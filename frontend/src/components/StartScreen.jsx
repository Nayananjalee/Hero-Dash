import React, { useState } from 'react'
import { useGameStore } from '../store'
import AnalyticsDashboard from './AnalyticsDashboard'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ============================================================
// AGE GROUP DEFINITIONS (Based on Tharanga & Viraj 2023)
// Maps developmental stages to clinical hearing therapy norms
// ============================================================
const AGE_GROUPS = [
  { value: '5-6', label: '5-6', emoji: '🧒', description: 'Learning new sounds' },
  { value: '7-8', label: '7-8', emoji: '👦', description: 'Telling sounds apart' },
  { value: '9-10', label: '9-10', emoji: '🧑', description: 'Listening in noise' },
  { value: '11-12', label: '11-12', emoji: '👧', description: 'Tricky sound challenges' },
  { value: '13-14', label: '13-14', emoji: '🧑‍🎓', description: 'Expert listener' }
]

const HEARING_LEVELS = [
  { value: 'normal', label: 'Normal', color: '#2ecc71', icon: '🟢' },
  { value: 'mild', label: 'Mild', detail: '21-40 dB', color: '#f1c40f', icon: '🟡' },
  { value: 'moderate', label: 'Moderate', detail: '41-55 dB', color: '#e67e22', icon: '🟠' },
  { value: 'mod_severe', label: 'Mod-Severe', detail: '56-70 dB', color: '#e74c3c', icon: '🔴' },
  { value: 'severe', label: 'Severe', detail: '71-90 dB', color: '#c0392b', icon: '⭕' },
  { value: 'profound', label: 'Profound', detail: '>90 dB', color: '#8e44ad', icon: '🟣' }
]

const GAME_MODES = [
  { 
    value: 'audio-visual', 
    label: '🔊 Audio + Visual', 
    description: 'Listen and watch — full game experience',
    color: '#2ecc71',
    recommended: true
  },
  { 
    value: 'visual-only', 
    label: '👁️ Visual Only', 
    description: 'Watch and feel vibrations — no sound needed',
    color: '#3498db',
    recommended: false
  },
  { 
    value: 'assessment', 
    label: '📋 Quick Test', 
    description: 'Short test to check your progress (20 rounds)',
    color: '#9b59b6',
    recommended: false
  }
]

// Floating animated particle for background decoration
function FloatingParticles() {
  return (
    <>
      <style>{`
        @keyframes float1 { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-30px) rotate(15deg); } }
        @keyframes float2 { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(-10deg); } }
        @keyframes float3 { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-25px) scale(1.1); } }
        @keyframes wiggle { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes popBounce {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes slideUp {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes titleGlow {
          0%,100% { text-shadow: 3px 3px 6px rgba(0,0,0,0.3), 0 0 20px rgba(255,215,0,0.3); }
          50% { text-shadow: 3px 3px 6px rgba(0,0,0,0.3), 0 0 40px rgba(255,215,0,0.6); }
        }
        .kid-btn { transition: all 0.2s ease !important; }
        .kid-btn:hover { transform: scale(1.06) !important; box-shadow: 0 6px 25px rgba(0,0,0,0.25) !important; }
        .kid-btn:active { transform: scale(0.97) !important; }
      `}</style>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        {['🌊','🏚️','🌊','🚨','🔥','⭐','🎵','🎧','🏥','🔔'].map((emoji, i) => (
          <span key={i} style={{
            position: 'absolute',
            fontSize: `${1.2 + Math.random() * 1.2}rem`,
            opacity: 0.12 + Math.random() * 0.08,
            top: `${5 + Math.random() * 85}%`,
            left: `${3 + Math.random() * 90}%`,
            animation: `float${(i % 3) + 1} ${4 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`
          }}>{emoji}</span>
        ))}
      </div>
    </>
  )
}

