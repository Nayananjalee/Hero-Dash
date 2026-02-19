from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Demographics for age-normalized scoring
    age_group = Column(String(20), default="7-8")  # 5-6, 7-8, 9-10, 11-12, 13-14
    hearing_level = Column(String(20), default="moderate")  # mild, moderate, severe, profound
    
    # Stats
    current_level = Column(Integer, default=1)
    total_score = Column(Integer, default=0)

    attempts = relationship("Attempt", back_populates="user")
    learning_profile = relationship("UserLearningProfile", back_populates="user", uselist=False)
    skill_memories = relationship("SkillMemoryState", back_populates="user")
    session_metrics = relationship("SessionMetrics", back_populates="user")
    clinical_assessments = relationship("ClinicalAssessment", back_populates="user")
    audiogram = relationship("AudiogramData", back_populates="user", uselist=False)
    bkt_states = relationship("BKTSkillState", back_populates="user")

class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    scenario_type = Column(String(50)) # tsunami_siren, earthquake_alarm, etc.
    success = Column(Boolean)
    reaction_time = Column(Float) # seconds
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Context of the attempt
    difficulty_level = Column(Integer)
    noise_level = Column(Float)
    speed_modifier = Column(Float)
    game_mode = Column(String(20), default="audio-visual")  # audio-visual, visual-only, assessment

    user = relationship("User", back_populates="attempts")

# --- ADVANCED ML & CLINICAL TRACKING MODELS ---

class UserLearningProfile(Base):
    """
    Machine Learning-based personalized learning profile
    Uses Thompson Sampling (Multi-Armed Bandit) for optimal scenario selection
    """
    __tablename__ = "learning_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    # Cognitive Load Metrics
    avg_reaction_time = Column(Float, default=0.0)
    reaction_time_variance = Column(Float, default=0.0)
    
    # Auditory Processing Metrics
    frequency_discrimination_score = Column(Float, default=0.0)
    temporal_processing_score = Column(Float, default=0.0)
    
    # Learning Curve Parameters (Bayesian estimation)
    learning_rate_alpha = Column(Float, default=0.1)
    retention_rate_beta = Column(Float, default=0.8)
    
    # Attention Span Metrics
    session_duration_optimal = Column(Float, default=600.0)  # seconds
    fatigue_threshold = Column(Float, default=0.7)
    
    # Multi-Armed Bandit State (Thompson Sampling parameters as JSON)
    # Stores alpha/beta for each scenario type
    bandit_params = Column(Text, default='{"tsunami_siren":{"alpha":1,"beta":1},"earthquake_alarm":{"alpha":1,"beta":1},"flood_warning":{"alpha":1,"beta":1},"air_raid_siren":{"alpha":1,"beta":1},"building_fire_alarm":{"alpha":1,"beta":1}}')
    
    user = relationship("User", back_populates="learning_profile")

class SkillMemoryState(Base):
    """
    Spaced Repetition System (SM-2 algorithm)
    Models memory retention using Ebbinghaus forgetting curve
    """
    __tablename__ = "skill_memory"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    scenario_type = Column(String(50))
    
    # Spaced Repetition System (SM-2 algorithm)
    repetition_number = Column(Integer, default=0)
    easiness_factor = Column(Float, default=2.5)  # 1.3 to 3.0
    interval_days = Column(Float, default=0.0)
    next_review_date = Column(DateTime, default=datetime.utcnow)
    
    # Memory strength (0-1) based on forgetting curve
    memory_strength = Column(Float, default=0.0)
    last_practiced = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="skill_memories")

class SessionMetrics(Base):
    """
    Flow state detection and engagement tracking
    Based on Csikszentmihalyi's flow theory
    """
    __tablename__ = "session_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_start = Column(DateTime, default=datetime.utcnow)
    session_end = Column(DateTime, nullable=True)
    
    # Flow state indicators
    challenge_skill_ratio = Column(Float, default=1.0)  # Optimal ~1.0
    engagement_score = Column(Float, default=0.5)       # 0-1
    frustration_index = Column(Float, default=0.0)      # 0-1
    
    # Performance trajectory
    initial_performance = Column(Float, default=0.0)
    final_performance = Column(Float, default=0.0)
    learning_velocity = Column(Float, default=0.0)      # Rate of improvement
    
    # Attention metrics
    response_consistency = Column(Float, default=0.0)   # Inverse of RT variance
    error_clustering = Column(Float, default=0.0)       # Pattern of errors
    
    user = relationship("User", back_populates="session_metrics")

