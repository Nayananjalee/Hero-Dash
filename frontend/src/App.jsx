/**
 * Main App Component
 * ===================
 * Manages the 3D game scene, emergency overlays, and backend communication.
 * Polls backend for ML-powered scenario recommendations every 10 seconds.
 */

import React, { useEffect, Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Stars } from '@react-three/drei'
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
import { useGameStore } from './store'

// API URL from environment variables (supports both dev and production)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
  const clearTimeoutId = useRef(null) // Store timeout ID for clearing
  const emergencyRemainingMs = useRef(null) // Track remaining ms when paused
  const emergencyDurationMs = 8000 // 8 second emergency window

  // Helper: schedule (or re-schedule) the auto-clear timeout for an active emergency
  const scheduleAutoClear = (ms) => {
    if (clearTimeoutId.current) clearTimeout(clearTimeoutId.current)
    emergencyRemainingMs.current = ms
    const startedAt = performance.now()
    clearTimeoutId.current = setTimeout(() => {
      console.log('⏰ Auto-clearing emergency (timeout)')
      useGameStore.getState().clearEmergency()
      clearTimeoutId.current = null
      emergencyRemainingMs.current = null
    }, ms)
    // Store start so we can compute remaining on next pause
    clearTimeoutId._startedAt = startedAt
  }

  // Fetch a new emergency from backend and trigger it
  const fetchAndTrigger = async () => {
    if (useGameStore.getState().emergencyActive) {
      console.log('⏭️ Skipping - emergency already active')
      return
    }
    try {
      console.log('🎯 Fetching emergency from backend...')
      const response = await fetch(`${API_URL}/recommend/${userId}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      console.log(`🚨 Emergency: ${data.type} - ${data.action}`)

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
      console.error('❌ Backend error or offline:', error)
    }
  }

  // Poll backend for personalized scenario recommendations
  useEffect(() => {
    if (!gameStarted || !userId || isPaused) {
      // --- PAUSING: save remaining time for the active emergency ---
      if (isPaused && clearTimeoutId.current && emergencyRemainingMs.current != null) {
        const elapsed = performance.now() - (clearTimeoutId._startedAt || 0)
        const remaining = Math.max(0, emergencyRemainingMs.current - elapsed)
        clearTimeout(clearTimeoutId.current)
        clearTimeoutId.current = null
        emergencyRemainingMs.current = remaining
        console.log(`⏸️ Paused with ${(remaining / 1000).toFixed(1)}s remaining on emergency`)
      }
      return
    }

    console.log('✅ Starting emergency polling')

    // --- UNPAUSING: if emergency is still active, resume its timer ---
    if (useGameStore.getState().emergencyActive && emergencyRemainingMs.current != null && emergencyRemainingMs.current > 0) {
      console.log(`▶️ Resuming emergency timer with ${(emergencyRemainingMs.current / 1000).toFixed(1)}s`)
      scheduleAutoClear(emergencyRemainingMs.current)
    }

    // First emergency after 3 seconds (only if none active)
    const firstTimeout = setTimeout(fetchAndTrigger, 3000)

    // Subsequent emergencies every 10 seconds
    const interval = setInterval(fetchAndTrigger, 10000)

    return () => {
      clearTimeout(firstTimeout)
      clearInterval(interval)
      // Don't clear the emergency timeout here — handled above on pause
    }
  }, [gameStarted, userId, isPaused, triggerEmergency])
  
  // Clear auto-clear timeout when emergency is completed
  useEffect(() => {
    if (!emergencyActive && clearTimeoutId.current) {
      console.log('🛑 Emergency completed - clearing auto-timeout')
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
      .catch(err => console.error("Failed to start session", err))
    }
  }, [gameStarted, userId])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* UI Overlays */}
      {!gameStarted && <StartScreen />}
      <SoundManager />
      <AudioProcessor />
      <EmergencyOverlay />
      <UI />
      <AnalyticsDashboard />
      
      {/* GameHUD - Real-time ML feedback during gameplay */}
      {gameStarted && userId && <GameHUD userId={userId} />}
      
      {/* Achievement System - Toast notifications + gallery */}
      {userId && (
        <AchievementSystem 
          userId={userId}
          show={showAchievements}
          onClose={() => useGameStore.getState().setShowAchievements(false)}
        />
      )}
      
      {/* Therapist Dashboard - Full clinical view */}
      {showTherapistDashboard && userId && (
        <TherapistDashboard 
          userId={userId}
          onBack={() => useGameStore.getState().setShowTherapistDashboard(false)}
        />
      )}
      
      {/* Assessment Mode - Standardized pre/post testing */}
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
        <fog attach="fog" args={['#101010', 10, 50]} />
        <Suspense fallback={null}>
          {/* Lighting setup */}
          <ambientLight intensity={0.3} />
          <spotLight position={[10, 20, 10]} angle={0.5} penumbra={1} intensity={1} />
          
          {/* Main game scene with car and environment */}
          <GameScene />
          
          {/* Environment effects */}
          <Environment preset="night" />
          <Stars radius={100} depth={50} count={1500} factor={4} saturation={0} fade speed={1} />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default App

