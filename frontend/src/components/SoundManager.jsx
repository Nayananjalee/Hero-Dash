import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store'

export default function SoundManager() {
  const { emergencyActive, emergencyType, gameStarted, level } = useGameStore()
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [showButton, setShowButton] = useState(true)
  const [audioInitialized, setAudioInitialized] = useState(false)
  
  // Use a ref to store audio instances so they persist
  const audioRefs = useRef({})

  // Initialize Audio objects once
  useEffect(() => {
    console.log('🎵 Initializing audio objects...')
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

    // Set initial volumes
    audioRefs.current.cityAmbience.volume = 0.3
    audioRefs.current.engine.volume = 0.2

    // Preload
    Object.entries(audioRefs.current).forEach(([name, audio]) => {
      audio.load()
      audio.addEventListener('loadeddata', () => {
        console.log(`✅ Loaded: ${name}`)
      })
      audio.addEventListener('error', (e) => {
        console.error(`❌ Error loading ${name}:`, e)
      })
    })

    setAudioInitialized(true)
    console.log('🎵 Audio initialization complete')

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
    console.log(`🎮 Game Started Effect - gameStarted: ${gameStarted}, soundEnabled: ${soundEnabled}`)
    
    if (gameStarted && soundEnabled && audioRefs.current.cityAmbience) {
      const playAudio = async () => {
        try {
          console.log('🎵 Attempting to play ambience sounds...')
          audioRefs.current.cityAmbience.volume = 0.3
          audioRefs.current.engine.volume = 0.2
          
          await audioRefs.current.cityAmbience.play()
          console.log("✅ City ambience playing")
          
          await audioRefs.current.engine.play()
          console.log("✅ Engine sound playing")
        } catch (e) {
          console.error("❌ Audio play failed:", e)
        }
      }
      playAudio()
    } else {
      console.log('⏸️ Not playing ambience - conditions not met')
    }
  }, [gameStarted, soundEnabled])

  // Handle Emergency Sirens
  useEffect(() => {
    console.log(`🚨 Emergency Effect - emergencyActive: ${emergencyActive}, emergencyType: ${emergencyType}, soundEnabled: ${soundEnabled}`)
    
    if (!audioRefs.current.ambulance || !soundEnabled) {
      console.log('⏸️ Skipping emergency sound - audio not ready or sound disabled')
      return
    }

    // Stop all sirens first
    Object.entries(audioRefs.current).forEach(([name, audio]) => {
        if (audio !== audioRefs.current.cityAmbience && audio !== audioRefs.current.engine) {
            audio.pause()
            audio.currentTime = 0
            console.log(`⏹️ Stopped: ${name}`)
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
              soundToPlay.volume = 1.0
              soundToPlay.currentTime = 0
              console.log(`🔊 Playing emergency sound: ${emergencyType}`)
              await soundToPlay.play()
              console.log(`✅ Successfully playing: ${emergencyType}`)
          } else {
              console.log(`⚠️ No sound found for emergency type: ${emergencyType}`)
          }
        } catch (e) {
          console.error(`❌ Siren play failed for ${emergencyType}:`, e)
        }
      }
      playSiren()
    } else {
      console.log('⏸️ Not playing emergency sound - conditions not met')
    }
  }, [emergencyActive, emergencyType, gameStarted, soundEnabled])

  const enableSound = async () => {
    console.log('🔊 User clicked Enable Sound button')
    setSoundEnabled(true)
    setShowButton(false)
    
    // Try to play and pause to unlock audio
    try {
      for (const [name, audio] of Object.entries(audioRefs.current)) {
        await audio.play()
        audio.pause()
        audio.currentTime = 0
        console.log(`✅ Unlocked: ${name}`)
      }
      console.log("🎉 Audio unlocked successfully!")
    } catch (e) {
      console.error("❌ Could not unlock audio:", e)
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
          zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.95)',
          padding: '40px 60px',
          borderRadius: '20px',
          border: '4px solid #3498db',
          boxShadow: '0 0 50px rgba(52, 152, 219, 0.5)'
        }}>
          <button
            onClick={enableSound}
            style={{
              padding: '20px 40px',
              fontSize: '2rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            🔊 CLICK TO ENABLE SOUND
          </button>
          <p style={{ 
            color: 'white', 
            marginTop: '20px', 
            textAlign: 'center', 
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}>
            Game sounds require your permission
          </p>
          <p style={{ 
            color: '#aaa', 
            marginTop: '10px', 
            textAlign: 'center', 
            fontSize: '0.9rem'
          }}>
            Audio initialized: {audioInitialized ? '✅' : '⏳'}
          </p>
        </div>
      )}
    </>
  )
}
