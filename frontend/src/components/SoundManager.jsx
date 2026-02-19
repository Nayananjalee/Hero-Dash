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

    // Set preload attribute for better loading
    Object.entries(audioRefs.current).forEach(([name, audio]) => {
      audio.preload = 'auto'
      
      audio.addEventListener('loadeddata', () => {
        console.log(`✅ Loaded: ${name} (duration: ${audio.duration}s)`)
      })
      
      audio.addEventListener('error', (e) => {
        console.error(`❌ Error loading ${name}:`, audio.error)
        console.error(`   Error code: ${audio.error?.code}, message: ${audio.error?.message}`)
      })
      
      audio.addEventListener('canplaythrough', () => {
        console.log(`▶️ Can play through: ${name}`)
      })
      
      // Start loading
      audio.load()
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
    console.log(`   Audio refs available: ${!!audioRefs.current.cityAmbience}`)
    
    if (gameStarted && soundEnabled && audioRefs.current.cityAmbience) {
      const playAudio = async () => {
        try {
          console.log('🎵 Attempting to play background ambience sounds...')
          
          // Check if already playing
          if (!audioRefs.current.cityAmbience.paused) {
            console.log('✅ City ambience already playing')
          } else {
            audioRefs.current.cityAmbience.volume = 0.3
            await audioRefs.current.cityAmbience.play()
            console.log("✅ City ambience NOW playing")
          }
          
          if (!audioRefs.current.engine.paused) {
            console.log('✅ Engine sound already playing')
          } else {
            audioRefs.current.engine.volume = 0.2
            await audioRefs.current.engine.play()
            console.log("✅ Engine sound NOW playing")
          }
        } catch (e) {
          console.error("❌ Background audio play failed:", e.message, e.name)
        }
      }
      playAudio()
    } else {
      console.log('⏸️ Not playing background sounds - conditions not met')
      console.log(`   gameStarted: ${gameStarted}, soundEnabled: ${soundEnabled}, audioRefs: ${!!audioRefs.current.cityAmbience}`)
    }
  }, [gameStarted, soundEnabled])

  // Handle Emergency Sirens
  useEffect(() => {
    console.log(`🚨 Emergency Effect Triggered!`)
    console.log(`   - emergencyActive: ${emergencyActive}`)
    console.log(`   - emergencyType: ${emergencyType}`)
    console.log(`   - soundEnabled: ${soundEnabled}`)
    console.log(`   - gameStarted: ${gameStarted}`)
    console.log(`   - audioRefs ready: ${!!audioRefs.current.tsunami_siren}`)
    
    if (!audioRefs.current.tsunami_siren || !soundEnabled) {
      console.log('⏸️ Skipping emergency sound - audio not ready or sound disabled')
      return
    }

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
          let soundToPlay = null
          console.log(`🎵 EMERGENCY TYPE RECEIVED: "${emergencyType}"`)
          
          switch (emergencyType) {
            case 'tsunami_siren': 
              soundToPlay = audioRefs.current.tsunami_siren
              console.log('✅ Selected TSUNAMI_SIREN sound')
              break
            case 'earthquake_alarm': 
              soundToPlay = audioRefs.current.earthquake_alarm
              console.log('✅ Selected EARTHQUAKE_ALARM sound')
              break
            case 'flood_warning': 
              soundToPlay = audioRefs.current.flood_warning
              console.log('✅ Selected FLOOD_WARNING sound')
              break
            case 'air_raid_siren': 
              soundToPlay = audioRefs.current.air_raid_siren
              console.log('✅ Selected AIR_RAID_SIREN sound')
              break
            case 'building_fire_alarm': 
              soundToPlay = audioRefs.current.building_fire_alarm
              console.log('✅ Selected BUILDING_FIRE_ALARM sound')
              break
            default:
              console.warn(`⚠️ UNKNOWN emergency type: "${emergencyType}"`)
          }
          
          if (soundToPlay) {
              soundToPlay.volume = 1.0
              // Slight random start offset (0-2s) so sounds don't always begin identically
              const duration = soundToPlay.duration || 0
              const maxOffset = Math.min(2, duration * 0.3)
              soundToPlay.currentTime = maxOffset > 0 ? Math.random() * maxOffset : 0
              // Slight pitch variation via playbackRate (0.95 - 1.05) for natural feel
              soundToPlay.playbackRate = 0.95 + Math.random() * 0.10
              console.log(`🔊 ATTEMPTING TO PLAY: ${emergencyType} (offset: ${soundToPlay.currentTime.toFixed(1)}s, rate: ${soundToPlay.playbackRate.toFixed(2)})`)
              await soundToPlay.play()
              console.log(`✅ SUCCESS! Now playing: ${emergencyType}`)
          } else {
              console.log(`⚠️ No sound found for emergency type: ${emergencyType}`)
          }
        } catch (e) {
          console.error(`❌ SIREN PLAY FAILED for ${emergencyType}:`, e)
          console.error('   Error details:', e.message, e.name)
        }
      }
      playSiren()
    } else {
      console.log(`⏸️ Not playing emergency sound - emergencyActive: ${emergencyActive}, gameStarted: ${gameStarted}`)
    }
  }, [emergencyActive, emergencyType, gameStarted, soundEnabled])

  const enableSound = async () => {
    console.log('🔊 User clicked Enable Sound button')
    console.log('📊 Current state - gameStarted:', gameStarted, 'audioInitialized:', audioInitialized)
    
    setSoundEnabled(true)
    setShowButton(false)
    
    // Simplified unlock process - just try to play/pause each sound
    try {
      console.log('🔓 Unlocking audio (simplified method)...')
      
      // Try unlocking each audio file
      for (const [name, audio] of Object.entries(audioRefs.current)) {
        try {
          audio.volume = 0.1 // Low volume for unlock
          await audio.play()
          audio.pause()
          audio.currentTime = 0
          console.log(`✅ Unlocked: ${name}`)
        } catch (e) {
          console.warn(`⚠️ Unlock ${name} failed:`, e.message)
          // Continue anyway
        }
      }
      
      console.log("🎉 Audio unlock completed - sounds ready!")
      
      // Immediately start background sounds if game is running
      if (gameStarted && audioRefs.current.cityAmbience && audioRefs.current.engine) {
        try {
          console.log('🎵 Starting background sounds immediately...')
          audioRefs.current.cityAmbience.volume = 0.3
          audioRefs.current.engine.volume = 0.2
          
          await audioRefs.current.cityAmbience.play()
          console.log("✅ City ambience started")
          
          await audioRefs.current.engine.play()
          console.log("✅ Engine sound started")
        } catch (bgError) {
          console.error("❌ Background sounds failed:", bgError.message)
        }
      }
      
      alert("✅ Sound enabled! You should now hear background sounds and emergency sirens.")
      
    } catch (e) {
      console.error("❌ Unlock error:", e)
      // Don't block - let sounds try to play anyway
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
            🔊 CLICK HERE TO ENABLE SOUND! 🔊
          </button>
          <p style={{ 
            color: 'white', 
            marginTop: '25px', 
            textAlign: 'center', 
            fontSize: '1.3rem',
            fontWeight: 'bold',
            textShadow: '1px 1px 3px rgba(0,0,0,0.8)'
          }}>
            🎮 Sound is required for this game! 🎮
          </p>
          <p style={{ 
            color: '#f39c12', 
            marginTop: '15px', 
            textAlign: 'center', 
            fontSize: '1rem',
            fontWeight: 'bold'
          }}>
            Audio Status: {audioInitialized ? '✅ Ready' : '⏳ Loading...'}
          </p>
          <p style={{ 
            color: '#bbb', 
            marginTop: '10px', 
            textAlign: 'center', 
            fontSize: '0.85rem'
          }}>
            Click the button above to hear emergency sirens
          </p>
        </div>
      )}
    </>
  )
}
