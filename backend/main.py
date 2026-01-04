"""
Hero-Dash Backend API
=====================
FastAPI backend for auditory therapy game.
Provides ML-powered scenario recommendations, user management, and analytics.
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
import random
import models, schemas, crud, database, ml_algorithms
import numpy as np

# Initialize database tables on startup
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Configure CORS to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (configure appropriately for production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database session dependency for automatic connection management
def get_db():
    """Create and manage database session for each request"""
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================================================
# BASIC ENDPOINTS - User Management & Game Flow
# ============================================================================

@app.get("/")
def read_root():
    """API health check endpoint"""
    return {"message": "Emergency Response Hero API"}

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user or return existing user by username.
    Serves as both registration and simple login.
    """
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        return db_user  # Return existing user if found
    return crud.create_user(db=db, user=user)

@app.post("/attempts/", response_model=schemas.Attempt)
def record_attempt(attempt: schemas.AttemptCreate, db: Session = Depends(get_db)):
    """
    Record a game attempt with ML processing.
    Updates user stats, Thompson Sampling, and Spaced Repetition models.
    """
    return crud.create_attempt(db=db, attempt=attempt)

@app.get("/recommend/{user_id}", response_model=schemas.ScenarioRecommendation)
def get_recommendation(user_id: int, db: Session = Depends(get_db)):
    """
    Get personalized scenario recommendation using ML algorithms.
    Combines Thompson Sampling, Spaced Repetition, and Cognitive Load analysis.
    """
    recommendation = crud.get_recommendation(db, user_id)
    if not recommendation:
        raise HTTPException(status_code=404, detail="User not found")
    return recommendation

@app.get("/scenario")
def get_scenario():
    """
    DEPRECATED: Returns a random emergency scenario.
    Use /recommend/{user_id} for personalized ML-based recommendations.
    """
    scenarios = [
        {"type": "ambulance", "visual_cue": "Flashing Red/White Lights", "action": "Move Right"},
        {"type": "police", "visual_cue": "Flashing Blue/Red Lights", "action": "Stay Center"},
        {"type": "firetruck", "visual_cue": "Flashing Red Lights", "action": "Move Left"},
        {"type": "train", "visual_cue": "Railway Crossing", "action": "Stop"},
        {"type": "ice_cream", "visual_cue": "Ice Cream Truck", "action": "Slow Down"},
    ]
    return random.choice(scenarios)

# ============================================================================
# ADVANCED ANALYTICS & CLINICAL ENDPOINTS
# ============================================================================

