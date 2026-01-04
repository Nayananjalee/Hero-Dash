/**
 * Main App Component
 * ===================
 * Manages the 3D game scene, emergency overlays, and backend communication.
 * Polls backend for ML-powered scenario recommendations every 10 seconds.
 */

import React, { useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Stars } from '@react-three/drei'
import GameScene from './components/GameScene'
import EmergencyOverlay from './components/EmergencyOverlay'
import UI from './components/UI'
import SoundManager from './components/SoundManager'
import StartScreen from './components/StartScreen'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import { useGameStore } from './store'

// API URL from environment variables (supports both dev and production)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const triggerEmergency = useGameStore((state) => state.triggerEmergency)
  const gameStarted = useGameStore((state) => state.gameStarted)
  const userId = useGameStore((state) => state.userId)
  const emergencyActive = useGameStore((state) => state.emergencyActive)

  // Poll backend for personalized scenario recommendations
  useEffect(() => {
    if (!gameStarted || !userId || emergencyActive) return

    const interval = setInterval(async () => {
      try {
        // Fetch ML-powered recommendation
        const response = await fetch(`${API_URL}/recommend/${userId}`)
        if (!response.ok) throw new Error("Failed to fetch")
        
        const data = await response.json()
        
        // Store ML metrics for UI display
        useGameStore.getState().setMLMetrics({
          cognitive_load: data.cognitive_load,
          in_flow_state: data.in_flow_state,
          reason: data.reason
        })
        
        // Trigger emergency with backend-provided scenario
        triggerEmergency(data.type, data.action)
        
        // Auto-clear after 8 seconds if user doesn't respond
        setTimeout(() => {
            useGameStore.getState().clearEmergency()
        }, 8000)
        
      } catch (error) {
        console.error("Backend error or offline", error)
      }
    }, 10000) // Poll every 10 seconds

    return () => clearInterval(interval)
  }, [gameStarted, userId, emergencyActive, triggerEmergency])
  
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
      <EmergencyOverlay />
      <UI />
      <AnalyticsDashboard />
      
      {/* 3D Game Scene */}
      <Canvas camera={{ position: [0, 5, 10], fov: 50 }} shadows>
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

