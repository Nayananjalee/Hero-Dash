from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    current_level: int
    total_score: int
    
    class Config:
        orm_mode = True

class AttemptCreate(BaseModel):
    user_id: int
    scenario_type: str
    success: bool
    reaction_time: Optional[float] = 0.0
    difficulty_level: int

class Attempt(AttemptCreate):
    id: int
    timestamp: datetime
    
    class Config:
        orm_mode = True

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
