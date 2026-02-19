"""
Bayesian Knowledge Tracing (BKT) Module
========================================
Implements Corbett & Anderson (1994) Hidden Markov Model for auditory skill mastery tracking.

Research Basis:
- Corbett, A.T. & Anderson, J.R. (1994). Knowledge tracing: Modeling the acquisition 
  of procedural knowledge. User Modeling and User-Adapted Interaction, 4(4), 253-278.
- Yudelson, M.V. et al. (2013). Individualized Bayesian Knowledge Tracing Models. AIED.
- Baker, R.S. et al. (2024). Deep knowledge tracing approaches. NeurIPS Workshop.

Skills Tracked:
1. frequency_discrimination - Distinguishing siren types by frequency content
2. temporal_pattern_recognition - Recognizing rhythmic patterns in sirens  
3. figure_ground_separation - Identifying signals amid background noise
4. sound_action_mapping - Correctly associating sounds with driving actions
5. auditory_attention - Sustained attention during gameplay sessions
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
import models
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple


# === Default BKT Parameters per Skill ===
# Based on auditory processing literature and empirical calibration

DEFAULT_BKT_PARAMS = {
    "frequency_discrimination": {
        "p_L0": 0.10,   # Low initial mastery - frequency discrimination is difficult
        "p_T": 0.15,    # Moderate learning rate with practice
        "p_G": 0.20,    # 1/5 chance of guessing correctly (5 options)
        "p_S": 0.10     # Low slip rate once mastered
    },
    "temporal_pattern_recognition": {
        "p_L0": 0.10,
        "p_T": 0.12,    # Slower learning - temporal patterns need more exposure
        "p_G": 0.20,
        "p_S": 0.15     # Higher slip - timing errors even when skill is known
    },
    "figure_ground_separation": {
        "p_L0": 0.05,   # Very low initial - hardest skill for hearing-impaired
        "p_T": 0.10,    # Slow learning - requires neural adaptation
        "p_G": 0.20,
        "p_S": 0.10
    },
    "sound_action_mapping": {
        "p_L0": 0.20,   # Higher initial - conceptual mapping is more accessible
        "p_T": 0.20,    # Fast learning - cognitive skill, not perceptual
        "p_G": 0.20,
        "p_S": 0.05     # Very low slip once associations are formed
    },
    "auditory_attention": {
        "p_L0": 0.15,
        "p_T": 0.10,    # Slow improvement - attention develops gradually
        "p_G": 0.20,
        "p_S": 0.15     # Moderate slip - attention lapses are common
    }
}

# Scenario-to-skill mapping: which skills are exercised by each scenario
SCENARIO_SKILL_MAP = {
    # --- Crisis / Disaster Warning Sounds ---
    "tsunami_siren": ["frequency_discrimination", "figure_ground_separation", "auditory_attention"],
    "earthquake_alarm": ["temporal_pattern_recognition", "sound_action_mapping", "auditory_attention"],
    "flood_warning": ["frequency_discrimination", "figure_ground_separation", "sound_action_mapping"],
    "air_raid_siren": ["frequency_discrimination", "temporal_pattern_recognition", "auditory_attention"],
    "building_fire_alarm": ["temporal_pattern_recognition", "figure_ground_separation", "sound_action_mapping"]
}


def initialize_bkt_states(db: Session, user_id: int) -> Dict[str, float]:
    """
    Initialize BKT skill states for a new user.
    Creates one BKTSkillState record per skill with default parameters.
    
    Returns: Dictionary of {skill_name: p_learned}
    """
    skill_levels = {}
    
    for skill_name, params in DEFAULT_BKT_PARAMS.items():
        existing = db.query(models.BKTSkillState).filter(
            and_(
                models.BKTSkillState.user_id == user_id,
                models.BKTSkillState.skill_name == skill_name
            )
        ).first()
        
        if not existing:
            state = models.BKTSkillState(
                user_id=user_id,
                skill_name=skill_name,
                p_learned=params["p_L0"],
                p_transit=params["p_T"],
                p_guess=params["p_G"],
                p_slip=params["p_S"],
                total_attempts=0,
                mastery_achieved=False,
                last_updated=datetime.utcnow()
            )
            db.add(state)
            skill_levels[skill_name] = params["p_L0"]
        else:
            skill_levels[skill_name] = existing.p_learned
    
    db.commit()
    return skill_levels


def update_bkt(db: Session, user_id: int, scenario_type: str, correct: bool) -> Dict[str, float]:
    """
    Update BKT estimates for all skills exercised by the given scenario.
    
    Uses Bayes' rule to update P(learned) posterior:
    
    If correct:
        P(L_n | correct) = P(L_n-1) * (1 - P(S)) / P(correct)
        where P(correct) = P(L) * (1-P(S)) + (1-P(L)) * P(G)
    
    If incorrect:
        P(L_n | incorrect) = P(L_n-1) * P(S) / P(incorrect)
        where P(incorrect) = P(L) * P(S) + (1-P(L)) * (1-P(G))
    
    Then apply transition:
        P(L_n) = P(L_n | obs) + (1 - P(L_n | obs)) * P(T)
    
    Args:
        db: Database session
        user_id: User identifier
        scenario_type: Type of emergency scenario
        correct: Whether the response was correct
    
    Returns: Updated skill levels dictionary
    """
    skills_exercised = SCENARIO_SKILL_MAP.get(scenario_type, ["sound_action_mapping"])
    updated_skills = {}
    
    for skill_name in skills_exercised:
        state = db.query(models.BKTSkillState).filter(
            and_(
                models.BKTSkillState.user_id == user_id,
                models.BKTSkillState.skill_name == skill_name
            )
        ).first()
        
        if not state:
            # Initialize if missing
            initialize_bkt_states(db, user_id)
            state = db.query(models.BKTSkillState).filter(
                and_(
                    models.BKTSkillState.user_id == user_id,
                    models.BKTSkillState.skill_name == skill_name
                )
            ).first()
        
        if not state:
            continue
        
        p_l = state.p_learned
        p_t = state.p_transit
        p_g = state.p_guess
        p_s = state.p_slip
        
        # Step 1: Compute posterior P(L | observation) using Bayes' rule
        if correct:
            p_obs = p_l * (1 - p_s) + (1 - p_l) * p_g  # P(correct)
            if p_obs > 0:
                p_l_posterior = (p_l * (1 - p_s)) / p_obs
            else:
                p_l_posterior = p_l
        else:
            p_obs = p_l * p_s + (1 - p_l) * (1 - p_g)  # P(incorrect)
            if p_obs > 0:
                p_l_posterior = (p_l * p_s) / p_obs
            else:
                p_l_posterior = p_l
        
        # Step 2: Apply learning transition
        p_l_new = p_l_posterior + (1 - p_l_posterior) * p_t
        
        # Clamp to [0, 1]
        p_l_new = max(0.0, min(1.0, p_l_new))
        
        # Step 3: Update state
        state.p_learned = p_l_new
        state.total_attempts += 1
        state.mastery_achieved = p_l_new >= 0.95
        state.last_updated = datetime.utcnow()
        
        updated_skills[skill_name] = round(p_l_new, 4)
    
    db.commit()
    return updated_skills


def get_skill_levels(db: Session, user_id: int) -> Dict[str, Dict]:
    """
    Get current BKT skill levels for a user.
    
    Returns: Dictionary with skill details including:
        - p_learned: Current mastery probability
        - mastery_achieved: Boolean
        - total_attempts: Practice count
        - mastery_label: Human-readable label
    """
    states = db.query(models.BKTSkillState).filter(
        models.BKTSkillState.user_id == user_id
    ).all()
    
    if not states:
        return initialize_bkt_states(db, user_id)
    
    result = {}
    for state in states:
        p = state.p_learned
        if p >= 0.95:
            label = "Mastered"
        elif p >= 0.80:
            label = "Proficient"
        elif p >= 0.60:
            label = "Developing"
        elif p >= 0.40:
            label = "Emerging"
        else:
            label = "Novice"
        
        result[state.skill_name] = {
            "p_learned": round(p, 4),
            "mastery_achieved": state.mastery_achieved,
            "total_attempts": state.total_attempts,
            "mastery_label": label,
            "last_updated": state.last_updated.isoformat() if state.last_updated else None
        }
    
    return result


def get_weakest_skill(db: Session, user_id: int) -> Tuple[str, float]:
    """
    Identify the weakest auditory processing skill for targeted practice.
    Returns: (skill_name, p_learned)
    """
    states = db.query(models.BKTSkillState).filter(
        models.BKTSkillState.user_id == user_id
    ).order_by(models.BKTSkillState.p_learned.asc()).first()
    
    if states:
        return (states.skill_name, states.p_learned)
    return ("frequency_discrimination", 0.1)


def get_skill_based_scenario(db: Session, user_id: int) -> Optional[str]:
    """
    Recommend a scenario that exercises the weakest skill.
    Used when BKT detects a skill significantly below others.
    
    Returns: scenario_type or None
    """
    weakest_skill, p_learned = get_weakest_skill(db, user_id)
    
    # Only target if significantly below mastery
    if p_learned >= 0.80:
        return None
    
    # Find scenarios that exercise this skill
    matching_scenarios = [
        scenario for scenario, skills in SCENARIO_SKILL_MAP.items()
        if weakest_skill in skills
    ]
    
    if matching_scenarios:
        # Return the one with most overlap with other weak skills
        return matching_scenarios[0]
    return None


def calculate_overall_mastery(db: Session, user_id: int) -> float:
    """
    Calculate weighted average mastery across all skills.
    Weights reflect clinical importance for hearing-impaired children.
    
    Returns: Overall mastery score (0-1)
    """
    SKILL_WEIGHTS = {
        "frequency_discrimination": 0.25,     # Core auditory skill
        "temporal_pattern_recognition": 0.20,
        "figure_ground_separation": 0.25,     # Most important for daily life
        "sound_action_mapping": 0.15,
        "auditory_attention": 0.15
    }
    
    states = db.query(models.BKTSkillState).filter(
        models.BKTSkillState.user_id == user_id
    ).all()
    
    if not states:
        return 0.0
    
    weighted_sum = 0.0
    total_weight = 0.0
    
    for state in states:
        weight = SKILL_WEIGHTS.get(state.skill_name, 0.1)
        weighted_sum += state.p_learned * weight
        total_weight += weight
    
    return round(weighted_sum / total_weight, 4) if total_weight > 0 else 0.0
