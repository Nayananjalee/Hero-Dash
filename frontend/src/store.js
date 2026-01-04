import { create } from 'zustand'

export const useGameStore = create((set, get) => ({
  gameStarted: false,
  score: 0,
  level: 1,
  lane: 0, // -1: Left, 0: Center, 1: Right
  speedModifier: 1, // 1: Normal, 0.5: Slow, 0: Stop
  emergencyActive: false,
  emergencyType: null, // 'ambulance', 'police', 'firetruck', 'train', 'ice_cream'
  emergencyAction: null, 
  targetLane: null, // The lane user needs to be in
  targetSpeed: null, // The speed user needs to be at
  feedback: null, // 'Correct! 🎉' or 'Try Again ❌'
  
  // User Data
  userId: null,
  username: null,
  sessionId: null,
  
  // Advanced ML Metrics
  cognitiveLoad: 0.0,
  inFlowState: false,
  mlReason: '',
  
  // Analytics Data
  clinicalScores: null,
  progressData: null,
  learningCurve: [],
  
  setUserId: (id, name) => set({ userId: id, username: name }),
  setSessionId: (id) => set({ sessionId: id }),
  setMLMetrics: (metrics) => set({ 
    cognitiveLoad: metrics.cognitive_load || 0,
    inFlowState: metrics.in_flow_state || false,
    mlReason: metrics.reason || ''
  }),

  startGame: () => set({ gameStarted: true, score: 0, level: 1, speedModifier: 1 }),
  
  setLane: (lane) => {
    set({ lane })
    // Immediate validation if emergency is active
    const state = get()
    if (state.emergencyActive && state.targetLane !== null) {
      if (lane === state.targetLane) {
        state.completeEmergency(true)
      }
    }
  },

  setSpeed: (speed) => {
    set({ speedModifier: speed })
    // Immediate validation for speed-based emergencies
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

  triggerEmergency: (type, action) => {
    let tLane = null
    let tSpeed = null

    if (action === 'Move Right') tLane = 1
    if (action === 'Move Left') tLane = -1
    if (action === 'Stop') tSpeed = 0
    if (action === 'Slow Down') tSpeed = 0.5
    // Police 'Stay Center' logic
    if (type === 'police') tLane = 0

    set({ 
      emergencyActive: true, 
      emergencyType: type, 
      emergencyAction: action,
      targetLane: tLane,
      targetSpeed: tSpeed,
      feedback: null
    })
  },
  
  completeEmergency: (success) => {
    const state = get()
    
    // Record attempt to backend
    if (state.userId) {
        fetch('http://localhost:8000/attempts/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: state.userId,
                scenario_type: state.emergencyType,
                success: success,
                reaction_time: 0, // TODO: Measure actual time
                difficulty_level: state.level
            })
        }).catch(err => console.error("Failed to record attempt", err))
    }

    if (success) {
      const newScore = state.score + 100
      // Level up every 500 points (5 correct answers) for easier testing
      const newLevel = Math.floor(newScore / 500) + 1 
      set({ 
        emergencyActive: false, 
        emergencyType: null, 
        targetLane: null,
        targetSpeed: null,
        score: newScore,
        level: newLevel,
        speedModifier: 1, // Reset speed to normal after success
        feedback: 'Correct! 🎉'
      })
    } else {
      set({ 
        emergencyActive: false, 
        emergencyType: null, 
        targetLane: null,
        targetSpeed: null,
        speedModifier: 1, // Reset speed
        feedback: 'Missed! ❌'
      })
    }
    
    // Clear feedback after 2 seconds
    setTimeout(() => set({ feedback: null }), 2000)
  },

  clearEmergency: () => {
    const state = get()
    if (state.emergencyActive) {
        // If time ran out and still active, it's a fail
        state.completeEmergency(false)
    }
  },
}))
