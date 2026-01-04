import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store'

export default function SoundManager() {
  const { emergencyActive, emergencyType, gameStarted, level } = useGameStore()
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [showButton, setShowButton] = useState(true)
  
  // Use a ref to store audio instances so they persist
  const audioRefs = useRef({})

  // Initialize Audio objects once
  useEffect(() => {
    audioRefs.current = {
      ambulance: new Audio('/sounds/ambulance.mp3'),
      police: new Audio('/sounds/police.mp3'),
      firetruck: new Audio('/sounds/firetruck.mp3'),
      train: new Audio('/sounds/train.mp3'),
      ice_cream: new Audio('/sounds/ice_cream.mp3'),
      cityAmbience: new Audio('/sounds/city_ambience.mp3'),
      engine: new Audio('/sounds/engine_loop.mp3')
    }

    // Configure loops
    audioRefs.current.cityAmbience.loop = true
    audioRefs.current.engine.loop = true

    // Preload
    Object.values(audioRefs.current).forEach(audio => audio.load())

    return () => {
      // Cleanup on unmount
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause()
        audio.currentTime = 0
      })
    }
  }, [])

  // Handle Volume / Difficulty based on Level
  useEffect(() => {
    if (!audioRefs.current.cityAmbience) return

    // Increase background noise as level increases
    const noiseVolume = Math.min(0.8, 0.2 + (level - 1) * 0.06)
    audioRefs.current.cityAmbience.volume = noiseVolume
    audioRefs.current.engine.volume = 0.2
  }, [level])

  // Handle Game Start (Ambience)
  useEffect(() => {
    if (gameStarted && soundEnabled && audioRefs.current.cityAmbience) {
      const playAudio = async () => {
        try {
          await audioRefs.current.cityAmbience.play()
          await audioRefs.current.engine.play()
          console.log("Ambience started")
        } catch (e) {
          console.error("Audio play failed. User interaction needed?", e)
        }
      }
      playAudio()
    }
  }, [gameStarted, soundEnabled])

  // Handle Emergency Sirens
  useEffect(() => {
    if (!audioRefs.current.ambulance || !soundEnabled) return

    // Stop all sirens first
    Object.values(audioRefs.current).forEach(audio => {
        if (audio !== audioRefs.current.cityAmbience && audio !== audioRefs.current.engine) {
            audio.pause()
            audio.currentTime = 0
        }
    })

    if (emergencyActive && gameStarted) {
      const playSiren = async () => {
        try {
          let soundToPlay = null
          switch (emergencyType) {
            case 'ambulance': soundToPlay = audioRefs.current.ambulance; break;
            case 'police': soundToPlay = audioRefs.current.police; break;
            case 'firetruck': soundToPlay = audioRefs.current.firetruck; break;
            case 'train': soundToPlay = audioRefs.current.train; break;
            case 'ice_cream': soundToPlay = audioRefs.current.ice_cream; break;
          }
          
          if (soundToPlay) {
              soundToPlay.volume = 1.0 // Ensure max volume for siren
              await soundToPlay.play()
              console.log(`Playing sound: ${emergencyType}`)
          }
        } catch (e) {
          console.error("Siren play failed", e)
        }
      }
      playSiren()
    }
  }, [emergencyActive, emergencyType, gameStarted, soundEnabled])

  const enableSound = async () => {
    setSoundEnabled(true)
    setShowButton(false)
    
    // Try to play and pause to unlock audio
    try {
      for (const audio of Object.values(audioRefs.current)) {
        await audio.play()
        audio.pause()
        audio.currentTime = 0
      }
      console.log("Audio unlocked!")
    } catch (e) {
      console.error("Could not unlock audio", e)
    }
  }

  return (
    <>
      {showButton && gameStarted && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.9)',
          padding: '30px 50px',
          borderRadius: '20px',
          border: '3px solid #3498db'
        }}>
          <button
            onClick={enableSound}
            style={{
              padding: '15px 30px',
              fontSize: '1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
            }}
          >
            🔊 Enable Sound
          </button>
          <p style={{ color: 'white', marginTop: '15px', textAlign: 'center', fontSize: '0.9rem' }}>
            Click to enable game audio
          </p>
        </div>
      )}
    </>
  )
}
