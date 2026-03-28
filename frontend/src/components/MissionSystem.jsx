/**
 * MissionSystem Component - Crisis Story Missions
 * =================================================
 * Groups emergency scenarios into narrative-driven missions with goals
 * and star ratings to provide engagement structure.
 * 
 * Research Basis:
 * - Green & Brock (2000): Narrative transportation theory
 * - Locke & Latham (2002): Goal-setting theory
 * - Hamari et al. (2014): Gamification effectiveness in education
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store'
import { MISSIONS, TOKENS } from '../config'

// ── Mission Selection Screen ──
function MissionSelector({ onClose }) {
  const completedMissions = useGameStore(s => s.completedMissions)
  const startMission = useGameStore(s => s.startMission)

  const difficultyLabel = (d) => d === 1 ? '🟢 Easy' : d === 2 ? '🟡 Medium' : '🔴 Hard'
  const difficultyColor = (d) => d === 1 ? '#2ecc71' : d === 2 ? '#f1c40f' : '#e74c3c'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.9)', zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        style={{
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          borderRadius: '25px', padding: '35px', width: '90%', maxWidth: '700px',
          maxHeight: '85vh', overflowY: 'auto', color: 'white',
          border: '2px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2.2rem' }}>📋 Crisis Missions</h1>
            <div style={{ color: '#aaa', fontSize: '0.95rem', marginTop: '5px' }}>
              අර්බුද මෙහෙයුම් — Choose a rescue mission!
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '10px', color: 'white', padding: '10px 20px', cursor: 'pointer', fontSize: '1rem',
          }}>✕ Close</button>
        </div>

        {/* Mission Cards */}
        <div style={{ display: 'grid', gap: '15px' }}>
          {MISSIONS.map(mission => {
            const isCompleted = completedMissions.includes(mission.id)
            return (
              <motion.div
                key={mission.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startMission(mission.id)}
                style={{
                  background: isCompleted
                    ? 'linear-gradient(135deg, rgba(46,204,113,0.15), rgba(39,174,96,0.1))'
                    : 'rgba(255,255,255,0.05)',
                  borderRadius: '16px', padding: '20px', cursor: 'pointer',
                  border: isCompleted
                    ? '2px solid rgba(46,204,113,0.4)'
                    : '2px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.3s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.4rem' }}>
                      {mission.title}
                      {isCompleted && ' ✅'}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '4px' }}>{mission.titleSi}</div>
                    <p style={{ margin: '8px 0', fontSize: '1rem', color: '#ddd' }}>{mission.story}</p>
                    <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#bbb', fontStyle: 'italic' }}>{mission.storySi}</p>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <div style={{
                      fontSize: '0.8rem', color: difficultyColor(mission.difficulty),
                      fontWeight: 'bold', marginBottom: '5px',
                    }}>
                      {difficultyLabel(mission.difficulty)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>
                      {mission.totalTrials} emergencies
                    </div>
                  </div>
                </div>
                <div style={{
                  marginTop: '10px', padding: '6px 12px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)', fontSize: '0.85rem', color: '#aaa',
                  display: 'inline-block',
                }}>
                  🎯 Goal: {mission.goal}
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Mission Progress Bar (shows during gameplay) ──
function MissionProgressBar() {
  const missionMode = useGameStore(s => s.missionMode)
  const currentMission = useGameStore(s => s.currentMission)
  const missionTrialIndex = useGameStore(s => s.missionTrialIndex)
  const missionStats = useGameStore(s => s.missionStats)

  if (!missionMode || !currentMission) return null

  const progress = (missionTrialIndex / currentMission.totalTrials) * 100

  return (
    <div style={{
      position: 'absolute', top: 75, left: '50%', transform: 'translateX(-50%)',
      zIndex: 15, pointerEvents: 'none', textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{
        background: TOKENS.panelBg, borderRadius: '12px', padding: '8px 20px',
        border: `1px solid ${TOKENS.panelBorder}`, minWidth: '250px',
      }}>
        <div style={{
          fontSize: '0.85rem', color: '#f1c40f', fontWeight: 'bold', marginBottom: '4px',
        }}>
          {currentMission.title}
        </div>
        <div style={{
          height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px',
          overflow: 'hidden', marginBottom: '4px',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            style={{ height: '100%', background: '#f1c40f', borderRadius: '3px' }}
          />
        </div>
        <div style={{ fontSize: '0.7rem', color: '#aaa' }}>
          Emergency {Math.min(missionTrialIndex + 1, currentMission.totalTrials)} / {currentMission.totalTrials}
          {' • '}
          ✅ {missionStats.successes} ❌ {missionStats.failures}
        </div>
      </div>
    </div>
  )
}

// ── Mission Complete Screen ──
function MissionCompleteScreen() {
  const missionComplete = useGameStore(s => s.missionComplete)
  const currentMission = useGameStore(s => s.currentMission)
  const missionStars = useGameStore(s => s.missionStars)
  const missionStats = useGameStore(s => s.missionStats)
  const exitMission = useGameStore(s => s.exitMission)
  const startMission = useGameStore(s => s.startMission)

  if (!missionComplete || !currentMission) return null

  const starDisplay = '⭐'.repeat(missionStars) + '☆'.repeat(3 - missionStars)
  const passed = currentMission.goalCheck?.(missionStats)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.92)', zIndex: 10002,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Arial, sans-serif', pointerEvents: 'auto',
      }}
    >
      <motion.div
        initial={{ scale: 0.8 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 150 }}
        style={{
          background: passed
            ? 'linear-gradient(135deg, #2d6a30, #1a4a1c)'
            : 'linear-gradient(135deg, #6a2d2d, #4a1a1a)',
          borderRadius: '25px', padding: '45px', textAlign: 'center', color: 'white',
          maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          border: `3px solid ${passed ? '#2ecc71' : '#e74c3c'}`,
        }}
      >
        <h1 style={{ fontSize: '3rem', margin: '0 0 5px 0' }}>
          {passed ? '🎉 Mission Complete!' : '💪 Good Try!'}
        </h1>
        <p style={{ fontSize: '1rem', opacity: 0.8, margin: '0 0 20px 0' }}>
          {passed ? 'මෙහෙයුම සම්පූර්ණයි!' : 'නැවත උත්සාහ කරන්න!'}
        </p>

        <div style={{ fontSize: '3rem', margin: '15px 0' }}>{starDisplay}</div>

        <div style={{
          background: 'rgba(0,0,0,0.3)', borderRadius: '15px', padding: '20px', margin: '20px 0',
        }}>
          <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
            ✅ Correct: {missionStats.successes} / {missionStats.completed}
          </div>
          <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
            ⏱️ Avg RT: {missionStats.avgRT.toFixed(1)}s
          </div>
          <div style={{ fontSize: '1.1rem' }}>
            🏆 Score: {missionStats.score}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '25px' }}>
          <button
            onClick={() => startMission(currentMission.id)}
            style={{
              padding: '15px 35px', background: '#3498db', border: 'none',
              borderRadius: '12px', color: 'white', fontSize: '1.2rem',
              fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            }}
          >
            🔄 Retry
          </button>
          <button
            onClick={exitMission}
            style={{
              padding: '15px 35px', background: '#7f8c8d', border: 'none',
              borderRadius: '12px', color: 'white', fontSize: '1.2rem',
              fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            }}
          >
            🚪 Exit
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Export ──
export default function MissionSystem() {
  const showMissionSelect = useGameStore(s => s.showMissionSelect)
  const setShowMissionSelect = useGameStore(s => s.setShowMissionSelect)
  const missionComplete = useGameStore(s => s.missionComplete)

  return (
    <>
      <AnimatePresence>
        {showMissionSelect && (
          <MissionSelector onClose={() => setShowMissionSelect(false)} />
        )}
      </AnimatePresence>

      <MissionProgressBar />
      
      {missionComplete && <MissionCompleteScreen />}
    </>
  )
}