class ClinicalAssessment(Base):
    """
    Standardized clinical scores aligned with:
    - SCAN-C (Screening Test for Auditory Processing Disorders)
    - CHAPPS (Children's Auditory Performance Scale)
    """
    __tablename__ = "clinical_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    assessment_date = Column(DateTime, default=datetime.utcnow)
    
    # Standardized test scores (0-100)
    figure_ground_discrimination_score = Column(Float, default=0.0)
    sound_localization_score = Column(Float, default=0.0)
    temporal_processing_score = Column(Float, default=0.0)
    auditory_attention_span = Column(Float, default=300.0)  # seconds
    composite_score = Column(Float, default=0.0)
    
    # Clinical benchmarks (age-normalized)
    age_group = Column(String(20), default="6-8")
    percentile_rank = Column(Float, default=50.0)
    
    # Pre/Post intervention tracking
    is_baseline = Column(Boolean, default=False)
    weeks_of_training = Column(Integer, default=0)
    
    # Recommendations from algorithm
    clinical_recommendations = Column(Text, default="[]")  # JSON array
    
    user = relationship("User", back_populates="clinical_assessments")


class AudiogramData(Base):
    """
    Individual audiometric profile for frequency-specific training.
    Based on pure-tone audiometry thresholds (dB HL) at standard frequencies.
    Enables personalized sound processing using NAL-NL2 prescription targets.
    """
    __tablename__ = "audiogram_data"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    # Pure-tone thresholds at standard audiometric frequencies (dB HL)
    threshold_250hz = Column(Float, default=30.0)
    threshold_500hz = Column(Float, default=35.0)
    threshold_1000hz = Column(Float, default=40.0)
    threshold_2000hz = Column(Float, default=45.0)
    threshold_4000hz = Column(Float, default=55.0)
    threshold_8000hz = Column(Float, default=60.0)
    
    # Hearing aid configuration
    hearing_aid_type = Column(String(30), default="none")  # none, bte, ite, cochlear_implant
    
    # Best ear PTA (Pure Tone Average: 500, 1000, 2000 Hz)
    pta_best_ear = Column(Float, default=40.0)
    
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="audiogram")


class BKTSkillState(Base):
    """
    Bayesian Knowledge Tracing (BKT) state for each auditory skill.
    Based on Corbett & Anderson (1994) Hidden Markov Model.
    
    Tracks probability of skill mastery using:
    - P(L0): Prior probability of knowing the skill
    - P(T): Probability of learning transition per attempt
    - P(G): Probability of guessing correctly without mastery
    - P(S): Probability of slipping (error despite mastery)
    """
    __tablename__ = "bkt_skill_states"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    skill_name = Column(String(50))  # frequency_discrimination, temporal_pattern, figure_ground, etc.
    
    # BKT parameters
    p_learned = Column(Float, default=0.1)    # Current P(learned)
    p_transit = Column(Float, default=0.15)   # P(transition to learned)
    p_guess = Column(Float, default=0.2)      # P(correct | not learned)
    p_slip = Column(Float, default=0.1)       # P(incorrect | learned)
    
    # Tracking
    total_attempts = Column(Integer, default=0)
    mastery_achieved = Column(Boolean, default=False)  # P(learned) > 0.95
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="bkt_states")


class AssessmentSession(Base):
    """
    Pre/Post assessment sessions for clinical validation.
    Follows standardized assessment protocol:
    - 20 trials (4 per scenario type)
    - Fixed difficulty (level 1, noise 0.2)
    - Used for measuring treatment effect
    """
    __tablename__ = "assessment_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    assessment_type = Column(String(20))  # baseline, post_test, follow_up
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Fixed assessment parameters
    noise_level = Column(Float, default=0.2)
    num_trials = Column(Integer, default=20)
    trials_completed = Column(Integer, default=0)
    
    # Results
    overall_accuracy = Column(Float, default=0.0)
    avg_reaction_time = Column(Float, default=0.0)
    
    # Per-scenario results (JSON)
    scenario_results = Column(Text, default="{}")
    
    # Comparison metrics (only for post_test)
    improvement_vs_baseline = Column(Float, nullable=True)
    effect_size_cohens_d = Column(Float, nullable=True)
    statistical_significance = Column(Boolean, nullable=True)
    p_value = Column(Float, nullable=True)


class IRTItemParameters(Base):
    """
    Item Response Theory (IRT) 2PL model parameters.
    Each scenario_type x noise_level combination is an 'item'.
    Based on Embretson & Reise (2000) and van der Linden (2024).
    
    P(correct | theta, a, b) = 1 / (1 + exp(-a * (theta - b)))
    """
    __tablename__ = "irt_item_parameters"
    
    id = Column(Integer, primary_key=True, index=True)
    
    scenario_type = Column(String(50))
    noise_level_bin = Column(String(20))  # low (0-0.3), medium (0.3-0.6), high (0.6-1.0)
    
    # 2PL parameters
    discrimination = Column(Float, default=1.0)  # 'a' parameter
    difficulty = Column(Float, default=0.0)       # 'b' parameter
    
    # Calibration data
    num_responses = Column(Integer, default=0)
    last_calibrated = Column(DateTime, default=datetime.utcnow)
