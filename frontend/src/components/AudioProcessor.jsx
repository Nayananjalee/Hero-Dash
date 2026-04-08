/**
 * AudioProcessor Component - Web Audio API Integration
 * =====================================================
 * Implements frequency-specific audio processing for hearing-impaired users.
 * 
 * Research Basis:
 * - Dillon (2012): Hearing Aids - Parametric EQ for hearing loss compensation
 * - Moore (2007): Cochlear Hearing Loss - Frequency-specific gain prescription
 * - NAL-NL2 prescription formula (Keidser et al., 2011)
 * - WHO (2021): Audiometric frequency bands (250-8000 Hz)
 * 
 * Features:
 * - 6-band parametric equalizer at audiometric frequencies
 * - Dynamic range compression (hearing aid-like processing)
 * - Audiogram-based automatic gain prescription
 * - Real-time frequency response adjustment
 * - Background noise level control per difficulty
 * 
 * FIX: Now exposes the AudioContext and processing chain so SoundManager
 * can route audio through it (previously the chain was disconnected).
 */

import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../store'

// Standard audiometric frequencies (Hz) - ISO 8253-1
const AUDIOMETRIC_FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000]

// Default hearing thresholds by hearing level (dB HL)
// Based on WHO Classification (Clark, 1981)
const HEARING_LEVEL_THRESHOLDS = {
  normal:     { 250: 10, 500: 10, 1000: 10, 2000: 10, 4000: 10, 8000: 15 },
  mild:       { 250: 20, 500: 25, 1000: 30, 2000: 35, 4000: 40, 8000: 45 },
  moderate:   { 250: 30, 500: 35, 1000: 45, 2000: 50, 4000: 55, 8000: 55 },
  mod_severe: { 250: 40, 500: 50, 1000: 60, 2000: 65, 4000: 70, 8000: 70 },
  severe:     { 250: 55, 500: 65, 1000: 75, 2000: 80, 4000: 85, 8000: 85 },
  profound:   { 250: 70, 500: 80, 1000: 90, 2000: 95, 4000: 100, 8000: 100 }
}

/**
 * Calculate prescribed gain using simplified NAL-NL2 formula
 * Gain = 0.46 * (hearing_threshold - 20) for thresholds > 20 dB
 * Capped at reasonable amplification limits
 */
function calculatePrescribedGain(thresholdDB) {
  if (thresholdDB <= 20) return 0 // Normal hearing, no gain needed
  const gain = 0.46 * (thresholdDB - 20)
  return Math.min(gain, 30) // Cap at 30 dB gain to prevent distortion
}

// =================================================================
// Shared AudioContext singleton — accessible by SoundManager
// =================================================================
let _sharedAudioContext = null
let _sharedInputNode = null  // The entry point for audio sources
let _isChainReady = false

/**
 * Get the shared AudioContext. Creates one if needed.
 * SoundManager calls this to route its MediaElementSource nodes.
 */
export function getAudioContext() {
  if (!_sharedAudioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    _sharedAudioContext = new AudioCtx()
  }
  return _sharedAudioContext
}

/**
 * Get the input node of the processing chain.
 * SoundManager connects MediaElementSourceNodes to this.
 * Returns null if the chain isn't ready yet (falls back to direct output).
 */
export function getProcessingInputNode() {
  return _isChainReady ? _sharedInputNode : null
}

/**
 * Check if the processing chain is initialized.
 */
export function isAudioChainReady() {
  return _isChainReady
}

