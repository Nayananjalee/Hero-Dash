# Hero-Dash - Auditory Therapy Game

## Overview
A 3D car driving game designed to help hearing-impaired children (ages 5-14) improve their auditory discrimination skills through gamified therapy exercises.

## Game Concept
Players drive through a city and respond to emergency vehicle sounds by taking the correct action:
- 🚑 **Ambulance** → Move Right
- 🚒 **Firetruck** → Move Left  
- 🚓 **Police** → Stay Center
- 🚂 **Train** → Stop
- 🍦 **Ice Cream Truck** → Slow Down

The game uses **Figure-Ground Discrimination** (identifying sounds amid background noise) and **Sound-Action Association** (linking sounds to actions). Difficulty increases as players progress through higher noise levels and faster speeds.

## Tech Stack
**Frontend**: React 18, Three.js (@react-three/fiber), Zustand, Framer Motion  
**Backend**: Python FastAPI, SQLAlchemy, Machine Learning (Thompson Sampling, Spaced Repetition)

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
Backend runs on `http://localhost:8000`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

## Controls
- **Left Arrow / A**: Move Left
- **Right Arrow / D**: Move Right
- **Up Arrow / W**: Accelerate / Resume Speed
- **Down Arrow**: STOP (Brake)
- **S Key**: SLOW DOWN (Caution)

