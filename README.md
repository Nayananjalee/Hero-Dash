# Herooo - 3D Auditory Therapy Game

## Overview
**Herooo** is a 3D car driving simulation game designed as a therapeutic tool for hearing-impaired children (ages 5-14). The game gamifies auditory training exercises, specifically focusing on **Figure-Ground Discrimination** and **Sound-Action Association**.

The player drives a car through a busy city and must respond correctly to emergency vehicle sirens. The game progressively increases in difficulty by modulating background noise levels and game speed.

## Therapy Logic

### 1. Figure-Ground Discrimination
*   **Concept**: The ability to focus on a specific sound (signal) in the presence of competing background sounds (noise).
*   **Implementation**:
    *   **Signal**: Emergency sirens (Ambulance, Firetruck, Police).
    *   **Noise**: City ambience (traffic, wind, crowd noise).
    *   **Progression**: As the player levels up, the volume of the background city ambience increases relative to the siren, making it harder to distinguish the emergency sound.

### 2. Sound-Action Association
*   **Concept**: Linking a specific auditory stimulus to a specific cognitive decision and motor action.
*   **Implementation**:
    *   **Ambulance Siren** 🚑 → Player must identify the sound and move **RIGHT**.
    *   **Firetruck Siren** 🚒 → Player must identify the sound and move **LEFT**.
    *   **Police Siren** 🚓 → Player must identify the sound and stay **CENTER** (Stop/Yield).
    *   **Train Bell** 🚂 → Player must identify the sound and **STOP** completely.
    *   **Ice Cream Music** 🍦 → Player must identify the sound and **SLOW DOWN**.
    *   **Visual Cues**: When a sound plays, visual banners appear showing all options. The player must listen to the sound to know which visual option is the correct one to follow.

## Game Mechanics

### Core Loop
1.  **Driving**: The player drives an infinite procedural road.
2.  **Emergency Trigger**: The Python backend randomly triggers an emergency scenario.
3.  **Listening Phase**:
    *   A specific siren plays.
    *   Visual banners appear for Firetruck (Left), Ambulance (Right), Police (Center), Train (Stop), and Ice Cream (Slow).
    *   The player must identify the sound.
4.  **Action Phase**: The player steers the car or adjusts speed.
5.  **Validation**:
    *   **Correct**: Score increases (+100), positive visual feedback.
    *   **Incorrect**: Score decreases, corrective feedback.
6.  **Leveling**: Every 500 points, the Level increases.
    *   **Speed**: The car and city move faster.
    *   **Noise**: Background city noise becomes louder.

## Tech Stack

### Frontend
*   **React 18**: UI and Game Logic.
*   **Three.js (@react-three/fiber)**: 3D Rendering (Car, City, Humans, Trees).
*   **Zustand**: State Management (Score, Level, Emergency State).
*   **Framer Motion**: UI Animations and Visual Banners.

### Backend
*   **Python (FastAPI)**: Game Controller.
*   **Logic**: Randomly generates emergency scenarios and validates game state (extensible for more complex logic).

## How to Run

### Prerequisites
*   Node.js (v16+)
*   Python (v3.8+)

### 1. Start the Backend
```bash
cd backend
pip install fastapi uvicorn
uvicorn main:app --reload
```
The backend runs on `http://localhost:8000`.

### 2. Start the Frontend
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
The game runs on `http://localhost:5173`.

## Controls
*   **Left Arrow / A**: Move Left
*   **Right Arrow / D**: Move Right
*   **Up Arrow / W**: Accelerate / Resume Speed
*   **Down Arrow**: STOP (Brake)
*   **S Key**: SLOW DOWN (Caution)
