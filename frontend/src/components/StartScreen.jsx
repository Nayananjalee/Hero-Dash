import React, { useState } from 'react'
import { useGameStore } from '../store'
import AnalyticsDashboard from './AnalyticsDashboard'
import { API_URL, AGE_GROUPS, HEARING_LEVELS, devLog, devWarn } from '../config'

const RESEARCH_APP_URL = import.meta.env.VITE_RESEARCH_APP_URL || 'http://localhost:5173'

function FloatingParticles() {
  return (
    <>
      <style>{`
        @keyframes float1 { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-30px) rotate(15deg); } }
        @keyframes float2 { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(-10deg); } }
        @keyframes popBounce { 0% { transform: scale(0); } 60% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes slideUp { 0% { transform: translateY(30px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes titleGlow { 0%,100% { text-shadow: 0 0 20px rgba(255,215,0,0.3); } 50% { text-shadow: 0 0 40px rgba(255,215,0,0.6); } }
        .kid-btn { transition: all 0.2s ease !important; }
        .kid-btn:hover { transform: scale(1.06) !important; box-shadow: 0 6px 25px rgba(0,0,0,0.25) !important; }
        .kid-btn:active { transform: scale(0.97) !important; }
        .instruction-scroll::-webkit-scrollbar { width: 6px; }
        .instruction-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
      `}</style>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
        {['🌊','🏚️','🌪️','🚨','🔥','⭐','🎵'].map((emoji, i) => (
          <span key={i} style={{
            position: 'absolute', fontSize: `${1.2 + Math.random()}rem`, opacity: 0.15,
            top: `${10 + Math.random() * 80}%`, left: `${5 + Math.random() * 90}%`,
            animation: `float${(i % 2) + 1} ${4 + Math.random() * 3}s ease-in-out infinite`
          }}>{emoji}</span>
        ))}
      </div>
    </>
  )
}

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

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const researchUsername = params.get('username')
    if (researchUsername) setName(researchUsername)
  }, [])

  const handleStart = async () => {
    if (!name.trim()) return alert("කරුණාකර ඔබේ නම ඇතුළත් කරන්න (Please enter your name)")
    
    setLoading(true)
    setAgeGroup(ageGroup)
    setHearingProfile(hearingLevel)
    setGameMode('audio-visual')
    
    try {
      const response = await fetch(`${API_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, age_group: ageGroup, hearing_level: hearingLevel })
      })
      if (!response.ok) throw new Error("Backend error")
      const data = await response.json()
      setUserId(data.id, data.username)
      startGame()
    } catch (error) {
      alert(`❌ Cannot connect to backend\n\nError: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDashboard = () => {
    if (!name.trim()) return alert("කරුණාකර ඔබේ නම ඇතුළත් කරන්න")
    setShowDashboard(true)
  }

  if (showDashboard) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e', overflow: 'hidden' }}>
        <button className="kid-btn" onClick={() => setShowDashboard(false)}
          style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100, padding: '12px 24px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
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
      color: 'white', fontFamily: "'Comic Sans MS', sans-serif"
    }}>
      <FloatingParticles />

      <div style={{ textAlign: 'center', zIndex: 1, marginBottom: '20px', animation: 'slideUp 0.6s ease-out' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', margin: '0 0 5px 0', color: '#FFD700', animation: 'titleGlow 3s infinite' }}>
          🎧 Emergency Hero 3D
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#ecf0f1', margin: 0 }}>Listen to emergency sounds and save the day! 🚑</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 450px) minmax(350px, 400px)', gap: '30px', width: '90%', maxWidth: '1000px', zIndex: 1, animation: 'slideUp 0.8s ease-out' }}>
        
        {/* LEFT COLUMN: Sounds */}
        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '24px', padding: '24px', border: '2px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ margin: '0 0 15px 0', color: '#FFD700', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>👂 Listen for these sounds:</h2>
          <div className="instruction-scroll" style={{ display: 'grid', gap: '12px', overflowY: 'auto', maxHeight: '40vh', paddingRight: '10px' }}>
            {[
              { id: 'tsunami', icon: '🌊', name: 'Tsunami Warning', color: '#3498db' },
              { id: 'quake', icon: '🏚️', name: 'Earthquake Alarm', color: '#e67e22' },
              { id: 'flood', icon: '💧', name: 'Flood Alert', color: '#2980b9' },
              { id: 'raid', icon: '🚨', name: 'Air Raid / Danger', color: '#e74c3c' },
              { id: 'fire', icon: '🔥', name: 'Building Fire', color: '#c0392b' }
            ].map(s => (
              <div key={s.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: `6px solid ${s.color}` }}>
                <div style={{ fontSize: '2rem' }}>{s.icon}</div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{s.name}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Profile */}
        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '24px', padding: '24px', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ margin: 0, color: '#FFD700', textAlign: 'center' }}>📋 Ready to Play!</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.5rem' }}>👤</span>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Player Name..." style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold', outline: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <select value={ageGroup} onChange={e => setAge(e.target.value)} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}>
                {AGE_GROUPS.map(g => <option key={g.value} value={g.value} style={{ color: '#000' }}>{g.label} yrs</option>)}
              </select>
              <select value={hearingLevel} onChange={e => setHearingLevel(e.target.value)} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}>
                {HEARING_LEVELS.map(h => <option key={h.value} value={h.value} style={{ color: '#000' }}>{h.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
            <button className="kid-btn" onClick={handleDashboard} style={{ background: 'rgba(52, 152, 219, 0.3)', border: '1px solid #3498db', color: 'white', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>📊 Dashboard</button>
            <button className="kid-btn" onClick={() => alert("Therapist tools coming soon!")} style={{ background: 'rgba(155, 89, 182, 0.3)', border: '1px solid #9b59b6', color: 'white', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>👩‍⚕️ Therapist</button>
          </div>
          <button className="kid-btn" onClick={handleStart} disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg, #FF512F 0%, #F09819 100%)', border: 'none', padding: '18px 20px', borderRadius: '20px', color: 'white', fontSize: '1.6rem', fontWeight: 900, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
            {loading ? '⏳ Loading...' : '🚀 START GAME!'}
          </button>
        </div>
      </div>
    </div>
  )
}
