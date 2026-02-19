/**
 * GameHUD Component - Real-Time ML Feedback Display
 * ===================================================
 * Shows live cognitive metrics, BKT skill progress, and achievements
 * during gameplay for both the child and observing therapist/parent.
 * 
 * Research Basis:
 * - Csikszentmihalyi (1990): Flow state feedback loops
 * - Deci & Ryan (2000): SDT — competence feedback for intrinsic motivation
 * - Hattie & Timperley (2007): Power of feedback in learning
 * - Sailer et al. (2017): Gamification progress indicators
 * 
 * Accessibility:
 * - WCAG 2.1 AAA contrast ratios
 * - Non-intrusive positioning (doesn't occlude game action)
 * - Collapsible for minimal distraction during play
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '../store'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Compact skill name mapping
const SKILL_LABELS = {
  frequency_discrimination: 'Freq. Disc.',
  temporal_pattern_recognition: 'Temporal',
  figure_ground_separation: 'Fig-Ground',
  sound_action_mapping: 'Sound-Action',
  auditory_attention: 'Attention'
}

const SKILL_ICONS = {
  frequency_discrimination: '🎵',
  temporal_pattern_recognition: '⏱️',
  figure_ground_separation: '🔊',
  sound_action_mapping: '🎯',
  auditory_attention: '👁️'
}

function MiniSkillBar({ name, value, icon }) {
  const pct = Math.round((value || 0) * 100)
  const color = pct >= 80 ? '#2ecc71' : pct >= 50 ? '#f39c12' : '#e74c3c'
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
      <span style={{ fontSize: '0.75rem', width: '16px' }}>{icon}</span>
      <span style={{ fontSize: '0.65rem', color: '#ccc', width: '55px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
        {name}
      </span>
      <div style={{ 
        flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', 
        borderRadius: '3px', overflow: 'hidden', minWidth: '40px' 
      }}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: '3px' }} 
        />
      </div>
      <span style={{ fontSize: '0.65rem', color, fontWeight: 'bold', width: '28px', textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  )
}

function CognitiveLoadGauge({ load }) {
  const pct = Math.round((load || 0) * 100)
  const color = pct < 30 ? '#2ecc71' : pct < 60 ? '#f39c12' : '#e74c3c'
  const label = pct < 30 ? 'Low' : pct < 60 ? 'Medium' : 'High'
  
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '3px' }}>Cognitive Load</div>
      <div style={{ position: 'relative', width: '50px', height: '50px', margin: '0 auto' }}>
        <svg width="50" height="50" viewBox="0 0 50 50">
          {/* Background circle */}
          <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
          {/* Progress arc */}
          <circle 
            cx="25" cy="25" r="20" fill="none" 
            stroke={color} strokeWidth="4"
            strokeDasharray={`${pct * 1.26} 126`}
            strokeLinecap="round"
            transform="rotate(-90 25 25)"
          />
        </svg>
        <div style={{ 
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          fontSize: '0.7rem', fontWeight: 'bold', color 
        }}>
          {pct}%
        </div>
      </div>
      <div style={{ fontSize: '0.6rem', color, fontWeight: 'bold' }}>{label}</div>
    </div>
  )
}

function FlowIndicator({ inFlow }) {
  return (
    <motion.div
      animate={inFlow ? { 
        boxShadow: ['0 0 5px rgba(46,204,113,0.3)', '0 0 15px rgba(46,204,113,0.6)', '0 0 5px rgba(46,204,113,0.3)']
      } : {}}
      transition={{ duration: 2, repeat: Infinity }}
      style={{
        textAlign: 'center', padding: '4px 8px', borderRadius: '8px',
        background: inFlow ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.15)',
        border: `1px solid ${inFlow ? '#2ecc71' : 'rgba(231,76,60,0.3)'}`,
      }}
    >
      <div style={{ fontSize: '1rem' }}>{inFlow ? '✨' : '🎯'}</div>
      <div style={{ fontSize: '0.6rem', color: inFlow ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
        {inFlow ? 'In Flow!' : 'Building...'}
      </div>
    </motion.div>
  )
}

function StreakDisplay({ streak }) {
  if (!streak || streak < 2) return null
  
  return (
    <motion.div
      key={streak}
      initial={{ scale: 1.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        textAlign: 'center', padding: '4px 8px', borderRadius: '8px',
        background: streak >= 5 ? 'rgba(255,215,0,0.2)' : 'rgba(52,152,219,0.2)',
        border: `1px solid ${streak >= 5 ? '#FFD700' : '#3498db'}`
      }}
    >
      <div style={{ fontSize: '1rem' }}>{streak >= 10 ? '🔥' : streak >= 5 ? '⭐' : '✅'}</div>
      <div style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 'bold' }}>{streak}x</div>
    </motion.div>
  )
}

function DueReviewBadge({ count }) {
  if (!count || count === 0) return null
  
  return (
    <div style={{
      textAlign: 'center', padding: '4px 8px', borderRadius: '8px',
      background: 'rgba(155,89,182,0.2)', border: '1px solid #9b59b6'
    }}>
      <div style={{ fontSize: '1rem' }}>🔔</div>
      <div style={{ fontSize: '0.6rem', color: '#9b59b6', fontWeight: 'bold' }}>
        {count} Due
      </div>
    </div>
  )
}