// ============================================================
// DASHBOARD VIEW - Enhanced with BKT + IRT visualization
// ============================================================
function DashboardView({ onBack }) {
  const { userId } = useGameStore()
  const [progressReport, setProgressReport] = useState(null)
  const [learningCurve, setLearningCurve] = useState([])
  const [cognitiveStatus, setCognitiveStatus] = useState(null)
  const [bktSkills, setBktSkills] = useState(null)
  const [irtAbility, setIrtAbility] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchAnalytics = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [progressRes, curveRes, cognitiveRes, bktRes, irtRes] = await Promise.allSettled([
        fetch(`${API_URL}/analytics/progress-report/${userId}?days=7`),
        fetch(`${API_URL}/analytics/learning-curve/${userId}`),
        fetch(`${API_URL}/analytics/cognitive-load/${userId}`),
        fetch(`${API_URL}/bkt/skill-levels/${userId}`),
        fetch(`${API_URL}/irt/ability-estimate/${userId}`)
      ])

      if (progressRes.status === 'fulfilled' && progressRes.value.ok) {
        const d = await progressRes.value.json()
        if (!d.error) setProgressReport(d)
      }
      if (curveRes.status === 'fulfilled' && curveRes.value.ok) {
        const d = await curveRes.value.json()
        setLearningCurve(d.data_points || [])
      }
      if (cognitiveRes.status === 'fulfilled' && cognitiveRes.value.ok) {
        setCognitiveStatus(await cognitiveRes.value.json())
      }
      if (bktRes.status === 'fulfilled' && bktRes.value.ok) {
        setBktSkills(await bktRes.value.json())
      }
      if (irtRes.status === 'fulfilled' && irtRes.value.ok) {
        setIrtAbility(await irtRes.value.json())
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { fetchAnalytics() }, [userId])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      overflowY: 'auto', zIndex: 1000, padding: '20px'
    }}>
      <button onClick={onBack} style={{
        position: 'fixed', top: 20, left: 20, padding: '12px 24px',
        background: '#e74c3c', border: 'none', borderRadius: '10px',
        color: 'white', fontSize: '1.1rem', fontWeight: 'bold',
        cursor: 'pointer', zIndex: 1001, boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
      }}>← Back to Menu</button>

      <div style={{ maxWidth: '1200px', margin: '80px auto 20px' }}>
        <h1 style={{ color: 'white', textAlign: 'center', fontSize: '3rem', marginBottom: '40px' }}>
          📊 Clinical Progress Dashboard
        </h1>
        
        {loading && <div style={{ textAlign: 'center', color: 'white', fontSize: '1.5rem' }}>Loading analytics... ⏳</div>}

        {/* BKT Skill Mastery Visualization */}
        {bktSkills && !loading && (
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '15px', padding: '30px', marginBottom: '20px' }}>
            <h2 style={{ color: 'white', marginBottom: '20px' }}>🧠 Auditory Skill Mastery (Bayesian Knowledge Tracing)</h2>
            <div style={{ display: 'grid', gap: '15px' }}>
              {Object.entries(bktSkills.skills || {}).map(([skill, data]) => (
                <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ color: 'white', minWidth: '200px', fontSize: '0.95rem' }}>
                    {skill.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                  <div style={{ flex: 1, height: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(data.p_learned || data.p_know || 0) * 100}%`, height: '100%',
                      background: (data.p_learned || data.p_know || 0) >= 0.8 ? '#2ecc71' : (data.p_learned || data.p_know || 0) >= 0.5 ? '#f39c12' : '#e74c3c',
                      borderRadius: '10px', transition: 'width 0.5s'
                    }} />
                  </div>
                  <span style={{ color: 'white', minWidth: '60px', textAlign: 'right', fontWeight: 'bold' }}>
                    {((data.p_learned || data.p_know || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
            {bktSkills.overall_mastery !== undefined && (
              <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(46,204,113,0.2)', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ color: 'white', fontSize: '1.2rem' }}>
                  Overall Mastery: <strong style={{ color: '#2ecc71', fontSize: '1.5rem' }}>{(bktSkills.overall_mastery * 100).toFixed(1)}%</strong>
                </span>
              </div>
            )}
          </div>
        )}

        {/* IRT Ability Estimate */}
        {irtAbility && !loading && irtAbility.num_responses > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '15px', padding: '30px', marginBottom: '20px' }}>
            <h2 style={{ color: 'white', marginBottom: '20px' }}>📐 Ability Estimate (Item Response Theory 2PL)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
              <StatCard label="Ability (θ)" value={irtAbility.theta?.toFixed(2) ?? 'N/A'} icon="📊" color="#9b59b6" />
              <StatCard label="Std Error" value={irtAbility.se < 900 ? irtAbility.se?.toFixed(3) : 'N/A'} icon="📏" color="#3498db" />
              <StatCard label="Classification" value={irtAbility.ability_label || 'N/A'} icon="🏷️" color="#f39c12" />
              <StatCard label="Percentile" value={irtAbility.percentile_estimate ? `${irtAbility.percentile_estimate}th` : 'N/A'} icon="📈" color="#2ecc71" />
            </div>
          </div>
        )}

        {progressReport && !loading && (
          <ProgressReportDisplay data={progressReport} learningCurve={learningCurve} cognitiveStatus={cognitiveStatus} />
        )}
      </div>
    </div>
  )
}

function ProgressReportDisplay({ data, learningCurve, cognitiveStatus }) {
  return (
    <div style={{ color: 'white' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.1)', borderRadius: '15px', padding: '30px', marginBottom: '20px' }}>
        <h2>🎯 Overall Performance</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
          <StatCard label="Total Attempts" value={data.overall_performance.total_attempts} icon="🎮" />
          <StatCard label="Success Rate" value={`${data.overall_performance.success_rate}%`} icon="✅" color="#2ecc71" />
          <StatCard label="Avg Reaction" value={`${data.overall_performance.avg_reaction_time.toFixed(1)}s`} icon="⚡" color="#f39c12" />
          <StatCard label="Improvement" value={`${data.overall_performance.improvement_rate > 0 ? '+' : ''}${data.overall_performance.improvement_rate}%`} icon="📈" color={data.overall_performance.improvement_rate > 0 ? '#2ecc71' : '#e74c3c'} />
        </div>
      </div>
      <div style={{ background: 'rgba(255, 255, 255, 0.1)', borderRadius: '15px', padding: '30px', marginBottom: '20px' }}>
        <h2>🚨 Scenario Performance</h2>
        {Object.entries(data.scenario_breakdown).map(([scenario, stats]) => (
          <ScenarioBar key={scenario} scenario={scenario} stats={stats} />
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color = '#3498db' }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '20px',
      textAlign: 'center', border: `2px solid ${color}`
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ fontSize: '1rem', opacity: 0.8, marginTop: '5px' }}>{label}</div>
    </div>
  )
}

function ScenarioBar({ scenario, stats }) {
  const getColor = (rate) => rate >= 70 ? '#2ecc71' : rate >= 50 ? '#f39c12' : '#e74c3c'
  const icons = { tsunami_siren: '🌊', earthquake_alarm: '🏚️', flood_warning: '🌊', air_raid_siren: '🚨', building_fire_alarm: '🔥' }
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '1.1rem' }}>
        <span>{icons[scenario]} {scenario.charAt(0).toUpperCase() + scenario.slice(1)}</span>
        <span><strong style={{ color: getColor(stats.success_rate) }}>{stats.success_rate}%</strong> ({stats.attempts} attempts)</span>
      </div>
      <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
        <div style={{ width: `${stats.success_rate}%`, height: '100%', background: getColor(stats.success_rate), transition: 'all 0.5s ease' }} />
      </div>
    </div>
  )
}

// ============================================================
// MAIN START SCREEN - Beautiful kid-friendly design, no scroll
// Research-backed: Jerger & Musiek (2000) - Pediatric audiological protocols
// ============================================================
export default function StartScreen() {
  const startGame = useGameStore((state) => state.startGame)
  const setUserId = useGameStore((state) => state.setUserId)
  const setAgeGroup = useGameStore((state) => state.setAgeGroup)
  const setGameMode = useGameStore((state) => state.setGameMode)
  const setHearingProfile = useGameStore((state) => state.setHearingProfile)
  
  const [name, setName] = useState('')
  const [ageGroup, setAge] = useState('7-8')
  const [hearingLevel, setHearingLevel] = useState('mild')
  const [gameMode, setMode] = useState('audio-visual')
  const [loading, setLoading] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [step, setStep] = useState(1) // Multi-step onboarding: 1=name, 2=profile, 3=mode

  const handleNext = () => {
    if (step === 1 && !name.trim()) return alert("Please enter your name (කරුණාකර ඔබේ නම ඇතුළත් කරන්න)")
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleStart = async () => {
    if (!name.trim()) return alert("Please enter your name")
    
    // Unlock audio context
    const unlockAudio = new Audio('/sounds/engine_loop.mp3')
    unlockAudio.volume = 0.1
    unlockAudio.play().then(() => unlockAudio.pause()).catch(e => console.log("Audio unlock failed", e))

    // Update global state
    setAgeGroup(ageGroup)
    setGameMode(gameMode)
    setHearingProfile({ hearing_level: hearingLevel })

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: name,
          age_group: ageGroup,
          hearing_level: hearingLevel
        })
      })
      const data = await response.json()
      setUserId(data.id, data.username)
      startGame()
    } catch (error) {
      console.error("Login failed", error)
      alert("Connection failed. Starting offline mode.")
      setUserId(-1, name || 'offline_player')
      startGame()
    } finally {
      setLoading(false)
    }
  }

  const handleDashboard = async () => {
    if (!name.trim()) return alert("Please enter your name (කරුණාකර ඔබේ නම ඇතුළත් කරන්න)")
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, age_group: ageGroup, hearing_level: hearingLevel })
      })
      const data = await response.json()
      setUserId(data.id, data.username)
      setShowDashboard(true)
    } catch (error) {
      console.error("Login failed", error)
      alert("Connection failed. Cannot load dashboard.")
    } finally {
      setLoading(false)
    }
  }

  // Shared function to register user for advanced actions
  const registerAndDo = async (action) => {
    if (!name.trim()) return alert("Please enter your name first")
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/users/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, age_group: ageGroup, hearing_level: hearingLevel })
      })
      const data = await response.json()
      setUserId(data.id, data.username)
      action()
    } catch (error) { alert("Connection failed.") }
    finally { setLoading(false) }
  }

  if (showDashboard) {
    return <DashboardView onBack={() => setShowDashboard(false)} />
  }

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      background: 'linear-gradient(135deg, #1a1a40 0%, #2d1b69 35%, #11998e 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, color: 'white', fontFamily: "'Segoe UI', 'Comic Sans MS', Arial, sans-serif", textAlign: 'center',
      overflow: 'hidden'
    }}>
      <FloatingParticles />

      {/* ========== HEADER (compact) ========== */}
      <div style={{ zIndex: 1, animation: 'popBounce 0.6s ease-out', flexShrink: 0 }}>
        <h1 style={{
          fontSize: 'clamp(1.8rem, 4vw, 3rem)', margin: '0 0 2px 0',
          animation: 'titleGlow 3s ease-in-out infinite',
          background: 'linear-gradient(90deg, #FFD700, #FFA500, #FF6347, #FFD700)',
          backgroundSize: '200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          fontWeight: 900, letterSpacing: '1px'
        }}>
          🎧 Emergency Hero 3D
        </h1>
        <p style={{ fontSize: 'clamp(0.8rem, 1.5vw, 1rem)', margin: '0 0 12px 0', opacity: 0.85, letterSpacing: '0.5px' }}>
          Learn to hear emergency sounds while you drive! 🚗
        </p>
      </div>

      {/* ========== STEP INDICATOR ========== */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', zIndex: 1, alignItems: 'center' }}>
        {[
          { n: 1, icon: '✏️', label: 'Name' },
          { n: 2, icon: '👤', label: 'Profile' },
          { n: 3, icon: '🎮', label: 'Play!' }
        ].map((s, i) => (
          <React.Fragment key={s.n}>
            {i > 0 && <div style={{
              width: '30px', height: '3px',
              background: step >= s.n ? 'linear-gradient(90deg, #2ecc71, #27ae60)' : 'rgba(255,255,255,0.15)',
              borderRadius: '2px', transition: 'background 0.4s'
            }}/>}
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: step >= s.n
                ? 'linear-gradient(135deg, #2ecc71, #27ae60)'
                : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.4s',
              border: step === s.n ? '3px solid #fff' : '3px solid transparent',
              boxShadow: step === s.n ? '0 0 15px rgba(46,204,113,0.6)' : 'none',
              cursor: s.n < step ? 'pointer' : 'default'
            }} onClick={() => { if (s.n < step) setStep(s.n) }}
            title={s.label}>
              {step > s.n ? '✓' : s.icon}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* ========== MAIN CONTENT AREA ========== */}
      <div style={{
        zIndex: 1, width: '94%', maxWidth: '880px',
        flex: '1 1 auto', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', minHeight: 0, maxHeight: 'calc(100vh - 180px)'
      }}>

        {/* =================== STEP 1: NAME & INSTRUCTIONS =================== */}
        {step === 1 && (
          <div style={{ animation: 'slideUp 0.4s ease-out', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
            
            {/* Compact instruction cards — 5 crisis sounds */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', width: '100%'
            }}>
              {[
                { emoji: '🌊', label: 'Tsunami', action: 'Right ➡️', si: 'සුනාමි', color: '#0077B6' },
                { emoji: '🏚️', label: 'Earthquake', action: 'Stop ⬇️', si: 'භූමිකම්පා', color: '#8B4513' },
                { emoji: '🌊', label: 'Flood', action: 'Safe 🏠 (S)', si: 'ගංවතුර', color: '#1E90FF' },
                { emoji: '🚨', label: 'Air Raid', action: 'Center ⏺️', si: 'ගුවන් ප්‍රහාර', color: '#800080' },
                { emoji: '🔥', label: 'Bldg Fire', action: 'Left ⬅️', si: 'ගොඩනැගිලි ගිනි', color: '#DC143C' }
              ].map((item, i) => (
                <div key={i} className="kid-btn" style={{
                  background: `linear-gradient(135deg, ${item.color}22, ${item.color}11)`,
                  border: `2px solid ${item.color}55`,
                  borderRadius: '14px', padding: '10px 6px', textAlign: 'center',
                  backdropFilter: 'blur(10px)',
                  animation: `popBounce 0.5s ease-out`,
                  animationDelay: `${i * 0.08}s`, animationFillMode: 'both'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '4px' }}>{item.emoji}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: item.color }}>{item.label}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.7, margin: '2px 0' }}>{item.si}</div>
                  <div style={{
                    fontSize: '0.75rem', fontWeight: 700, color: '#fff',
                    background: `${item.color}44`, borderRadius: '8px', padding: '3px 6px', marginTop: '4px'
                  }}>{item.action}</div>
                </div>
              ))}
            </div>

            {/* Name input */}
            <div style={{ 
              background: 'rgba(255,255,255,0.08)', borderRadius: '18px', padding: '18px 24px',
              backdropFilter: 'blur(15px)', border: '2px solid rgba(255,255,255,0.12)',
              width: '100%', maxWidth: '460px'
            }}>
              <label style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#FFD700' }}>
                ✏️ What's your name? (ඔබේ නම)
              </label>
              <input 
                type="text" placeholder="Enter your name here..." value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNext()}
                style={{
                  padding: '14px 18px', fontSize: '1.2rem', borderRadius: '12px',
                  border: '2px solid rgba(255,255,255,0.2)', width: '100%', boxSizing: 'border-box',
                  textAlign: 'center', background: 'rgba(255,255,255,0.95)', color: '#333',
                  fontWeight: 600, outline: 'none'
                }}
              />
            </div>

            <button className="kid-btn" onClick={handleNext} style={{
              padding: '14px 60px', fontSize: '1.3rem',
              background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
              color: 'white', border: 'none', borderRadius: '50px',
              cursor: 'pointer', fontWeight: 'bold',
              boxShadow: '0 6px 25px rgba(46,204,113,0.4)'
            }}>Let's Go! →</button>
          </div>
        )}

        {/* =================== STEP 2: PROFILE (AGE + HEARING) — SIDE BY SIDE =================== */}
        {step === 2 && (
          <div style={{ animation: 'slideUp 0.35s ease-out', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* === AGE GROUP (left column) === */}
              <div style={{
                background: 'rgba(255,255,255,0.07)', borderRadius: '18px', padding: '16px',
                backdropFilter: 'blur(15px)', border: '2px solid rgba(255,255,255,0.1)'
              }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#FFD700' }}>
                  👶 How old are you?
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '6px' }}>
                  {AGE_GROUPS.map((ag, i) => (
                    <button key={ag.value} className="kid-btn" onClick={() => setAge(ag.value)} style={{
                      padding: '8px 4px', borderRadius: '12px', cursor: 'pointer', border: 'none',
                      background: ageGroup === ag.value
                        ? 'linear-gradient(135deg, #2ecc71, #27ae60)'
                        : 'rgba(255,255,255,0.08)',
                      color: 'white', textAlign: 'center',
                      boxShadow: ageGroup === ag.value ? '0 3px 15px rgba(46,204,113,0.4)' : 'none',
                      animation: `popBounce 0.4s ease-out`,
                      animationDelay: `${i * 0.05}s`, animationFillMode: 'both'
                    }}>
                      <div style={{ fontSize: '1.3rem' }}>{ag.emoji}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{ag.label}</div>
                      <div style={{ fontSize: '0.6rem', opacity: 0.75 }}>{ag.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* === HEARING LEVEL (right column) === */}
              <div style={{
                background: 'rgba(255,255,255,0.07)', borderRadius: '18px', padding: '16px',
                backdropFilter: 'blur(15px)', border: '2px solid rgba(255,255,255,0.1)'
              }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#FFD700' }}>
                  🦻 Hearing Level
                </h3>
                <p style={{ fontSize: '0.72rem', margin: '0 0 8px 0', opacity: 0.6 }}>
                  Ask your parent or therapist for help
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {HEARING_LEVELS.map((hl, i) => (
                    <button key={hl.value} className="kid-btn" onClick={() => setHearingLevel(hl.value)} style={{
                      padding: '8px 6px', borderRadius: '10px', cursor: 'pointer', border: 'none',
                      background: hearingLevel === hl.value
                        ? `linear-gradient(135deg, ${hl.color}55, ${hl.color}33)`
                        : 'rgba(255,255,255,0.06)',
                      color: 'white', textAlign: 'center',
                      outline: hearingLevel === hl.value ? `2px solid ${hl.color}` : 'none',
                      animation: `popBounce 0.4s ease-out`,
                      animationDelay: `${i * 0.05}s`, animationFillMode: 'both'
                    }}>
                      <span style={{ fontSize: '1rem' }}>{hl.icon}</span>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>{hl.label}</div>
                      {hl.detail && <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>{hl.detail}</div>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="kid-btn" onClick={handleBack} style={{
                padding: '12px 30px', fontSize: '1.1rem', background: 'rgba(255,255,255,0.12)',
                color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold'
              }}>← Back</button>
              <button className="kid-btn" onClick={handleNext} style={{
                padding: '12px 50px', fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
                color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold',
                boxShadow: '0 4px 20px rgba(46,204,113,0.4)'
              }}>Next →</button>
            </div>
          </div>
        )}

        {/* =================== STEP 3: GAME MODE & LAUNCH =================== */}
        {step === 3 && (
          <div style={{ animation: 'slideUp 0.35s ease-out', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Game Mode Selection */}
              <div style={{
                background: 'rgba(255,255,255,0.07)', borderRadius: '18px', padding: '16px',
                backdropFilter: 'blur(15px)', border: '2px solid rgba(255,255,255,0.1)'
              }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#FFD700' }}>
                  🎮 Choose Your Mode
                </h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {GAME_MODES.map((gm, i) => (
                    <button key={gm.value} className="kid-btn" onClick={() => setMode(gm.value)} style={{
                      padding: '12px 14px', borderRadius: '12px', cursor: 'pointer', border: 'none',
                      background: gameMode === gm.value
                        ? `linear-gradient(135deg, ${gm.color}44, ${gm.color}22)`
                        : 'rgba(255,255,255,0.06)',
                      color: 'white', textAlign: 'left',
                      outline: gameMode === gm.value ? `2px solid ${gm.color}` : 'none',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      animation: `popBounce 0.4s ease-out`,
                      animationDelay: `${i * 0.08}s`, animationFillMode: 'both'
                    }}>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '2px' }}>
                          {gm.label}
                          {gm.recommended && <span style={{ 
                            marginLeft: '8px', fontSize: '0.6rem', background: '#2ecc71', 
                            padding: '2px 7px', borderRadius: '8px', verticalAlign: 'middle'
                          }}>★</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{gm.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Summary */}
              <div style={{
                background: 'rgba(255,255,255,0.07)', borderRadius: '18px', padding: '16px',
                backdropFilter: 'blur(15px)', border: '2px solid rgba(255,255,255,0.1)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#FFD700' }}>📋 Ready to Play!</h3>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {[
                      { icon: '👤', label: 'Player', value: name || '—' },
                      { icon: '🎂', label: 'Age', value: AGE_GROUPS.find(a => a.value === ageGroup)?.label + ' yrs' },
                      { icon: '🦻', label: 'Hearing', value: HEARING_LEVELS.find(h => h.value === hearingLevel)?.label },
                      { icon: '🎮', label: 'Mode', value: GAME_MODES.find(m => m.value === gameMode)?.label.replace(/🔊 |👁️ |📋 /, '') }
                    ].map((item, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '8px 12px'
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                        <span style={{ fontSize: '0.78rem', opacity: 0.6, minWidth: '50px' }}>{item.label}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick actions below summary */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {[
                    { label: '🩺 Therapist', action: () => registerAndDo(() => useGameStore.getState().setShowTherapistDashboard(true)), bg: '#9b59b6' },
                    { label: '📋 Assess', action: () => registerAndDo(() => useGameStore.getState().launchAssessment('baseline')), bg: '#e67e22' },
                    { label: '📊 Dashboard', action: handleDashboard, bg: '#3498db' },
                    { label: '🏆 Awards', action: () => { if (!useGameStore.getState().userId) return alert("Start a session first"); useGameStore.getState().setShowAchievements(true) }, bg: '#f39c12' }
                  ].map((btn, i) => (
                    <button key={i} className="kid-btn" onClick={btn.action} disabled={loading} style={{
                      padding: '5px 10px', fontSize: '0.72rem', fontWeight: 700,
                      background: loading ? '#555' : btn.bg, color: 'white',
                      border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
                      flex: '1 1 45%'
                    }}>{btn.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main action buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="kid-btn" onClick={handleBack} style={{
                padding: '12px 30px', fontSize: '1.1rem', background: 'rgba(255,255,255,0.12)',
                color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold'
              }}>← Back</button>
              <button className="kid-btn" onClick={handleStart} disabled={loading} style={{
                padding: '14px 50px', fontSize: '1.4rem',
                background: loading ? '#7f8c8d' : 'linear-gradient(135deg, #FF6B35, #F7C948, #2ecc71)',
                backgroundSize: '200%',
                color: 'white', border: 'none', borderRadius: '50px',
                cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 900,
                boxShadow: '0 6px 30px rgba(255,107,53,0.45)',
                letterSpacing: '1px',
                animation: loading ? 'none' : 'wiggle 2s ease-in-out infinite'
              }}>
                {loading ? '⏳ Loading...' : '🚀 START GAME!'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
