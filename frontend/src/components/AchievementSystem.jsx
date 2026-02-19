/**
 * AchievementNotification Component - Gamification Milestone System
 * =================================================================
 * Full-screen achievement unlocked overlay + persistent achievement gallery.
 * 
 * Research Basis:
 * - Deterding et al. (2011): Gamification framework
 * - Ryan & Deci (2020): Self-determination theory (SDT)
 * - Hamari et al. (2014): Gamification effectiveness in education
 * - Landers et al. (2017): Game elements and learning outcomes
 * 
 * Features:
 * - Toast notification for newly unlocked achievements
 * - Full achievement gallery with progress bars
 * - Bilingual (English + Sinhala)
 * - Celebratory particle animation on unlock
 * - Categorized by milestone type
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ============================================================
// TOAST NOTIFICATION (floats in from top-right)
// ============================================================
function AchievementToast({ achievement, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 120 }}
      style={{
        position: 'fixed', top: '20px', right: '20px', zIndex: 3000,
        background: 'linear-gradient(135deg, #2d2d44, #1a1a2e)',
        border: '2px solid #f1c40f', borderRadius: '16px',
        padding: '16px 24px', minWidth: '300px', maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(241,196,15,0.3)',
        cursor: 'pointer', fontFamily: 'Arial, sans-serif', color: 'white'
      }}
      onClick={onDismiss}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '2.5rem' }}>{achievement.icon}</div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#f1c40f', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Achievement Unlocked!
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{achievement.name}</div>
          <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{achievement.name_si}</div>
          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>{achievement.description}</div>
        </div>
      </div>
      {/* Sparkle effect */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, x: 0, y: 0 }}
          animate={{ 
            opacity: 0,
            x: (Math.random() - 0.5) * 150,
            y: (Math.random() - 0.5) * 100
          }}
          transition={{ duration: 1.5, delay: i * 0.1 }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#f1c40f', pointerEvents: 'none'
          }}
        />
      ))}
    </motion.div>
  )
}

// ============================================================
// FULL ACHIEVEMENT GALLERY
// ============================================================
function AchievementGallery({ achievements, onClose }) {
  const categories = useMemo(() => {
    const cats = {}
    achievements.forEach(a => {
      const cat = a.category || 'General'
      if (!cats[cat]) cats[cat] = []
      cats[cat].push(a)
    })
    return cats
  }, [achievements])

  const unlockedCount = achievements.filter(a => a.unlocked).length

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.85)', zIndex: 2500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        style={{
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '800px',
          maxHeight: '85vh', overflowY: 'auto', border: '2px solid rgba(255,255,255,0.1)',
          color: 'white'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem' }}>🏆 Achievements</h1>
            <div style={{ color: '#aaa', fontSize: '0.9rem' }}>
              {unlockedCount} / {achievements.length} unlocked — සාර්ථකත්වයන්
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '10px', color: 'white', padding: '8px 16px', cursor: 'pointer', fontSize: '1rem'
          }}>✕ Close</button>
        </div>

        {/* Progress Ring */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
            <circle cx="50" cy="50" r="42" stroke="#f1c40f" strokeWidth="8" fill="none"
              strokeDasharray={`${(unlockedCount / achievements.length) * 264} 264`}
              strokeLinecap="round" transform="rotate(-90 50 50)" />
            <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="18" fontWeight="bold">
              {Math.round((unlockedCount / achievements.length) * 100)}%
            </text>
          </svg>
        </div>

        {/* Categorized Achievements */}
        {Object.entries(categories).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#f1c40f', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>
              {cat}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {items.map(ach => (
                <div key={ach.id} style={{
                  background: ach.unlocked ? 'rgba(241,196,15,0.1)' : 'rgba(255,255,255,0.04)',
                  borderRadius: '12px', padding: '14px',
                  border: ach.unlocked ? '2px solid #f1c40f' : '2px solid rgba(255,255,255,0.1)',
                  opacity: ach.unlocked ? 1 : 0.6, transition: 'all 0.3s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.8rem', filter: ach.unlocked ? 'none' : 'grayscale(1)' }}>
                      {ach.icon}
                    </span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{ach.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#aaa' }}>{ach.name_si}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '8px' }}>{ach.description}</div>
                  {/* Progress bar */}
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, (ach.progress || 0))}%`, height: '100%',
                      background: ach.unlocked ? '#f1c40f' : '#3498db', borderRadius: '3px',
                      transition: 'width 0.5s'
                    }} />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '3px', textAlign: 'right' }}>
                    {ach.unlocked ? '✅ Unlocked' : `${(ach.progress || 0).toFixed(0)}%`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}

// ============================================================
// MAIN EXPORT - Achievement System Controller
// ============================================================
export default function AchievementSystem({ userId, show, onClose }) {
  const [achievements, setAchievements] = useState([])
  const [toastQueue, setToastQueue] = useState([])
  const previouslyUnlockedRef = useRef(new Set())

  const fetchAchievements = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`${API_URL}/achievements/${userId}`)
      const data = await res.json()
      const achList = data.achievements || []
      setAchievements(achList)

      // Detect newly unlocked
      const currentUnlocked = new Set(achList.filter(a => a.unlocked).map(a => a.id))
      if (previouslyUnlockedRef.current.size > 0) {
        const newOnes = achList.filter(a => a.unlocked && !previouslyUnlockedRef.current.has(a.id))
        if (newOnes.length > 0) {
          setToastQueue(prev => [...prev, ...newOnes])
        }
      }
      previouslyUnlockedRef.current = currentUnlocked
    } catch (err) {
      console.error('Failed to fetch achievements:', err)
    }
  }, [userId])

  // Poll every 30 seconds
  useEffect(() => {
    fetchAchievements()
    const interval = setInterval(fetchAchievements, 30000)
    return () => clearInterval(interval)
  }, [fetchAchievements])

  const dismissToast = useCallback(() => {
    setToastQueue(prev => prev.slice(1))
  }, [])

  return (
    <>
      {/* Toast notifications */}
      <AnimatePresence>
        {toastQueue.length > 0 && (
          <AchievementToast 
            key={toastQueue[0].id}
            achievement={toastQueue[0]}
            onDismiss={dismissToast}
          />
        )}
      </AnimatePresence>

      {/* Full gallery */}
      <AnimatePresence>
        {show && (
          <AchievementGallery 
            achievements={achievements}
            onClose={onClose}
          />
        )}
      </AnimatePresence>
    </>
  )
}
