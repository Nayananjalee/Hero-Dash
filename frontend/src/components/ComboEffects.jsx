/**
 * ComboEffects Component - Streak Celebration Overlays
 * =====================================================
 * Renders escalating visual celebrations for consecutive correct answers.
 * 
 * Research Basis:
 * - Skinner (1957): Variable ratio reinforcement schedule
 * - Ryan & Deci (2000): SDT competence feedback
 * - Sailer et al. (2017): Gamification progress indicators
 */

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store'

// Particle burst generator
function ParticleBurst({ color, count = 20 }) {
  const particles = useMemo(() => (
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 500,
      y: (Math.random() - 0.5) * 400,
      size: 4 + Math.random() * 8,
      delay: Math.random() * 0.3,
      rotation: Math.random() * 360,
    }))
  ), [count])

  return (
    <>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
          animate={{ 
            opacity: 0, x: p.x, y: p.y, scale: 0, rotate: p.rotation 
          }}
          transition={{ duration: 1.5, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: p.size, height: p.size, borderRadius: '50%',
            background: color, pointerEvents: 'none',
          }}
        />
      ))}
    </>
  )
}

export default function ComboEffects() {
  const streak = useGameStore(s => s.streak)
  const comboMilestone = useGameStore(s => s.comboMilestone)
  const comboAnimationKey = useGameStore(s => s.comboAnimationKey)
  const gameStarted = useGameStore(s => s.gameStarted)

  if (!gameStarted || !comboMilestone) return null

  return (
    <AnimatePresence>
      {comboMilestone && (
        <div
          key={comboAnimationKey}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            pointerEvents: 'none', zIndex: 300
          }}
        >
          {/* Combo Text */}
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 1, 0], y: [50, -20, -30] }}
            transition={{ duration: 2, times: [0, 0.2, 0.7, 1] }}
            style={{
              position: 'absolute', top: '35%', left: '50%', transform: 'translateX(-50%)',
              textAlign: 'center', pointerEvents: 'none',
            }}
          >
            <div style={{
              fontSize: streak >= 7 ? '4rem' : '3rem',
              fontWeight: 'bold',
              color: comboMilestone.color,
              textShadow: `0 0 30px ${comboMilestone.color}, 0 0 60px ${comboMilestone.color}40, 
                          3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000`,
              fontFamily: 'Arial, sans-serif',
            }}>
              {comboMilestone.emoji} {comboMilestone.label}
            </div>
            <div style={{
              fontSize: '1.3rem', color: '#fff', opacity: 0.8, marginTop: '5px',
              textShadow: '2px 2px 4px #000',
            }}>
              {comboMilestone.labelSi}
            </div>
            <div style={{
              fontSize: '1.8rem', color: comboMilestone.color, fontWeight: 'bold', marginTop: '8px',
              textShadow: '2px 2px 4px #000',
            }}>
              {streak}x Streak • {comboMilestone.multiplier}× Points
            </div>
          </motion.div>

          {/* Particle burst for 5+ streak */}
          {streak >= 5 && (
            <ParticleBurst color={comboMilestone.color} count={streak >= 10 ? 40 : 20} />
          )}

          {/* Screen border glow for 7+ streak */}
          {streak >= 7 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0] }}
              transition={{ duration: 2 }}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                boxShadow: `inset 0 0 100px 30px ${comboMilestone.color}60`,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Bonus life notification */}
          {comboMilestone.bonusLife && streak === 10 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              style={{
                position: 'absolute', bottom: '25%', left: '50%', transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                padding: '12px 30px', borderRadius: '15px',
                border: '2px solid #fff', boxShadow: '0 0 30px rgba(231,76,60,0.5)',
                color: 'white', fontWeight: 'bold', fontSize: '1.3rem',
                textShadow: '2px 2px 4px #000',
              }}
            >
              ❤️ +1 Bonus Life!
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  )
}
