from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    age_group: Optional[str] = "7-8"  # Age group for normalized scoring
    hearing_level: Optional[str] = "moderate"  # mild, moderate, severe, profound

class User(UserBase):
    id: int
    current_level: int
    total_score: int
    age_group: Optional[str] = "7-8"
    hearing_level: Optional[str] = "moderate"
    
    class Config:
        from_attributes = True

class AttemptCreate(BaseModel):
    user_id: int
    scenario_type: str
    success: bool
    reaction_time: Optional[float] = 0.0
    difficulty_level: int
    noise_level: Optional[float] = 0.2       # Background noise level (0-1)
    speed_modifier: Optional[float] = 1.0    # Game speed modifier
    game_mode: Optional[str] = "audio-visual" # audio-visual, visual-only, assessment

class Attempt(AttemptCreate):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

class ScenarioRecommendation(BaseModel):
    type: str
    action: str
    visual_cue: str
    difficulty_level: int
    noise_level: float
    speed_modifier: float
    reason: str  # Explanation for the recommendation
    cognitive_load: Optional[float] = 0.0  # Real-time cognitive load (0-1)
    in_flow_state: Optional[bool] = False  # Whether user is in optimal learning zone

# === Assessment Schemas ===

class BaselineAssessmentRequest(BaseModel):
    """Request to start a baseline or post-test assessment"""
    assessment_type: str = "baseline"  # baseline or post_test
    num_trials: int = 20  # Standard: 4 trials x 5 scenarios

class AssessmentTrialResult(BaseModel):
    """Single trial result during assessment"""
    user_id: int
    scenario_type: str
    success: bool
    reaction_time: float
    noise_level: float = 0.2
    trial_number: int
    assessment_type: str = "baseline"

class ClinicalReportRequest(BaseModel):
    """Request for clinical report export"""
    user_id: int
    format: str = "json"  # json, csv
    include_raw_data: bool = False
    days: int = 30

class AudiogramProfile(BaseModel):
    """Hearing profile based on audiometric data"""
    user_id: int
    thresholds_250hz: Optional[float] = 30.0   # dB HL
    thresholds_500hz: Optional[float] = 35.0
    thresholds_1000hz: Optional[float] = 40.0
    thresholds_2000hz: Optional[float] = 45.0
    thresholds_4000hz: Optional[float] = 55.0
    thresholds_8000hz: Optional[float] = 60.0
    hearing_aid_type: Optional[str] = "none"  # none, bte, ite, cochlear_implant

class BKTSkillState(BaseModel):
    """Bayesian Knowledge Tracing skill state"""
    skill_name: str
    p_learned: float
    p_transit: float
    p_guess: float
    p_slip: float

class PsychometricReport(BaseModel):
    """Psychometric validation metrics"""
    cronbachs_alpha: Optional[float] = None
    test_retest_reliability: Optional[float] = None
    standard_error_measurement: Optional[float] = None
    minimal_detectable_change: Optional[float] = None
    sensitivity: Optional[float] = None
    specificity: Optional[float] = None

class TherapistDashboard(BaseModel):
    """Comprehensive therapist/parent dashboard data"""
    user_id: int
    username: str
    age_group: str
    hearing_level: str
    total_sessions: int
    total_training_minutes: float
    overall_progress: Dict
    skill_breakdown: Dict
    clinical_scores: Optional[Dict] = None
    bkt_skill_levels: Optional[Dict] = None
    psychometric_validity: Optional[Dict] = None
    recommendations: List[Dict]
    next_steps: List[str]
