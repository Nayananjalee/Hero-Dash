/**
 * Global Game State Management (Zustand Store)
 * =============================================
 * Manages all game state including:
 * - Game progress (score, level)
 * - Player position (lane, speed)
 * - Emergency scenarios and validation
 * - ML metrics (cognitive load, flow state)
 * - Analytics and user data
 */

import { create } from 'zustand'

// API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const useGameStore = create((set, get) => ({
  // === Game State ===
  gameStarted: false,
  score: 0,
  level: 1,
  
  // === Player State ===
  lane: 0,              // -1: Left, 0: Center, 1: Right
  speedModifier: 1,     // 1: Normal, 0.5: Slow, 0: Stop
  
  // === Emergency State ===
  emergencyActive: false,
  emergencyType: null,  // 'ambulance', 'police', 'firetruck', 'train', 'ice_cream'
  emergencyAction: null, 
  targetLane: null,     // Required lane position for current emergency
  targetSpeed: null,    // Required speed for current emergency
  feedback: null,       // User feedback: 'Correct! 🎉' or 'Try Again ❌'
  
  // === User Data ===
  userId: null,
  username: null,
  sessionId: null,
  
  // === ML Metrics (from backend) ===
  cognitiveLoad: 0.0,
  inFlowState: false,
  mlReason: '',
  
  // === Analytics Data ===
  clinicalScores: null,
  progressData: null,
  learningCurve: [],
  
  // === Actions ===
  
  /**
   * Set user ID and username for tracking
   */
  setUserId: (id, name) => set({ userId: id, username: name }),
  
  /**
   * Set analytics session ID
   */
  setSessionId: (id) => set({ sessionId: id }),
  
  /**
   * Update ML metrics from backend recommendation
   */
  setMLMetrics: (metrics) => set({ 
    cognitiveLoad: metrics.cognitive_load || 0,
    inFlowState: metrics.in_flow_state || false,
    mlReason: metrics.reason || ''
  }),

  /**
   * Initialize game session
   */
  startGame: () => set({ gameStarted: true, score: 0, level: 1, speedModifier: 1 }),
  
  /**
   * Update player lane position and auto-validate if emergency active
   */
  setLane: (lane) => {
    set({ lane })
    // Check if correct lane for current emergency
    const state = get()
    if (state.emergencyActive && state.targetLane !== null) {
      if (lane === state.targetLane) {
        state.completeEmergency(true)
      }
    }
  },

  /**
   * Update player speed and auto-validate if emergency active
   */
  setSpeed: (speed) => {
    set({ speedModifier: speed })
    // Check if correct speed for current emergency
    const state = get()
    if (state.emergencyActive && state.targetSpeed !== null) {
        if (state.targetSpeed === 0 && speed === 0) {
            state.completeEmergency(true)
        }
        if (state.targetSpeed === 0.5 && speed === 0.5) {
            state.completeEmergency(true)
        }
    }
  },

  /**
   * Trigger new emergency scenario
   * @param {string} type - Scenario type (ambulance, police, etc.)
   * @param {string} action - Required action (Move Right, Stop, etc.)
   */
  triggerEmergency: (type, action) => {
    let tLane = null
    let tSpeed = null

    // Map actions to required lane/speed targets
    if (action === 'Move Right') tLane = 1
    if (action === 'Move Left') tLane = -1
    if (action === 'Stop') tSpeed = 0
    if (action === 'Slow Down') tSpeed = 0.5
    if (type === 'police') tLane = 0  // Police: Stay Center

    set({ 
      emergencyActive: true, 
      emergencyType: type, 
      emergencyAction: action,
      targetLane: tLane,
      targetSpeed: tSpeed,
      feedback: null
    })
  },
  
  /**
   * Complete emergency attempt and send result to backend
   * @param {boolean} success - Whether user responded correctly
   */
  completeEmergency: (success) => {
    const state = get()
    
    // Send attempt to backend for ML processing
    if (state.userId) {
        fetch(`${API_URL}/attempts/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: state.userId,
                scenario_type: state.emergencyType,
                success: success,
                reaction_time: 0, // TODO: Measure actual reaction time
                difficulty_level: state.level
            })
        }).catch(err => console.error("Failed to record attempt", err))
    }

    // Update game state based on success/failure
    if (success) {
      const newScore = state.score + 100
      const newLevel = Math.floor(newScore / 500) + 1  // Level up every 500 points
      
      set({ 
        emergencyActive: false, 
        emergencyType: null, 
        targetLane: null,
        targetSpeed: null,
        score: newScore,
        level: newLevel,
        speedModifier: 1,  // Reset to normal speed
        feedback: 'Correct! 🎉'
      })
    } else {
      set({ 
        emergencyActive: false, 
        emergencyType: null, 
        targetLane: null,
        targetSpeed: null,
        speedModifier: 1,
        feedback: 'Missed! ❌'
      })
    }
    
    // Auto-clear feedback after 2 seconds
    setTimeout(() => set({ feedback: null }), 2000)
  },

  /**
   * Clear emergency when time runs out (treated as failure)
   */
  clearEmergency: () => {
    const state = get()
    if (state.emergencyActive) {
        state.completeEmergency(false)  // Timeout = failure
    }
  },
}))

