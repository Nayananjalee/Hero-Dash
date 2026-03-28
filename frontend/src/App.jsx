/**
 * Main App Component
 * ===================
 * Manages the 3D game scene, emergency overlays, and backend communication.
 * Polls backend for ML-powered scenario recommendations.
 * Supports mission mode with scripted scenario sequences.
 */

import React, { useEffect, Suspense, useRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Stars } from '@react-three/drei'
import GameScene from './components/GameScene'
import EmergencyOverlay from './components/EmergencyOverlay'
import UI from './components/UI'
import SoundManager from './components/SoundManager'
import AudioProcessor from './components/AudioProcessor'
import StartScreen from './components/StartScreen'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import GameHUD from './components/GameHUD'
import AssessmentMode from './components/AssessmentMode'
import AchievementSystem from './components/AchievementSystem'
import TherapistDashboard from './components/TherapistDashboard'
import ComboEffects from './components/ComboEffects'
import WeatherEffects from './components/WeatherEffects'
import MissionSystem from './components/MissionSystem'
import { useGameStore } from './store'
import { API_URL, devLog, devWarn, DISASTER_THEMES } from './config'

function App() {
  const triggerEmergency = useGameStore((state) => state.triggerEmergency)
  const gameStarted = useGameStore((state) => state.gameStarted)
  const userId = useGameStore((state) => state.userId)
  const emergencyActive = useGameStore((state) => state.emergencyActive)
  const isPaused = useGameStore((state) => state.isPaused)
  const showTherapistDashboard = useGameStore((state) => state.showTherapistDashboard)
  const showAssessmentMode = useGameStore((state) => state.showAssessmentMode)
  const assessmentTypeToRun = useGameStore((state) => state.assessmentTypeToRun)
  const showAchievements = useGameStore((state) => state.showAchievements)
  const isGameOver = useGameStore((state) => state.isGameOver)
  const currentZone = useGameStore((state) => state.currentZone)
  const missionMode = useGameStore((state) => state.missionMode)
  const missionComplete = useGameStore((state) => state.missionComplete)
  
  const clearTimeoutId = useRef(null)
  const emergencyRemainingMs = useRef(null)
  const emergencyDurationMs = 8000

  // Dynamic fog color based on zone
  const fogColor = currentZone?.fogColor || '#101010'

  const scheduleAutoClear = (ms) => {
    if (clearTimeoutId.current) clearTimeout(clearTimeoutId.current)
    emergencyRemainingMs.current = ms
    const startedAt = performance.now()
    clearTimeoutId.current = setTimeout(() => {
      devLog('⏰ Auto-clearing emergency (timeout)')
      useGameStore.getState().clearEmergency()
      clearTimeoutId.current = null
      emergencyRemainingMs.current = null
    }, ms)
    clearTimeoutId._startedAt = startedAt
  }

  // Fetch emergency — handles both free-play and mission mode
  const fetchAndTrigger = async () => {
    const state = useGameStore.getState()
    if (state.emergencyActive) return
    if (state.missionComplete) return // Don't fetch if mission is done
    
    // === Mission Mode: use scripted scenario ===
    if (state.missionMode && state.currentMission) {
      const missionScenario = state.getNextMissionScenario()
      if (!missionScenario) {
        devLog('📋 Mission complete — no more scenarios')
        return
      }
      
      if (missionScenario.type) {
        // Use scripted scenario
        const theme = DISASTER_THEMES[missionScenario.type]
        devLog(`📋 Mission scenario ${state.missionTrialIndex + 1}: ${missionScenario.type}`)
        triggerEmergency(missionScenario.type, theme?.action || 'Respond')
        scheduleAutoClear(emergencyDurationMs)
        return
      }
      // If no scripted type, fall through to ML recommendation below
    }
    
    // === Free-Play Mode: fetch from backend ML ===
    try {
      devLog('🎯 Fetching emergency from backend...')
      const response = await fetch(`${API_URL}/recommend/${userId}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      devLog(`🚨 Emergency: ${data.type} - ${data.action}`)

      useGameStore.getState().setMLMetrics({
        cognitive_load: data.cognitive_load,
        in_flow_state: data.in_flow_state,
        reason: data.reason,
        noise_level: data.noise_level,
        speed_modifier: data.speed_modifier
      })

      triggerEmergency(data.type, data.action)
      scheduleAutoClear(emergencyDurationMs)
    } catch (error) {
      devWarn('❌ Backend error or offline:', error)
    }
  }

  // Poll backend for scenario recommendations
  useEffect(() => {
    if (!gameStarted || !userId || isPaused || isGameOver) {
      if (isPaused && clearTimeoutId.current && emergencyRemainingMs.current != null) {
        const elapsed = performance.now() - (clearTimeoutId._startedAt || 0)
        const remaining = Math.max(0, emergencyRemainingMs.current - elapsed)
        clearTimeout(clearTimeoutId.current)
        clearTimeoutId.current = null
        emergencyRemainingMs.current = remaining
      }
      return
    }

    devLog('✅ Starting emergency polling')

    if (useGameStore.getState().emergencyActive && emergencyRemainingMs.current != null && emergencyRemainingMs.current > 0) {
      scheduleAutoClear(emergencyRemainingMs.current)
    }

    const firstTimeout = setTimeout(fetchAndTrigger, 3000)
    const interval = setInterval(fetchAndTrigger, 10000)

    return () => {
      clearTimeout(firstTimeout)
      clearInterval(interval)
    }
  }, [gameStarted, userId, isPaused, isGameOver, triggerEmergency])
  
  // Clear auto-clear timeout when emergency is completed
  useEffect(() => {
    if (!emergencyActive && clearTimeoutId.current) {
      devLog('🛑 Emergency completed - clearing auto-timeout')
      clearTimeout(clearTimeoutId.current)
      clearTimeoutId.current = null
      emergencyRemainingMs.current = null
    }
  }, [emergencyActive])
  
  // Start analytics session when game starts
  useEffect(() => {
    if (gameStarted && userId && !useGameStore.getState().sessionId) {
      fetch(`${API_URL}/analytics/start-session/${userId}`, {
        method: 'POST'
      })
      .then(res => res.json())
      .then(data => {
        useGameStore.getState().setSessionId(data.session_id)
      })
      .catch(err => devWarn("Failed to start session", err))
    }
  }, [gameStarted, userId])

  // End session reliably on browser close
  useEffect(() => {
    const endSessionBeacon = () => {
      const sid = useGameStore.getState().sessionId
      if (sid) {
        navigator.sendBeacon(
          `${API_URL}/analytics/end-session/${sid}`,
          new Blob([], { type: 'application/json' })
        )
      }
    }

    const handleBeforeUnload = () => endSessionBeacon()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') endSessionBeacon()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* UI Overlays */}
      {!gameStarted && <StartScreen />}
      <SoundManager />
      <AudioProcessor />
      <EmergencyOverlay />
      <UI />
      <AnalyticsDashboard />
      
      {/* NEW: Engagement Features */}
      <ComboEffects />
      <WeatherEffects />
      <MissionSystem />
      
      {/* Zone indicator badge */}
      {gameStarted && currentZone && (
        <div style={{
          position: 'absolute', bottom: 80, left: 20, zIndex: 9,
          background: 'rgba(0,0,0,0.6)', borderRadius: '10px',
          padding: '6px 12px', color: '#fff', fontSize: '0.8rem',
          fontFamily: 'Arial, sans-serif', pointerEvents: 'none',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          {currentZone.label}
          <div style={{ fontSize: '0.65rem', color: '#aaa' }}>{currentZone.labelSi}</div>
        </div>
      )}
      
      {/* GameHUD - Real-time ML feedback during gameplay */}
      {gameStarted && userId && <GameHUD userId={userId} />}
      
      {/* Achievement System */}
      {userId && (
        <AchievementSystem 
          userId={userId}
          show={showAchievements}
          onClose={() => useGameStore.getState().setShowAchievements(false)}
        />
      )}
      
      {/* Therapist Dashboard */}
      {showTherapistDashboard && userId && (
        <TherapistDashboard 
          userId={userId}
          onBack={() => useGameStore.getState().setShowTherapistDashboard(false)}
        />
      )}
      
      {/* Assessment Mode */}
      {showAssessmentMode && userId && (
        <AssessmentMode
          userId={userId}
          assessmentType={assessmentTypeToRun}
          onComplete={() => useGameStore.getState().closeAssessment()}
        />
      )}
      
      {/* 3D Game Scene */}
      <Canvas 
        camera={{ position: [0, 5, 10], fov: 50 }} 
        shadows={false}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        style={{ pointerEvents: 'none' }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <fog attach="fog" args={[fogColor, 10, 50]} />
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <spotLight position={[10, 20, 10]} angle={0.5} penumbra={1} intensity={1} />
          <GameScene />
          <Environment preset="night" />
          <Stars radius={100} depth={50} count={1500} factor={4} saturation={0} fade speed={1} />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default App
