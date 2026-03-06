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
import { API_URL, DISASTER_THEMES, devLog, devWarn, TOKENS, triggerHaptic } from './config'

export const useGameStore = create((set, get) => ({
  // === Game State ===
  gameStarted: false,
  isPaused: false,
  score: 0,
  level: 1,
  
  // === Player State ===
  lane: 0,              // -1: Left, 0: Center, 1: Right
  speedModifier: 1,     // 1: Normal, 0.5: Slow, 0: Stop
  
  // === Emergency State ===
  emergencyActive: false,
  emergencyType: null,  // 'tsunami_siren', 'earthquake_alarm', 'flood_warning', 'air_raid_siren', 'building_fire_alarm'
  emergencyAction: null, 
  targetLane: null,     // Required lane position for current emergency
  targetSpeed: null,    // Required speed for current emergency
  feedback: null,       // User feedback: 'Correct! 🎉' or 'Try Again ❌'
  emergencyStartTime: null, // High-precision timestamp for RT measurement
  responseLocked: false,     // Lock after first key press per emergency
  
  // === User Data ===
  userId: null,
  username: null,
  sessionId: null,
  ageGroup: '7-8',       // Age group for normalized scoring
  hearingProfile: null,  // Audiogram data if provided
  
  // === Game Mode ===
  gameMode: 'audio-visual', // 'audio-visual', 'visual-only', 'assessment'
  assessmentPhase: null,    // 'baseline', 'post-test', null
  assessmentTrials: [],     // Pre/post assessment trial data
  
  // === ML Metrics (from backend) ===
  mlMetrics: {
    cognitive_load: 0.0,
    in_flow_state: false,
    reason: '',
    noise_level: 0.2,
    speed_modifier: 1.0
  },
  
  // === Analytics Data ===
  clinicalScores: null,
  progressData: null,
  learningCurve: [],
  bktSkillLevels: {},  // Bayesian Knowledge Tracing levels
  
  // === View State (new components) ===
  showTherapistDashboard: false,
  showAssessmentMode: false,
  assessmentTypeToRun: 'baseline', // 'baseline', 'post_test', 'follow_up'
  showAchievements: false,
  
  // === Actions ===
  
  /**
   * Set user ID and username for tracking
   */
  setUserId: (id, name) => set({ userId: id, username: name }),
  
  /**
   * Set age group for normalized scoring
   */
  setAgeGroup: (ageGroup) => set({ ageGroup }),
  
  /**
   * Set game mode: audio-visual, visual-only, assessment
   */
  setGameMode: (mode) => set({ gameMode: mode }),
  
  /**
   * Set hearing profile (audiogram thresholds)
   */
  setHearingProfile: (profile) => set({ hearingProfile: profile }),
  
  /**
   * Toggle Therapist Dashboard view
   */
  setShowTherapistDashboard: (show) => set({ showTherapistDashboard: show }),
  
  /**
   * Launch assessment mode with specified type
   */
  launchAssessment: (type = 'baseline') => set({ showAssessmentMode: true, assessmentTypeToRun: type }),
  
  /**
   * Close assessment mode
   */
  closeAssessment: () => set({ showAssessmentMode: false }),
  
  /**
   * Toggle achievements gallery
   */
  setShowAchievements: (show) => set({ showAchievements: show }),
  
  /**
   * Set analytics session ID
   */
  setSessionId: (id) => set({ sessionId: id }),
  
  /**
   * Update ML metrics from backend recommendation
   */
  setMLMetrics: (metrics) => set({ 
    mlMetrics: {
      cognitive_load: metrics.cognitive_load || 0,
      in_flow_state: metrics.in_flow_state || false,
      reason: metrics.reason || '',
      noise_level: metrics.noise_level || 0.2,
      speed_modifier: metrics.speed_modifier || 1.0
    }
  }),

  /**
   * Initialize game session
   */
  startGame: () => set({ gameStarted: true, score: 0, level: 1, speedModifier: 1, isPaused: false }),
  
  /**
   * Stop game session, end analytics session, and reset state
   */
  stopGame: () => {
    const state = get()
    // End analytics session if one exists
    if (state.sessionId) {
      fetch(`${API_URL}/analytics/end-session/${state.sessionId}`, {
        method: 'POST'
      }).catch(err => devWarn("Failed to end session", err))
    }
    set({ 
      gameStarted: false, 
      isPaused: false,
      sessionId: null,
      emergencyActive: false,
      emergencyType: null,
      emergencyAction: null,
      feedback: null,
      lane: 0,
      speedModifier: 1
    })
  },
  
  /**
   * Toggle pause state
   */
  setPaused: (paused) => set({ isPaused: paused }),
  
  /**
   * Update player lane position and auto-validate if emergency active
   */
  setLane: (lane) => {
    devLog(`🚗 Lane changed to: ${lane}`)
    set({ lane })
    // Check if correct lane for current emergency
    const state = get()
    if (state.emergencyActive && state.targetLane !== null) {
      // If response is already locked, ignore further presses
      if (state.responseLocked) {
        devLog('🔒 Response already locked - ignoring lane change')
        return
      }
      // Lock response on first press
      set({ responseLocked: true })
      devLog(`🎯 Checking lane target: current=${lane}, target=${state.targetLane}`)
      if (lane === state.targetLane) {
        devLog('✅ CORRECT LANE! Completing emergency as success')
        state.completeEmergency(true)
      } else {
        devLog('❌ WRONG LANE! Completing emergency as failure')
        state.completeEmergency(false)
      }
    }
  },

  /**
   * Update player speed and auto-validate if emergency active
   */
  setSpeed: (speed) => {
    devLog(`⚡ Speed changed to: ${speed}`)
    set({ speedModifier: speed })
    // Check if correct speed for current emergency
    const state = get()
    if (state.emergencyActive && state.targetSpeed !== null) {
      // If response is already locked, ignore further presses
      if (state.responseLocked) {
        devLog('🔒 Response already locked - ignoring speed change')
        return
      }
      // Lock response on first press
      set({ responseLocked: true })
      devLog(`🎯 Checking speed target: current=${speed}, target=${state.targetSpeed}`)
      if (state.targetSpeed === speed) {
        devLog('✅ CORRECT SPEED! Completing emergency as success')
        state.completeEmergency(true)
      } else {
        devLog('❌ WRONG SPEED! Completing emergency as failure')
        state.completeEmergency(false)
      }
    }
  },

  /**
   * Trigger new emergency scenario
   * @param {string} type - Scenario type (tsunami_siren, earthquake_alarm, etc.)
   * @param {string} action - Required action (Move Right, Stop, etc.)
   */
  triggerEmergency: (type, action) => {
    devLog(`🎯 STORE.triggerEmergency called with TYPE: "${type}", ACTION: "${action}"`)
    
    let tLane = null
    let tSpeed = null

    // Map actions to required lane/speed targets
    if (action === 'Move Right') tLane = 1
    if (action === 'Move Left') tLane = -1
    if (action === 'Stop') tSpeed = 0
    if (action === 'Slow Down') tSpeed = 0.5
    if (action === 'Find Safe Place') tSpeed = 0.5
    if (action === 'Stay Center') tLane = 0
    // Crisis scenario overrides — each sound has a unique action
    if (type === 'tsunami_siren') { tLane = 1; tSpeed = null }       // Move Right (evacuate to high ground)
    if (type === 'earthquake_alarm') { tSpeed = 0; tLane = null }    // Stop (Drop, Cover, Hold On)
    if (type === 'flood_warning') { tSpeed = 0.5; tLane = null }     // Find Safe Place (seek shelter)
    if (type === 'air_raid_siren') { tLane = 0; tSpeed = null }      // Stay Center (take cover in place)
    if (type === 'building_fire_alarm') { tLane = -1; tSpeed = null } // Move Left (evacuate building)

    // Trigger haptic feedback for hearing-impaired accessibility
    // Uses screen-shake fallback on desktop/laptop where vibration is unavailable
    const theme = DISASTER_THEMES[type]
    triggerHaptic(theme ? theme.haptic : [200], theme ? theme.glow : 'rgba(255,165,0,0.6)')

    set({ 
      emergencyActive: true, 
      emergencyType: type, 
      emergencyAction: action,
      targetLane: tLane,
      targetSpeed: tSpeed,
      feedback: null,
      responseLocked: false,  // Reset lock for new emergency
      emergencyStartTime: performance.now()  // High-precision RT measurement
    })
    
    devLog(`✅ Emergency state updated - emergencyType set to: "${type}"`)
  },
  
  /**
   * Complete emergency attempt and send result to backend
   * @param {boolean} success - Whether user responded correctly
   */
  completeEmergency: (success) => {
    const state = get()
    
    // Prevent multiple completions of the same emergency
    if (!state.emergencyActive) {
      devLog('⚠️ CompletEmergency called but no emergency active - ignoring')
      return
    }
    
    devLog(`✅ Completing emergency - Success: ${success}`)
    
    // Calculate actual reaction time using high-precision timer
    const reactionTime = state.emergencyStartTime 
      ? parseFloat(((performance.now() - state.emergencyStartTime) / 1000).toFixed(3))
      : 0
    
    devLog(`⏱️ Reaction time: ${reactionTime}s`)
    
    // Haptic feedback for result (screen-shake on desktop)
    triggerHaptic(
      success ? [100, 50, 100] : [500],
      success ? 'rgba(45,198,83,0.6)' : 'rgba(231,76,60,0.6)'
    )
    
    // Send attempt to backend for ML processing
    if (state.userId) {
        fetch(`${API_URL}/attempts/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: state.userId,
                scenario_type: state.emergencyType,
                success: success,
                reaction_time: reactionTime,
                difficulty_level: state.level,
                noise_level: state.mlMetrics.noise_level,
                speed_modifier: state.mlMetrics.speed_modifier,
                game_mode: state.gameMode
            })
        }).catch(err => devWarn("Failed to record attempt", err))
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
        emergencyStartTime: null,
        responseLocked: false,
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
        emergencyStartTime: null,
        responseLocked: false,
        speedModifier: 1,
        feedback: 'Missed! ❌'
      })
    }
    
    // Auto-clear feedback (longer for young readers)
    setTimeout(() => set({ feedback: null }), TOKENS.feedbackDuration)
  },

  /**
   * Clear emergency when time runs out (treated as failure)
   */
  clearEmergency: () => {
    devLog('⏰ clearEmergency called (timeout)')
    const state = get()
    if (state.emergencyActive) {
        devLog('❌ Marking emergency as FAILED due to timeout')
        state.completeEmergency(false)  // Timeout = failure
    } else {
      devLog('ℹ️ No active emergency to clear')
    }
  },
}))

