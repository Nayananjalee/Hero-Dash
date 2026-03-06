/**
 * AssessmentMode Component - Clinical Pre/Post Assessment Protocol
 * =================================================================
 * Implements standardized 20-trial assessment for measuring treatment effect.
 * 
 * Protocol (based on research):
 * - 20 trials total (4 per scenario type × 5 crisis scenarios)
 * - Fixed difficulty (Level 1, Noise: 0.2)
 * - Randomized scenario order (counterbalanced)
 * - No adaptive ML adjustments during assessment
 * - Collects: accuracy, reaction time, per-scenario breakdown
 * 
 * Research Basis:
 * - APA (2024): Standards for educational/psychological testing
 * - Nunnally & Bernstein (1994): Psychometric theory
 * - Campbell & Stanley (1963): Pre-post experimental design
 * - Cohen (1988): Effect size calculation (Cohen's d)
 * 
 * Assessment Types:
 * - baseline: Pre-intervention measurement
 * - post_test: Post-intervention measurement  
 * - follow_up: Retention measurement (maintenance check)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store'
import { triggerHaptic } from '../config'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const VEHICLE_THEMES = {
  tsunami_siren: { icon: '🌊', label: 'Tsunami Warning', sinhala: 'සුනාමි අනතුරු ඇඟවීම', action: 'Move Right ➡️', actionSinhala: 'දකුණට යන්න', color: '#0077B6', targetAction: 'right' },
  earthquake_alarm: { icon: '🏚️', label: 'Earthquake', sinhala: 'භූමිකම්පා අනතුරු ඇඟවීම', action: 'STOP ⬇️', actionSinhala: 'නවතින්න', color: '#8B4513', targetAction: 'stop' },
  flood_warning: { icon: '🌊', label: 'Flood Warning', sinhala: 'ගංවතුර අනතුරු ඇඟවීම', action: 'Find Safe Place 🏠 (S)', actionSinhala: 'ආරක්ෂිත ස්ථානයක් සොයන්න', color: '#1E90FF', targetAction: 'slow' },
  air_raid_siren: { icon: '🚨', label: 'Air Raid', sinhala: 'ගුවන් ප්‍රහාර අනතුරු ඇඟවීම', action: 'Stay Center ⏺️', actionSinhala: 'මැද රැඳී සිටින්න', color: '#800080', targetAction: 'center' },
  building_fire_alarm: { icon: '🔥', label: 'Building Fire', sinhala: 'ගොඩනැගිලි ගිනි අනතුරු ඇඟවීම', action: 'Move Left ⬅️', actionSinhala: 'වමට යන්න', color: '#DC143C', targetAction: 'left' }
}

// Assessment States
const STATES = {
  INTRO: 'intro',
  READY: 'ready',
  TRIAL: 'trial',
  FEEDBACK: 'feedback',
  COMPLETE: 'complete'
}

function TrialDisplay({ trial, theme, onResponse, timeLeft }) {
  const actions = [
    { key: 'left', label: '⬅️ Left', sinhala: 'වමට' },
    { key: 'right', label: '➡️ Right', sinhala: 'දකුණට' },
    { key: 'center', label: '⏺️ Center', sinhala: 'මැද' },
    { key: 'stop', label: '🛑 Stop', sinhala: 'නවතින්න' },
    { key: 'slow', label: '🔽 Slow', sinhala: 'හෙමින්' }
  ]

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Trial counter */}
      <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '10px' }}>
        Trial {trial.trial_number} of 20
      </div>
      
      {/* Timer bar */}
      <div style={{ width: '80%', margin: '0 auto 20px', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
        <motion.div 
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 8, ease: 'linear' }}
          style={{ height: '100%', background: timeLeft > 3 ? '#2ecc71' : '#e74c3c', borderRadius: '4px' }} 
        />
      </div>

      {/* Vehicle display */}
      <motion.div 
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        style={{
          display: 'inline-block', padding: '25px 50px', borderRadius: '20px',
          background: `${theme.color}30`, border: `3px solid ${theme.color}`,
          marginBottom: '25px'
        }}
      >
        <div style={{ fontSize: '5rem' }}>{theme.icon}</div>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', textShadow: '2px 2px 4px #000' }}>
          {theme.label}
        </div>
        <div style={{ fontSize: '1.2rem', color: theme.color }}>{theme.sinhala}</div>
      </motion.div>

      {/* What should you do? */}
      <div style={{ fontSize: '1.3rem', color: '#f1c40f', marginBottom: '20px', fontWeight: 'bold' }}>
        What should you do? (ඔබ කුමක් කළ යුතුද?)
      </div>

      {/* Response buttons */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {actions.map(action => (
          <motion.button
            key={action.key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onResponse(action.key)}
            style={{
              padding: '15px 25px', borderRadius: '12px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)',
              color: 'white', fontSize: '1.2rem', fontWeight: 'bold',
              transition: 'all 0.2s', minWidth: '100px'
            }}
          >
            <div>{action.label}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{action.sinhala}</div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function TrialFeedback({ correct, correctAction }) {
  return (
    <motion.div
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      style={{ textAlign: 'center', padding: '40px' }}
    >
      <div style={{ fontSize: '5rem' }}>{correct ? '✅' : '❌'}</div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: correct ? '#2ecc71' : '#e74c3c' }}>
        {correct ? 'Correct! හරි!' : 'Incorrect! වැරදියි!'}
      </div>
      {!correct && (
        <div style={{ fontSize: '1rem', color: '#aaa', marginTop: '10px' }}>
          Correct answer: {correctAction}
        </div>
      )}
    </motion.div>
  )
}

function ResultsSummary({ results, onClose }) {
  if (!results) return null

  const scenarioResults = results.scenario_results || {}
  const comparison = results.pre_post_comparison

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', color: 'white' }}>
      <h1 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '25px' }}>
        📋 Assessment Results
      </h1>

      {/* Overall Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'rgba(46,204,113,0.15)', borderRadius: '12px', padding: '15px', textAlign: 'center', border: '2px solid #2ecc71' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2ecc71' }}>
            {results.overall_accuracy?.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.85rem', color: '#aaa' }}>Overall Accuracy</div>
        </div>
        <div style={{ background: 'rgba(52,152,219,0.15)', borderRadius: '12px', padding: '15px', textAlign: 'center', border: '2px solid #3498db' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3498db' }}>
            {results.avg_reaction_time?.toFixed(2)}s
          </div>
          <div style={{ fontSize: '0.85rem', color: '#aaa' }}>Avg Reaction Time</div>
        </div>
        <div style={{ background: 'rgba(155,89,182,0.15)', borderRadius: '12px', padding: '15px', textAlign: 'center', border: '2px solid #9b59b6' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#9b59b6' }}>
            {results.assessment_type?.replace('_', ' ').toUpperCase()}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#aaa' }}>Assessment Type</div>
        </div>
      </div>

      {/* Per-Scenario Breakdown */}
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '15px' }}>🚨 Per-Scenario Results</h2>
        {Object.entries(scenarioResults).map(([scenario, data]) => {
          const theme = VEHICLE_THEMES[scenario] || {}
          return (
            <div key={scenario} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>{theme.icon} {scenario.charAt(0).toUpperCase() + scenario.slice(1)}</span>
                <span>
                  <strong style={{ color: (data.accuracy || 0) >= 75 ? '#2ecc71' : '#e74c3c' }}>
                    {data.accuracy?.toFixed(0) || 0}%
                  </strong>
                  {' '}({data.correct || 0}/{data.total || 0}) 
                  {data.avg_rt && ` | ${data.avg_rt.toFixed(2)}s`}
                </span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${data.accuracy || 0}%`, height: '100%',
                  background: (data.accuracy || 0) >= 75 ? '#2ecc71' : (data.accuracy || 0) >= 50 ? '#f39c12' : '#e74c3c',
                  borderRadius: '4px'
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Pre-Post Comparison */}
      {comparison && (
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '12px' }}>📈 Pre/Post Comparison</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(52,152,219,0.1)', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Improvement</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: comparison.improvement > 0 ? '#2ecc71' : '#e74c3c' }}>
                {comparison.improvement > 0 ? '+' : ''}{comparison.improvement?.toFixed(1)}%
              </div>
            </div>
            <div style={{ padding: '12px', background: 'rgba(52,152,219,0.1)', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Cohen's d</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f39c12' }}>
                {comparison.effect_size?.cohens_d?.toFixed(2) || 'N/A'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#888' }}>
                {comparison.effect_size?.interpretation || ''}
              </div>
            </div>
          </div>
          {comparison.effect_size?.significant && (
            <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(46,204,113,0.15)', borderRadius: '8px', textAlign: 'center', color: '#2ecc71', fontWeight: 'bold' }}>
              ✅ Statistically Significant (p = {comparison.effect_size.p_value?.toFixed(4)})
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '25px' }}>
        <button onClick={onClose} style={{
          padding: '14px 40px', background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
          border: '2px solid white', borderRadius: '12px', color: 'white',
          fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer'
        }}>
          ✓ Done (අවසානයි)
        </button>
      </div>
    </div>
  )
}

// ============================================================
// MAIN ASSESSMENT MODE COMPONENT
// ============================================================
export default function AssessmentMode({ userId, assessmentType = 'baseline', onComplete }) {
  const [state, setState] = useState(STATES.INTRO)
  const [assessmentId, setAssessmentId] = useState(null)
  const [trials, setTrials] = useState([])
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0)
  const [lastFeedback, setLastFeedback] = useState(null)
  const [results, setResults] = useState(null)
  const [timeLeft, setTimeLeft] = useState(8)

  // Use refs for values accessed inside timers to avoid stale closures
  const timerRef = useRef(null)
  const feedbackTimerRef = useRef(null)
  const countdownRef = useRef(null)
  const trialStartRef = useRef(null)
  const indexRef = useRef(0)
  const trialsRef = useRef([])
  const assessmentIdRef = useRef(null)
  const respondedRef = useRef(false) // guard against double-fire

  // Keep refs in sync with state
  useEffect(() => { indexRef.current = currentTrialIndex }, [currentTrialIndex])
  useEffect(() => { trialsRef.current = trials }, [trials])
  useEffect(() => { assessmentIdRef.current = assessmentId }, [assessmentId])

  const currentTrial = trials[currentTrialIndex]
  const currentTheme = currentTrial ? VEHICLE_THEMES[currentTrial.scenario_type] : null

  // Start assessment via backend
  const startAssessment = async () => {
    try {
      const res = await fetch(`${API_URL}/assessment/start/${userId}?assessment_type=${assessmentType}`, {
        method: 'POST'
      })
      const data = await res.json()
      setAssessmentId(data.assessment_id)
      assessmentIdRef.current = data.assessment_id
      setTrials(data.trials)
      trialsRef.current = data.trials
      setCurrentTrialIndex(0)
      indexRef.current = 0
      setState(STATES.READY)
    } catch (err) {
      alert('Failed to start assessment. Check connection.')
    }
  }

  // Begin a trial (reads from refs, not stale state)
  const beginTrial = useCallback(() => {
    respondedRef.current = false
    setState(STATES.TRIAL)
    trialStartRef.current = performance.now()
    setTimeLeft(8)

    // Clear any previous timers
    if (timerRef.current) clearTimeout(timerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)

    // Countdown timer for color change
    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Auto-fail after 8 seconds
    timerRef.current = setTimeout(() => {
      if (!respondedRef.current) {
        handleResponse(null)
      }
    }, 8000)
  }, [])

  // Handle player response — uses refs to always have current values
  const handleResponse = useCallback((responseAction) => {
    // Prevent double-fire (user click + timeout, or multiple clicks)
    if (respondedRef.current) return
    respondedRef.current = true

    // Clear the auto-fail timer
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }

    const idx = indexRef.current
    const allTrials = trialsRef.current
    const trial = allTrials[idx]
    if (!trial) return

    const theme = VEHICLE_THEMES[trial.scenario_type]
    const reactionTime = trialStartRef.current ? (performance.now() - trialStartRef.current) / 1000 : 8.0
    const success = responseAction === theme.targetAction

    // Haptic feedback (screen-shake on desktop)
    triggerHaptic(
      success ? [100, 50, 100] : [500],
      success ? 'rgba(45,198,83,0.6)' : 'rgba(231,76,60,0.6)'
    )

    // Record trial to backend (fire-and-forget)
    fetch(`${API_URL}/assessment/record-trial/${assessmentIdRef.current}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        scenario_type: trial.scenario_type,
        success: success,
        reaction_time: parseFloat(reactionTime.toFixed(3)),
        noise_level: 0.2,
        trial_number: trial.trial_number,
        assessment_type: assessmentType
      })
    }).catch(err => console.error('Failed to record trial:', err))

    // Show feedback
    setLastFeedback({ correct: success, correctAction: theme.action })
    setState(STATES.FEEDBACK)

    // After 1.5s move to next trial or complete
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    feedbackTimerRef.current = setTimeout(() => {
      const nextIdx = idx + 1
      if (nextIdx < allTrials.length) {
        indexRef.current = nextIdx
        setCurrentTrialIndex(nextIdx)
        // Start the next trial directly
        respondedRef.current = false
        setState(STATES.TRIAL)
        trialStartRef.current = performance.now()
        setTimeLeft(8)
        if (timerRef.current) clearTimeout(timerRef.current)
        if (countdownRef.current) clearInterval(countdownRef.current)
        countdownRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(countdownRef.current)
              return 0
            }
            return prev - 1
          })
        }, 1000)
        timerRef.current = setTimeout(() => {
          if (!respondedRef.current) handleResponse(null)
        }, 8000)
      } else {
        completeAssessment()
      }
    }, 1500)
  }, [userId, assessmentType])

  // Complete assessment
  const completeAssessment = useCallback(async () => {
    // Clear all timers
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (feedbackTimerRef.current) { clearTimeout(feedbackTimerRef.current); feedbackTimerRef.current = null }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }

    try {
      const res = await fetch(`${API_URL}/assessment/complete/${assessmentIdRef.current}`, {
        method: 'POST'
      })
      const data = await res.json()
      setResults(data)
      setState(STATES.COMPLETE)
    } catch (err) {
      console.error('Failed to complete assessment:', err)
      setState(STATES.COMPLETE)
    }
  }, [])

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: 'Arial, sans-serif'
    }}>
      <AnimatePresence mode="wait">
        {/* INTRO - Instructions */}
        {state === STATES.INTRO && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ maxWidth: '600px', textAlign: 'center', padding: '30px' }}
          >
            <h1 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>📋 Clinical Assessment</h1>
            <div style={{
              background: 'rgba(255,255,255,0.1)', borderRadius: '15px', padding: '25px', marginBottom: '25px',
              textAlign: 'left', lineHeight: '1.8'
            }}>
              <h3 style={{ color: '#f1c40f' }}>Assessment Protocol ({assessmentType.replace('_', ' ')})</h3>
              <ul style={{ paddingLeft: '20px' }}>
                <li>20 trials (4 per vehicle type)</li>
                <li>Fixed difficulty — no adaptive changes</li>
                <li>8 seconds to respond per trial</li>
                <li>Results compared against baseline</li>
              </ul>
              <h3 style={{ color: '#f1c40f', marginTop: '15px' }}>ප්‍රොටෝකෝලය:</h3>
              <ul style={{ paddingLeft: '20px' }}>
                <li>අත්හදා බැලීම් 20ක්</li>
                <li>ස්ථාවර දුෂ්කරතාව</li>
                <li>එක් අත්හදා බැලීමකට තත්පර 8ක්</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button onClick={onComplete} style={{
                padding: '14px 35px', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '12px', color: 'white', fontSize: '1.1rem', cursor: 'pointer'
              }}>← Cancel</button>
              <button onClick={startAssessment} style={{
                padding: '14px 40px', background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
                border: '2px solid white', borderRadius: '12px', color: 'white',
                fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer'
              }}>Start Assessment 🚀</button>
            </div>
          </motion.div>
        )}

        {/* READY - About to start */}
        {state === STATES.READY && (
          <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center' }}
          >
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>Get Ready! සූදානම් වෙන්න!</h2>
            <p style={{ color: '#aaa', marginBottom: '25px' }}>
              {trials.length} trials loaded. Press Start when ready.
            </p>
            <button onClick={beginTrial} style={{
              padding: '18px 50px', background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
              border: '2px solid white', borderRadius: '15px', color: 'white',
              fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer'
            }}>▶️ Begin</button>
          </motion.div>
        )}

        {/* TRIAL - Active trial */}
        {state === STATES.TRIAL && currentTrial && currentTheme && (
          <motion.div key={`trial-${currentTrialIndex}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
            style={{ width: '100%', maxWidth: '700px', padding: '20px' }}
          >
            <TrialDisplay 
              trial={currentTrial}
              theme={currentTheme} 
              onResponse={handleResponse}
              timeLeft={timeLeft}
            />
          </motion.div>
        )}

        {/* FEEDBACK - After response */}
        {state === STATES.FEEDBACK && lastFeedback && (
          <motion.div key="feedback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TrialFeedback correct={lastFeedback.correct} correctAction={lastFeedback.correctAction} />
            <div style={{ textAlign: 'center', marginTop: '10px', color: '#aaa' }}>
              {currentTrialIndex + 1}/{trials.length} completed
            </div>
          </motion.div>
        )}

        {/* COMPLETE - Results */}
        {state === STATES.COMPLETE && (
          <motion.div key="complete" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '20px' }}
          >
            <ResultsSummary results={results} onClose={onComplete} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar at bottom */}
      {(state === STATES.TRIAL || state === STATES.FEEDBACK) && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, width: '100%', height: '4px',
          background: 'rgba(255,255,255,0.1)'
        }}>
          <div style={{
            width: `${((currentTrialIndex + 1) / trials.length) * 100}%`,
            height: '100%', background: '#9b59b6', transition: 'width 0.3s'
          }} />
        </div>
      )}
    </div>
  )
}
