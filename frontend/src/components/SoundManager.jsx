import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store'
import { devLog, devWarn } from '../config'
import { getAudioContext, getProcessingInputNode, isAudioChainReady } from './AudioProcessor'

export default function SoundManager() {
  const { emergencyActive, emergencyType, gameStarted, level, isPaused } = useGameStore()
  const [soundEnabled, setSoundEnabled] = useState(true) // ALWAYS TRUE NOW
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
      distractor_icecream: new Audio('/sounds/distractor_icecream.mp3'),
      distractor_horn: new Audio('/sounds/distractor_horn.mp3'),
      distractor_dog: new Audio('/sounds/distractor_dog.mp3'),
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
      
      // Auto-unlock AudioContext if it was suspended (using the click from the Start screen)
      const ctx = getAudioContext()
      if (ctx?.state === 'suspended') {
        ctx.resume().catch(() => devWarn("Could not resume audio context automatically"));
      }

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
            // Procedural Audio Generation & Doppler Effect Setup
            soundToPlay.volume = 0.1 // Start quiet (far away)
            const duration = soundToPlay.duration || 0
            const maxOffset = Math.min(2, duration * 0.3)
            soundToPlay.currentTime = maxOffset > 0 ? Math.random() * maxOffset : 0
            
            // Base procedural pitch shift (so it doesn't sound like rote memorization)
            const baseRate = 0.95 + Math.random() * 0.10
            soundToPlay.playbackRate = baseRate
            
            devLog(`🚨 Playing Procedural Siren: ${emergencyType}`)
            await soundToPlay.play()

            // Doppler Effect Simulation (Approaching then passing)
            let timePassed = 0;
            const dopplerInterval = setInterval(() => {
              if (!useGameStore.getState().emergencyActive || soundToPlay.paused) {
                clearInterval(dopplerInterval);
                return;
              }
              timePassed += 100;
              // Simulate vehicle approaching over 4 seconds, then passing
              if (timePassed < 4000) {
                // Approaching: volume increases, pitch is higher (Doppler blue-shift)
                if (soundToPlay.volume < 1.0) soundToPlay.volume = Math.min(1.0, soundToPlay.volume + 0.05);
                soundToPlay.playbackRate = baseRate + 0.05; 
              } else if (timePassed < 6000) {
                // Right next to player
                soundToPlay.volume = 1.0;
                soundToPlay.playbackRate = baseRate;
              } else {
                // Moving away: volume drops, pitch lowers (Doppler red-shift)
                if (soundToPlay.volume > 0.1) soundToPlay.volume = Math.max(0.1, soundToPlay.volume - 0.05);
                soundToPlay.playbackRate = baseRate - 0.08;
              }
            }, 100);

          }
        } catch (e) {
          devWarn(` SIREN PLAY FAILED for ${emergencyType}:`, e)
        }
      }
      playSiren()
    }
  }, [emergencyActive, emergencyType, gameStarted, soundEnabled])

  // Removed the manual enableSound button and alerts because 
  // the initial "Start Game" click from StartScreen unlocks the audio context naturally.
  return null;
}
