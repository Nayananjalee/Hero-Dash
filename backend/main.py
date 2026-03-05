"""
Hero-Dash Backend API
=====================
FastAPI backend for auditory therapy game.
Provides ML-powered scenario recommendations, user management, and analytics.
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
from datetime import datetime, timedelta
import random
import os
from dotenv import load_dotenv
import models, schemas, crud, database, ml_algorithms
import bayesian_knowledge_tracing as bkt
import irt_model as irt
import psychometrics
import numpy as np
import json

# Load environment variables from .env file
load_dotenv()

# Log which database is being used (mask credentials)
db_url = database.SQLALCHEMY_DATABASE_URL
if "://" in db_url and not db_url.startswith("sqlite"):
    # Mask password in log output
    parts = db_url.split("@")
    db_display = f"postgresql://***@{parts[-1]}" if len(parts) > 1 else "postgresql://***"
else:
    db_display = db_url
print(f"🗄️  Database: {db_display}")

# Initialize database tables on startup
models.Base.metadata.create_all(bind=database.engine)
print("✅ Database tables initialized")

app = FastAPI()

# Get allowed origins from environment variable or use defaults
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

# Configure CORS to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Production-ready CORS configuration
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
    Initializes BKT skill states and learning profile.
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
    
    # Log the recommendation for debugging
    print(f"🎯 RECOMMENDATION for user {user_id}: TYPE={recommendation['type']}, ACTION={recommendation['action']}, REASON={recommendation['reason']}")
    
    return recommendation


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
            "attempts": int(stats["total"]),
            "success_rate": float(round(stats["success"] / stats["total"] * 100, 1)),
            "avg_reaction_time": float(round(np.mean(stats["avg_rt"]), 2)) if stats["avg_rt"] else 0.0
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
            "total_attempts": int(total_attempts),
            "success_rate": float(round(success_rate * 100, 1)),
            "avg_reaction_time": float(round(avg_rt, 2)),
            "improvement_rate": float(round(improvement * 100, 1)),
            "days_active": int(days)
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


# ============================================================================
# BAYESIAN KNOWLEDGE TRACING (BKT) ENDPOINTS
# ============================================================================

@app.get("/bkt/skill-levels/{user_id}")
def get_bkt_skill_levels(user_id: int, db: Session = Depends(get_db)):
    """
    Get current Bayesian Knowledge Tracing skill mastery levels.
    
    Tracks 5 auditory processing skills:
    - frequency_discrimination: Distinguishing siren types by frequency
    - temporal_pattern_recognition: Recognizing rhythmic patterns
    - figure_ground_separation: Identifying signals amid noise
    - sound_action_mapping: Associating sounds with actions
    - auditory_attention: Sustained attention during sessions
    
    Based on: Corbett & Anderson (1994) Hidden Markov Model
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    skill_levels = bkt.get_skill_levels(db, user_id)
    overall_mastery = bkt.calculate_overall_mastery(db, user_id)
    
    return {
        "user_id": user_id,
        "username": user.username,
        "skills": skill_levels,
        "overall_mastery": round(overall_mastery, 4),
        "mastery_label": "Mastered" if overall_mastery >= 0.95 else
                        "Proficient" if overall_mastery >= 0.80 else
                        "Developing" if overall_mastery >= 0.60 else
                        "Emerging" if overall_mastery >= 0.40 else "Novice"
    }


# ============================================================================
# ITEM RESPONSE THEORY (IRT) ENDPOINTS
# ============================================================================

@app.get("/irt/ability-estimate/{user_id}")
def get_irt_ability(user_id: int, db: Session = Depends(get_db)):
    """
    Estimate latent auditory processing ability using 2PL IRT model.
    
    Uses Maximum Likelihood Estimation with Newton-Raphson optimization.
    Theta is on a standard normal scale (-3 to +3).
    
    Based on: Embretson & Reise (2000); van der Linden (2024)
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    ability = irt.estimate_ability_from_db(db, user_id)
    
    return {
        "user_id": user_id,
        "username": user.username,
        **ability
    }


@app.get("/irt/ability-trajectory/{user_id}")
def get_ability_trajectory(user_id: int, db: Session = Depends(get_db)):
    """
    Get ability growth trajectory over time (sliding window IRT).
    Shows how theta changes as child accumulates practice.
    """
    trajectory = irt.get_ability_growth_trajectory(db, user_id)
    return {
        "user_id": user_id,
        "trajectory": trajectory,
        "num_data_points": len(trajectory)
    }


@app.get("/irt/optimal-item/{user_id}")
def get_optimal_item(user_id: int, db: Session = Depends(get_db)):
    """
    Get the optimal next item using Computerized Adaptive Testing (CAT).
    Selects item with maximum Fisher Information at current ability estimate.
    """
    ability = irt.estimate_ability_from_db(db, user_id)
    item = irt.select_optimal_item(ability.get("theta", 0.0))
    
    return {
        "current_ability": ability,
        "recommended_item": item
    }


# ============================================================================
# PSYCHOMETRIC VALIDATION ENDPOINTS
# ============================================================================

@app.get("/psychometrics/report/{user_id}")
def get_psychometric_report(user_id: int, db: Session = Depends(get_db)):
    """
    Generate comprehensive psychometric validation report.
    
    Includes:
    - Cronbach's Alpha (internal consistency)
    - Test-Retest Reliability (stability)
    - Standard Error of Measurement (precision)
    - Minimal Detectable Change (clinical threshold)
    
    Based on: Nunnally & Bernstein (1994); AERA Standards (2014)
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    report = psychometrics.generate_psychometric_report(db, user_id)
    return report


