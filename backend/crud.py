"""
CRUD Operations Module
======================
Database operations for user management, attempt recording, and ML-powered recommendations.
Integrates Thompson Sampling, Spaced Repetition, and Cognitive Load analysis.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_
import models, schemas
import random
from datetime import datetime, timedelta
import ml_algorithms
import bayesian_knowledge_tracing as bkt
import irt_model as irt

# ============================================================================
# USER MANAGEMENT
# ============================================================================

def get_user_by_username(db: Session, username: str):
    """Retrieve user by username for authentication"""
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    """Create new user with default starting values and initialize ML profiles"""
    db_user = models.User(
        username=user.username,
        age_group=user.age_group if hasattr(user, 'age_group') and user.age_group else "7-8",
        hearing_level=user.hearing_level if hasattr(user, 'hearing_level') and user.hearing_level else "moderate"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Initialize BKT skill states for new user
    bkt.initialize_bkt_states(db, db_user.id)
    
    return db_user

# ============================================================================
# ATTEMPT RECORDING & ML INTEGRATION
# ============================================================================

def create_attempt(db: Session, attempt: schemas.AttemptCreate):
    """
    Record a game attempt and trigger all ML model updates.
    
    Process flow:
    1. Store attempt in database
    2. Update user score and level
    3. Calculate learning gain for Thompson Sampling
    4. Update Spaced Repetition memory schedules
    5. Update user learning profile metrics
    """
    # Store attempt record
    db_attempt = models.Attempt(
        user_id=attempt.user_id,
        scenario_type=attempt.scenario_type,
        success=attempt.success,
        reaction_time=attempt.reaction_time,
        difficulty_level=attempt.difficulty_level,
        noise_level=attempt.noise_level if hasattr(attempt, 'noise_level') and attempt.noise_level else min(0.8, 0.2 + (attempt.difficulty_level - 1) * 0.06),
        speed_modifier=attempt.speed_modifier if hasattr(attempt, 'speed_modifier') and attempt.speed_modifier else 1.0 + (attempt.difficulty_level - 1) * 0.1,
        game_mode=attempt.game_mode if hasattr(attempt, 'game_mode') and attempt.game_mode else "audio-visual"
    )
    db.add(db_attempt)
    
    # Update user statistics
    user = db.query(models.User).filter(models.User.id == attempt.user_id).first()
    if attempt.success:
        user.total_score += 100
        # Level up every 500 points (approximately 5 successful attempts)
        if user.total_score % 500 == 0:
            user.current_level += 1
    
    db.commit()
    db.refresh(db_attempt)
    
    # --- ML MODEL UPDATES ---
    
    # 1. Calculate learning gain metric for Thompson Sampling
    learning_gain = ml_algorithms.calculate_learning_gain(
        db, attempt.user_id, attempt.scenario_type, 
        attempt.success, attempt.reaction_time
    )
    
    # 2. Update Thompson Sampling (Multi-Armed Bandit) parameters
    ml_algorithms.update_thompson_sampling(
        db, attempt.user_id, attempt.scenario_type,
        attempt.success, learning_gain
    )
    
    # 3. Calculate quality score for Spaced Repetition (0-5 scale)
    # Quality based on success and reaction speed
    if attempt.success:
        if attempt.reaction_time > 0:
            if attempt.reaction_time < 1.5:
                quality = 5  # Perfect recall
            elif attempt.reaction_time < 2.5:
                quality = 4  # Easy
            elif attempt.reaction_time < 4.0:
                quality = 3  # Some hesitation
            else:
                quality = 2  # Correct but struggled
        else:
            quality = 4  # Default for successful attempts
    else:
        quality = 0 if attempt.reaction_time > 5 else 1  # Complete or partial failure
    
    # 4. Update Spaced Repetition memory model (SM-2 algorithm)
    ml_algorithms.update_spaced_repetition(
        db, attempt.user_id, attempt.scenario_type,
        quality, attempt.reaction_time
    )
    
    # 5. Update Bayesian Knowledge Tracing for all relevant skills
    bkt.update_bkt(db, attempt.user_id, attempt.scenario_type, attempt.success)
    
    # 6. Update learning profile with running averages
    profile = db.query(models.UserLearningProfile).filter(
        models.UserLearningProfile.user_id == attempt.user_id
    ).first()
    
    if profile:
        # Calculate average reaction time from recent attempts
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

# ============================================================================
# ML-POWERED RECOMMENDATION SYSTEM
# ============================================================================

def get_recommendation(db: Session, user_id: int):
    """
    Generate personalized scenario recommendation using multiple ML algorithms.
    
    Algorithm Hierarchy:
    1. Spaced Repetition (Priority 1): Reviews due for memory retention
    2. BKT Skill Targeting (Priority 2): Focus on weakest auditory skill
    3. IRT Optimal Challenge (Priority 3): Item matched to ability level
    4. Thompson Sampling (Priority 4): Exploration-exploitation balance
    5. Weakness Targeting (Priority 5): Focus on failure-prone scenarios
    6. Balanced Rotation (Fallback): Even distribution
    
    VARIETY ENFORCEMENT:
    - Never repeat the same scenario type more than twice in a row
    - Ensure all 5 types are seen within every 8 consecutive trials
    - Slight randomization within priority tiers to avoid predictability
    
    Adjustments:
    - Cognitive Load: Reduces difficulty when user is overloaded
    - Flow State: Increases difficulty when user is in optimal learning zone
    - Success Streaks: Bonus difficulty for consecutive successes
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None

    ALL_TYPES = ["tsunami_siren", "earthquake_alarm", "flood_warning", "air_raid_siren", "building_fire_alarm"]

    # === VARIETY CHECK: Get last N scenario types to prevent repetition ===
    recent_types = [
        a.scenario_type for a in db.query(models.Attempt.scenario_type).filter(
            models.Attempt.user_id == user_id
        ).order_by(models.Attempt.timestamp.desc()).limit(8).all()
    ]
    
    # The last 2 scenarios played
    last_two = recent_types[:2] if len(recent_types) >= 2 else recent_types[:1] if recent_types else []
    
    # Types NOT seen in last 8 attempts — these are "starved" and need attention
    recent_set = set(recent_types[:8]) if recent_types else set()
    starved_types = [t for t in ALL_TYPES if t not in recent_set]

    def pick_varied(candidates):
        """From a list of candidate types, prefer ones not recently played."""
        if not candidates:
            return None
        # Filter out types that appeared in last 2 consecutive (avoid 3+ repeats)
        if len(last_two) >= 2 and last_two[0] == last_two[1]:
            varied = [c for c in candidates if c != last_two[0]]
            if varied:
                return random.choice(varied)
        # Filter out the immediate last type when possible
        if last_two:
            varied = [c for c in candidates if c != last_two[0]]
            if varied:
                return random.choice(varied)
        return random.choice(candidates)

    # 1. Check Spaced Repetition for due reviews
    due_scenarios = ml_algorithms.get_due_for_review(db, user_id)
    
    # 2. Run Thompson Sampling for optimal scenario selection
    ts_scenario, bandit_state, learning_potential = ml_algorithms.thompson_sampling_scenario_selection(
        db, user_id
    )
    
    # 3. Analyze cognitive load and flow state
    flow_analysis = ml_algorithms.detect_flow_state(db, user_id)
    
    # 4. Check BKT for skill-based targeting
    bkt_scenario = bkt.get_skill_based_scenario(db, user_id)
    
    # 5. Get IRT-based optimal item selection
    irt_ability = irt.estimate_ability_from_db(db, user_id)
    irt_item = irt.select_optimal_item(irt_ability.get("theta", 0.0))
    
    # === FORCE STARVED TYPES periodically (every ~5 attempts, rotate in unseen types) ===
    if starved_types and len(recent_types) >= 5 and random.random() < 0.5:
        selected_type = random.choice(starved_types)
        reason = f"Introducing variety — {selected_type} not practiced recently"
    
    # === Priority 1: Spaced repetition review (if not cognitively overloaded) ===
    elif due_scenarios and flow_analysis["cognitive_load"] < 0.7:
        selected_type = pick_varied(due_scenarios)
        reason = "Memory retention review (Spaced Repetition SM-2)"
    
    # === Priority 2: BKT skill targeting ===
    elif bkt_scenario and flow_analysis["cognitive_load"] < 0.6:
        selected_type = pick_varied([bkt_scenario])
        if selected_type != bkt_scenario:
            reason = f"Skill training (BKT) — varied from {bkt_scenario}"
        else:
            weakest_skill, p = bkt.get_weakest_skill(db, user_id)
            reason = f"Targeting weakest skill: {weakest_skill} (BKT P(L)={p:.2f})"
    
    # === Priority 3: IRT-based optimal challenge ===
    elif irt_item and irt_ability.get("num_responses", 0) >= 10:
        selected_type = pick_varied([irt_item["scenario_type"]])
        reason = f"Optimal challenge (IRT θ={irt_ability['theta']:.2f}, P(correct)={irt_item['expected_p_correct']:.1%})"
    
    # === Priority 4: Thompson Sampling ===
    elif learning_potential > 0.3:
        selected_type = pick_varied([ts_scenario])
        reason = f"Exploration-exploitation balance (Thompson Sampling)"
    
    # === Priority 5: Target weakest area ===
    else:
        recent_attempts = db.query(models.Attempt).filter(
            models.Attempt.user_id == user_id
        ).order_by(models.Attempt.timestamp.desc()).limit(20).all()
        
        stats = {t: {"attempts": 0, "failures": 0} for t in ALL_TYPES}
        for att in recent_attempts:
            if att.scenario_type in stats:
                stats[att.scenario_type]["attempts"] += 1
                if not att.success:
                    stats[att.scenario_type]["failures"] += 1
        
        # Find weakest scenarios (>30% failure rate)
        weak_scenarios = []
        for t, data in stats.items():
            if data["attempts"] > 0 and data["failures"] / data["attempts"] > 0.3:
                weak_scenarios.append(t)
        
        if weak_scenarios:
            selected_type = pick_varied(weak_scenarios)
            reason = "Targeted practice for weak areas"
        else:
            # Balanced rotation — prefer least-recently-played types
            if starved_types:
                selected_type = random.choice(starved_types)
            else:
                selected_type = pick_varied(ALL_TYPES)
            reason = "Balanced rotation"

    # === Adjust difficulty based on flow state and cognitive load ===
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

    # === Build complete recommendation response ===
    scenario_map = {
        "tsunami_siren": {"action": "Move Right", "visual_cue": "Tsunami Warning Lights"},
        "earthquake_alarm": {"action": "Stop", "visual_cue": "Seismic Warning Lights"},
        "flood_warning": {"action": "Find Safe Place", "visual_cue": "Flood Warning Lights"},
        "air_raid_siren": {"action": "Stay Center", "visual_cue": "Civil Defense Lights"},
        "building_fire_alarm": {"action": "Move Left", "visual_cue": "Building Fire Alarm Lights"},
    }
    
    details = scenario_map.get(selected_type, scenario_map["tsunami_siren"])
    
    # Calculate adaptive noise level
    base_noise = min(0.8, 0.2 + (user.current_level - 1) * 0.06)
    adjusted_noise = base_noise * (1 - flow_analysis["cognitive_load"] * 0.3)
    
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