@app.get("/analytics/clinical-scores/{user_id}")
def get_clinical_scores(user_id: int, db: Session = Depends(get_db)):
    """
    Generate comprehensive clinical assessment scores.
    Evaluates figure-ground discrimination, temporal processing,
    sound localization, and attention span based on gameplay data.
    
    Requires minimum 20 attempts for statistical validity.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    scores = ml_algorithms.calculate_clinical_scores(db, user_id)
    
    if not scores:
        return {
            "error": "Insufficient data",
            "message": "Need at least 20 attempts for clinical assessment",
            "current_attempts": db.query(models.Attempt).filter(
                models.Attempt.user_id == user_id
            ).count()
        }
    
    # Save to database
    assessment = models.ClinicalAssessment(
        user_id=user_id,
        figure_ground_discrimination_score=scores["figure_ground_score"],
        temporal_processing_score=scores["temporal_processing_score"],
        sound_localization_score=scores["sound_localization_score"],
        auditory_attention_span=scores["auditory_attention_span"],
        composite_score=scores["composite_score"]
    )
    db.add(assessment)
    db.commit()
    
    return {
        "user_id": user_id,
        "username": user.username,
        "assessment_date": datetime.utcnow().isoformat(),
        "scores": scores,
        "interpretation": interpret_clinical_scores(scores)
    }


def interpret_clinical_scores(scores: dict) -> dict:
    """
    Provide clinical interpretation of composite scores.
    Classifies performance and identifies strengths/weaknesses.
    """
    composite = scores["composite_score"]
    
    if composite >= 80:
        level = "Excellent"
        note = "Performance well above age-expected norms"
    elif composite >= 65:
        level = "Good"
        note = "Performance within or above typical range"
    elif composite >= 50:
        level = "Developing"
        note = "Some areas need targeted intervention"
    else:
        level = "Needs Support"
        note = "Recommend professional audiological evaluation"
    
    return {
        "performance_level": level,
        "clinical_note": note,
        "areas_of_strength": get_strength_areas(scores),
        "areas_for_improvement": get_improvement_areas(scores)
    }


def get_strength_areas(scores: dict) -> list:
    """Identify performance areas where user excels (score >= 70)"""
    strengths = []
    if scores["figure_ground_score"] >= 70:
        strengths.append("Figure-ground discrimination")
    if scores["temporal_processing_score"] >= 70:
        strengths.append("Temporal processing")
    if scores["sound_localization_score"] >= 70:
        strengths.append("Sound identification")
    return strengths if strengths else ["Building foundation"]


def get_improvement_areas(scores: dict) -> list:
    """Identify areas needing targeted practice (score < 60)"""
    improvements = []
    if scores["figure_ground_score"] < 60:
        improvements.append("Noise filtering ability")
    if scores["temporal_processing_score"] < 60:
        improvements.append("Processing speed consistency")
    if scores["sound_localization_score"] < 60:
        improvements.append("Sound recognition accuracy")
    if scores["auditory_attention_span"] < 180:
        improvements.append("Sustained attention")
    return improvements if improvements else ["Continue current program"]


@app.get("/analytics/progress-report/{user_id}")
def generate_progress_report(user_id: int, days: Optional[int] = 30, db: Session = Depends(get_db)):
    """
    Generate comprehensive progress report for specified time period.
    Includes success rates, reaction times, improvement trends,
    per-scenario breakdowns, and clinical recommendations.
    
    Args:
        user_id: User identifier
        days: Number of days to include in report (default: 30)
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Fetch attempts from specified time period
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    all_attempts = db.query(models.Attempt).filter(
        models.Attempt.user_id == user_id,
        models.Attempt.timestamp >= cutoff_date
    ).order_by(models.Attempt.timestamp).all()
    
    if not all_attempts:
        return {"error": "No data in specified time period"}
    
    # Calculate overall metrics
    total_attempts = len(all_attempts)
    success_rate = sum(1 for a in all_attempts if a.success) / total_attempts
    
    reaction_times = [a.reaction_time for a in all_attempts if a.reaction_time > 0]
    avg_rt = np.mean(reaction_times) if reaction_times else 0
    
    # Calculate improvement rate (first 25% vs last 25%)
    quarter_size = max(1, total_attempts // 4)
    first_quarter = all_attempts[:quarter_size]
    last_quarter = all_attempts[-quarter_size:]
    
    first_success = sum(1 for a in first_quarter if a.success) / len(first_quarter)
    last_success = sum(1 for a in last_quarter if a.success) / len(last_quarter)
    improvement = last_success - first_success
    
    # Scenario breakdown
    from collections import defaultdict
    scenario_stats = defaultdict(lambda: {"total": 0, "success": 0, "avg_rt": []})
    
    for attempt in all_attempts:
        scenario_stats[attempt.scenario_type]["total"] += 1
        if attempt.success:
            scenario_stats[attempt.scenario_type]["success"] += 1
        if attempt.reaction_time > 0:
            scenario_stats[attempt.scenario_type]["avg_rt"].append(attempt.reaction_time)
    
    scenario_summary = {}
    for scenario, stats in scenario_stats.items():
        scenario_summary[scenario] = {
            "attempts": stats["total"],
            "success_rate": round(stats["success"] / stats["total"] * 100, 1),
            "avg_reaction_time": round(np.mean(stats["avg_rt"]), 2) if stats["avg_rt"] else 0
        }
    
    # Get clinical recommendations
    recommendations = ml_algorithms.generate_clinical_recommendations(db, user_id)
    
    # Get flow state analysis
    flow_state = ml_algorithms.detect_flow_state(db, user_id)
    
    return {
        "report_period": f"Last {days} days",
        "generated_at": datetime.utcnow().isoformat(),
        "user_info": {
            "username": user.username,
            "current_level": user.current_level,
            "total_score": user.total_score
        },
        "overall_performance": {
            "total_attempts": total_attempts,
            "success_rate": round(success_rate * 100, 1),
            "avg_reaction_time": round(avg_rt, 2),
            "improvement_rate": round(improvement * 100, 1),
            "days_active": days
        },
        "scenario_breakdown": scenario_summary,
        "current_state": {
            "cognitive_load": round(flow_state["cognitive_load"], 2),
            "in_flow_state": flow_state["in_flow"],
            "recommendation": flow_state["recommendation"]
        },
        "clinical_recommendations": recommendations,
        "next_steps": generate_next_steps(scenario_summary, flow_state, recommendations)
    }


def generate_next_steps(scenario_summary: dict, flow_state: dict, recommendations: list) -> list:
    """Generate actionable next steps"""
    steps = []
    
    # Based on flow state
    if flow_state["cognitive_load"] > 0.7:
        steps.append("Take a 10-minute break before next session")
        steps.append("Reduce session duration to 10-15 minutes")
    elif flow_state["in_flow"]:
        steps.append("Continue current difficulty level")
        steps.append("Aim for 20-30 minute sessions")
    
    # Based on scenario performance
    weak_scenarios = [s for s, stats in scenario_summary.items() if stats["success_rate"] < 60]
    if weak_scenarios:
        steps.append(f"Focus practice on: {', '.join(weak_scenarios)}")
    
    # From clinical recommendations
    high_priority = [r for r in recommendations if r.get("severity") == "high_priority"]
    if high_priority:
        steps.append(high_priority[0]["suggestion"])
    
    return steps if steps else ["Continue current training program"]


@app.get("/analytics/learning-curve/{user_id}")
def get_learning_curve_data(user_id: int, db: Session = Depends(get_db)):
    """
    Get data for learning curve visualization
    Returns moving average of success rate over time
    """
    attempts = db.query(models.Attempt).filter(
        models.Attempt.user_id == user_id
    ).order_by(models.Attempt.timestamp).all()
    
    if not attempts:
        return {"data_points": []}
    
    # Calculate moving average (window = 10)
    window_size = 10
    data_points = []
    
    for i in range(len(attempts)):
        start = max(0, i - window_size + 1)
        window = attempts[start:i+1]
        avg_success = sum(1 for a in window if a.success) / len(window)
        
        data_points.append({
            "attempt_number": i + 1,
            "success": attempts[i].success,
            "moving_average": round(avg_success, 3),
            "timestamp": attempts[i].timestamp.isoformat(),
            "difficulty": attempts[i].difficulty_level,
            "scenario": attempts[i].scenario_type
        })
    
    return {
        "total_attempts": len(attempts),
        "data_points": data_points
    }


@app.get("/analytics/cognitive-load/{user_id}")
def get_cognitive_load_status(user_id: int, db: Session = Depends(get_db)):
    """
    Get real-time cognitive load assessment
    """
    cognitive_load = ml_algorithms.calculate_cognitive_load(db, user_id, window_minutes=10)
    flow_state = ml_algorithms.detect_flow_state(db, user_id)
    
    return {
        "cognitive_load": round(cognitive_load, 2),
        "load_level": get_load_level(cognitive_load),
        "flow_state": flow_state,
        "recommendation": get_cognitive_recommendation(cognitive_load, flow_state)
    }


def get_load_level(cognitive_load: float) -> str:
    """Categorize cognitive load"""
    if cognitive_load < 0.3:
        return "Low"
    elif cognitive_load < 0.6:
        return "Moderate"
    else:
        return "High"


def get_cognitive_recommendation(cognitive_load: float, flow_state: dict) -> str:
    """Get recommendation based on cognitive state"""
    if cognitive_load > 0.7:
        return "Take a break - cognitive load is high"
    elif flow_state["in_flow"]:
        return "Optimal learning state - continue"
    elif flow_state["recommendation"] == "decrease_difficulty":
        return "Reduce difficulty temporarily"
    elif flow_state["recommendation"] == "increase_difficulty":
        return "Ready for more challenge"
    else:
        return "Continue current approach"


@app.post("/analytics/start-session/{user_id}")
def start_session(user_id: int, db: Session = Depends(get_db)):
    """
    Start a new training session for tracking
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    session = models.SessionMetrics(
        user_id=user_id,
        session_start=datetime.utcnow()
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {
        "session_id": session.id,
        "started_at": session.session_start.isoformat(),
        "message": "Session tracking started"
    }


@app.post("/analytics/end-session/{session_id}")
def end_session(session_id: int, db: Session = Depends(get_db)):
    """
    End a training session and calculate metrics
    """
    session = db.query(models.SessionMetrics).filter(
        models.SessionMetrics.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.session_end = datetime.utcnow()
    
    # Calculate session metrics
    attempts = db.query(models.Attempt).filter(
        models.Attempt.user_id == session.user_id,
        models.Attempt.timestamp >= session.session_start,
        models.Attempt.timestamp <= session.session_end
    ).all()
    
    if attempts:
        initial_perf = sum(1 for a in attempts[:5] if a.success) / min(5, len(attempts))
        final_perf = sum(1 for a in attempts[-5:] if a.success) / min(5, len(attempts))
        
        session.initial_performance = initial_perf
        session.final_performance = final_perf
        session.learning_velocity = final_perf - initial_perf
        
        reaction_times = [a.reaction_time for a in attempts if a.reaction_time > 0]
        if reaction_times:
            session.response_consistency = 1 / (1 + np.var(reaction_times))
    
    db.commit()
    
    duration_seconds = (session.session_end - session.session_start).total_seconds()
    
    return {
        "session_id": session.id,
        "duration_seconds": round(duration_seconds, 1),
        "duration_minutes": round(duration_seconds / 60, 1),
        "attempts_made": len(attempts),
        "learning_velocity": round(session.learning_velocity, 3),
        "message": "Session completed"
    }