@app.get("/psychometrics/age-normalized-scores/{user_id}")
def get_age_normalized_scores(user_id: int, db: Session = Depends(get_db)):
    """
    Get clinical scores with age-normalized percentiles and classifications.
    
    Compares to published SCAN-3:CH and CHAPPS normative data.
    Returns z-scores, percentiles, and clinical classification per skill.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    raw_scores = ml_algorithms.calculate_clinical_scores(db, user_id)
    if not raw_scores:
        return {
            "error": "Insufficient data",
            "message": "Need at least 20 attempts",
            "current_attempts": db.query(models.Attempt).filter(
                models.Attempt.user_id == user_id
            ).count()
        }
    
    age_group = user.age_group or "7-8"
    normalized = psychometrics.calculate_age_normalized_scores(raw_scores, age_group)
    
    return {
        "user_id": user_id,
        "age_group": age_group,
        "hearing_level": user.hearing_level,
        "raw_scores": raw_scores,
        "normalized_scores": normalized,
        "assessment_date": datetime.utcnow().isoformat()
    }


# ============================================================================
# PRE/POST ASSESSMENT PROTOCOL
# ============================================================================

@app.post("/assessment/start/{user_id}")
def start_assessment(user_id: int, assessment_type: str = "baseline", 
                     db: Session = Depends(get_db)):
    """
    Start a standardized pre/post assessment session.
    
    Protocol:
    - 20 trials (4 per scenario type × 5 crisis scenarios)
    - Fixed difficulty (level 1)
    - Fixed noise (0.2 for baseline)
    - Randomized scenario order
    - Used for measuring treatment effect (pre-post design)
    
    Assessment types: baseline, post_test, follow_up
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create assessment session
    assessment = models.AssessmentSession(
        user_id=user_id,
        assessment_type=assessment_type,
        started_at=datetime.utcnow(),
        noise_level=0.2,
        num_trials=20,
        trials_completed=0
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    
    # Generate randomized trial sequence (4 of each type)
    scenarios = ["tsunami_siren", "earthquake_alarm", "flood_warning", "air_raid_siren", "building_fire_alarm"] * 4
    random.shuffle(scenarios)
    
    scenario_map = {
        "tsunami_siren": {"action": "Move Right", "visual_cue": "Tsunami Warning Lights"},
        "earthquake_alarm": {"action": "Stop", "visual_cue": "Seismic Warning Lights"},
        "flood_warning": {"action": "Find Safe Place", "visual_cue": "Flood Warning Lights"},
        "air_raid_siren": {"action": "Stay Center", "visual_cue": "Civil Defense Lights"},
        "building_fire_alarm": {"action": "Move Left", "visual_cue": "Building Fire Alarm Lights"},
    }
    
    trials = []
    for i, scenario in enumerate(scenarios):
        details = scenario_map[scenario]
        trials.append({
            "trial_number": i + 1,
            "scenario_type": scenario,
            "action": details["action"],
            "visual_cue": details["visual_cue"],
            "noise_level": 0.2,
            "difficulty_level": 1
        })
    
    return {
        "assessment_id": assessment.id,
        "assessment_type": assessment_type,
        "num_trials": 20,
        "trials": trials,
        "message": f"Assessment ({assessment_type}) started. Complete all 20 trials."
    }


@app.post("/assessment/record-trial/{assessment_id}")
def record_assessment_trial(assessment_id: int, trial: schemas.AssessmentTrialResult,
                            db: Session = Depends(get_db)):
    """
    Record a single assessment trial result.
    Updates assessment progress and stores the attempt.
    """
    assessment = db.query(models.AssessmentSession).filter(
        models.AssessmentSession.id == assessment_id
    ).first()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Record as regular attempt (for ML model training)
    attempt_data = schemas.AttemptCreate(
        user_id=trial.user_id,
        scenario_type=trial.scenario_type,
        success=trial.success,
        reaction_time=trial.reaction_time,
        difficulty_level=1,
        noise_level=trial.noise_level,
        speed_modifier=1.0,
        game_mode="assessment"
    )
    crud.create_attempt(db=db, attempt=attempt_data)
    
    assessment.trials_completed += 1
    
    # Update per-scenario results
    results = json.loads(assessment.scenario_results or "{}")
    if trial.scenario_type not in results:
        results[trial.scenario_type] = {"correct": 0, "total": 0, "reaction_times": []}
    
    results[trial.scenario_type]["total"] += 1
    if trial.success:
        results[trial.scenario_type]["correct"] += 1
    results[trial.scenario_type]["reaction_times"].append(trial.reaction_time)
    
    assessment.scenario_results = json.dumps(results)
    db.commit()
    
    return {
        "trial_recorded": trial.trial_number,
        "trials_remaining": assessment.num_trials - assessment.trials_completed,
        "completed": assessment.trials_completed >= assessment.num_trials
    }


@app.post("/assessment/complete/{assessment_id}")
def complete_assessment(assessment_id: int, db: Session = Depends(get_db)):
    """
    Complete an assessment session and calculate final scores.
    Computes accuracy, reaction times, and effect sizes if post-test.
    """
    assessment = db.query(models.AssessmentSession).filter(
        models.AssessmentSession.id == assessment_id
    ).first()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    assessment.completed_at = datetime.utcnow()
    
    results = json.loads(assessment.scenario_results or "{}")
    
    # Calculate overall metrics
    total_correct = sum(r.get("correct", 0) for r in results.values())
    total_trials = sum(r.get("total", 0) for r in results.values())
    all_rts = []
    
    for scenario, data in results.items():
        if data["total"] > 0:
            data["accuracy"] = round(data["correct"] / data["total"] * 100, 1)
        else:
            data["accuracy"] = 0.0
        
        if data["reaction_times"]:
            data["avg_rt"] = round(sum(data["reaction_times"]) / len(data["reaction_times"]), 3)
            all_rts.extend(data["reaction_times"])
    
    assessment.overall_accuracy = (total_correct / total_trials * 100) if total_trials > 0 else 0
    assessment.avg_reaction_time = (sum(all_rts) / len(all_rts)) if all_rts else 0
    assessment.scenario_results = json.dumps(results)
    
    # If post-test, calculate effect size vs baseline
    comparison = None
    if assessment.assessment_type == "post_test":
        comparison = psychometrics.compare_pre_post_assessment(db, assessment.user_id)
        if comparison:
            assessment.improvement_vs_baseline = comparison.get("improvement", 0)
            effect = comparison.get("effect_size", {})
            assessment.effect_size_cohens_d = effect.get("cohens_d", 0)
            assessment.statistical_significance = effect.get("significant", False)
            assessment.p_value = effect.get("p_value", 1.0)
    
    db.commit()
    
    return {
        "assessment_id": assessment.id,
        "assessment_type": assessment.assessment_type,
        "overall_accuracy": round(assessment.overall_accuracy, 1),
        "avg_reaction_time": round(assessment.avg_reaction_time, 3),
        "scenario_results": results,
        "pre_post_comparison": comparison,
        "message": "Assessment completed successfully"
    }


@app.get("/assessment/compare/{user_id}")
def compare_assessments(user_id: int, db: Session = Depends(get_db)):
    """
    Compare pre-test vs post-test assessment results.
    
    Statistical analysis includes:
    - Paired comparison per scenario type
    - Cohen's d effect size
    - Statistical significance (p-value)
    - Training duration and attempts between assessments
    """
    comparison = psychometrics.compare_pre_post_assessment(db, user_id)
    if not comparison:
        return {
            "error": "Need both baseline and post_test assessments",
            "available_assessments": [
                {
                    "type": a.assessment_type,
                    "date": a.started_at.isoformat(),
                    "completed": a.completed_at is not None
                }
                for a in db.query(models.AssessmentSession).filter(
                    models.AssessmentSession.user_id == user_id
                ).all()
            ]
        }
    return comparison


# ============================================================================
# AUDIOGRAM & HEARING PROFILE
# ============================================================================

@app.post("/audiogram/{user_id}")
def save_audiogram(user_id: int, profile: schemas.AudiogramProfile,
                   db: Session = Depends(get_db)):
    """
    Save audiometric profile for frequency-specific sound processing.
    
    Thresholds are in dB HL at standard audiometric frequencies.
    Used to customize game sounds and calculate PTA (Pure Tone Average).
    
    Based on: NAL-NL2 prescription targets (Keidser et al., 2011)
    """
    existing = db.query(models.AudiogramData).filter(
        models.AudiogramData.user_id == user_id
    ).first()
    
    # Calculate PTA (average of 500, 1000, 2000 Hz)
    pta = (profile.thresholds_500hz + profile.thresholds_1000hz + profile.thresholds_2000hz) / 3
    
    if existing:
        existing.threshold_250hz = profile.thresholds_250hz
        existing.threshold_500hz = profile.thresholds_500hz
        existing.threshold_1000hz = profile.thresholds_1000hz
        existing.threshold_2000hz = profile.thresholds_2000hz
        existing.threshold_4000hz = profile.thresholds_4000hz
        existing.threshold_8000hz = profile.thresholds_8000hz
        existing.hearing_aid_type = profile.hearing_aid_type
        existing.pta_best_ear = pta
        existing.updated_at = datetime.utcnow()
    else:
        audiogram = models.AudiogramData(
            user_id=user_id,
            threshold_250hz=profile.thresholds_250hz,
            threshold_500hz=profile.thresholds_500hz,
            threshold_1000hz=profile.thresholds_1000hz,
            threshold_2000hz=profile.thresholds_2000hz,
            threshold_4000hz=profile.thresholds_4000hz,
            threshold_8000hz=profile.thresholds_8000hz,
            hearing_aid_type=profile.hearing_aid_type,
            pta_best_ear=pta
        )
        db.add(audiogram)
    
    # Update hearing level classification based on PTA
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        if pta <= 15:
            user.hearing_level = "normal"
        elif pta <= 25:
            user.hearing_level = "mild"
        elif pta <= 40:
            user.hearing_level = "moderate"
        elif pta <= 55:
            user.hearing_level = "moderately_severe"
        elif pta <= 70:
            user.hearing_level = "severe"
        else:
            user.hearing_level = "profound"
    
    db.commit()
    
    return {
        "user_id": user_id,
        "pta_best_ear": round(pta, 1),
        "hearing_level": user.hearing_level if user else "unknown",
        "eq_profile": calculate_eq_gains(profile),
        "message": "Audiogram saved. Sound processing will be customized."
    }


def calculate_eq_gains(profile: schemas.AudiogramProfile) -> dict:
    """
    Calculate recommended EQ gain adjustments based on half-gain rule.
    Half-gain rule: Apply 50% of the hearing loss as amplification.
    """
    thresholds = {
        250: profile.thresholds_250hz,
        500: profile.thresholds_500hz,
        1000: profile.thresholds_1000hz,
        2000: profile.thresholds_2000hz,
        4000: profile.thresholds_4000hz,
        8000: profile.thresholds_8000hz
    }
    
    gains = {}
    for freq, threshold in thresholds.items():
        # Half-gain rule with max 20 dB boost
        gain = min(threshold * 0.5, 20.0)
        gains[f"{freq}hz"] = round(gain, 1)
    
    return gains


@app.get("/audiogram/{user_id}")
def get_audiogram(user_id: int, db: Session = Depends(get_db)):
    """Get stored audiogram data and recommended EQ gains."""
    audiogram = db.query(models.AudiogramData).filter(
        models.AudiogramData.user_id == user_id
    ).first()
    
    if not audiogram:
        return {"message": "No audiogram data stored", "eq_profile": None}
    
    profile = schemas.AudiogramProfile(
        user_id=user_id,
        thresholds_250hz=audiogram.threshold_250hz,
        thresholds_500hz=audiogram.threshold_500hz,
        thresholds_1000hz=audiogram.threshold_1000hz,
        thresholds_2000hz=audiogram.threshold_2000hz,
        thresholds_4000hz=audiogram.threshold_4000hz,
        thresholds_8000hz=audiogram.threshold_8000hz,
        hearing_aid_type=audiogram.hearing_aid_type
    )
    
    return {
        "audiogram": {
            "250hz": audiogram.threshold_250hz,
            "500hz": audiogram.threshold_500hz,
            "1000hz": audiogram.threshold_1000hz,
            "2000hz": audiogram.threshold_2000hz,
            "4000hz": audiogram.threshold_4000hz,
            "8000hz": audiogram.threshold_8000hz,
        },
        "hearing_aid_type": audiogram.hearing_aid_type,
        "pta_best_ear": audiogram.pta_best_ear,
        "eq_profile": calculate_eq_gains(profile)
    }


# ============================================================================
# THERAPIST / PARENT DASHBOARD
# ============================================================================

@app.get("/dashboard/therapist/{user_id}")
def get_therapist_dashboard(user_id: int, db: Session = Depends(get_db)):
    """
    Comprehensive therapist/parent dashboard with all clinical data.
    
    Provides at-a-glance view of:
    - Overall progress and training metrics
    - BKT skill mastery levels
    - IRT ability estimate with confidence interval
    - Age-normalized clinical scores
    - Psychometric validity metrics
    - Clinical recommendations in SOAP note format
    
    Based on: Moeller (2000); DesJardin & Eisenberg (2024)
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Total sessions and training time
    sessions = db.query(models.SessionMetrics).filter(
        models.SessionMetrics.user_id == user_id
    ).all()
    
    total_sessions = len(sessions)
    total_minutes = sum(
        (s.session_end - s.session_start).total_seconds() / 60
        for s in sessions if s.session_end
    )
    
    # Overall attempt stats
    total_attempts = db.query(models.Attempt).filter(
        models.Attempt.user_id == user_id
    ).count()
    
    successful = db.query(models.Attempt).filter(
        and_(models.Attempt.user_id == user_id, models.Attempt.success == True)
    ).count()
    
    overall_accuracy = (successful / total_attempts * 100) if total_attempts > 0 else 0
    
    # BKT skills
    skill_levels = bkt.get_skill_levels(db, user_id)
    overall_mastery = bkt.calculate_overall_mastery(db, user_id)
    
    # IRT ability
    ability = irt.estimate_ability_from_db(db, user_id)
    
    # Clinical scores (age-normalized)
    raw_scores = ml_algorithms.calculate_clinical_scores(db, user_id)
    normalized = None
    if raw_scores:
        normalized = psychometrics.calculate_age_normalized_scores(
            raw_scores, user.age_group or "7-8"
        )
    
    # Psychometric validity
    psych_report = psychometrics.generate_psychometric_report(db, user_id)
    
    # Clinical recommendations
    recommendations = ml_algorithms.generate_clinical_recommendations(db, user_id)
    
    # SOAP-style clinical note
    soap_note = generate_soap_note(user, overall_accuracy, skill_levels, ability, recommendations)
    
    return {
        "user_info": {
            "id": user.id,
            "username": user.username,
            "age_group": user.age_group,
            "hearing_level": user.hearing_level,
            "current_level": user.current_level,
            "member_since": user.created_at.isoformat() if user.created_at else None
        },
        "training_summary": {
            "total_sessions": total_sessions,
            "total_training_minutes": round(total_minutes, 1),
            "total_attempts": total_attempts,
            "overall_accuracy": round(overall_accuracy, 1)
        },
        "bkt_skill_mastery": {
            "skills": skill_levels,
            "overall_mastery": round(overall_mastery, 4),
            "mastery_label": "Mastered" if overall_mastery >= 0.95 else
                            "Proficient" if overall_mastery >= 0.80 else
                            "Developing" if overall_mastery >= 0.60 else
                            "Emerging" if overall_mastery >= 0.40 else "Novice"
        },
        "irt_ability": ability,
        "clinical_scores": {
            "raw": raw_scores,
            "normalized": normalized
        },
        "psychometric_validity": psych_report,
        "clinical_recommendations": recommendations,
        "soap_note": soap_note,
        "generated_at": datetime.utcnow().isoformat()
    }


def generate_soap_note(user, accuracy, skills, ability, recommendations):
    """Generate SOAP-format clinical documentation."""
    # Subjective
    subjective = f"Patient {user.username} (age group: {user.age_group}, " \
                 f"hearing level: {user.hearing_level}) participating in " \
                 f"gamified auditory discrimination training."
    
    # Objective
    objective_parts = [
        f"Overall accuracy: {accuracy:.1f}%",
        f"IRT ability estimate: θ={ability.get('theta', 0):.2f} ({ability.get('ability_label', 'N/A')})",
    ]
    for skill_name, skill_data in skills.items():
        if isinstance(skill_data, dict):
            objective_parts.append(
                f"{skill_name}: P(L)={skill_data.get('p_learned', 0):.2f} "
                f"({skill_data.get('mastery_label', 'N/A')})"
            )
    
    # Assessment
    high_priority = [r for r in recommendations if r.get("severity") == "high_priority"]
    if high_priority:
        assessment = "Areas of concern identified requiring targeted intervention."
    elif accuracy >= 70:
        assessment = "Performance progressing within expected parameters."
    else:
        assessment = "Below expected performance; continued intensive training recommended."
    
    # Plan
    plan_items = [r.get("suggestion", "") for r in recommendations[:3]]
    if not plan_items:
        plan_items = ["Continue current training protocol."]
    
    return {
        "subjective": subjective,
        "objective": " | ".join(objective_parts),
        "assessment": assessment,
        "plan": plan_items
    }


# ============================================================================
# CLINICAL EXPORT
# ============================================================================

@app.get("/export/clinical-report/{user_id}")
def export_clinical_report(user_id: int, days: int = 30, 
                           db: Session = Depends(get_db)):
    """
    Export comprehensive clinical report for audiologist/therapist use.
    
    Includes all data needed for clinical documentation:
    - Patient demographics and hearing profile
    - Training history and progress
    - Standardized clinical scores (age-normalized)
    - BKT skill mastery tracking
    - IRT ability estimates with confidence intervals
    - Psychometric validity metrics
    - Pre/post comparison (if available)
    - Clinical recommendations
    
    Compatible with: ASHA documentation standards
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Gather all data
    dashboard = get_therapist_dashboard(user_id, db)
    progress = generate_progress_report(user_id, days, db)
    
    # Assessment comparison
    comparison = psychometrics.compare_pre_post_assessment(db, user_id)
    
    # Learning curve
    learning_data = get_learning_curve_data(user_id, db)
    
    # IRT trajectory
    trajectory = irt.get_ability_growth_trajectory(db, user_id)
    
    return {
        "report_type": "Clinical Assessment Report",
        "report_version": "2.0",
        "generated_at": datetime.utcnow().isoformat(),
        "patient": dashboard.get("user_info", {}),
        "training_summary": dashboard.get("training_summary", {}),
        "clinical_scores": dashboard.get("clinical_scores", {}),
        "bkt_skills": dashboard.get("bkt_skill_mastery", {}),
        "irt_ability": dashboard.get("irt_ability", {}),
        "irt_growth_trajectory": trajectory,
        "progress_over_period": progress if not isinstance(progress, dict) or "error" not in progress else None,
        "pre_post_comparison": comparison,
        "psychometric_validity": dashboard.get("psychometric_validity", {}),
        "clinical_recommendations": dashboard.get("clinical_recommendations", []),
        "soap_note": dashboard.get("soap_note", {}),
        "disclaimer": "This report is generated by an automated system and should be "
                      "interpreted by a qualified audiologist or speech-language pathologist."
    }


# ============================================================================
# SPACED REPETITION DATA ENDPOINTS
# ============================================================================

@app.get("/spaced-repetition/memory-states/{user_id}")
def get_memory_states(user_id: int, db: Session = Depends(get_db)):
    """
    Get all spaced repetition memory states for a user.
    Shows current memory strength, next review dates, and forgetting curves.
    
    Based on: Ebbinghaus (1885/2013); Pimsleur (1967) spacing schedule;
    Cepeda et al. (2006) distributed practice; Kang (2016) spaced retrieval
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    skills = db.query(models.SkillMemoryState).filter(
        models.SkillMemoryState.user_id == user_id
    ).all()
    
    memory_states = []
    for skill in skills:
        current_strength = ml_algorithms.calculate_memory_decay(db, user_id, skill.scenario_type)
        time_since_practice = (datetime.utcnow() - skill.last_practiced).total_seconds() / 3600  # hours
        is_due = skill.next_review_date <= datetime.utcnow()
        
        memory_states.append({
            "scenario_type": skill.scenario_type,
            "memory_strength": round(current_strength, 4),
            "easiness_factor": round(skill.easiness_factor, 2),
            "interval_days": round(skill.interval_days, 1),
            "repetition_number": skill.repetition_number,
            "next_review_date": skill.next_review_date.isoformat(),
            "last_practiced": skill.last_practiced.isoformat(),
            "hours_since_practice": round(time_since_practice, 1),
            "is_due_for_review": is_due,
            "strength_label": "Strong" if current_strength >= 0.8 else
                             "Moderate" if current_strength >= 0.5 else
                             "Weak" if current_strength >= 0.2 else "Forgotten"
        })
    
    # Sort by urgency (weakest memory first)
    memory_states.sort(key=lambda x: x["memory_strength"])
    
    return {
        "user_id": user_id,
        "total_skills_tracked": len(memory_states),
        "due_for_review": sum(1 for m in memory_states if m["is_due_for_review"]),
        "average_strength": round(
            sum(m["memory_strength"] for m in memory_states) / max(1, len(memory_states)), 3
        ),
        "memory_states": memory_states
    }


@app.get("/spaced-repetition/due-reviews/{user_id}")
def get_due_reviews(user_id: int, db: Session = Depends(get_db)):
    """
    Get scenarios that are due for spaced repetition review.
    Returns prioritized list based on memory decay urgency.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    due_scenarios = ml_algorithms.get_due_for_review(db, user_id)
    
    due_details = []
    for scenario in due_scenarios:
        strength = ml_algorithms.calculate_memory_decay(db, user_id, scenario)
        due_details.append({
            "scenario_type": scenario,
            "current_memory_strength": round(strength, 4),
            "urgency": round(1 - strength, 4),
            "urgency_label": "Critical" if strength < 0.2 else
                            "High" if strength < 0.4 else
                            "Medium" if strength < 0.6 else "Low"
        })
    
    return {
        "user_id": user_id,
        "due_count": len(due_details),
        "due_scenarios": due_details,
        "recommendation": "Start with highest urgency scenarios" if due_details else
                         "All skills are fresh! Practice a new scenario."
    }


# ============================================================================
# TRAINING PLAN & SCHEDULE
# ============================================================================

@app.get("/training-plan/{user_id}")
def get_training_plan(user_id: int, db: Session = Depends(get_db)):
    """
    Generate personalized weekly training plan based on:
    - BKT skill mastery levels → target weakest skills
    - Spaced repetition schedule → prioritize due reviews
    - Cognitive load history → recommend session length
    - Flow state data → optimize difficulty
    - Attention span → determine break frequency
    
    Research basis:
    - Dunlosky et al. (2013): Effective learning techniques
    - Roediger & Butler (2011): Retrieval practice
    - Bjork & Bjork (2020): Desirable difficulties
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Gather data for plan generation
    skill_levels = bkt.get_skill_levels(db, user_id)
    due_reviews = ml_algorithms.get_due_for_review(db, user_id)
    attention_span = ml_algorithms.calculate_attention_span(db, user_id)
    cognitive_load = ml_algorithms.calculate_cognitive_load(db, user_id, window_minutes=60)
    
    # Total attempts for training maturity
    total_attempts = db.query(models.Attempt).filter(
        models.Attempt.user_id == user_id
    ).count()
    
    # Calculate recommended session length based on attention span
    recommended_session_minutes = max(5, min(20, attention_span / 60))
    
    # Determine sessions per week based on maturity
    if total_attempts < 50:
        sessions_per_week = 5  # Daily for beginners
        plan_phase = "Foundation"
    elif total_attempts < 200:
        sessions_per_week = 4
        plan_phase = "Building"
    elif total_attempts < 500:
        sessions_per_week = 3
        plan_phase = "Consolidation"
    else:
        sessions_per_week = 3
        plan_phase = "Maintenance"
    
    # Identify focus areas from BKT
    focus_skills = []
    for skill_name, skill_data in skill_levels.items():
        if isinstance(skill_data, dict):
            p_know = skill_data.get("p_know", skill_data.get("p_learned", 0))
            if p_know < 0.6:
                focus_skills.append({
                    "skill": skill_name.replace("_", " ").title(),
                    "current_mastery": round(p_know, 2),
                    "priority": "High" if p_know < 0.3 else "Medium"
                })
    
    # Generate daily plan
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    weekly_plan = []
    
    for i in range(sessions_per_week):
        day_plan = {
            "day": days[i],
            "session_minutes": round(recommended_session_minutes),
            "activities": []
        }
        
        # Activity 1: Spaced repetition reviews (if any due)
        if due_reviews:
            review_scenario = due_reviews[i % len(due_reviews)]
            day_plan["activities"].append({
                "type": "spaced_review",
                "scenario": review_scenario,
                "duration_minutes": 3,
                "description": f"Review {review_scenario} sound recognition (memory reinforcement)"
            })
        
        # Activity 2: Skill-targeted practice
        if focus_skills:
            target_skill = focus_skills[i % len(focus_skills)]
            scenario_map = {
                "Frequency Discrimination": "flood_warning",
                "Temporal Pattern Recognition": "earthquake_alarm",
                "Figure Ground Separation": "building_fire_alarm",
                "Sound Action Mapping": "air_raid_siren",
                "Auditory Attention": "tsunami_siren"
            }
            # Also map to alternate disaster scenarios for variety
            disaster_scenario_map = {
                "Frequency Discrimination": "air_raid_siren",
                "Temporal Pattern Recognition": "building_fire_alarm",
                "Figure Ground Separation": "flood_warning",
                "Sound Action Mapping": "earthquake_alarm",
                "Auditory Attention": "air_raid_siren"
            }
            target_scenario = scenario_map.get(target_skill["skill"], "tsunami_siren")
            # Alternate between emergency and disaster scenarios
            if i % 2 == 1:
                target_scenario = disaster_scenario_map.get(target_skill["skill"], target_scenario)
            day_plan["activities"].append({
                "type": "skill_practice",
                "skill": target_skill["skill"],
                "scenario": target_scenario,
                "duration_minutes": 5,
                "description": f"Focused practice on {target_skill['skill']} (mastery: {target_skill['current_mastery']*100:.0f}%)"
            })
        
        # Activity 3: Free play (ML-guided)
        remaining_time = round(recommended_session_minutes) - sum(a["duration_minutes"] for a in day_plan["activities"])
        if remaining_time > 2:
            day_plan["activities"].append({
                "type": "adaptive_play",
                "duration_minutes": remaining_time,
                "description": "ML-guided adaptive practice (Thompson Sampling selects optimal scenarios)"
            })
        
        weekly_plan.append(day_plan)
    
    # Rest days
    for i in range(sessions_per_week, 7):
        weekly_plan.append({
            "day": days[i],
            "session_minutes": 0,
            "activities": [{"type": "rest", "description": "Rest day — memory consolidation occurs during breaks"}]
        })
    
    return {
        "user_id": user_id,
        "plan_phase": plan_phase,
        "total_attempts_completed": total_attempts,
        "sessions_per_week": sessions_per_week,
        "recommended_session_minutes": round(recommended_session_minutes),
        "attention_span_seconds": round(attention_span),
        "current_cognitive_load": round(cognitive_load, 2),
        "focus_skills": focus_skills,
        "due_reviews_count": len(due_reviews),
        "weekly_plan": weekly_plan,
        "tips": [
            "Train at the same time each day for habit formation",
            "Take breaks when the game suggests — this helps memory consolidation",
            "Start each session with spaced repetition reviews",
            "End sessions while still engaged (don't push to frustration)",
            f"Optimal session length for this user: ~{round(recommended_session_minutes)} minutes"
        ]
    }


# ============================================================================
# ACHIEVEMENT & MILESTONE SYSTEM
# ============================================================================

ACHIEVEMENT_DEFINITIONS = [
    {"id": "first_attempt", "name": "First Steps", "name_si": "පළමු පියවර",
     "description": "Complete your first trial", "icon": "🌟", "threshold": 1, "metric": "total_attempts"},
    {"id": "ten_streak", "name": "On Fire!", "name_si": "ගිනි ගන්නවා!",
     "description": "Get 10 correct answers in a row", "icon": "🔥", "threshold": 10, "metric": "max_streak"},
    {"id": "fifty_attempts", "name": "Dedicated Learner", "name_si": "කැපවූ ඉගෙනුම්කරු",
     "description": "Complete 50 trials", "icon": "📚", "threshold": 50, "metric": "total_attempts"},
    {"id": "hundred_attempts", "name": "Century Club", "name_si": "සියවස් සමාජය",
     "description": "Complete 100 trials", "icon": "💯", "threshold": 100, "metric": "total_attempts"},
    {"id": "five_hundred", "name": "Sound Master", "name_si": "ශබ්ද ස්වාමී",
     "description": "Complete 500 trials", "icon": "🏆", "threshold": 500, "metric": "total_attempts"},
    {"id": "accuracy_70", "name": "Sharp Ears", "name_si": "තියුණු කන්",
     "description": "Reach 70% overall accuracy", "icon": "👂", "threshold": 70, "metric": "accuracy"},
    {"id": "accuracy_90", "name": "Eagle Ears", "name_si": "රාජාලි කන්",
     "description": "Reach 90% overall accuracy", "icon": "🦅", "threshold": 90, "metric": "accuracy"},
    {"id": "bkt_mastery_one", "name": "Skill Unlocked", "name_si": "කුසලතාව අගුළු හරිනු ලැබීය",
     "description": "Master one auditory skill (BKT > 95%)", "icon": "🔓", "threshold": 1, "metric": "skills_mastered"},
    {"id": "bkt_mastery_all", "name": "Grand Master", "name_si": "මහා ස්වාමී",
     "description": "Master all 5 auditory skills", "icon": "👑", "threshold": 5, "metric": "skills_mastered"},
    {"id": "flow_state", "name": "In The Zone", "name_si": "කලාපයේ",
     "description": "Achieve flow state for the first time", "icon": "🌊", "threshold": 1, "metric": "flow_achieved"},
    {"id": "fast_reactor", "name": "Lightning Reflexes", "name_si": "අකුණු ප්‍රතීචාර",
     "description": "React under 1 second consistently (5 times)", "icon": "⚡", "threshold": 5, "metric": "fast_reactions"},
    {"id": "week_streak", "name": "Weekly Warrior", "name_si": "සතිපතා සටන්කරු",
     "description": "Practice for 7 consecutive days", "icon": "📅", "threshold": 7, "metric": "consecutive_days"},
    {"id": "assessment_done", "name": "Clinically Tested", "name_si": "සායනිකව පරීක්ෂා කළා",
     "description": "Complete a clinical assessment", "icon": "📋", "threshold": 1, "metric": "assessments_completed"},
    {"id": "improvement_10", "name": "Growing Stronger", "name_si": "ශක්තිමත් වෙමින්",
     "description": "Improve accuracy by 10% from baseline", "icon": "📈", "threshold": 10, "metric": "improvement_pct"},
    {"id": "all_scenarios", "name": "Well Rounded", "name_si": "සම්පූර්ණ",
     "description": "Practice all 5 crisis scenarios", "icon": "🎯", "threshold": 5, "metric": "scenarios_practiced"},
]


@app.get("/achievements/{user_id}")
def get_achievements(user_id: int, db: Session = Depends(get_db)):
    """
    Calculate and return earned achievements/milestones.
    Gamification based on:
    - Deterding et al. (2011): Gamification design elements
    - Hamari et al. (2014): Gamification motivation effects
    - Sailer et al. (2017): Psychological effects of game elements
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Gather all metrics
    all_attempts = db.query(models.Attempt).filter(
        models.Attempt.user_id == user_id
    ).order_by(models.Attempt.timestamp).all()
    
    total_attempts = len(all_attempts)
    successful = sum(1 for a in all_attempts if a.success)
    accuracy = (successful / total_attempts * 100) if total_attempts > 0 else 0
    
    # Calculate max streak
    max_streak = 0
    current_streak = 0
    for a in all_attempts:
        if a.success:
            current_streak += 1
            max_streak = max(max_streak, current_streak)
        else:
            current_streak = 0
    
    # BKT mastery count
    bkt_states = db.query(models.BKTSkillState).filter(
        models.BKTSkillState.user_id == user_id,
        models.BKTSkillState.p_learned >= 0.95
    ).count()
    
    # Flow state achieved (check if any session had flow)
    flow_achieved = 1 if any(
        a.success and a.reaction_time > 0 and a.reaction_time < 3
        for a in all_attempts[-20:] if len(all_attempts) >= 20
    ) else 0
    
    # Fast reactions (< 1 second)
    fast_reactions = sum(1 for a in all_attempts if a.success and 0 < a.reaction_time < 1.0)
    
    # Consecutive days
    if all_attempts:
        practice_dates = sorted(set(a.timestamp.date() for a in all_attempts))
        consecutive_days = 1
        max_consecutive = 1
        for i in range(1, len(practice_dates)):
            if (practice_dates[i] - practice_dates[i-1]).days == 1:
                consecutive_days += 1
                max_consecutive = max(max_consecutive, consecutive_days)
            else:
                consecutive_days = 1
    else:
        max_consecutive = 0
    
    # Assessments completed
    assessments_completed = db.query(models.AssessmentSession).filter(
        models.AssessmentSession.user_id == user_id,
        models.AssessmentSession.completed_at.isnot(None)
    ).count()
    
    # Scenarios practiced
    scenarios_practiced = len(set(a.scenario_type for a in all_attempts))
    
    # Improvement from first 20 to last 20
    improvement_pct = 0
    if total_attempts >= 40:
        first_20_acc = sum(1 for a in all_attempts[:20] if a.success) / 20 * 100
        last_20_acc = sum(1 for a in all_attempts[-20:] if a.success) / 20 * 100
        improvement_pct = last_20_acc - first_20_acc
    
    # Build metrics map
    metrics = {
        "total_attempts": total_attempts,
        "max_streak": max_streak,
        "accuracy": accuracy,
        "skills_mastered": bkt_states,
        "flow_achieved": flow_achieved,
        "fast_reactions": fast_reactions,
        "consecutive_days": max_consecutive,
        "assessments_completed": assessments_completed,
        "improvement_pct": improvement_pct,
        "scenarios_practiced": scenarios_practiced,
    }
    
    # Evaluate achievements
    earned = []
    locked = []
    newly_earned = []
    
    for ach in ACHIEVEMENT_DEFINITIONS:
        metric_value = metrics.get(ach["metric"], 0)
        is_earned = metric_value >= ach["threshold"]
        progress = min(100, (metric_value / ach["threshold"]) * 100) if ach["threshold"] > 0 else 0
        
        entry = {
            "id": ach["id"],
            "name": ach["name"],
            "name_sinhala": ach["name_si"],
            "description": ach["description"],
            "icon": ach["icon"],
            "earned": is_earned,
            "progress": round(progress, 1),
            "current_value": round(metric_value, 1),
            "target_value": ach["threshold"]
        }
        
        if is_earned:
            earned.append(entry)
        else:
            locked.append(entry)
    
    # Determine closest achievement to unlock (motivation)
    next_achievement = None
    if locked:
        locked.sort(key=lambda x: x["progress"], reverse=True)
        next_achievement = locked[0]
    
    return {
        "user_id": user_id,
        "total_earned": len(earned),
        "total_available": len(ACHIEVEMENT_DEFINITIONS),
        "completion_percentage": round(len(earned) / len(ACHIEVEMENT_DEFINITIONS) * 100, 1),
        "earned_achievements": earned,
        "locked_achievements": locked,
        "next_achievement": next_achievement,
        "metrics_summary": {
            "total_attempts": total_attempts,
            "accuracy": round(accuracy, 1),
            "max_streak": max_streak,
            "skills_mastered": bkt_states,
            "consecutive_days": max_consecutive,
            "improvement": round(improvement_pct, 1)
        }
    }
