from sqlalchemy.orm import Session
from sqlalchemy import func, and_
import models, schemas
import random
from datetime import datetime, timedelta
import ml_algorithms

# --- USER MANAGEMENT ---
def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(username=user.username)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- DATA LOGGING ---
def create_attempt(db: Session, attempt: schemas.AttemptCreate):
    # Record the attempt
    db_attempt = models.Attempt(
        user_id=attempt.user_id,
        scenario_type=attempt.scenario_type,
        success=attempt.success,
        reaction_time=attempt.reaction_time,
        difficulty_level=attempt.difficulty_level,
        # Default logic for noise/speed based on level if not passed explicitly
        noise_level=min(0.8, 0.2 + (attempt.difficulty_level - 1) * 0.06),
        speed_modifier=1.0 + (attempt.difficulty_level - 1) * 0.1
    )
    db.add(db_attempt)
    
    # Update User Stats
    user = db.query(models.User).filter(models.User.id == attempt.user_id).first()
    if attempt.success:
        user.total_score += 100
        # Simple leveling logic: Level up every 5 successes (approx 500 points)
        if user.total_score % 500 == 0:
            user.current_level += 1
    
    db.commit()
    db.refresh(db_attempt)
    
    # --- ADVANCED ML UPDATES ---
    
    # 1. Calculate learning gain for Thompson Sampling
    learning_gain = ml_algorithms.calculate_learning_gain(
        db, attempt.user_id, attempt.scenario_type, 
        attempt.success, attempt.reaction_time
    )
    
    # 2. Update Thompson Sampling bandit
    ml_algorithms.update_thompson_sampling(
        db, attempt.user_id, attempt.scenario_type,
        attempt.success, learning_gain
    )
    
    # 3. Determine quality score for Spaced Repetition
    # Quality: 0-5 based on success + reaction time
    if attempt.success:
        if attempt.reaction_time > 0:
            # Fast response = higher quality
            if attempt.reaction_time < 1.5:
                quality = 5  # Perfect
            elif attempt.reaction_time < 2.5:
                quality = 4  # Easy
            elif attempt.reaction_time < 4.0:
                quality = 3  # Some hesitation
            else:
                quality = 2  # Correct with difficulty
        else:
            quality = 4  # Default for success
    else:
        quality = 0 if attempt.reaction_time > 5 else 1
    
    # 4. Update Spaced Repetition memory
    ml_algorithms.update_spaced_repetition(
        db, attempt.user_id, attempt.scenario_type,
        quality, attempt.reaction_time
    )
    
    # 5. Update learning profile metrics
    profile = db.query(models.UserLearningProfile).filter(
        models.UserLearningProfile.user_id == attempt.user_id
    ).first()
    
    if profile:
        # Update running averages
        recent_rts = db.query(models.Attempt.reaction_time).filter(
            and_(
                models.Attempt.user_id == attempt.user_id,
                models.Attempt.reaction_time > 0
            )
        ).order_by(models.Attempt.timestamp.desc()).limit(20).all()
        
        if recent_rts:
            rts = [r[0] for r in recent_rts]
            profile.avg_reaction_time = sum(rts) / len(rts)
            import numpy as np
            profile.reaction_time_variance = float(np.var(rts))
        
        db.commit()
    
    return db_attempt

