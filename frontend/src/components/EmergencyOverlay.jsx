/**
 * EmergencyOverlay Component - Research-Enhanced
 * ================================================
 * Implements multimodal visual cue system per:
 * - Erber (1982): Visual supplement hierarchy for hearing-impaired
 * - Massaro & Light (2003): Bimodal speech perception advantages
 * - WCAG 2.1 AAA: Contrast ratio ≥ 7:1 for all text
 * - WHO (2021): Multi-sensory redundancy for accessibility
 * 
 * Features:
 * - Vehicle-specific color-coded borders (unique chromatic coding)
 * - Animated directional arrows with pulsing indicators
 * - High-contrast text with black stroke outlines
 * - Countdown timer visualization (8-second response window)
 * - Visual-only mode support (no reliance on audio)
 */

import React, { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store'
import { motion, AnimatePresence } from 'framer-motion'
import { DISASTER_THEMES } from '../config'

// Use shared disaster themes (colorblind-safe):
// - Tsunami: deep blue #005F99   🌊
// - Earthquake: earth brown #7A4419  🏚️
// - Flood: teal-green #00897B   🌧️  (distinct from tsunami)
// - Air Raid: violet #7B2D8E    🚨
// - Fire: deep red #C62828      🔥
const VEHICLE_THEMES = DISASTER_THEMES

// Countdown Timer Component — pause-aware
function CountdownBar({ duration = 8 }) {
  const isPaused = useGameStore((state) => state.isPaused)
  const [progress, setProgress] = useState(100)
  const elapsedRef = useRef(0)       // total elapsed seconds (accumulated across pauses)
  const frameRef = useRef(null)
  const lastTickRef = useRef(null)

  useEffect(() => {
    if (isPaused) {
      // Freeze — stop the animation loop
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      lastTickRef.current = null
      return
    }

    // Start / resume the countdown
    lastTickRef.current = performance.now()

    const animate = () => {
      const now = performance.now()
      if (lastTickRef.current != null) {
        elapsedRef.current += (now - lastTickRef.current) / 1000
      }
      lastTickRef.current = now
      const remaining = Math.max(0, ((duration - elapsedRef.current) / duration) * 100)
      setProgress(remaining)
      if (remaining > 0) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }
    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [duration, isPaused])

  // Reset elapsed when a new emergency starts (component remounts)
  useEffect(() => {
    elapsedRef.current = 0
    setProgress(100)
  }, [])

  const barColor = progress > 60 ? '#2ecc71' : progress > 30 ? '#f39c12' : '#e74c3c'

  return (
    <div style={{
      position: 'absolute', bottom: '8px', left: '5%', width: '90%', height: '8px',
      background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden', zIndex: 30
    }}>
      <motion.div style={{
        width: `${progress}%`, height: '100%', background: barColor,
        borderRadius: '4px', transition: 'background 0.3s'
      }} />
    </div>
  )
}

// Directional Arrow Animation
function DirectionalArrow({ direction, color }) {
  const arrowConfig = {
    right: { symbol: '➡️', motion: { x: [0, 20, 0] }, style: { right: '280px', top: '50%' } },
    left: { symbol: '⬅️', motion: { x: [0, -20, 0] }, style: { left: '280px', top: '50%' } },
    center: { symbol: '⏺️', motion: { scale: [1, 1.3, 1] }, style: { left: '50%', top: '55%', transform: 'translateX(-50%)' } },
    stop: { symbol: '🛑', motion: { y: [0, 10, 0] }, style: { left: '50%', bottom: '120px', transform: 'translateX(-50%)' } },
    slow: { symbol: '🔽', motion: { y: [0, 8, 0] }, style: { left: '50%', bottom: '120px', transform: 'translateX(-50%)' } }
  }

  const config = arrowConfig[direction] || arrowConfig.center

  return (
    <motion.div
      animate={config.motion}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute', ...config.style, fontSize: '4rem',
        zIndex: 25, filter: `drop-shadow(0 0 15px ${color})`
      }}
    >
      {config.symbol}
    </motion.div>
  )
}

