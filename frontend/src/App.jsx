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

  // Poll backend for personalized scenario recommendations
  useEffect(() => {
    if (!gameStarted || !userId || isPaused) {
      console.log('🚫 Polling skipped - gameStarted:', gameStarted, 'userId:', userId, 'isPaused:', isPaused)
      return
    }

    console.log('✅ Starting emergency polling - checking every 10 seconds')
    
    // Trigger first emergency quickly (after 3 seconds instead of 10)
    const triggerFirstEmergency = async () => {
      // Don't trigger if emergency already active
      if (useGameStore.getState().emergencyActive) {
        console.log('⏭️ Skipping - emergency already active')
        return
      }
      
      try {
        console.log('🎯 Fetching first emergency from backend...')
        const response = await fetch(`${API_URL}/recommend/${userId}`)
        if (!response.ok) throw new Error("Failed to fetch")
        
        const data = await response.json()
        console.log('📥 Received recommendation:', data)
        console.log(`🚨 Emergency details - TYPE: "${data.type}", ACTION: "${data.action}"`)        
        // Store ML metrics for UI display
        useGameStore.getState().setMLMetrics({
          cognitive_load: data.cognitive_load,
          in_flow_state: data.in_flow_state,
          reason: data.reason,
          noise_level: data.noise_level,
          speed_modifier: data.speed_modifier
        })
        
        // Trigger emergency with backend-provided scenario
        console.log(`🚨 Triggering emergency: ${data.type} - ${data.action}`)
        triggerEmergency(data.type, data.action)
        
        // Clear any existing timeout
        if (clearTimeoutId.current) {
          clearTimeout(clearTimeoutId.current)
        }
        
        // Auto-clear after 8 seconds if user doesn't respond
        clearTimeoutId.current = setTimeout(() => {
            console.log('⏰ Auto-clearing emergency after 8 seconds')
            useGameStore.getState().clearEmergency()
            clearTimeoutId.current = null
        }, 8000)
        
      } catch (error) {
        console.error("❌ Backend error or offline:", error)
      }
    }
    
    // First emergency after 3 seconds
    const firstTimeout = setTimeout(triggerFirstEmergency, 3000)

    // Subsequent emergencies every 10 seconds
    const interval = setInterval(async () => {
      // Don't trigger if emergency already active
      if (useGameStore.getState().emergencyActive) {
        console.log('⏭️ Skipping interval - emergency still active')
        return
      }
      
      try {
        console.log('🎯 Fetching next emergency from backend...')
        const response = await fetch(`${API_URL}/recommend/${userId}`)
        if (!response.ok) throw new Error("Failed to fetch")
        
        const data = await response.json()
        console.log('📥 Received recommendation:', data)
        console.log(`🚨 Emergency details - TYPE: "${data.type}", ACTION: "${data.action}"`)
        
        // Store ML metrics for UI display
        useGameStore.getState().setMLMetrics({
          cognitive_load: data.cognitive_load,
          in_flow_state: data.in_flow_state,
          reason: data.reason,
          noise_level: data.noise_level,
          speed_modifier: data.speed_modifier
        })
        
        // Trigger emergency with backend-provided scenario
        console.log(`🚨 Triggering emergency: ${data.type} - ${data.action}`)
        triggerEmergency(data.type, data.action)
        
        // Clear any existing timeout
        if (clearTimeoutId.current) {
          clearTimeout(clearTimeoutId.current)
        }
        
        // Auto-clear after 8 seconds if user doesn't respond
        clearTimeoutId.current = setTimeout(() => {
            console.log('⏰ Auto-clearing emergency after 8 seconds')
            useGameStore.getState().clearEmergency()
            clearTimeoutId.current = null
        }, 8000)
        
      } catch (error) {
        console.error("❌ Backend error or offline:", error)
      }
    }, 10000) // Poll every 10 seconds

    return () => {
      clearTimeout(firstTimeout)
      clearInterval(interval)
      if (clearTimeoutId.current) {
        clearTimeout(clearTimeoutId.current)
      }
    }
  }, [gameStarted, userId, isPaused, triggerEmergency])
  
  // Clear auto-clear timeout when emergency is completed
  useEffect(() => {
    if (!emergencyActive && clearTimeoutId.current) {
      console.log('🛑 Emergency completed - clearing auto-timeout')
      clearTimeout(clearTimeoutId.current)
      clearTimeoutId.current = null
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
        shadows
        style={{ pointerEvents: 'none' }}
      >
        <fog attach="fog" args={['#101010', 10, 50]} />
        <Suspense fallback={null}>
          {/* Lighting setup */}
          <ambientLight intensity={0.2} />
          <spotLight position={[10, 20, 10]} angle={0.5} penumbra={1} intensity={1} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          
          {/* Main game scene with car and environment */}
          <GameScene />
          
          {/* Environment effects */}
          <Environment preset="night" />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default App

