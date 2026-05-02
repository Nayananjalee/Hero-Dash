import React, { useState } from 'react'
import { useGameStore } from '../store'
import AnalyticsDashboard from './AnalyticsDashboard'
import { API_URL, AGE_GROUPS, HEARING_LEVELS, devLog, devWarn } from '../config'

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
        
        /* Custom scrollbar for instructions if needed */
        .instruction-scroll::-webkit-scrollbar { width: 6px; }
        .instruction-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .instruction-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
      `}</style>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        {['🌊','🏚️','🌪️','🚨','🔥','⭐','🎵','🎧','🏥','🔔'].map((emoji, i) => (
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

function MiniStatBar({ scenario, stats }) {
  if (!stats) return null
  const getColor = (rate) => rate >= 70 ? '#2ecc71' : rate >= 50 ? '#f39c12' : '#e74c3c'
  const icons = { tsunami_siren: '🌊', earthquake_alarm: '🏚️', flood_warning: '🌊', air_raid_siren: '🚨', building_fire_alarm: '🔥' }
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '1rem' }}>
        <span>{icons[scenario]} {scenario.charAt(0).toUpperCase() + scenario.slice(1).replace('_', ' ')}</span>
        <span><strong style={{ color: getColor(stats.success_rate) }}>{stats.success_rate}%</strong> ({stats.attempts} tries)</span>
      </div>
      <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
        <div style={{ width: `${stats.success_rate}%`, height: '100%', background: getColor(stats.success_rate), transition: 'all 0.5s ease' }} />
      </div>
    </div>
  )
}

// ============================================================
// MAIN START SCREEN - Single unified dashboard view
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
  const [loading, setLoading] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  
  // Stats state for the side panel (if user returns to menu)
  const [userStats, setUserStats] = useState(null)

  // Pre-fill from Research App
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const researchUsername = params.get('username')
    if (researchUsername) {
      setName(researchUsername)
    }
  }, [])

  // Auto-fetch stats when name is entered (simulated)
  React.useEffect(() => {
    if (name.length > 2) {
      // In a real app, fetch from backend
      // setUserStats(...)
    }
  }, [name])

  const handleStart = async () => {
    if (!name.trim()) return alert("Please enter your name (කරුණාකර ඔබේ නම ඇතුළත් කරන්න)")
    
    setLoading(true)
    setAgeGroup(ageGroup)
    setHearingProfile(hearingLevel)
    setGameMode('audio-visual') // Always set to audio-visual automatically
    
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
      
      alert(
        `❌ Cannot connect to backend\n\nError: ${errorMsg}\n\nAPI URL: ${API_URL}`
      )
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
      if (!response.ok) throw new Error("Backend error")
      const data = await response.json()
      setUserId(data.id, data.username)
      setShowDashboard(true)
    } catch (error) {
      alert("Error: Cannot connect to analytics server.")
    } finally {
      setLoading(false)
    }
  }

  // If viewing dashboard, render it
  if (showDashboard) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e', overflow: 'hidden' }}>
        <button 
          className="kid-btn"
          onClick={() => setShowDashboard(false)}
          style={{
            position: 'absolute', top: '20px', left: '20px', zIndex: 100,
            padding: '12px 24px', background: 'rgba(255,255,255,0.1)',
            border: 'none', borderRadius: '12px', color: 'white',
            fontWeight: 'bold', cursor: 'pointer', backdropFilter: 'blur(10px)'
          }}
        >
          ← Back to Menu
        </button>
        <AnalyticsDashboard />
      </div>
    )
  }

  return (
    <div style={{ 
      width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden',
      background: 'radial-gradient(circle at 50% 50%, #2c3e50 0%, #1a1a2e 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: "'Comic Sans MS', 'Chalkboard SE', sans-serif"
    }}>
      <FloatingParticles />

      {/* Top Left Return Button */}
      <button 
        className="kid-btn"
        onClick={() => window.location.href = RESEARCH_APP_URL}
        style={{
          position: 'absolute', top: '20px', left: '20px', zIndex: 10,
          background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)',
          color: 'white', padding: '10px 20px', borderRadius: '20px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
          fontWeight: 'bold', backdropFilter: 'blur(5px)'
        }}
      >
        ← Return to Main App
      </button>

      {/* Main Title Area */}
      <div style={{ textAlign: 'center', zIndex: 1, marginBottom: '20px', animation: 'slideUp 0.6s ease-out' }}>
        <h1 style={{ 
          fontSize: 'clamp(2.5rem, 5vw, 4rem)', margin: '0 0 5px 0', 
          color: '#FFD700', animation: 'titleGlow 3s infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px'
        }}>
          🎧 Emergency Hero 3D
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#ecf0f1', opacity: 0.9, margin: 0 }}>
          Listen to emergency sounds and save the day! 🚑
        </p>
      </div>

      {/* Central Content Panel - Grid Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(350px, 450px) minmax(350px, 400px)',
        gap: '30px',
        width: '90%',
        maxWidth: '1000px',
        zIndex: 1,
        animation: 'slideUp 0.8s ease-out'
      }}>
        
        {/* LEFT COLUMN: Instructions & Sounds */}
        <div style={{
          background: 'rgba(255,255,255,0.07)', borderRadius: '24px', padding: '24px',
          backdropFilter: 'blur(15px)', border: '2px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column'
        }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '1.4rem', color: '#FFD700', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
            👂 Listen for these sounds:
          </h2>
          
          <div className="instruction-scroll" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', overflowY: 'auto', maxHeight: '40vh', paddingRight: '10px' }}>
            {[
              { id: 'tsunami', icon: '🌊', name: 'Tsunami Warning', desc: 'Loud, long sweeping siren', color: '#3498db' },
              { id: 'quake', icon: '🏚️', name: 'Earthquake Alarm', desc: 'Deep rumbling & sharp bells', color: '#e67e22' },
              { id: 'flood', icon: '💧', name: 'Flood Alert', desc: 'Repeating low-pitch horn', color: '#2980b9' },
              { id: 'raid', icon: '🚨', name: 'Air Raid / Danger', desc: 'High-pitch wailing sound', color: '#e74c3c' },
              { id: 'fire', icon: '🔥', name: 'Building Fire', desc: 'Fast, sharp buzzing alarm', color: '#c0392b' }
            ].map(s => (
              <div key={s.id} style={{
                background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '15px', borderLeft: `6px solid ${s.color}`
              }}>
                <div style={{ fontSize: '2.5rem', filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))' }}>{s.icon}</div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#fff' }}>{s.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#bdc3c7' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Player Profile & Action Buttons */}
        <div style={{
          background: 'rgba(255,255,255,0.07)', borderRadius: '24px', padding: '24px',
          backdropFilter: 'blur(15px)', border: '2px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column', gap: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#FFD700', textAlign: 'center' }}>
            📋 Ready to Play!
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Name Input */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.5rem' }}>👤</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: '#bdc3c7', marginBottom: '4px' }}>Player Name</div>
                <input 
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Enter your name..."
                  style={{ 
                    width: '100%', background: 'transparent', border: 'none', color: '#fff', 
                    fontSize: '1.2rem', fontWeight: 'bold', outline: 'none' 
                  }} 
                />
              </div>
            </div>

            {/* Age & Hearing Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: '#bdc3c7', marginBottom: '8px' }}>🎂 Age Group</div>
                <select 
                  value={ageGroup} onChange={e => setAge(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer', outline: 'none' }}
                >
                  {AGE_GROUPS.map(g => <option key={g} value={g} style={{ color: '#000' }}>{g} yrs</option>)}
                </select>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: '#bdc3c7', marginBottom: '8px' }}>🦻 Hearing Level</div>
                <select 
                  value={hearingLevel} onChange={e => setHearingLevel(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer', outline: 'none' }}
                >
                  {HEARING_LEVELS.map(h => <option key={h} value={h} style={{ color: '#000' }}>{h.charAt(0).toUpperCase() + h.slice(1)}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Access Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
            <button className="kid-btn" onClick={handleDashboard} style={{
              background: 'rgba(52, 152, 219, 0.3)', border: '1px solid #3498db', color: 'white',
              padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'
            }}>📊 Dashboard</button>
            <button className="kid-btn" onClick={() => alert("Therapist tools coming soon!")} style={{
              background: 'rgba(155, 89, 182, 0.3)', border: '1px solid #9b59b6', color: 'white',
              padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'
            }}>👩‍⚕️ Therapist</button>
            <button className="kid-btn" onClick={() => alert("Assessment starting...")} style={{
              background: 'rgba(230, 126, 34, 0.3)', border: '1px solid #e67e22', color: 'white',
              padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'
            }}>📋 Assess</button>
            <button className="kid-btn" onClick={() => alert("Awards showing...")} style={{
              background: 'rgba(241, 196, 15, 0.3)', border: '1px solid #f1c40f', color: 'white',
              padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'
            }}>🏆 Awards</button>
          </div>

          {/* BIG START BUTTON */}
          <button 
            className="kid-btn" onClick={handleStart} disabled={loading}
            style={{
              width: '100%', background: 'linear-gradient(135deg, #FF512F 0%, #F09819 100%)',
              border: 'none', padding: '18px 20px', borderRadius: '20px', color: 'white',
              fontSize: '1.6rem', fontWeight: 900, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px rgba(240, 152, 25, 0.4)', textTransform: 'uppercase',
              letterSpacing: '2px', opacity: loading ? 0.7 : 1, marginTop: '10px'
            }}
          >
            {loading ? '⏳ Loading...' : '🚀 START GAME!'}
          </button>
          
        </div>
      </div>
    </div>
  )
}
