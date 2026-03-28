import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store'
import { devLog, devWarn } from '../config'
import { getAudioContext, getProcessingInputNode, isAudioChainReady } from './AudioProcessor'

export default function SoundManager() {
  const { emergencyActive, emergencyType, gameStarted, level, isPaused } = useGameStore()
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [showButton, setShowButton] = useState(true)
  const [audioInitialized, setAudioInitialized] = useState(false)
  
  // Store audio instances and their MediaElementSource nodes
  const audioRefs = useRef({})
  const sourceNodesRef = useRef({})  // MediaElementSourceNode per audio
  const connectedRef = useRef(false)

  // Initialize Audio objects once
  useEffect(() => {
    devLog(' Initializing audio objects...')
    
    // Create audio instances — crisis/disaster sounds only
    audioRefs.current = {
      tsunami_siren: new Audio('/sounds/tsunami_siren.mp3'),
      earthquake_alarm: new Audio('/sounds/earthquake_alarm.mp3'),
      flood_warning: new Audio('/sounds/flood_warning.mp3'),
      air_raid_siren: new Audio('/sounds/air_raid_siren.mp3'),
      building_fire_alarm: new Audio('/sounds/building_fire_alarm.mp3'),
      cityAmbience: new Audio('/sounds/city_ambience.mp3'),
      engine: new Audio('/sounds/engine_loop.mp3')
    }

    // Configure loops
    audioRefs.current.cityAmbience.loop = true
    audioRefs.current.engine.loop = true

    // Set initial volumes
    audioRefs.current.cityAmbience.volume = 0.3
    audioRefs.current.engine.volume = 0.2

    // Set preload attribute
    Object.entries(audioRefs.current).forEach(([name, audio]) => {
      audio.preload = 'auto'
      audio.addEventListener('loadeddata', () => devLog(` Loaded: ${name}`))
      audio.addEventListener('error', () => devWarn(` Error loading ${name}`))
      audio.load()
    })

    setAudioInitialized(true)
    devLog(' Audio initialization complete')

    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause()
        audio.currentTime = 0
      })
    }
  }, [])

  /**
   * Connect all audio elements through the AudioProcessor's Web Audio chain.
   * This routes: HTML5 Audio → MediaElementSource → AudioProcessor EQ/Compressor → Speakers
   * 
   * Without this connection, the AudioProcessor's NAL-NL2 EQ does nothing.
   */
  const connectToProcessingChain = () => {
    if (connectedRef.current) return
    
    const ctx = getAudioContext()
    const inputNode = getProcessingInputNode()
    
    if (!ctx || !inputNode) {
      devLog('🎛️ Processing chain not ready yet — will use direct playback')
      return
    }

    try {
      Object.entries(audioRefs.current).forEach(([name, audio]) => {
        // Only create MediaElementSource once per element (Web Audio restriction)
        if (!sourceNodesRef.current[name]) {
          const source = ctx.createMediaElementSource(audio)
          source.connect(inputNode)  // Route through EQ + compressor chain
          sourceNodesRef.current[name] = source
          devLog(`🎛️ Routed ${name} through AudioProcessor chain`)
        }
      })
      connectedRef.current = true
      devLog('🎛️ All audio now routed through Web Audio processing chain')
    } catch (e) {
      devWarn('🎛️ Failed to connect to processing chain:', e.message)
      // Audio will still play directly if this fails
    }
  }

  // Handle Volume / Difficulty based on Level
  useEffect(() => {
    if (!audioRefs.current.cityAmbience) return
    const noiseVolume = Math.min(0.8, 0.2 + (level - 1) * 0.06)
    audioRefs.current.cityAmbience.volume = noiseVolume
    audioRefs.current.engine.volume = 0.2
  }, [level])

  // Handle Pause/Resume
  useEffect(() => {
    if (!soundEnabled) return
    const allAudio = Object.values(audioRefs.current)
    if (isPaused) {
      allAudio.forEach(audio => {
        if (!audio.paused) {
          audio.dataset.wasPlaying = 'true'
          audio.pause()
        }
      })
      devLog(' All sounds paused')
    } else {
      allAudio.forEach(audio => {
        if (audio.dataset.wasPlaying === 'true') {
          audio.play().catch(() => {})
          audio.dataset.wasPlaying = ''
        }
      })
      devLog(' Sounds resumed')
    }
  }, [isPaused, soundEnabled])

  // Handle Game Stop
  useEffect(() => {
    if (!gameStarted) {
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause()
        audio.currentTime = 0
        audio.dataset.wasPlaying = ''
      })
      devLog(' All sounds stopped — game ended')
    }
  }, [gameStarted])

  // Handle Game Start (Ambience)
  useEffect(() => {
    if (gameStarted && soundEnabled && audioRefs.current.cityAmbience) {
      // Try to connect to processing chain now that game is started
      connectToProcessingChain()
      
      const playAudio = async () => {
        try {
          if (audioRefs.current.cityAmbience.paused) {
            audioRefs.current.cityAmbience.volume = 0.3
            await audioRefs.current.cityAmbience.play()
            devLog(" City ambience NOW playing")
          }
          if (audioRefs.current.engine.paused) {
            audioRefs.current.engine.volume = 0.2
            await audioRefs.current.engine.play()
            devLog(" Engine sound NOW playing")
          }
        } catch (e) {
          devWarn(" Background audio play failed:", e.message)
        }
      }
      playAudio()
    }
  }, [gameStarted, soundEnabled])

  // Handle Emergency Sirens
  useEffect(() => {
    if (!audioRefs.current.tsunami_siren || !soundEnabled) return

    // Stop all sirens first
    Object.entries(audioRefs.current).forEach(([name, audio]) => {
      if (audio !== audioRefs.current.cityAmbience && audio !== audioRefs.current.engine) {
        audio.pause()
        audio.currentTime = 0
      }
    })

    if (emergencyActive && gameStarted) {
      const playSiren = async () => {
        try {
          let soundToPlay = audioRefs.current[emergencyType] || null
          
          if (soundToPlay) {
            soundToPlay.volume = 1.0
            const duration = soundToPlay.duration || 0
            const maxOffset = Math.min(2, duration * 0.3)
            soundToPlay.currentTime = maxOffset > 0 ? Math.random() * maxOffset : 0
            soundToPlay.playbackRate = 0.95 + Math.random() * 0.10
            devLog(` Playing: ${emergencyType}`)
            await soundToPlay.play()
          }
        } catch (e) {
          devWarn(` SIREN PLAY FAILED for ${emergencyType}:`, e)
        }
      }
      playSiren()
    }
  }, [emergencyActive, emergencyType, gameStarted, soundEnabled])

  const enableSound = async () => {
    setSoundEnabled(true)
    setShowButton(false)
    
    // Resume AudioContext (browser requirement)
    const ctx = getAudioContext()
    if (ctx?.state === 'suspended') {
      await ctx.resume()
    }
    
    try {
      // Unlock each audio file
      for (const [name, audio] of Object.entries(audioRefs.current)) {
        try {
          audio.volume = 0.01
          await audio.play()
          audio.pause()
          audio.currentTime = 0
          devLog(` Unlocked: ${name}`)
        } catch (e) {
          devWarn(` Unlock ${name} failed:`, e.message)
        }
      }
      
      // Now connect to processing chain (AudioProcessor should be ready by now)
      setTimeout(() => {
        connectToProcessingChain()
      }, 200)
      
      // Start background sounds if game is running
      if (gameStarted) {
        try {
          audioRefs.current.cityAmbience.volume = 0.3
          audioRefs.current.engine.volume = 0.2
          await audioRefs.current.cityAmbience.play()
          await audioRefs.current.engine.play()
        } catch (bgError) {
          devWarn(" Background sounds failed:", bgError.message)
        }
      }
      
      alert("✅ Sound enabled! You should now hear background sounds and emergency sirens.")
    } catch (e) {
      devWarn(" Unlock error:", e)
      alert("✅ Sound system activated! Sounds will play during the game.")
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
          zIndex: 99999,
          background: 'rgba(0, 0, 0, 0.98)',
          padding: '50px 80px',
          borderRadius: '25px',
          border: '5px solid #f39c12',
          boxShadow: '0 0 80px rgba(243, 156, 18, 0.8), 0 0 40px rgba(243, 156, 18, 0.5)',
          animation: 'pulse 2s infinite'
        }}>
          <style>{`
            @keyframes pulse {
              0%, 100% { transform: translate(-50%, -50%) scale(1); }
              50% { transform: translate(-50%, -50%) scale(1.02); }
            }
          `}</style>
          <button
            onClick={enableSound}
            style={{
              padding: '25px 50px',
              fontSize: '2.5rem',
              background: 'linear-gradient(135deg, #f39c12 0%, #e74c3c 100%)',
              border: '3px solid white',
              borderRadius: '15px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
              transition: 'all 0.2s',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.1)'
              e.target.style.background = 'linear-gradient(135deg, #e67e22 0%, #c0392b 100%)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.background = 'linear-gradient(135deg, #f39c12 0%, #e74c3c 100%)'
            }}
          >
            🔊 Tap to Start Sound 🔊
          </button>
          <p style={{ 
            color: 'white', marginTop: '25px', textAlign: 'center', 
            fontSize: '1.3rem', fontWeight: 'bold',
            textShadow: '1px 1px 3px rgba(0,0,0,0.8)'
          }}>
            👁️ Visual alerts always work — sound adds more fun!
          </p>
          <p style={{ 
            color: '#f39c12', marginTop: '15px', textAlign: 'center', 
            fontSize: '1rem', fontWeight: 'bold'
          }}>
            Audio Status: {audioInitialized ? '✅ Ready' : '⏳ Loading...'}
          </p>
          <p style={{ 
            color: '#bbb', marginTop: '10px', textAlign: 'center', 
            fontSize: '0.85rem'
          }}>
            You will see and feel all emergency alerts on screen
          </p>
        </div>
      )}
    </>
  )
}