# --- ADVANCED RECOMMENDATION ALGORITHM ---
def get_recommendation(db: Session, user_id: int):
    """
    Advanced ML-based recommendation using:
    1. Thompson Sampling (Multi-Armed Bandit) for scenario selection
    2. Spaced Repetition for memory optimization
    3. Cognitive Load Analysis for difficulty adjustment
    4. Flow State Detection for engagement
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None

    # 1. Check for due spaced repetition reviews (highest priority)
    due_scenarios = ml_algorithms.get_due_for_review(db, user_id)
    
    # 2. Use Thompson Sampling for optimal scenario selection
    ts_scenario, bandit_state, learning_potential = ml_algorithms.thompson_sampling_scenario_selection(
        db, user_id
    )
    
    # 3. Detect flow state and get cognitive load
    flow_analysis = ml_algorithms.detect_flow_state(db, user_id)
    
    # 4. Decision logic: Priority hierarchy
    selected_type = None
    reason = ""
    
    # Priority 1: Spaced repetition (if due and not in high cognitive load)
    if due_scenarios and flow_analysis["cognitive_load"] < 0.7:
        selected_type = due_scenarios[0]
        reason = "Memory retention review (Spaced Repetition)"
    
    # Priority 2: Thompson Sampling selection
    elif learning_potential > 0.3:  # Good learning opportunity
        selected_type = ts_scenario
        reason = f"Optimal learning opportunity detected (Thompson Sampling)"
    
    # Priority 3: Fallback to weakest area (original algorithm)
    else:
        recent_attempts = db.query(models.Attempt).filter(
            models.Attempt.user_id == user_id
        ).order_by(models.Attempt.timestamp.desc()).limit(20).all()
        
        stats = {}
        all_types = ["ambulance", "police", "firetruck", "train", "ice_cream"]
        
        for t in all_types:
            stats[t] = {"attempts": 0, "failures": 0}

        for att in recent_attempts:
            if att.scenario_type in stats:
                stats[att.scenario_type]["attempts"] += 1
                if not att.success:
                    stats[att.scenario_type]["failures"] += 1
        
        weakest_link = None
        highest_fail_rate = -1
        
        for t, data in stats.items():
            if data["attempts"] > 0:
                fail_rate = data["failures"] / data["attempts"]
                if fail_rate > highest_fail_rate:
                    highest_fail_rate = fail_rate
                    weakest_link = t
        
        if weakest_link and highest_fail_rate > 0.3:
            selected_type = weakest_link
            reason = f"Targeted practice for weakness ({int(highest_fail_rate*100)}% failure rate)"
        else:
            selected_type = random.choice(all_types)
            reason = "Balanced rotation"

    # 5. Adjust difficulty based on flow state
    speed_mod = 1.0
    
    if flow_analysis["recommendation"] == "decrease_difficulty":
        speed_mod = 0.8
        reason += " | Difficulty reduced (cognitive load management)"
    elif flow_analysis["recommendation"] == "increase_difficulty":
        speed_mod = 1.3
        reason += " | Difficulty increased (in flow state)"
    elif flow_analysis["in_flow"]:
        reason += " | Optimal challenge-skill balance"
    
    # Check for success streak bonus
    streak = 0
    for att in db.query(models.Attempt).filter(
        models.Attempt.user_id == user_id
    ).order_by(models.Attempt.timestamp.desc()).limit(5).all():
        if att.success:
            streak += 1
        else:
            break
    
    if streak >= 3:
        speed_mod *= 1.1
        reason += " | Streak bonus"

    # 6. Construct Response
    scenario_map = {
        "ambulance": {"action": "Move Right", "visual_cue": "Flashing Red/White Lights"},
        "police": {"action": "Stay Center", "visual_cue": "Flashing Blue/Red Lights"},
        "firetruck": {"action": "Move Left", "visual_cue": "Flashing Red Lights"},
        "train": {"action": "Stop", "visual_cue": "Railway Crossing"},
        "ice_cream": {"action": "Slow Down", "visual_cue": "Ice Cream Truck"},
    }
    
    details = scenario_map.get(selected_type, scenario_map["ambulance"])
    
    # Calculate noise level with cognitive load consideration
    base_noise = min(0.8, 0.2 + (user.current_level - 1) * 0.06)
    adjusted_noise = base_noise * (1 - flow_analysis["cognitive_load"] * 0.3)  # Reduce if overloaded
    
    return {
        "type": selected_type,
        "action": details["action"],
        "visual_cue": details["visual_cue"],
        "difficulty_level": user.current_level,
        "noise_level": round(adjusted_noise, 2),
        "speed_modifier": round(speed_mod, 2),
        "reason": reason,
        "cognitive_load": round(flow_analysis["cognitive_load"], 2),
        "in_flow_state": flow_analysis["in_flow"]
    }
