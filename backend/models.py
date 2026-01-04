from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Stats
    current_level = Column(Integer, default=1)
    total_score = Column(Integer, default=0)

    attempts = relationship("Attempt", back_populates="user")
    learning_profile = relationship("UserLearningProfile", back_populates="user", uselist=False)
    skill_memories = relationship("SkillMemoryState", back_populates="user")
    session_metrics = relationship("SessionMetrics", back_populates="user")
    clinical_assessments = relationship("ClinicalAssessment", back_populates="user")

class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    scenario_type = Column(String(50)) # ambulance, police, etc.
    success = Column(Boolean)
    reaction_time = Column(Float) # seconds
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Context of the attempt
    difficulty_level = Column(Integer)
    noise_level = Column(Float)
    speed_modifier = Column(Float)

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
    bandit_params = Column(Text, default='{"ambulance":{"alpha":1,"beta":1},"police":{"alpha":1,"beta":1},"firetruck":{"alpha":1,"beta":1},"train":{"alpha":1,"beta":1},"ice_cream":{"alpha":1,"beta":1}}')
    
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
