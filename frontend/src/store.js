/**
 * Global Game State Management (Zustand Store)
 * =============================================
 * Manages all game state including:
 * - Game progress (score, level, streak, combos)
 * - Player position (lane, speed)
 * - Emergency scenarios and validation
 * - ML metrics (cognitive load, flow state)
 * - Environment zones, weather effects
 * - Mission system state
 * - Analytics and user data
 */

import { create } from 'zustand'
import { API_URL, DISASTER_THEMES, devLog, devWarn, TOKENS, triggerHaptic, COMBO_MILESTONES, MISSIONS, ENVIRONMENT_ZONES, WEATHER_TYPES } from './config'

export const useGameStore = create((set, get) => ({
  // === Game State ===
  gameStarted: false,
  isPaused: false,
  isGameOver: false,
  score: 0,
  level: 1,
  lives: 3,
  
  // === Player State ===
  lane: 0,              // -1: Left, 0: Center, 1: Right
  speedModifier: 1,     // 1: Normal, 0.5: Slow, 0: Stop
  
  // === Emergency State ===
  emergencyActive: false,
  emergencyType: null,
  emergencyAction: null, 
  targetLane: null,
  targetSpeed: null,
  feedback: null,
  emergencyStartTime: null,
  responseLocked: false,
  
  // === Streak & Combo (NEW) ===
  streak: 0,
  bestStreak: 0,
  comboMilestone: null,      // Current milestone object or null
  comboAnimationKey: 0,      // Incremented to trigger animation re-render
  
  // === Environment Zones (NEW) ===
  currentZoneIndex: 0,
  currentZone: ENVIRONMENT_ZONES[0],
  
  // === Weather (NEW) ===
  currentWeatherIndex: 0,
  currentWeather: WEATHER_TYPES[0],
  
  // === Mission System (NEW) ===
  missionMode: false,
  currentMission: null,      // Mission config object
  missionTrialIndex: 0,      // Current trial within mission
  missionStats: { score: 0, successes: 0, failures: 0, totalRT: 0, completed: 0, typesCorrect: new Set(), avgRT: 0 },
  missionComplete: false,
  missionStars: 0,
  completedMissions: [],     // Array of mission IDs
  showMissionSelect: false,
  
  // === User Data ===
  userId: null,
  username: null,
  sessionId: null,
  ageGroup: '7-8',
  hearingProfile: null,
  
  // === Game Mode ===
  gameMode: 'audio-visual',
  assessmentPhase: null,
  assessmentTrials: [],
  
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
  bktSkillLevels: {},
  
  // === View State ===
  showTherapistDashboard: false,
  showAssessmentMode: false,
  assessmentTypeToRun: 'baseline',
  showAchievements: false,
  
  // === Actions ===
  
  setUserId: (id, name) => set({ userId: id, username: name }),
  setAgeGroup: (ageGroup) => set({ ageGroup }),
  setGameMode: (mode) => set({ gameMode: mode }),
  setHearingProfile: (profile) => set({ hearingProfile: profile }),
  setShowTherapistDashboard: (show) => set({ showTherapistDashboard: show }),
  launchAssessment: (type = 'baseline') => set({ showAssessmentMode: true, assessmentTypeToRun: type }),
  closeAssessment: () => set({ showAssessmentMode: false }),
  setShowAchievements: (show) => set({ showAchievements: show }),
  setSessionId: (id) => set({ sessionId: id }),
  
  setMLMetrics: (metrics) => set({ 
    mlMetrics: {
      cognitive_load: metrics.cognitive_load || 0,
      in_flow_state: metrics.in_flow_state || false,
      reason: metrics.reason || '',
      noise_level: metrics.noise_level || 0.2,
      speed_modifier: metrics.speed_modifier || 1.0
    }
  }),

  // === Zone & Weather Actions ===
  
  cycleZone: () => {
    const state = get()
    const nextIdx = (state.currentZoneIndex + 1) % ENVIRONMENT_ZONES.length
    devLog(`🌍 Zone changed to: ${ENVIRONMENT_ZONES[nextIdx].label}`)
    set({ currentZoneIndex: nextIdx, currentZone: ENVIRONMENT_ZONES[nextIdx] })
  },
  
  cycleWeather: () => {
    const state = get()
    // Only cycle to harder weather at higher levels
    const availableCount = Math.min(WEATHER_TYPES.length, 1 + Math.floor(state.level / 2))
    const nextIdx = (state.currentWeatherIndex + 1) % availableCount
    devLog(`🌤️ Weather changed to: ${WEATHER_TYPES[nextIdx].label}`)
    set({ currentWeatherIndex: nextIdx, currentWeather: WEATHER_TYPES[nextIdx] })
  },
  
  // === Mission Actions ===
  
  setShowMissionSelect: (show) => set({ showMissionSelect: show }),
  
  startMission: (missionId) => {
    const mission = MISSIONS.find(m => m.id === missionId)
    if (!mission) return
    devLog(`📋 Starting mission: ${mission.title}`)
    set({ 
      missionMode: true, 
      currentMission: mission,
      missionTrialIndex: 0,
      missionStats: { score: 0, successes: 0, failures: 0, totalRT: 0, completed: 0, typesCorrect: new Set(), avgRT: 0 },
      missionComplete: false,
      missionStars: 0,
      showMissionSelect: false,
      // Start the game too
      gameStarted: true, score: 0, level: 1, lives: 3, isGameOver: false, speedModifier: 1, isPaused: false, streak: 0
    })
  },
  
  /**
   * Get the next scenario for mission mode.
   * Returns { type, action } or null if mission complete.
   */
  getNextMissionScenario: () => {
    const state = get()
    if (!state.missionMode || !state.currentMission) return null
    
    const mission = state.currentMission
    if (state.missionTrialIndex >= mission.totalTrials) return null
    
    if (mission.scenarios) {
      const type = mission.scenarios[state.missionTrialIndex]
      const theme = DISASTER_THEMES[type]
      return { type, action: theme?.action?.replace(/ [➡️⬅️⬇️🏠⏺️]/g, '').trim() || 'Respond' }
    }
    return null // Use ML recommendation
  },
  
  completeMissionTrial: (success, reactionTime, scenarioType) => {
    const state = get()
    if (!state.missionMode) return
    
    const stats = { ...state.missionStats }
    stats.completed += 1
    if (success) {
      stats.successes += 1
      stats.score += 100
      if (scenarioType) stats.typesCorrect = new Set([...stats.typesCorrect, scenarioType])
    } else {
      stats.failures += 1
    }
    stats.totalRT += (reactionTime || 0)
    stats.avgRT = stats.totalRT / stats.completed
    
    const nextIdx = state.missionTrialIndex + 1
    const isComplete = nextIdx >= state.currentMission.totalTrials
    
    if (isComplete) {
      // Calculate stars
      let stars = 0
      const mission = state.currentMission
      mission.stars.forEach(s => {
        if (s.check) {
          if (s.check(stats)) stars += 1
        } else if (stats.score >= s.required) {
          stars += 1
        }
      })
      
      const newCompleted = [...state.completedMissions]
      if (!newCompleted.includes(mission.id)) newCompleted.push(mission.id)
      
      devLog(`📋 Mission complete! Stars: ${stars}`)
      set({ 
        missionStats: stats, 
        missionTrialIndex: nextIdx, 
        missionComplete: true, 
        missionStars: stars,
        completedMissions: newCompleted
      })
    } else {
      set({ missionStats: stats, missionTrialIndex: nextIdx })
    }
  },
  
  exitMission: () => set({ 
    missionMode: false, currentMission: null, missionTrialIndex: 0,
    missionComplete: false, missionStars: 0, showMissionSelect: false
  }),

  // === Game Actions ===
  
  startGame: () => set({ 
    gameStarted: true, score: 0, level: 1, lives: 3, isGameOver: false, 
    speedModifier: 1, isPaused: false, streak: 0, bestStreak: 0, comboMilestone: null,
    currentZoneIndex: 0, currentZone: ENVIRONMENT_ZONES[0],
    currentWeatherIndex: 0, currentWeather: WEATHER_TYPES[0]
  }),
  
  stopGame: () => {
    const state = get()
    if (state.sessionId) {
      fetch(`${API_URL}/analytics/end-session/${state.sessionId}`, {
        method: 'POST'
      }).catch(err => devWarn("Failed to end session", err))
    }
    set({ 
      gameStarted: false, isPaused: false, isGameOver: false, lives: 3,
      sessionId: null, emergencyActive: false, emergencyType: null,
      emergencyAction: null, feedback: null, lane: 0, speedModifier: 1,
      streak: 0, comboMilestone: null,
      missionMode: false, currentMission: null, missionComplete: false
    })
  },
  
  setPaused: (paused) => set({ isPaused: paused }),
  
  setLane: (newLane) => {
    const oldLane = get().lane
    devLog(`🚗 Lane changed to: ${newLane}`)
    set({ lane: newLane })
    const state = get()
    if (state.emergencyActive && state.targetLane !== null) {
      if (state.responseLocked) {
        devLog('🔒 Response already locked - ignoring lane change')
        return
      }
      set({ responseLocked: true })
      const direction = newLane - oldLane
      let isCorrect = false
      if (newLane === state.targetLane) {
        isCorrect = true
      } else if (state.targetLane === 1 && direction > 0) {
        isCorrect = true
      } else if (state.targetLane === -1 && direction < 0) {
        isCorrect = true
      }
      devLog(`🎯 Checking lane: old=${oldLane}, new=${newLane}, target=${state.targetLane}, correct=${isCorrect}`)
      if (isCorrect) {
        set({ lane: state.targetLane })
        state.completeEmergency(true)
      } else {
        state.completeEmergency(false)
      }
    }
  },

  setSpeed: (speed) => {
    devLog(`⚡ Speed changed to: ${speed}`)
    set({ speedModifier: speed })
    const state = get()
    if (state.emergencyActive && state.targetSpeed !== null) {
      if (state.responseLocked) {
        devLog('🔒 Response already locked - ignoring speed change')
        return
      }
      set({ responseLocked: true })
      if (state.targetSpeed === speed) {
        state.completeEmergency(true)
      } else {
        state.completeEmergency(false)
      }
    }
  },

  triggerEmergency: (type, action) => {
    devLog(`🎯 STORE.triggerEmergency: TYPE="${type}", ACTION="${action}"`)
    
    let tLane = null
    let tSpeed = null

    // Crisis scenario mapping — each sound has a unique action
    if (type === 'tsunami_siren') { tLane = 1; tSpeed = null }
    else if (type === 'earthquake_alarm') { tSpeed = 0; tLane = null }
    else if (type === 'flood_warning') { tSpeed = 0.5; tLane = null }
    else if (type === 'air_raid_siren') { tLane = 0; tSpeed = null }
    else if (type === 'building_fire_alarm') { tLane = -1; tSpeed = null }
    else {
      // Fallback to action-based mapping
      if (action === 'Move Right') tLane = 1
      if (action === 'Move Left') tLane = -1
      if (action === 'Stop') tSpeed = 0
      if (action === 'Slow Down' || action === 'Find Safe Place') tSpeed = 0.5
      if (action === 'Stay Center') tLane = 0
    }

    const theme = DISASTER_THEMES[type]
    triggerHaptic(theme ? theme.haptic : [200], theme ? theme.glow : 'rgba(255,165,0,0.6)')

    set({ 
      emergencyActive: true, emergencyType: type, emergencyAction: action,
      targetLane: tLane, targetSpeed: tSpeed, feedback: null,
      responseLocked: false, emergencyStartTime: performance.now()
    })
  },
  
  completeEmergency: (success) => {
    const state = get()
    
    if (!state.emergencyActive) return
    
    devLog(`✅ Completing emergency - Success: ${success}`)
    
    const reactionTime = state.emergencyStartTime 
      ? parseFloat(((performance.now() - state.emergencyStartTime) / 1000).toFixed(3))
      : 0
    
    devLog(`⏱️ Reaction time: ${reactionTime}s`)
    
    triggerHaptic(
      success ? [100, 50, 100] : [500],
      success ? 'rgba(45,198,83,0.6)' : 'rgba(231,76,60,0.6)'
    )
    
    // Track mission progress
    if (state.missionMode) {
      state.completeMissionTrial(success, reactionTime, state.emergencyType)
    }
    
    // Send attempt to backend
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

    if (success) {
      // === Streak & Combo Logic ===
      const newStreak = state.streak + 1
      const newBest = Math.max(newStreak, state.bestStreak)
      
      // Find the highest milestone reached
      let milestone = null
      for (let i = COMBO_MILESTONES.length - 1; i >= 0; i--) {
        if (newStreak >= COMBO_MILESTONES[i].streak) {
          milestone = COMBO_MILESTONES[i]
          break
        }
      }
      
      // Calculate score with combo multiplier
      const multiplier = milestone ? milestone.multiplier : 1.0
      const pointsEarned = Math.round(100 * multiplier)
      const newScore = state.score + pointsEarned
      const newLevel = Math.floor(newScore / 500) + 1
      
      // Award bonus life at 10x streak
      let newLives = state.lives
      if (milestone?.bonusLife && newStreak === 10) {
        newLives = Math.min(state.lives + 1, 5) // Cap at 5 lives
        devLog('🎁 BONUS LIFE awarded for 10x streak!')
      }
      
      devLog(`🔥 Streak: ${newStreak}, Multiplier: ${multiplier}x, Points: ${pointsEarned}`)
      
      set({ 
        emergencyActive: false, emergencyType: null, targetLane: null,
        targetSpeed: null, emergencyStartTime: null, responseLocked: false,
        score: newScore, level: newLevel, speedModifier: 1,
        streak: newStreak, bestStreak: newBest,
        comboMilestone: milestone,
        comboAnimationKey: state.comboAnimationKey + 1,
        lives: newLives,
        feedback: milestone ? `${milestone.emoji} ${milestone.label} +${pointsEarned}` : 'Correct! 🎉'
      })
    } else {
      // Failure — reset streak
      const currentLives = state.lives - 1
      const gameOver = currentLives <= 0
      
      set({ 
        emergencyActive: false, emergencyType: null, targetLane: null,
        targetSpeed: null, emergencyStartTime: null, responseLocked: false,
        speedModifier: 1, lives: currentLives, isGameOver: gameOver,
        streak: 0, comboMilestone: null,
        feedback: gameOver ? null : 'Missed! ❌'
      })
      
      if (gameOver) {
        if (state.sessionId) {
          fetch(`${API_URL}/analytics/end-session/${state.sessionId}`, {
            method: 'POST'
          }).catch(err => devWarn('Failed to end session', err))
        }
        return
      }
    }
    
    setTimeout(() => set({ feedback: null }), TOKENS.feedbackDuration)
  },

  clearEmergency: () => {
    devLog('⏰ clearEmergency called (timeout)')
    const state = get()
    if (state.emergencyActive) {
      devLog('❌ Marking emergency as FAILED due to timeout')
      state.completeEmergency(false)
    }
  },
}))