export default function EmergencyOverlay() {
  const { emergencyActive, emergencyType, gameMode } = useGameStore()
  const theme = emergencyType ? VEHICLE_THEMES[emergencyType] : null

  return (
    <AnimatePresence>
      {emergencyActive && theme && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
          
          {/* === Vehicle-Specific Colored Border Flash === */}
          <motion.div
            animate={{
              boxShadow: [
                `inset 0 0 60px 25px ${theme.glow}`,
                `inset 0 0 30px 10px transparent`,
                `inset 0 0 60px 25px ${theme.glow}`
              ]
            }}
            transition={{ duration: 0.6, repeat: Infinity }}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: `4px solid ${theme.primary}`, borderRadius: '0' }}
          />

          {/* === Central Instruction Banner (WCAG AAA Compliant) === */}
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            style={{
              position: 'absolute', top: '8%', width: '100%', textAlign: 'center', zIndex: 25
            }}
          >
            <div style={{
              display: 'inline-block', padding: '15px 40px',
              background: `linear-gradient(135deg, ${theme.primary}CC, ${theme.primary}99)`,
              borderRadius: '20px', border: `3px solid ${theme.secondary}`,
              boxShadow: `0 0 30px ${theme.glow}`
            }}>
              <div style={{ fontSize: '2.5rem', color: 'white', fontWeight: 'bold',
                textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000' }}>
                {gameMode === 'visual-only' ? '👁️ Look!' : '🔊 Listen!'} {theme.icon} {theme.action}
              </div>
              <div style={{ fontSize: '1.3rem', color: theme.secondary, marginTop: '5px',
                textShadow: '1px 1px 0 #000, -1px -1px 0 #000' }}>
                {theme.sinhala} — {theme.actionSinhala}
              </div>
            </div>
          </motion.div>

          {/* === Animated Directional Arrow === */}
          <DirectionalArrow direction={theme.direction} color={theme.primary} />

          {/* === LEFT OPTION PANEL (Building Fire - Move Left) === */}
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            style={{
              position: 'absolute', left: 0, top: '28%', bottom: '28%', width: '240px',
              background: emergencyType === 'building_fire_alarm' 
                ? `linear-gradient(135deg, ${VEHICLE_THEMES.building_fire_alarm.primary}DD, ${VEHICLE_THEMES.building_fire_alarm.primary}88)` 
                : 'rgba(0,0,0,0.85)',
              borderRight: `5px solid ${VEHICLE_THEMES.building_fire_alarm.primary}`,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              color: 'white', borderTopRightRadius: '20px', borderBottomRightRadius: '20px', zIndex: 20,
              boxShadow: emergencyType === 'building_fire_alarm' ? `0 0 40px ${VEHICLE_THEMES.building_fire_alarm.glow}` : 'none'
            }}
          >
            <motion.span 
              animate={emergencyType === 'building_fire_alarm' ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.6, repeat: Infinity }}
              style={{ fontSize: '4.5rem' }}
            >🔥</motion.span>
            <h3 style={{ fontSize: '1.4rem', margin: '8px 0', textShadow: '2px 2px 4px #000' }}>Building Fire</h3>
            <h4 style={{ fontSize: '1rem', margin: 0, color: VEHICLE_THEMES.building_fire_alarm.secondary }}>
              ⬅️ වමට (Left)
            </h4>
            <motion.p 
              animate={{ x: [-5, -15, -5] }} 
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{ color: VEHICLE_THEMES.building_fire_alarm.primary, fontWeight: 'bold', fontSize: '2rem', margin: '5px 0' }}
            >⬅️</motion.p>
          </motion.div>

          {/* === RIGHT OPTION PANEL (Tsunami - Move Right) === */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            style={{
              position: 'absolute', right: 0, top: '28%', bottom: '28%', width: '240px',
              background: emergencyType === 'tsunami_siren' 
                ? `linear-gradient(135deg, ${VEHICLE_THEMES.tsunami_siren.primary}DD, ${VEHICLE_THEMES.tsunami_siren.primary}88)` 
                : 'rgba(0,0,0,0.85)',
              borderLeft: `5px solid ${VEHICLE_THEMES.tsunami_siren.primary}`,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              color: 'white', borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px', zIndex: 20,
              boxShadow: emergencyType === 'tsunami_siren' ? `0 0 40px ${VEHICLE_THEMES.tsunami_siren.glow}` : 'none'
            }}
          >
            <motion.span 
              animate={emergencyType === 'tsunami_siren' ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.6, repeat: Infinity }}
              style={{ fontSize: '4.5rem' }}
            >🌊</motion.span>
            <h3 style={{ fontSize: '1.4rem', margin: '8px 0', textShadow: '2px 2px 4px #000' }}>Tsunami</h3>
            <h4 style={{ fontSize: '1rem', margin: 0, color: VEHICLE_THEMES.tsunami_siren.secondary }}>
              ➡️ දකුණට (Right)
            </h4>
            <motion.p 
              animate={{ x: [5, 15, 5] }} 
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{ color: VEHICLE_THEMES.tsunami_siren.primary, fontWeight: 'bold', fontSize: '2rem', margin: '5px 0' }}
            >➡️</motion.p>
          </motion.div>

          {/* === CENTER/TOP OPTION (Air Raid - Stay Center) === */}
          <motion.div
            initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              padding: '12px 35px',
              background: emergencyType === 'air_raid_siren' 
                ? `linear-gradient(135deg, ${VEHICLE_THEMES.air_raid_siren.primary}DD, ${VEHICLE_THEMES.air_raid_siren.primary}88)` 
                : 'rgba(0,0,0,0.85)',
              borderBottom: `5px solid ${VEHICLE_THEMES.air_raid_siren.primary}`,
              color: 'white', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20,
              boxShadow: emergencyType === 'air_raid_siren' ? `0 0 40px ${VEHICLE_THEMES.air_raid_siren.glow}` : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <motion.span 
                animate={emergencyType === 'air_raid_siren' ? { rotate: [0, -10, 10, 0] } : {}}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{ fontSize: '3rem' }}
              >🚨</motion.span>
              <div>
                <h3 style={{ fontSize: '1.2rem', margin: 0, textShadow: '2px 2px 4px #000' }}>Air Raid</h3>
                <h4 style={{ fontSize: '0.9rem', margin: '4px 0', color: VEHICLE_THEMES.air_raid_siren.secondary }}>මැද (Center)</h4>
                <p style={{ color: VEHICLE_THEMES.air_raid_siren.primary, fontWeight: 'bold', margin: 0 }}>⬆️ Arrow Up</p>
              </div>
            </div>
          </motion.div>

          {/* === BOTTOM OPTION (Earthquake - Stop) === */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            style={{
              position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
              padding: '12px 35px',
              background: emergencyType === 'earthquake_alarm' 
                ? `linear-gradient(135deg, ${VEHICLE_THEMES.earthquake_alarm.primary}DD, ${VEHICLE_THEMES.earthquake_alarm.primary}88)` 
                : 'rgba(0,0,0,0.85)',
              borderTop: `5px solid ${VEHICLE_THEMES.earthquake_alarm.primary}`,
              color: 'white', borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20,
              boxShadow: emergencyType === 'earthquake_alarm' ? `0 0 40px ${VEHICLE_THEMES.earthquake_alarm.glow}` : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <motion.span 
                animate={emergencyType === 'earthquake_alarm' ? { y: [0, -8, 0] } : {}}
                transition={{ duration: 0.4, repeat: Infinity }}
                style={{ fontSize: '3rem' }}
              >🏚️</motion.span>
              <div>
                <h3 style={{ fontSize: '1.2rem', margin: 0, textShadow: '2px 2px 4px #000' }}>Earthquake</h3>
                <h4 style={{ fontSize: '0.9rem', margin: '4px 0', color: VEHICLE_THEMES.earthquake_alarm.secondary }}>භූමිකම්පා (Stop)</h4>
                <motion.p 
                  animate={{ y: [0, 5, 0] }} 
                  transition={{ duration: 0.6, repeat: Infinity }}
                  style={{ color: VEHICLE_THEMES.earthquake_alarm.primary, fontWeight: 'bold', margin: 0 }}
                >⬇️ Arrow Down</motion.p>
              </div>
            </div>
          </motion.div>

          {/* === FLOOD WARNING OPTION (Top-Left Corner — Press S) === */}
          <motion.div
            initial={{ x: '-100%', y: '-50%' }} animate={{ x: 0, y: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
            style={{
              position: 'absolute', top: '8%', left: '20px', padding: '10px 15px',
              background: emergencyType === 'flood_warning' 
                ? `linear-gradient(135deg, ${VEHICLE_THEMES.flood_warning.primary}DD, ${VEHICLE_THEMES.flood_warning.primary}88)` 
                : 'rgba(0,0,0,0.85)',
              border: `3px solid ${VEHICLE_THEMES.flood_warning.primary}`,
              borderRadius: '15px', color: 'white',
              display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20,
              boxShadow: emergencyType === 'flood_warning' ? `0 0 30px ${VEHICLE_THEMES.flood_warning.glow}` : 'none'
            }}
          >
            <motion.span 
              animate={emergencyType === 'flood_warning' ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{ fontSize: '2.8rem' }}
            >
            {VEHICLE_THEMES.flood_warning.icon}
            </motion.span>
            <h3 style={{ fontSize: '0.95rem', margin: '4px 0', textShadow: '2px 2px 4px #000' }}>Flood</h3>
            <h4 style={{ fontSize: '0.8rem', margin: 0, color: VEHICLE_THEMES.flood_warning.secondary }}>🏠 ආරක්ෂිත (Safe)</h4>
            <p style={{ color: VEHICLE_THEMES.flood_warning.primary, fontWeight: 'bold', margin: '2px 0', fontSize: '0.9rem' }}>Press 'S'</p>
          </motion.div>

          {/* === Countdown Timer Bar === */}
          <CountdownBar duration={8} />

        </div>
      )}
    </AnimatePresence>
  )
}
