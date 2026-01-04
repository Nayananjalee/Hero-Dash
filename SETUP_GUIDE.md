# 🚀 Setup and Installation Guide

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Initialize Database

The database will be automatically created when you first run the server. All the new advanced ML models will be initialized.

### 3. Run the Server

```bash
cd backend
uvicorn main:app --reload
```

The API will be available at: `http://localhost:8000`

### 4. Test the API

Visit: `http://localhost:8000/docs` to see the interactive API documentation (Swagger UI)

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

---

## 🧪 Testing the Advanced Features

### Test Endpoints in Order:

#### 1. Create a User
```bash
POST http://localhost:8000/users/
{
  "username": "test_child_1"
}
```

#### 2. Get Personalized Recommendation (Thompson Sampling)
```bash
GET http://localhost:8000/recommend/{user_id}
```

**Expected Response**:
```json
{
  "type": "ambulance",
  "action": "Move Right",
  "visual_cue": "Flashing Red/White Lights",
  "difficulty_level": 1,
  "noise_level": 0.2,
  "speed_modifier": 1.0,
  "reason": "Optimal learning opportunity detected (Thompson Sampling)",
  "cognitive_load": 0.5,
  "in_flow_state": false
}
```

#### 3. Record Attempts
```bash
POST http://localhost:8000/attempts/
{
  "user_id": 1,
  "scenario_type": "ambulance",
  "success": true,
  "reaction_time": 2.3,
  "difficulty_level": 1
}
```

#### 4. Get Clinical Scores (after 20+ attempts)
```bash
GET http://localhost:8000/analytics/clinical-scores/{user_id}
```

#### 5. Get Progress Report
```bash
GET http://localhost:8000/analytics/progress-report/{user_id}?days=7
```

#### 6. Get Learning Curve Data
```bash
GET http://localhost:8000/analytics/learning-curve/{user_id}
```

#### 7. Check Cognitive Load
```bash
GET http://localhost:8000/analytics/cognitive-load/{user_id}
```

#### 8. Start/End Sessions
```bash
POST http://localhost:8000/analytics/start-session/{user_id}
POST http://localhost:8000/analytics/end-session/{session_id}
```

---

## 🎯 What's New - Advanced Features

### 1. **Thompson Sampling Algorithm**
- File: `backend/ml_algorithms.py` (lines 1-120)
- Automatically selects optimal scenarios for each learner
- Balances exploration vs exploitation

### 2. **Spaced Repetition System**
- File: `backend/ml_algorithms.py` (lines 122-220)
- Schedules reviews at optimal intervals
- Uses SM-2 algorithm for memory retention

### 3. **Cognitive Load Analysis**
- File: `backend/ml_algorithms.py` (lines 222-310)
- Real-time monitoring of mental fatigue
- Prevents burnout and frustration

### 4. **Flow State Detection**
- File: `backend/ml_algorithms.py` (lines 312-380)
- Detects optimal learning zones
- Maintains challenge-skill balance

### 5. **Clinical Assessment Metrics**
- File: `backend/ml_algorithms.py` (lines 382-520)
- Standardized scores aligned with SCAN-C/CHAPPS
- Evidence-based progress tracking

### 6. **Advanced Analytics Dashboard**
- File: `backend/main.py` (lines 65-400)
- Comprehensive progress reports
- Learning curve visualization
- Clinical recommendations

---

## 📊 Database Schema Updates

New tables added:

1. **learning_profiles** - Thompson Sampling state & user metrics
2. **skill_memory** - Spaced repetition tracking per scenario
3. **session_metrics** - Flow state & engagement tracking
4. **clinical_assessments** - Standardized clinical scores

All automatically created on first run!

---

## 🎓 For Your Research Presentation

### Key Points to Highlight:

1. **Novel Algorithms**:
   - Thompson Sampling for personalized learning paths
   - Spaced Repetition for memory optimization
   - Real-time cognitive load monitoring

2. **Data Science Integration**:
   - Bayesian optimization (Beta distributions)
   - Statistical modeling (forgetting curves)
   - Multi-factor decision making

3. **Clinical Relevance**:
   - Evidence-based metrics (SCAN-C aligned)
   - Standardized assessment scores
   - Professional-grade progress tracking

4. **Impact**:
   - Accessible home-based therapy
   - Personalized to each child
   - Research-quality data generation

### Demo Flow:

1. **Show API Documentation** (`/docs`)
2. **Create test user** and make several attempts
3. **Display recommendation** with explanation
4. **Show clinical scores** after 20+ attempts
5. **Present progress report** with graphs
6. **Explain algorithms** using research documentation

---

## 🔍 Troubleshooting

### If database errors occur:
```bash
# Delete the old database
rm backend/hearing_therapy.db

# Restart server (will recreate with new schema)
cd backend
uvicorn main:app --reload
```

### If import errors occur:
```bash
# Make sure numpy and scipy are installed
pip install numpy scipy
```

---

## 📚 Documentation Files

1. **RESEARCH_DOCUMENTATION.md** - Complete research methodology
2. **README.md** - This setup guide
3. **backend/ml_algorithms.py** - Algorithm implementations with detailed comments
4. **backend/main.py** - API endpoints with analytics

---

## ✨ Next Steps

1. ✅ Test all endpoints to ensure they work
2. ✅ Generate sample data (20-30 attempts) to test analytics
3. ✅ Review research documentation for presentation
4. ✅ Consider adding visualizations in frontend
5. ✅ Prepare demo scenarios for evaluation

Good luck with your A+ research project! 🎓🚀