export default function GameHUD() {
  const { userId, gameStarted, emergencyActive, score, level, mlMetrics } = useGameStore()
  const [collapsed, setCollapsed] = useState(false)
  const [bktSkills, setBktSkills] = useState(null)
  const [dueReviews, setDueReviews] = useState(0)
  const [streak, setStreak] = useState(0)
  const [achievements, setAchievements] = useState(null)
  const [newAchievement, setNewAchievement] = useState(null)
  const [prevEarnedCount, setPrevEarnedCount] = useState(0)

  // Fetch BKT skills and achievements periodically
  const fetchHUDData = useCallback(async () => {
    if (!userId) return
    
    try {
      const [bktRes, dueRes, achRes] = await Promise.allSettled([
        fetch(`${API_URL}/bkt/skill-levels/${userId}`),
        fetch(`${API_URL}/spaced-repetition/due-reviews/${userId}`),
        fetch(`${API_URL}/achievements/${userId}`)
      ])
      
      if (bktRes.status === 'fulfilled' && bktRes.value.ok) {
        const data = await bktRes.value.json()
        setBktSkills(data.skills)
      }
      
      if (dueRes.status === 'fulfilled' && dueRes.value.ok) {
        const data = await dueRes.value.json()
        setDueReviews(data.due_count)
      }
      
      if (achRes.status === 'fulfilled' && achRes.value.ok) {
        const data = await achRes.value.json()
        setAchievements(data)
        
        // Check for newly earned achievements
        if (data.total_earned > prevEarnedCount && prevEarnedCount > 0) {
          const newest = data.earned_achievements[data.earned_achievements.length - 1]
          setNewAchievement(newest)
          setTimeout(() => setNewAchievement(null), 4000)
        }
        setPrevEarnedCount(data.total_earned)
        
        // Update streak from metrics
        setStreak(data.metrics_summary?.max_streak || 0)
      }
    } catch (err) {
      // Silent fail — HUD is non-critical
    }
  }, [userId, prevEarnedCount])

  // Refresh HUD data every 15 seconds during gameplay
  useEffect(() => {
    if (!gameStarted || !userId) return
    
    fetchHUDData()
    const interval = setInterval(fetchHUDData, 15000)
    return () => clearInterval(interval)
  }, [gameStarted, userId, fetchHUDData])

  if (!gameStarted || !userId) return null

  // During emergency, hide HUD to reduce distraction
  if (emergencyActive && collapsed) return null

  return (
    <>
      {/* New Achievement Popup */}
      <AnimatePresence>
        {newAchievement && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0 }}
            style={{
              position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #f39c12, #e67e22)', padding: '15px 30px',
              borderRadius: '15px', zIndex: 500, textAlign: 'center', color: 'white',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)', border: '2px solid #FFD700'
            }}
          >
            <div style={{ fontSize: '2.5rem' }}>{newAchievement.icon}</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Achievement Unlocked!</div>
            <div style={{ fontSize: '1rem' }}>{newAchievement.name}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{newAchievement.name_sinhala}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsible HUD Panel - Left Side */}
      <div style={{
        position: 'absolute', top: '100px', left: '10px', zIndex: 15,
        pointerEvents: 'auto'
      }}>
        {/* Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px', color: 'white', padding: '4px 8px', cursor: 'pointer',
            fontSize: '0.7rem', marginBottom: '5px', display: 'block'
          }}
        >
          {collapsed ? '📊 Show Stats' : '📊 Hide'}
        </button>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{
                background: 'rgba(0,0,0,0.75)', borderRadius: '12px',
                padding: '10px', width: '200px', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}
            >
              {/* Quick Status Row */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '8px' }}>
                <CognitiveLoadGauge load={mlMetrics?.cognitive_load} />
                <FlowIndicator inFlow={mlMetrics?.in_flow_state} />
                <StreakDisplay streak={streak} />
                <DueReviewBadge count={dueReviews} />
              </div>

              {/* BKT Skill Bars */}
              {bktSkills && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#aaa', marginBottom: '4px', textAlign: 'center' }}>
                    🧠 Skill Mastery (BKT)
                  </div>
                  {Object.entries(bktSkills).map(([skill, data]) => (
                    <MiniSkillBar 
                      key={skill}
                      name={SKILL_LABELS[skill] || skill}
                      value={data?.p_know || data?.p_learned || 0}
                      icon={SKILL_ICONS[skill] || '📊'}
                    />
                  ))}
                </div>
              )}

              {/* ML Recommendation Reason */}
              {mlMetrics?.reason && (
                <div style={{
                  marginTop: '6px', padding: '4px 6px', background: 'rgba(52,152,219,0.15)',
                  borderRadius: '6px', fontSize: '0.6rem', color: '#87CEEB'
                }}>
                  💡 {mlMetrics.reason.split(' | ')[0]}
                </div>
              )}

              {/* Achievements Progress */}
              {achievements && (
                <div style={{
                  marginTop: '6px', padding: '4px 6px', background: 'rgba(243,156,18,0.15)',
                  borderRadius: '6px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.6rem', color: '#f39c12' }}>
                    🏆 {achievements.total_earned}/{achievements.total_available} Achievements
                  </div>
                  {achievements.next_achievement && (
                    <div style={{ fontSize: '0.55rem', color: '#aaa', marginTop: '2px' }}>
                      Next: {achievements.next_achievement.icon} {achievements.next_achievement.name} ({achievements.next_achievement.progress}%)
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
