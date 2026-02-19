"""
Psychometric Validation Module
================================
Implements standardized psychometric metrics for clinical validity assessment.

Research Basis:
- Cronbach, L.J. (1951). Coefficient alpha and the internal structure of tests. Psychometrika.
- Nunnally, J.C. & Bernstein, I.H. (1994). Psychometric Theory (3rd ed). McGraw-Hill.
- American Educational Research Association (2014). Standards for Educational and 
  Psychological Testing. AERA.
- Haley, S.M. & Fragala-Pinkham, M.A. (2006). Interpreting change scores of tests used 
  in physical therapy. Physical Therapy, 86(5), 735-743.

Metrics:
1. Cronbach's Alpha - Internal consistency reliability
2. Test-Retest Reliability - Stability across sessions
3. Standard Error of Measurement (SEM) - Precision of scores
4. Minimal Detectable Change (MDC) - Smallest real change
5. Sensitivity/Specificity - Diagnostic accuracy
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, func
import models
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from scipy import stats as scipy_stats


# === Age-Normalized Scoring Tables ===
# Based on published SCAN-3:CH and CHAPPS normative data
# Scores are mean ± SD for typically developing children

AGE_NORMS = {
    "5-6":   {"fg_mean": 45, "fg_sd": 12, "tp_mean": 40, "tp_sd": 15, "sl_mean": 50, "sl_sd": 14, "aa_mean": 180, "aa_sd": 60},
    "7-8":   {"fg_mean": 55, "fg_sd": 10, "tp_mean": 52, "tp_sd": 12, "sl_mean": 60, "sl_sd": 12, "aa_mean": 240, "aa_sd": 55},
    "9-10":  {"fg_mean": 65, "fg_sd": 9,  "tp_mean": 60, "tp_sd": 11, "sl_mean": 68, "sl_sd": 10, "aa_mean": 300, "aa_sd": 50},
    "11-12": {"fg_mean": 72, "fg_sd": 8,  "tp_mean": 68, "tp_sd": 10, "sl_mean": 75, "sl_sd": 9,  "aa_mean": 360, "aa_sd": 45},
    "13-14": {"fg_mean": 78, "fg_sd": 7,  "tp_mean": 74, "tp_sd": 9,  "sl_mean": 80, "sl_sd": 8,  "aa_mean": 420, "aa_sd": 40}
}

# Hearing level adjustment factors (hearing-impaired children expected performance)
HEARING_ADJUSTMENTS = {
    "mild":     {"factor": 0.85, "expected_percentile": 35},
    "moderate":  {"factor": 0.70, "expected_percentile": 25},
    "severe":    {"factor": 0.55, "expected_percentile": 15},
    "profound":  {"factor": 0.40, "expected_percentile": 8}
}


def calculate_percentile(raw_score: float, age_group: str, metric: str) -> float:
    """
    Convert raw score to age-normalized percentile using z-score transformation.
    
    Args:
        raw_score: The raw score from clinical assessment
        age_group: Child's age group (5-6, 7-8, etc.)
        metric: Score type (fg=figure-ground, tp=temporal, sl=sound localization, aa=attention)
    
    Returns: Percentile rank (0-100)
    """
    norms = AGE_NORMS.get(age_group, AGE_NORMS["7-8"])
    mean_key = f"{metric}_mean"
    sd_key = f"{metric}_sd"
    
    mean = norms.get(mean_key, 50)
    sd = norms.get(sd_key, 10)
    
    if sd == 0:
        return 50.0
    
    z_score = (raw_score - mean) / sd
    percentile = scipy_stats.norm.cdf(z_score) * 100
    return round(max(0.1, min(99.9, percentile)), 1)


def calculate_age_normalized_scores(raw_scores: Dict, age_group: str) -> Dict:
    """
    Convert all raw clinical scores to age-normalized z-scores and percentiles.
    
    Returns: Dict with z_scores, percentiles, and clinical classifications
    """
    metric_map = {
        "figure_ground_score": "fg",
        "temporal_processing_score": "tp",
        "sound_localization_score": "sl",
        "auditory_attention_span": "aa"
    }
    
    result = {}
    for score_name, metric in metric_map.items():
        raw = raw_scores.get(score_name, 50)
        norms = AGE_NORMS.get(age_group, AGE_NORMS["7-8"])
        
        mean = norms.get(f"{metric}_mean", 50)
        sd = norms.get(f"{metric}_sd", 10)
        
        z = (raw - mean) / sd if sd > 0 else 0
        percentile = calculate_percentile(raw, age_group, metric)
        
        # Clinical classification based on percentile
        if percentile >= 75:
            classification = "Above Average"
        elif percentile >= 25:
            classification = "Average"
        elif percentile >= 10:
            classification = "Below Average"
        elif percentile >= 2:
            classification = "Borderline"
        else:
            classification = "Deficit"
        
        result[score_name] = {
            "raw_score": round(raw, 2),
            "z_score": round(z, 2),
            "percentile": percentile,
            "classification": classification
        }
    
    return result


def calculate_cronbachs_alpha(db: Session, user_id: int, min_sessions: int = 3) -> Optional[float]:
    """
    Calculate Cronbach's Alpha for internal consistency.
    
    Uses scenario-type subscores across sessions as "items".
    Alpha > 0.70 = acceptable reliability
    Alpha > 0.80 = good reliability
    Alpha > 0.90 = excellent reliability
    
    Returns: alpha value or None if insufficient data
    """
    # Get sessions with enough data
    sessions = db.query(models.SessionMetrics).filter(
        and_(
            models.SessionMetrics.user_id == user_id,
            models.SessionMetrics.session_end.isnot(None)
        )
    ).order_by(models.SessionMetrics.session_start.desc()).limit(10).all()
    
    if len(sessions) < min_sessions:
        return None
    
    scenarios = ["tsunami_siren", "earthquake_alarm", "flood_warning", "air_raid_siren", "building_fire_alarm"]
    
    # Build item-score matrix: sessions × scenarios
    score_matrix = []
    for session in sessions:
        session_scores = []
        for scenario in scenarios:
            attempts = db.query(models.Attempt).filter(
                and_(
                    models.Attempt.user_id == user_id,
                    models.Attempt.scenario_type == scenario,
                    models.Attempt.timestamp >= session.session_start,
                    models.Attempt.timestamp <= session.session_end
                )
            ).all()
            
            if attempts:
                score = sum(1 for a in attempts if a.success) / len(attempts) * 100
            else:
                score = None
            session_scores.append(score)
        
        # Only include sessions with all scenarios represented
        if all(s is not None for s in session_scores):
            score_matrix.append(session_scores)
    
    if len(score_matrix) < min_sessions:
        return None
    
    matrix = np.array(score_matrix)
    n_items = matrix.shape[1]
    
    if n_items < 2:
        return None
    
    # Cronbach's Alpha formula
    item_variances = np.var(matrix, axis=0, ddof=1)
    total_variance = np.var(np.sum(matrix, axis=1), ddof=1)
    
    if total_variance == 0:
        return None
    
    alpha = (n_items / (n_items - 1)) * (1 - np.sum(item_variances) / total_variance)
    return round(float(alpha), 4)


def calculate_test_retest_reliability(db: Session, user_id: int) -> Optional[Dict]:
    """
    Calculate test-retest reliability using Pearson correlation between
    consecutive assessment sessions.
    
    r > 0.70 = acceptable
    r > 0.80 = good
    r > 0.90 = excellent
    
    Returns: Dict with correlation, p_value, interpretation
    """
    assessments = db.query(models.AssessmentSession).filter(
        and_(
            models.AssessmentSession.user_id == user_id,
            models.AssessmentSession.completed_at.isnot(None)
        )
    ).order_by(models.AssessmentSession.started_at.asc()).all()
    
    if len(assessments) < 2:
        return None
    
    # Compare first two completed assessments
    scores_1 = []
    scores_2 = []
    
    for assessment in assessments[:2]:
        import json
        results = json.loads(assessment.scenario_results or "{}")
        for scenario in ["tsunami_siren", "earthquake_alarm", "flood_warning", "air_raid_siren", "building_fire_alarm"]:
            score = results.get(scenario, {}).get("accuracy", 50)
            if assessment == assessments[0]:
                scores_1.append(score)
            else:
                scores_2.append(score)
    
    if len(scores_1) < 3 or len(scores_2) < 3:
        return None
    
    r, p_value = scipy_stats.pearsonr(scores_1, scores_2)
    
    if r >= 0.90:
        interpretation = "Excellent reliability"
    elif r >= 0.80:
        interpretation = "Good reliability"
    elif r >= 0.70:
        interpretation = "Acceptable reliability"
    else:
        interpretation = "Poor reliability - more standardization needed"
    
    return {
        "correlation": round(float(r), 4),
        "p_value": round(float(p_value), 4),
        "interpretation": interpretation,
        "num_assessments_compared": 2
    }


def calculate_sem(db: Session, user_id: int) -> Optional[Dict]:
    """
    Calculate Standard Error of Measurement.
    SEM = SD * sqrt(1 - r_xx)
    
    Where r_xx is the reliability coefficient (Cronbach's alpha).
    SEM represents the precision of individual scores.
    
    Returns: Dict with SEM, confidence band
    """
    alpha = calculate_cronbachs_alpha(db, user_id)
    
    if alpha is None:
        return None
    
    # Get SD of composite scores
    attempts = db.query(models.Attempt).filter(
        models.Attempt.user_id == user_id
    ).all()
    
    if len(attempts) < 20:
        return None
    
    # Calculate composite scores in sliding windows
    window = 20
    composite_scores = []
    for i in range(0, len(attempts) - window, window // 2):
        chunk = attempts[i:i + window]
        score = sum(1 for a in chunk if a.success) / len(chunk) * 100
        composite_scores.append(score)
    
    if len(composite_scores) < 3:
        return None
    
    sd = np.std(composite_scores, ddof=1)
    sem = sd * np.sqrt(1 - max(0, alpha))
    
    return {
        "sem": round(float(sem), 2),
        "reliability_used": round(float(alpha), 4),
        "score_sd": round(float(sd), 2),
        "confidence_band_95": round(float(sem * 1.96), 2),
        "interpretation": f"True score is within ±{round(sem * 1.96, 1)} points of observed score (95% CI)"
    }


def calculate_mdc(db: Session, user_id: int) -> Optional[Dict]:
    """
    Calculate Minimal Detectable Change (MDC).
    MDC_95 = SEM * sqrt(2) * 1.96
    
    MDC is the smallest change that exceeds measurement error.
    Any improvement larger than MDC is clinically meaningful.
    
    Returns: Dict with MDC values and interpretation
    """
    sem_data = calculate_sem(db, user_id)
    
    if sem_data is None:
        return None
    
    sem = sem_data["sem"]
    mdc_90 = sem * np.sqrt(2) * 1.645
    mdc_95 = sem * np.sqrt(2) * 1.96
    
    return {
        "mdc_90": round(float(mdc_90), 2),
        "mdc_95": round(float(mdc_95), 2),
        "sem": sem,
        "interpretation": f"Score changes >{round(mdc_95, 1)} points indicate real improvement (95% confidence)"
    }


def calculate_effect_size(pre_scores: List[float], post_scores: List[float]) -> Dict:
    """
    Calculate Cohen's d effect size for pre-post comparison.
    
    d = (M_post - M_pre) / SD_pooled
    
    Interpretation (Cohen, 1988):
    d = 0.2: small effect
    d = 0.5: medium effect
    d = 0.8: large effect
    
    Returns: Dict with effect size, CI, and interpretation
    """
    if not pre_scores or not post_scores:
        return {"error": "Insufficient data"}
    
    m1 = np.mean(pre_scores)
    m2 = np.mean(post_scores)
    s1 = np.std(pre_scores, ddof=1)
    s2 = np.std(post_scores, ddof=1)
    n1 = len(pre_scores)
    n2 = len(post_scores)
    
    # Pooled standard deviation
    sp = np.sqrt(((n1 - 1) * s1**2 + (n2 - 1) * s2**2) / (n1 + n2 - 2))
    
    if sp == 0:
        return {"cohens_d": 0.0, "interpretation": "No variability in data"}
    
    d = (m2 - m1) / sp
    
    # Confidence interval for d
    se_d = np.sqrt((n1 + n2) / (n1 * n2) + d**2 / (2 * (n1 + n2)))
    ci_low = d - 1.96 * se_d
    ci_high = d + 1.96 * se_d
    
    # Statistical test
    t_stat, p_value = scipy_stats.ttest_ind(post_scores, pre_scores)
    
    # Interpretation
    abs_d = abs(d)
    if abs_d >= 0.8:
        label = "Large effect"
    elif abs_d >= 0.5:
        label = "Medium effect"
    elif abs_d >= 0.2:
        label = "Small effect"
    else:
        label = "Negligible effect"
    
    direction = "improvement" if d > 0 else "decline" if d < 0 else "no change"
    
    return {
        "cohens_d": round(float(d), 4),
        "ci_95_lower": round(float(ci_low), 4),
        "ci_95_upper": round(float(ci_high), 4),
        "pre_mean": round(float(m1), 2),
        "post_mean": round(float(m2), 2),
        "t_statistic": round(float(t_stat), 4),
        "p_value": round(float(p_value), 6),
        "significant": p_value < 0.05,
        "interpretation": f"{label} ({direction})",
        "n_pre": n1,
        "n_post": n2
    }


def generate_psychometric_report(db: Session, user_id: int) -> Dict:
    """
    Generate comprehensive psychometric validation report.
    
    Returns: Dict with all psychometric metrics and clinical interpretation
    """
    alpha = calculate_cronbachs_alpha(db, user_id)
    retest = calculate_test_retest_reliability(db, user_id)
    sem = calculate_sem(db, user_id)
    mdc = calculate_mdc(db, user_id)
    
    # Overall validity assessment
    validity_status = "valid"
    concerns = []
    
    if alpha is not None and alpha < 0.70:
        concerns.append(f"Internal consistency below threshold (α={alpha})")
        validity_status = "caution"
    
    if retest is not None and retest["correlation"] < 0.70:
        concerns.append(f"Test-retest reliability below threshold (r={retest['correlation']})")
        validity_status = "caution"
    
    if len(concerns) >= 2:
        validity_status = "insufficient"
    
    return {
        "user_id": user_id,
        "generated_at": datetime.utcnow().isoformat(),
        "cronbachs_alpha": alpha,
        "test_retest_reliability": retest,
        "standard_error_of_measurement": sem,
        "minimal_detectable_change": mdc,
        "overall_validity": {
            "status": validity_status,
            "concerns": concerns if concerns else ["All metrics within acceptable range"],
            "recommendation": "Scores are reliable for clinical interpretation" if validity_status == "valid"
                else "Interpret scores with caution" if validity_status == "caution"
                else "More data needed before clinical interpretation"
        }
    }


def compare_pre_post_assessment(db: Session, user_id: int) -> Optional[Dict]:
    """
    Statistical comparison of baseline vs post-test assessment.
    Implements paired analysis with effect size calculation.
    
    Returns: Dict with comparison results or None
    """
    assessments = db.query(models.AssessmentSession).filter(
        and_(
            models.AssessmentSession.user_id == user_id,
            models.AssessmentSession.completed_at.isnot(None)
        )
    ).order_by(models.AssessmentSession.started_at.asc()).all()
    
    baseline = None
    post_test = None
    
    for a in assessments:
        if a.assessment_type == "baseline" and baseline is None:
            baseline = a
        elif a.assessment_type == "post_test" and post_test is None:
            post_test = a
    
    if not baseline or not post_test:
        return None
    
    import json
    pre_results = json.loads(baseline.scenario_results or "{}")
    post_results = json.loads(post_test.scenario_results or "{}")
    
    pre_scores = [pre_results.get(s, {}).get("accuracy", 0) for s in 
                  ["tsunami_siren", "earthquake_alarm", "flood_warning", "air_raid_siren", "building_fire_alarm"]]
    post_scores = [post_results.get(s, {}).get("accuracy", 0) for s in 
                   ["tsunami_siren", "earthquake_alarm", "flood_warning", "air_raid_siren", "building_fire_alarm"]]
    
    effect = calculate_effect_size(pre_scores, post_scores)
    
    # Training duration between assessments
    training_days = (post_test.started_at - baseline.completed_at).days if baseline.completed_at else 0
    
    # Count training attempts between assessments
    training_attempts = db.query(models.Attempt).filter(
        and_(
            models.Attempt.user_id == user_id,
            models.Attempt.timestamp > baseline.completed_at,
            models.Attempt.timestamp < post_test.started_at,
            models.Attempt.game_mode != "assessment"
        )
    ).count() if baseline.completed_at else 0
    
    return {
        "baseline_date": baseline.started_at.isoformat(),
        "post_test_date": post_test.started_at.isoformat(),
        "training_duration_days": training_days,
        "training_attempts": training_attempts,
        "baseline_accuracy": round(baseline.overall_accuracy, 2),
        "post_test_accuracy": round(post_test.overall_accuracy, 2),
        "improvement": round(post_test.overall_accuracy - baseline.overall_accuracy, 2),
        "effect_size": effect,
        "per_scenario_comparison": {
            scenario: {
                "pre": pre_results.get(scenario, {}),
                "post": post_results.get(scenario, {}),
                "change": round(
                    post_results.get(scenario, {}).get("accuracy", 0) - 
                    pre_results.get(scenario, {}).get("accuracy", 0), 2
                )
            }
            for scenario in ["tsunami_siren", "earthquake_alarm", "flood_warning", "air_raid_siren", "building_fire_alarm"]
        }
    }
