/**
 * WeatherEffects Component - Dynamic Visibility Overlays
 * =======================================================
 * CSS/Canvas-based weather overlays that add visual variety
 * and increase figure-ground discrimination difficulty.
 * 
 * Research Basis:
 * - Musiek et al. (2005): Figure-ground separation training
 * - Vygotsky (1978): Zone of Proximal Development — progressive difficulty
 * 
 * Accessibility:
 * - Weather overlay z-index is BELOW EmergencyOverlay
 * - Emergency instruction banner is never obscured
 * - Effects are subtle enough to not cause seizure risk (WCAG 2.3.1)
 */

import React, { useMemo } from 'react'
import { useGameStore } from '../store'
import { motion } from 'framer-motion'

// Generate fixed rain drop positions (avoid re-render flicker)
function useRainDrops(count = 80) {
  return useMemo(() => (
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 2,
      duration: 0.6 + Math.random() * 0.4,
      height: 15 + Math.random() * 20,
      opacity: 0.3 + Math.random() * 0.5,
    }))
  ), [count])
}

function RainOverlay() {
  const drops = useRainDrops(80)

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', overflow: 'hidden', zIndex: 8,
    }}>
      {drops.map(drop => (
        <motion.div
          key={drop.id}
          animate={{ y: ['0vh', '105vh'] }}
          transition={{
            duration: drop.duration,
            repeat: Infinity,
            delay: drop.delay,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            left: drop.left,
            top: '-5vh',
            width: '2px',
            height: `${drop.height}px`,
            background: `rgba(174, 214, 241, ${drop.opacity})`,
            borderRadius: '0 0 2px 2px',
          }}
        />
      ))}
      {/* Rain tint overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(30, 60, 90, 0.15)',
      }} />
    </div>
  )
}

function FogOverlay() {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 8,
    }}>
      <motion.div
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'radial-gradient(ellipse at center, rgba(200,200,200,0.3) 0%, rgba(150,150,150,0.5) 50%, rgba(100,100,100,0.3) 100%)',
        }}
      />
      {/* Fog gradient — thicker at bottom (like real fog) */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60%',
        background: 'linear-gradient(to top, rgba(180,180,180,0.4), transparent)',
      }} />
    </div>
  )
}

function NightOverlay() {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 8,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0, 0, 20, 0.45)',
      }} />
      {/* Subtle vignette effect */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
      }} />
    </div>
  )
}

export default function WeatherEffects() {
  const currentWeather = useGameStore(s => s.currentWeather)
  const gameStarted = useGameStore(s => s.gameStarted)
  const isPaused = useGameStore(s => s.isPaused)

  if (!gameStarted || isPaused || !currentWeather || currentWeather.id === 'clear') return null

  return (
    <>
      {currentWeather.id === 'rain' && <RainOverlay />}
      {currentWeather.id === 'fog' && <FogOverlay />}
      {currentWeather.id === 'night' && <NightOverlay />}

      {/* Zone + Weather indicator (small unobtrusive badge) */}
      <div style={{
        position: 'absolute', bottom: 80, right: 20, zIndex: 9,
        background: 'rgba(0,0,0,0.6)', borderRadius: '10px',
        padding: '6px 12px', color: '#fff', fontSize: '0.8rem',
        fontFamily: 'Arial, sans-serif', pointerEvents: 'none',
        border: '1px solid rgba(255,255,255,0.15)',
      }}>
        {currentWeather.label}
      </div>
    </>
  )
}
