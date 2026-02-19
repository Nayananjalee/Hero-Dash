"""
Item Response Theory (IRT) Module
==================================
Implements 2-Parameter Logistic (2PL) IRT model for precise ability estimation
and adaptive difficulty calibration.

Research Basis:
- Rasch, G. (1960). Probabilistic Models for Intelligence and Attainment Tests.
- Embretson, S.E. & Reise, S.P. (2000). Item Response Theory for Psychologists.
- van der Linden, W.J. (2024). Handbook of Item Response Theory (3rd ed).
- Lord, F.M. (1980). Applications of Item Response Theory to Practical Testing Problems.

Model:
    P(correct | theta, a, b) = 1 / (1 + exp(-a * (theta - b)))
    
    theta: Child's latent auditory processing ability
    a: Item discrimination parameter (how well item separates abilities)
    b: Item difficulty parameter
    
Each scenario_type × noise_level combination is an "item".
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
import models
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple


# === Default IRT Item Parameters ===
# Calibrated from auditory processing research norms

DEFAULT_ITEM_PARAMS = {
    # (scenario_type, noise_bin): (discrimination, difficulty)
    # --- Crisis / Disaster Warning Sounds Only ---
    ("tsunami_siren", "low"):        (0.9, -0.5),   # Rising wail - tsunami evacuation siren
    ("tsunami_siren", "medium"):     (0.9,  0.5),
    ("tsunami_siren", "high"):       (0.9,  1.5),
    ("earthquake_alarm", "low"):     (1.1, -0.8),   # Distinctive seismic alert tone
    ("earthquake_alarm", "medium"):  (1.1,  0.3),
    ("earthquake_alarm", "high"):    (1.1,  1.3),
    ("flood_warning", "low"):        (0.9, -0.6),   # Rising-tone flood siren
    ("flood_warning", "medium"):     (0.9,  0.4),
    ("flood_warning", "high"):       (0.9,  1.4),
    ("air_raid_siren", "low"):       (1.0, -0.4),   # Wailing civil defense siren
    ("air_raid_siren", "medium"):    (1.0,  0.6),
    ("air_raid_siren", "high"):      (1.0,  1.6),
    ("building_fire_alarm", "low"):  (1.3, -0.7),   # Pulsing indoor alarm - high discrimination
    ("building_fire_alarm", "medium"): (1.3, 0.1),
    ("building_fire_alarm", "high"): (1.3,  1.1),
}


def noise_to_bin(noise_level: float) -> str:
    """Convert continuous noise level to categorical bin."""
    if noise_level <= 0.3:
        return "low"
    elif noise_level <= 0.6:
        return "medium"
    else:
        return "high"


def irt_probability(theta: float, a: float, b: float) -> float:
    """
    2PL IRT probability of correct response.
    
    P(correct) = 1 / (1 + exp(-a * (theta - b)))
    
    Args:
        theta: Ability parameter (typically -3 to +3)
        a: Discrimination parameter (typically 0.5 to 2.5)
        b: Difficulty parameter (typically -3 to +3)
    """
    exponent = -a * (theta - b)
    # Clamp to prevent overflow
    exponent = max(-20, min(20, exponent))
    return 1.0 / (1.0 + np.exp(exponent))


def fisher_information(theta: float, a: float, b: float) -> float:
    """
    Fisher Information at given theta for 2PL model.
    I(theta) = a^2 * P(theta) * (1 - P(theta))
    
    Higher information = item is most informative for this ability level.
    """
    p = irt_probability(theta, a, b)
    return a**2 * p * (1 - p)


def estimate_ability(responses: List[Dict], max_iter: int = 50) -> Tuple[float, float]:
    """
    Estimate latent ability (theta) using Maximum Likelihood Estimation (MLE)
    with Newton-Raphson optimization.
    
    Args:
        responses: List of dicts with keys: scenario_type, noise_level, correct
        max_iter: Maximum Newton-Raphson iterations
    
    Returns:
        (theta_estimate, standard_error)
    """
    if not responses:
        return (0.0, 999.0)
    
    # Initial theta estimate
    correct_rate = sum(1 for r in responses if r["correct"]) / len(responses)
    theta = np.log(max(0.01, correct_rate) / max(0.01, 1 - correct_rate))  # Logit transform
    theta = max(-3.0, min(3.0, theta))
    
    for iteration in range(max_iter):
        numerator = 0.0
        denominator = 0.0
        
        for resp in responses:
            noise_bin = noise_to_bin(resp.get("noise_level", 0.2))
            key = (resp["scenario_type"], noise_bin)
            a, b = DEFAULT_ITEM_PARAMS.get(key, (1.0, 0.0))
            
            p = irt_probability(theta, a, b)
            u = 1.0 if resp["correct"] else 0.0
            
            # First derivative of log-likelihood
            numerator += a * (u - p)
            # Second derivative (negative for Newton-Raphson)
            denominator -= a**2 * p * (1 - p)
        
        if abs(denominator) < 1e-10:
            break
        
        # Newton-Raphson update
        delta = numerator / denominator
        theta -= delta
        theta = max(-4.0, min(4.0, theta))
        
        if abs(delta) < 0.001:
            break
    
    # Standard error = 1 / sqrt(total Fisher information)
    total_info = sum(
        fisher_information(
            theta,
            *DEFAULT_ITEM_PARAMS.get(
                (r["scenario_type"], noise_to_bin(r.get("noise_level", 0.2))),
                (1.0, 0.0)
            )
        ) for r in responses
    )
    
    se = 1.0 / np.sqrt(max(0.01, total_info))
    
    return (round(theta, 4), round(se, 4))


def select_optimal_item(theta: float, available_scenarios: List[str] = None,
                        exclude_recent: List[str] = None) -> Dict:
    """
    Select the item (scenario + noise) with maximum Fisher Information
    at the current ability estimate. This implements Computerized Adaptive Testing (CAT).
    
    Args:
        theta: Current ability estimate
        available_scenarios: Restrict to these scenarios (optional)
        exclude_recent: Don't repeat these recently used scenarios
    
    Returns:
        Dict with scenario_type, noise_level, expected_information
    """
    if available_scenarios is None:
        available_scenarios = ["tsunami_siren", "earthquake_alarm", "flood_warning", "air_raid_siren", "building_fire_alarm"]
    if exclude_recent is None:
        exclude_recent = []
    
    best_item = None
    best_info = -1
    
    for (scenario, noise_bin), (a, b) in DEFAULT_ITEM_PARAMS.items():
        if scenario not in available_scenarios:
            continue
        if scenario in exclude_recent:
            continue
        
        info = fisher_information(theta, a, b)
        
        if info > best_info:
            best_info = info
            noise_map = {"low": 0.15, "medium": 0.45, "high": 0.75}
            best_item = {
                "scenario_type": scenario,
                "noise_level": noise_map.get(noise_bin, 0.2),
                "noise_bin": noise_bin,
                "expected_information": round(info, 4),
                "expected_p_correct": round(irt_probability(theta, a, b), 4)
            }
    
    return best_item or {"scenario_type": "tsunami_siren", "noise_level": 0.2, 
                          "noise_bin": "low", "expected_information": 0}


def estimate_ability_from_db(db: Session, user_id: int) -> Dict:
    """
    Estimate ability from all stored attempts in database.
    
    Returns:
        Dict with theta, se, ability_label, percentile_estimate
    """
    attempts = db.query(models.Attempt).filter(
        models.Attempt.user_id == user_id
    ).order_by(models.Attempt.timestamp.desc()).limit(100).all()
    
    if not attempts:
        return {
            "theta": 0.0,
            "se": 999.0,
            "ability_label": "Insufficient Data",
            "percentile_estimate": 50.0,
            "num_responses": 0,
            "confidence_interval": None
        }
    
    responses = [{
        "scenario_type": a.scenario_type,
        "noise_level": a.noise_level or 0.2,
        "correct": a.success
    } for a in attempts]
    
    theta, se = estimate_ability(responses)
    
    # Convert theta to ability label
    if theta >= 1.5:
        label = "Advanced"
    elif theta >= 0.5:
        label = "Above Average"
    elif theta >= -0.5:
        label = "Average"
    elif theta >= -1.5:
        label = "Below Average"
    else:
        label = "Needs Support"
    
    # Rough percentile from standard normal
    from scipy import stats as scipy_stats
    percentile = round(scipy_stats.norm.cdf(theta) * 100, 1)
    
    return {
        "theta": theta,
        "se": se,
        "ability_label": label,
        "percentile_estimate": percentile,
        "num_responses": len(responses),
        "confidence_interval": [round(theta - 1.96 * se, 4), round(theta + 1.96 * se, 4)]
    }


def get_ability_growth_trajectory(db: Session, user_id: int, window_size: int = 20) -> List[Dict]:
    """
    Calculate ability trajectory over time using sliding window IRT estimation.
    Shows how theta changes as child accumulates practice.
    
    Returns: List of {attempt_number, theta, se, timestamp}
    """
    attempts = db.query(models.Attempt).filter(
        models.Attempt.user_id == user_id
    ).order_by(models.Attempt.timestamp.asc()).all()
    
    if len(attempts) < window_size:
        return []
    
    trajectory = []
    for i in range(window_size, len(attempts) + 1):
        window = attempts[max(0, i - window_size):i]
        responses = [{
            "scenario_type": a.scenario_type,
            "noise_level": a.noise_level or 0.2,
            "correct": a.success
        } for a in window]
        
        theta, se = estimate_ability(responses)
        trajectory.append({
            "attempt_number": i,
            "theta": theta,
            "se": se,
            "timestamp": window[-1].timestamp.isoformat()
        })
    
    return trajectory
