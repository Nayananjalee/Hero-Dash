"""
Advanced Machine Learning Algorithms for Hearing Therapy
Implements novel data science approaches for personalized auditory training
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, func
import models
import numpy as np
import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional


# ============================================================================
# 1. THOMPSON SAMPLING (Multi-Armed Bandit Algorithm)
# ============================================================================

def thompson_sampling_scenario_selection(db: Session, user_id: int) -> Tuple[str, Dict, float]:
    """
    Use Thompson Sampling to balance exploration vs exploitation
    for optimal learning trajectory.
    
    This is a Bayesian approach where each scenario is modeled as a Beta distribution.
    We sample from each and select the one with highest sample.
    
    Returns:
        - selected_scenario: str
        - bandit_state: dict
        - learning_potential: float (expected learning gain)
    """
    profile = db.query(models.UserLearningProfile).filter(
        models.UserLearningProfile.user_id == user_id
    ).first()
    
    if not profile:
        # Initialize profile with uniform priors
        profile = models.UserLearningProfile(
            user_id=user_id,
            bandit_params=json.dumps({
                "ambulance": {"alpha": 1, "beta": 1},
                "police": {"alpha": 1, "beta": 1},
                "firetruck": {"alpha": 1, "beta": 1},
                "train": {"alpha": 1, "beta": 1},
                "ice_cream": {"alpha": 1, "beta": 1}
            })
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    bandit_state = json.loads(profile.bandit_params)
    
    # Sample from Beta distributions (Thompson Sampling)
    samples = {}
    for scenario, params in bandit_state.items():
        # Beta(alpha, beta) represents uncertainty about success probability
        samples[scenario] = np.random.beta(params["alpha"], params["beta"])
    
    # Select scenario with highest sample
    selected = max(samples, key=samples.get)
    learning_potential = samples[selected]
    
    return selected, bandit_state, learning_potential


def update_thompson_sampling(db: Session, user_id: int, scenario_type: str, 
                             success: bool, learning_gain: float):
    """
    Update bandit parameters based on learning gain (not just success).
    Learning gain considers: difficulty, improvement over baseline, retention
    
    Args:
        learning_gain: 0-1, where higher means more learning occurred
    """
    profile = db.query(models.UserLearningProfile).filter(
        models.UserLearningProfile.user_id == user_id
    ).first()
    
    if not profile:
        return
    
    bandit_state = json.loads(profile.bandit_params)
    
    # Update Beta distribution parameters
    # High learning gain = reward (increase alpha)
    # Low learning gain = no reward (increase beta)
    if learning_gain > 0.4:  # Significant learning threshold
        bandit_state[scenario_type]["alpha"] += learning_gain
    else:
        bandit_state[scenario_type]["beta"] += (1 - learning_gain)
    
    profile.bandit_params = json.dumps(bandit_state)
    db.commit()


def calculate_learning_gain(db: Session, user_id: int, scenario_type: str, 
                            current_success: bool, reaction_time: float) -> float:
    """
    Calculate learning gain for this attempt.
    Considers:
    - Success vs historical baseline
    - Improvement in reaction time
    - Challenge level
    
    Returns: 0-1 score representing learning value
    """
    # Get historical performance for this scenario
    past_attempts = db.query(models.Attempt).filter(
        and_(
            models.Attempt.user_id == user_id,
            models.Attempt.scenario_type == scenario_type
        )
    ).order_by(models.Attempt.timestamp.desc()).limit(10).all()
    
    if len(past_attempts) < 3:
        # Early learning phase - any success is high gain
        return 0.8 if current_success else 0.4
    
    # Calculate baseline performance
    baseline_success_rate = sum(1 for a in past_attempts if a.success) / len(past_attempts)
    baseline_rt = np.mean([a.reaction_time for a in past_attempts if a.reaction_time > 0])
    
    # Learning gain components
    success_gain = 0.5 if current_success else 0.0
    
    # Improvement over baseline
    if current_success and baseline_success_rate < 0.7:
        improvement_gain = 0.3  # Learning in challenging area
    else:
        improvement_gain = 0.1
    
    # Speed improvement
    if reaction_time > 0 and baseline_rt > 0:
        speed_gain = max(0, (baseline_rt - reaction_time) / baseline_rt * 0.2)
    else:
        speed_gain = 0.0
    
    total_gain = min(1.0, success_gain + improvement_gain + speed_gain)
    return total_gain


# ============================================================================
# 2. SPACED REPETITION SYSTEM (SM-2 Algorithm)
# ============================================================================

def calculate_memory_decay(db: Session, user_id: int, scenario_type: str) -> float:
    """
    Calculate current memory strength using Ebbinghaus forgetting curve:
    R(t) = e^(-t/S)
    where t = time since last practice, S = memory strength
    
    Returns: Current memory strength (0-1)
    """
    skill = db.query(models.SkillMemoryState).filter(
        and_(
            models.SkillMemoryState.user_id == user_id,
            models.SkillMemoryState.scenario_type == scenario_type
        )
    ).first()
    
    if not skill:
        return 0.0  # No memory established yet
    
    time_elapsed = (datetime.utcnow() - skill.last_practiced).total_seconds() / 86400  # days
    decay_rate = 1 / (skill.easiness_factor * max(skill.interval_days, 0.1))
    
    current_strength = skill.memory_strength * np.exp(-decay_rate * time_elapsed)
    return max(0.0, min(1.0, current_strength))


def update_spaced_repetition(db: Session, user_id: int, scenario_type: str, 
                             quality: int, reaction_time: float):
    """
    Update memory state using SM-2 algorithm.
    
    Args:
        quality: 0-5 performance quality
            0 = complete fail
            1 = incorrect but remembered
            2 = correct with difficulty
            3 = correct with some hesitation
            4 = correct easily
            5 = perfect recall
    """
    skill = db.query(models.SkillMemoryState).filter(
        and_(
            models.SkillMemoryState.user_id == user_id,
            models.SkillMemoryState.scenario_type == scenario_type
        )
    ).first()
    
    if not skill:
        skill = models.SkillMemoryState(
            user_id=user_id,
            scenario_type=scenario_type,
            repetition_number=0,
            easiness_factor=2.5,
            interval_days=0.0,
            memory_strength=0.0,
            last_practiced=datetime.utcnow(),
            next_review_date=datetime.utcnow()
        )
        db.add(skill)
        db.flush()  # Ensure defaults are set
    
    # SM-2 algorithm
    if quality >= 3:  # Successful recall
        if skill.repetition_number == 0:
            skill.interval_days = 1
        elif skill.repetition_number == 1:
            skill.interval_days = 6
        else:
            skill.interval_days = skill.interval_days * skill.easiness_factor
        
        skill.repetition_number += 1
    else:  # Failed recall - restart
        skill.repetition_number = 0
        skill.interval_days = 1
    
    # Update easiness factor (how easy this skill is to remember)
    skill.easiness_factor = max(
        1.3, 
        skill.easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )
    
    # Update memory strength based on quality
    skill.memory_strength = min(1.0, skill.memory_strength + quality / 10.0)
    skill.last_practiced = datetime.utcnow()
    skill.next_review_date = datetime.utcnow() + timedelta(days=skill.interval_days)
    
    db.commit()


def get_due_for_review(db: Session, user_id: int) -> List[str]:
    """
    Get list of scenarios that are due for spaced repetition review.
    Prioritize skills with weakening memory.
    """
    skills = db.query(models.SkillMemoryState).filter(
        and_(
            models.SkillMemoryState.user_id == user_id,
            models.SkillMemoryState.next_review_date <= datetime.utcnow()
        )
    ).all()
    
    # Calculate urgency score (lower memory strength = higher urgency)
    urgent_skills = []
    for skill in skills:
        current_strength = calculate_memory_decay(db, user_id, skill.scenario_type)
        urgency = 1 - current_strength
        urgent_skills.append((skill.scenario_type, urgency))
    
    # Sort by urgency
    urgent_skills.sort(key=lambda x: x[1], reverse=True)
    return [s[0] for s in urgent_skills]


# ============================================================================
# 3. COGNITIVE LOAD ANALYSIS
# ============================================================================

def calculate_cognitive_load(db: Session, user_id: int, window_minutes: int = 10) -> float:
    """
    Calculate real-time cognitive load based on:
    - Reaction time trends (increasing RT = fatigue)
    - Error patterns (clustering = overload)
    - Response variance (inconsistency = attention issues)
    
    Returns: Cognitive load score 0-1 (0=low, 1=high)
    """
    recent = db.query(models.Attempt).filter(
        and_(
            models.Attempt.user_id == user_id,
            models.Attempt.timestamp > datetime.utcnow() - timedelta(minutes=window_minutes)
        )
    ).order_by(models.Attempt.timestamp).all()
    
    if len(recent) < 3:
        return 0.5  # Neutral load (insufficient data)
    
    # Extract metrics
    reaction_times = [a.reaction_time for a in recent if a.reaction_time > 0]
    success_rate = sum(1 for a in recent if a.success) / len(recent)
    
    if not reaction_times:
        return 0.5
    
    # 1. Reaction time variance (high variance = distraction/fatigue)
    rt_variance = np.var(reaction_times) if len(reaction_times) > 1 else 0
    rt_normalized_var = min(1.0, rt_variance / 2.0)
    
    # 2. Reaction time trend (increasing = fatigue)
    if len(reaction_times) > 2:
        rt_trend = np.polyfit(range(len(reaction_times)), reaction_times, 1)[0]
        rt_trend_score = max(0, rt_trend * 10)  # Positive slope = increasing RT
    else:
        rt_trend_score = 0
    
    # 3. Error rate
    error_score = 1 - success_rate
    
    # 4. Error clustering (consecutive errors indicate overload)
    consecutive_errors = 0
    max_consecutive = 0
    for attempt in recent:
        if not attempt.success:
            consecutive_errors += 1
            max_consecutive = max(max_consecutive, consecutive_errors)
        else:
            consecutive_errors = 0
    error_clustering = min(1.0, max_consecutive / 3)
    
    # Weighted combination
    cognitive_load = (
        0.25 * rt_normalized_var +      # Consistency
        0.25 * min(1.0, rt_trend_score) +  # Fatigue
        0.30 * error_score +             # Difficulty
        0.20 * error_clustering          # Frustration
    )
    
    return min(1.0, max(0.0, cognitive_load))


def detect_flow_state(db: Session, user_id: int, current_session_id: Optional[int] = None) -> Dict:
    """
    Detect if user is in 'flow state' (optimal learning zone)
    Based on Csikszentmihalyi's flow theory:
    - Challenge matches skill level
    - High engagement (consistent performance)
    - Moderate success rate (60-85%)
    
    Returns: Flow state analysis with recommendations
    """
    # Get current session attempts
    if current_session_id:
        session = db.query(models.SessionMetrics).filter(
            models.SessionMetrics.id == current_session_id
        ).first()
        
        if session:
            attempts = db.query(models.Attempt).filter(
                and_(
                    models.Attempt.user_id == user_id,
                    models.Attempt.timestamp >= session.session_start,
                    models.Attempt.timestamp <= (session.session_end or datetime.utcnow())
                )
            ).all()
        else:
            attempts = []
    else:
        # Use recent attempts
        attempts = db.query(models.Attempt).filter(
            models.Attempt.user_id == user_id
        ).order_by(models.Attempt.timestamp.desc()).limit(20).all()
    
    if len(attempts) < 5:
        return {
            "in_flow": False,
            "reason": "insufficient_data",
            "recommendation": "continue",
            "cognitive_load": 0.5,  # Neutral load for insufficient data
            "success_rate": 0.0,
            "consistency_score": 0.5
        }
    
    # Calculate flow indicators
    success_rate = sum(1 for a in attempts if a.success) / len(attempts)
    reaction_times = [a.reaction_time for a in attempts if a.reaction_time > 0]
    
    if not reaction_times:
        rt_variance = 999
        rt_cv = 999
        rt_mean = 0
    else:
        rt_variance = np.var(reaction_times) if len(reaction_times) > 1 else 0
        rt_mean = np.mean(reaction_times) if len(reaction_times) > 0 else 0
        rt_cv = (np.sqrt(rt_variance) / rt_mean) if rt_mean > 0 else 999  # Coefficient of variation
    
    # Flow criteria:
    # 1. Moderate success rate (60-85% = optimal challenge)
    # 2. Low CV in RT (< 0.3 = high consistency/engagement)
    # 3. No recent error streaks
    
    optimal_success = 0.6 <= success_rate <= 0.85
    high_consistency = rt_cv < 0.3 if rt_cv != 999 else False
    
    in_flow = optimal_success and high_consistency
    
    # Generate recommendations
    if success_rate < 0.4:
        recommendation = "decrease_difficulty"
        reason = f"Low success rate ({success_rate:.1%}) indicates frustration"
    elif success_rate > 0.9:
        recommendation = "increase_difficulty"
        reason = f"High success rate ({success_rate:.1%}) indicates under-challenge"
    elif not high_consistency:
        recommendation = "check_attention"
        reason = "High variability suggests attention issues or fatigue"
    else:
        recommendation = "maintain"
        reason = "Optimal challenge-skill balance detected"
    
    return {
        "in_flow": in_flow,
        "success_rate": success_rate,
        "consistency_score": 1 / (1 + rt_cv) if rt_cv != 999 else 0.5,
        "recommendation": recommendation,
        "reason": reason,
        "cognitive_load": calculate_cognitive_load(db, user_id)
    }


# ============================================================================
# 4. CLINICAL ASSESSMENT METRICS
# ============================================================================

def calculate_clinical_scores(db: Session, user_id: int) -> Optional[Dict]:
    """
    Calculate standardized clinical scores aligned with:
    - SCAN-C (Screening Test for Auditory Processing Disorders in Children)
    - CHAPPS (Children's Auditory Performance Scale)
    
    Returns: Dictionary of clinical scores or None if insufficient data
    """
    all_attempts = db.query(models.Attempt).filter(
        models.Attempt.user_id == user_id
    ).order_by(models.Attempt.timestamp.desc()).limit(100).all()
    
    if len(all_attempts) < 20:
        return None  # Need minimum data
    
    # 1. Figure-Ground Discrimination Score
    # Ability to identify signals in noise
    high_noise_attempts = [a for a in all_attempts if a.noise_level > 0.5]
    if high_noise_attempts:
        fg_score = (sum(1 for a in high_noise_attempts if a.success) / len(high_noise_attempts)) * 100
    else:
        fg_score = 50.0  # Default
    
    # 2. Temporal Processing Score
    # Based on reaction time consistency
    reaction_times = [a.reaction_time for a in all_attempts if a.reaction_time > 0]
    if len(reaction_times) > 1:
        rt_mean = np.mean(reaction_times)
        rt_std = np.std(reaction_times)
        # Lower variance = better temporal processing
        temporal_score = max(0, 100 - (rt_std / rt_mean * 100)) if rt_mean > 0 else 50
    else:
        temporal_score = 50.0
    
    # 3. Sound Localization/Discrimination Score
    # Overall accuracy across all scenarios
    overall_success = sum(1 for a in all_attempts if a.success) / len(all_attempts) * 100
    
    # 4. Auditory Attention Span
    attention_span = calculate_attention_span(db, user_id)
    
    # 5. Composite Score
    composite = (fg_score + temporal_score + overall_success) / 3
    
    return {
        "figure_ground_score": round(fg_score, 2),
        "temporal_processing_score": round(temporal_score, 2),
        "sound_localization_score": round(overall_success, 2),
        "auditory_attention_span": round(attention_span, 2),
        "composite_score": round(composite, 2)
    }


def calculate_attention_span(db: Session, user_id: int) -> float:
    """
    Find the duration after which performance starts declining.
    This indicates attention fatigue threshold.
    
    Returns: Attention span in seconds
    """
    sessions = db.query(models.SessionMetrics).filter(
        models.SessionMetrics.user_id == user_id
    ).all()
    
    attention_spans = []
    
    for session in sessions:
        if not session.session_end:
            continue
            
        attempts = db.query(models.Attempt).filter(
            and_(
                models.Attempt.user_id == user_id,
                models.Attempt.timestamp >= session.session_start,
                models.Attempt.timestamp <= session.session_end
            )
        ).order_by(models.Attempt.timestamp).all()
        
        if len(attempts) < 10:
            continue
        
        # Find inflection point where success rate drops
        window_size = 5
        for i in range(len(attempts) - window_size):
            window = attempts[i:i+window_size]
            success_rate = sum(1 for a in window if a.success) / window_size
            
            if success_rate < 0.5:  # Performance degradation threshold
                time_to_fatigue = (window[0].timestamp - session.session_start).total_seconds()
                attention_spans.append(time_to_fatigue)
                break
    
    if attention_spans:
        return float(np.median(attention_spans))
    else:
        return 300.0  # Default 5 minutes


def generate_clinical_recommendations(db: Session, user_id: int) -> List[Dict]:
    """
    Generate evidence-based recommendations for therapists/parents.
    """
    recommendations = []
    
    # Get performance by scenario
    all_attempts = db.query(models.Attempt).filter(
        models.Attempt.user_id == user_id
    ).all()
    
    if len(all_attempts) < 10:
        return [{
            "area": "data_collection",
            "severity": "info",
            "suggestion": "Continue practicing to gather baseline data",
            "clinical_note": "Minimum 20 attempts needed for meaningful assessment"
        }]
    
    # Analyze by scenario type
    from collections import defaultdict
    scenario_stats = defaultdict(lambda: {"total": 0, "success": 0})
    
    for attempt in all_attempts:
        scenario_stats[attempt.scenario_type]["total"] += 1
        if attempt.success:
            scenario_stats[attempt.scenario_type]["success"] += 1
    
    # Check for specific deficits
    for scenario, stats in scenario_stats.items():
        if stats["total"] > 5:
            success_rate = stats["success"] / stats["total"]
            
            if success_rate < 0.5:
                recommendations.append({
                    "area": f"{scenario.title()} Recognition",
                    "severity": "high_priority",
                    "suggestion": f"Increase exposure to {scenario} sounds in controlled environment",
                    "clinical_note": "Consider frequency-specific hearing assessment"
                })
            elif success_rate < 0.7:
                recommendations.append({
                    "area": f"{scenario.title()} Recognition",
                    "severity": "moderate",
                    "suggestion": f"Additional practice recommended for {scenario} scenarios",
                    "clinical_note": "Monitor progress over next 2 weeks"
                })
    
    # Check for attention issues
    reaction_times = [a.reaction_time for a in all_attempts if a.reaction_time > 0]
    if reaction_times and len(reaction_times) > 5:
        rt_cv = np.std(reaction_times) / np.mean(reaction_times)
        
        if rt_cv > 0.5:
            recommendations.append({
                "area": "Attention Consistency",
                "severity": "moderate",
                "suggestion": "Implement shorter, more frequent training sessions (10-15 min)",
                "clinical_note": "High RT variability may indicate attention difficulties"
            })
    
    # Check cognitive load
    cognitive_load = calculate_cognitive_load(db, user_id, window_minutes=60)
    if cognitive_load > 0.7:
        recommendations.append({
            "area": "Cognitive Load Management",
            "severity": "high_priority",
            "suggestion": "Reduce session duration and difficulty temporarily",
            "clinical_note": "Signs of sustained cognitive overload detected"
        })
    
    return recommendations