export default function AudioProcessor() {
  const { hearingProfile, mlMetrics, gameStarted, gameMode } = useGameStore()
  const currentNoiseLevel = mlMetrics?.noise_level ?? 0.2
  
  const eqFiltersRef = useRef([])
  const compressorRef = useRef(null)
  const gainNodeRef = useRef(null)
  const isInitializedRef = useRef(false)

  /**
   * Initialize Web Audio API processing chain:
   * Input GainNode → Parametric EQ (6 bands) → Compressor → Master Gain → Output
   * 
   * SoundManager connects its MediaElementSource nodes to the Input GainNode.
   */
  const initializeAudioChain = useCallback(() => {
    if (isInitializedRef.current) return
    
    try {
      const ctx = getAudioContext()
      if (!ctx) {
        console.warn('Web Audio API not supported')
        return
      }

      // Create an input gain node — this is the entry point for all game audio
      const inputGain = ctx.createGain()
      inputGain.gain.value = 1.0
      _sharedInputNode = inputGain

      // Create 6-band parametric EQ at audiometric frequencies
      const filters = AUDIOMETRIC_FREQUENCIES.map((freq) => {
        const filter = ctx.createBiquadFilter()
        filter.type = 'peaking'
        filter.frequency.value = freq
        filter.Q.value = 1.4 // Moderate Q for natural sound
        filter.gain.value = 0 // Start flat, adjusted by audiogram
        return filter
      })

      // Chain: inputGain → filter[0] → filter[1] → ... → filter[5]
      inputGain.connect(filters[0])
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1])
      }

      // Dynamic range compressor (hearing aid-like)
      const compressor = ctx.createDynamicsCompressor()
      compressor.threshold.value = -24  // Start compressing at -24 dB
      compressor.knee.value = 12        // Soft knee for natural sound
      compressor.ratio.value = 4        // 4:1 compression ratio
      compressor.attack.value = 0.005   // 5ms attack (fast for transients)
      compressor.release.value = 0.1    // 100ms release

      // Master gain control
      const masterGain = ctx.createGain()
      masterGain.gain.value = 1.0

      // Connect: last filter → compressor → master gain → destination
      filters[filters.length - 1].connect(compressor)
      compressor.connect(masterGain)
      masterGain.connect(ctx.destination)

      eqFiltersRef.current = filters
      compressorRef.current = compressor
      gainNodeRef.current = masterGain
      isInitializedRef.current = true
      _isChainReady = true

      console.log('🎛️ AudioProcessor: Web Audio chain initialized & shared')
      console.log(`   Frequencies: ${AUDIOMETRIC_FREQUENCIES.join(', ')} Hz`)
      console.log('   SoundManager can now route audio through this chain')
      
    } catch (error) {
      console.error('AudioProcessor initialization failed:', error)
    }
  }, [])

  /**
   * Apply audiogram-based EQ gains
   */
  const applyAudiogramGains = useCallback(() => {
    if (!isInitializedRef.current || !eqFiltersRef.current.length) return

    const hearingLevel = hearingProfile?.hearing_level || 'normal'
    const thresholds = hearingProfile?.audiogram_thresholds || HEARING_LEVEL_THRESHOLDS[hearingLevel] || HEARING_LEVEL_THRESHOLDS.normal

    console.log(`🎛️ Applying audiogram gains for: ${hearingLevel}`)

    AUDIOMETRIC_FREQUENCIES.forEach((freq, idx) => {
      const threshold = thresholds[freq] || 10
      const prescribedGainDB = calculatePrescribedGain(threshold)
      
      if (eqFiltersRef.current[idx]) {
        eqFiltersRef.current[idx].gain.value = prescribedGainDB
        console.log(`   ${freq}Hz: threshold=${threshold}dB → gain=${prescribedGainDB.toFixed(1)}dB`)
      }
    })

    // Adjust compressor based on hearing severity
    if (compressorRef.current) {
      const severityIndex = Object.keys(HEARING_LEVEL_THRESHOLDS).indexOf(hearingLevel)
      compressorRef.current.ratio.value = 3 + severityIndex * 0.5
      compressorRef.current.threshold.value = -20 - severityIndex * 3
    }
  }, [hearingProfile])

  /**
   * Adjust master volume based on noise level (difficulty)
   */
  const adjustForNoise = useCallback(() => {
    if (!gainNodeRef.current) return
    const ctx = getAudioContext()
    if (!ctx) return
    
    const noiseBoost = 1 + (currentNoiseLevel * 0.5)
    gainNodeRef.current.gain.setTargetAtTime(
      noiseBoost, 
      ctx.currentTime || 0, 
      0.1
    )
  }, [currentNoiseLevel])

  // Initialize on game start
  useEffect(() => {
    if (gameStarted && !isInitializedRef.current) {
      const timer = setTimeout(initializeAudioChain, 100)
      return () => clearTimeout(timer)
    }
  }, [gameStarted, initializeAudioChain])

  // Apply audiogram when hearing profile changes
  useEffect(() => {
    if (isInitializedRef.current) {
      applyAudiogramGains()
    }
  }, [hearingProfile, applyAudiogramGains])

  // Adjust for noise level changes
  useEffect(() => {
    adjustForNoise()
  }, [currentNoiseLevel, adjustForNoise])

  // Resume AudioContext on user interaction (browser requirement)
  useEffect(() => {
    const resumeContext = () => {
      const ctx = getAudioContext()
      if (ctx?.state === 'suspended') {
        ctx.resume()
        console.log('🎛️ AudioContext resumed')
      }
    }
    
    document.addEventListener('click', resumeContext)
    document.addEventListener('keydown', resumeContext)
    
    return () => {
      document.removeEventListener('click', resumeContext)
      document.removeEventListener('keydown', resumeContext)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (_sharedAudioContext) {
        _sharedAudioContext.close()
        _sharedAudioContext = null
        _sharedInputNode = null
        _isChainReady = false
        console.log('🎛️ AudioProcessor: Cleaned up')
      }
    }
  }, [])

  return null
}

/**
 * Procedural Audio Generation - Distractor Noise (Car Horn)
 * Generates a completely procedural, unrecorded horn sound to train 
 * Auditory Figure-Ground Discrimination.
 */
export const playProceduralDistractor = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();
  
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  const randomFreq = Math.random() * 50; 
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(350 + randomFreq, ctx.currentTime);
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(400 + randomFreq, ctx.currentTime);
  
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  
  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + 0.7);
  osc2.stop(ctx.currentTime + 0.7);
};
