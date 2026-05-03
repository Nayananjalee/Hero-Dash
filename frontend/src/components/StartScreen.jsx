import React, { useState } from 'react'
import { useGameStore } from '../store'
import AnalyticsDashboard from './AnalyticsDashboard'
import { API_URL, AGE_GROUPS, HEARING_LEVELS, GAME_MODES, devLog, devWarn } from '../config'

const RESEARCH_APP_URL = import.meta.env.VITE_RESEARCH_APP_URL || 'http://localhost:5173'

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
        {['🌊','🏚️','�️','🚨','🔥','⭐','🎵','🎧','🏥','🔔'].map((emoji, i) => (
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
      devWarn('Failed to fetch analytics:', error)
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
  const [customAlert, setCustomAlert] = useState(null) // Custom popup state

  // Helper to show custom alerts instead of native browser alerts
  const showAlert = (message, title = "Oops! ⚠️") => {
    setCustomAlert({ title, message })
  }

  // ========== Pre-fill from Research App (SilentSpark) ==========
  // When user comes from the research app, userId and username are passed via query params.
  // We pre-fill the name so the user still goes through the normal onboarding steps.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const researchUserId = params.get('userId')
    const researchUsername = params.get('username')
    if (researchUserId && researchUsername) {
      devLog('\ud83d\udd17 Research app user detected:', researchUsername, '(ID:', researchUserId, ')')
      // Pre-fill name but let user continue through normal step flow
      setName(researchUsername)
    }
  }, [])

  const handleNext = () => {
    if (step === 1 && !name.trim()) return alert("Please enter your name (කරුණාකර ඔබේ නම ඇතුළත් කරන්න)")
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleStart = async () => {
    if (!name.trim()) return showAlert("Please enter your name (කරුණාකර ඔබේ නම ඇතුළත් කරන්න)", "Name Required! ✏️")
    
    // Check if API URL is configured
    if (!API_URL) {
      devWarn("❌ API_URL not configured - cannot connect to backend")
      showAlert("Backend URL not configured! Make sure VITE_API_URL environment variable is set.", "System Error ⚠️")
      return
    }
    
    // Unlock audio context
    const unlockAudio = new Audio('/sounds/engine_loop.mp3')
    unlockAudio.volume = 0.1
    unlockAudio.play().then(() => unlockAudio.pause()).catch(e => devLog("Audio unlock failed", e))

    // Update global state
    setAgeGroup(ageGroup)
    setGameMode(gameMode)
    setHearingProfile({ hearing_level: hearingLevel })

    setLoading(true)
    try {
      devLog(`📡 Connecting to: ${API_URL}/users/`)
      const response = await fetch(`${API_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: name,
          age_group: ageGroup,
          hearing_level: hearingLevel
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Backend error (${response.status}): ${errorText.substring(0, 100)}`)
      }
      
      const data = await response.json()
      devLog(`✅ User created: ${data.id}`)
      setUserId(data.id, data.username)
      startGame()
    } catch (error) {
      const errorMsg = error?.message || String(error)
      devWarn("❌ Connection failed:", errorMsg)
      console.error("Full error:", error)
      
      // Show user-friendly error with debugging info
      showAlert(
        `Cannot connect to backend server. Is it running? (${errorMsg})`, "Connection Error ❌"
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDashboard = async () => {
    if (!name.trim()) return showAlert("Please enter your name (කරුණාකර ඔබේ නම ඇතුළත් කරන්න)", "Name Required! ✏️")
    
    if (!API_URL) {
      showAlert("Backend URL not configured!", "System Error ⚠️")
      return
    }
    
    setLoading(true)
    try {
      devLog(`📡 Connecting to: ${API_URL}/users/`)
      const response = await fetch(`${API_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, age_group: ageGroup, hearing_level: hearingLevel })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Backend error (${response.status}): ${errorText.substring(0, 100)}`)
      }
      
      const data = await response.json()
      devLog(`✅ User created: ${data.id}`)
      setUserId(data.id, data.username)
      setShowDashboard(true)
    } catch (error) {
      const errorMsg = error?.message || String(error)
      devWarn("❌ Dashboard load failed:", errorMsg)
      showAlert(`Cannot load dashboard: ${errorMsg}`, "Connection Error ❌")
    } finally {
      setLoading(false)
    }
  }

  // Shared function to register user for advanced actions
  const registerAndDo = async (action) => {
    if (!name.trim()) return showAlert("Please enter your name first", "Name Required! ✏️")
    
    if (!API_URL) {
      showAlert("Backend URL not configured!", "System Error ⚠️")
      return
    }
    
    setLoading(true)
    try {
      devLog(`📡 Connecting to: ${API_URL}/users/`)
      const response = await fetch(`${API_URL}/users/`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, age_group: ageGroup, hearing_level: hearingLevel })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Backend error (${response.status})`)
      }
      
      const data = await response.json()
      devLog(`✅ User registered: ${data.id}`)
      setUserId(data.id, data.username)
      action()
    } catch (error) { 
      devWarn("❌ Registration failed:", error?.message || error)
      showAlert(`Connection failed: ${error?.message || 'Unknown error'}`, "Connection Error ❌") 
    }
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

      {/* ========== CUSTOM POPUP ALERT ========== */}
      {customAlert && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2d1b69, #1a1a40)', border: '4px solid #FFD700',
            borderRadius: '24px', padding: '30px 40px', maxWidth: '400px', width: '80%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'popBounce 0.4s ease-out'
          }}>
            <h2 style={{ color: '#FFD700', marginTop: 0, fontSize: '1.8rem' }}>{customAlert.title}</h2>
            <p style={{ fontSize: '1.2rem', lineHeight: '1.5', margin: '20px 0' }}>{customAlert.message}</p>
            <button className="kid-btn" onClick={() => setCustomAlert(null)} style={{
              padding: '12px 30px', fontSize: '1.2rem', fontWeight: 'bold',
              background: '#2ecc71', color: 'white', border: 'none', borderRadius: '50px',
              cursor: 'pointer', boxShadow: '0 5px 15px rgba(46,204,113,0.4)', width: '100%'
            }}>
              OK, Got it! 👍
            </button>
          </div>
        </div>
      )}

      {/* ========== BACK TO SILENTSPARK ========== */}
      <a
        href={RESEARCH_APP_URL}
        style={{
          position: 'fixed', top: 14, left: 14,
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
          border: '1.5px solid rgba(255,255,255,0.3)',
          borderRadius: '12px', padding: '8px 18px',
          color: 'white', fontSize: '0.88rem', fontWeight: 700,
          textDecoration: 'none', zIndex: 200,
          display: 'flex', alignItems: 'center', gap: '6px',
          transition: 'all 0.2s',
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
      >
        ← SilentSpark
      </a>

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

      {/* ========== SINGLE PAGE CONTENT AREA ========== */}
      <div style={{
        zIndex: 1, width: '96%', maxWidth: '1000px',
        flex: '1 1 auto', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '20px', paddingBottom: '20px',
        overflowY: 'auto'
      }}>

        {/* --- Top Row: Name Input & Action Buttons --- */}
        <div style={{ display: 'flex', gap: '20px', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Name Input */}
          <div style={{ 
            background: 'rgba(255,255,255,0.08)', borderRadius: '20px', padding: '15px 20px',
            backdropFilter: 'blur(15px)', border: '2px solid rgba(255,255,255,0.12)',
            flex: '1 1 300px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
          }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px', color: '#FFD700', textAlign: 'left' }}>
              ✏️ What's your name? (ඔබේ නම)
            </label>
            <input 
              type="text" placeholder="Enter your name here..." value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                padding: '12px 15px', fontSize: '1.1rem', borderRadius: '12px',
                border: '2px solid rgba(255,255,255,0.2)', width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.95)', color: '#333', fontWeight: 600, outline: 'none'
              }}
            />
          </div>

          {/* Action Buttons (Missions, Dashboard, etc.) */}
          <div style={{ 
            background: 'rgba(255,255,255,0.08)', borderRadius: '20px', padding: '15px',
            backdropFilter: 'blur(15px)', border: '2px solid rgba(255,255,255,0.12)',
            flex: '2 1 400px', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', alignItems: 'center'
          }}>
            {[
              { label: '📋 Missions', action: () => registerAndDo(() => useGameStore.getState().setShowMissionSelect(true)), bg: '#e74c3c' },
              { label: '🩺 Therapist', action: () => registerAndDo(() => useGameStore.getState().setShowTherapistDashboard(true)), bg: '#9b59b6' },
              { label: '📊 Dashboard', action: handleDashboard, bg: '#3498db' },
              { label: '🏆 Awards', action: () => registerAndDo(() => useGameStore.getState().setShowAchievements(true)), bg: '#f39c12' }
            ].map((btn, i) => (
              <button key={i} className="kid-btn" onClick={btn.action} disabled={loading} style={{
                padding: '10px 16px', fontSize: '0.9rem', fontWeight: 800,
                background: loading ? '#555' : btn.bg, color: 'white',
                border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer',
                flex: '1 1 calc(45% - 8px)', boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
              }}>{btn.label}</button>
            ))}
          </div>
        </div>

        {/* --- Middle Row: Age and Hearing Level Selection --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', width: '100%' }}>
          {/* Age Selection */}
          <div style={{
            background: 'rgba(255,255,255,0.07)', borderRadius: '20px', padding: '20px',
            backdropFilter: 'blur(15px)', border: '2px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem', color: '#FFD700', textAlign: 'left' }}>
              👶 How old are you? (වයස)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {AGE_GROUPS.map((ag, i) => (
                <button key={ag.value} className="kid-btn" onClick={() => setAge(ag.value)} style={{
                  padding: '12px 5px', borderRadius: '16px', cursor: 'pointer', border: 'none',
                  background: ageGroup === ag.value
                    ? 'linear-gradient(135deg, #2ecc71, #27ae60)'
                    : 'rgba(255,255,255,0.08)',
                  color: 'white', textAlign: 'center',
                  boxShadow: ageGroup === ag.value ? '0 4px 15px rgba(46,204,113,0.5)' : 'none',
                  animation: `popBounce 0.4s ease-out`,
                  animationDelay: `${i * 0.05}s`, animationFillMode: 'both'
                }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: '5px' }}>{ag.emoji}</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{ag.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Hearing Level Selection */}
          <div style={{
            background: 'rgba(255,255,255,0.07)', borderRadius: '20px', padding: '20px',
            backdropFilter: 'blur(15px)', border: '2px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: '#FFD700', textAlign: 'left' }}>
              🦻 Hearing Level (ශ්‍රවණ මට්ටම)
            </h3>
            <p style={{ fontSize: '0.8rem', margin: '0 0 12px 0', opacity: 0.7, textAlign: 'left' }}>
              Ask your parent or therapist for help
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {HEARING_LEVELS.map((hl, i) => (
                <button key={hl.value} className="kid-btn" onClick={() => setHearingLevel(hl.value)} style={{
                  padding: '12px 8px', borderRadius: '16px', cursor: 'pointer', border: 'none',
                  background: hearingLevel === hl.value
                    ? `linear-gradient(135deg, ${hl.color}77, ${hl.color}44)`
                    : 'rgba(255,255,255,0.06)',
                  color: 'white', textAlign: 'center',
                  outline: hearingLevel === hl.value ? `3px solid ${hl.color}` : 'none',
                  boxShadow: hearingLevel === hl.value ? `0 4px 15px ${hl.color}66` : 'none',
                  animation: `popBounce 0.4s ease-out`,
                  animationDelay: `${i * 0.05}s`, animationFillMode: 'both'
                }}>
                  <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '4px' }}>{hl.icon}</span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{hl.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- Bottom Row: Big Start Button --- */}
        <div style={{ marginTop: '10px', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <button className="kid-btn" onClick={handleStart} disabled={loading} style={{
            padding: '16px 80px', fontSize: '1.6rem',
            background: loading ? '#7f8c8d' : 'linear-gradient(135deg, #FF6B35, #F7C948, #2ecc71)',
            backgroundSize: '200%', color: 'white', border: 'none', borderRadius: '50px',
            cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 900,
            boxShadow: '0 8px 30px rgba(255,107,53,0.5)', letterSpacing: '1.5px',
            animation: loading ? 'none' : 'wiggle 2s ease-in-out infinite'
          }}>
            {loading ? '⏳ Loading...' : '🚀 START GAME!'}
          </button>
        </div>

      </div>
    </div>
  )
}
