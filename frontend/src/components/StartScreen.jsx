import React, { useState } from 'react'
import { useGameStore } from '../store'
import AnalyticsDashboard from './AnalyticsDashboard'

// Dashboard View Component
function DashboardView({ onBack }) {
  const { userId } = useGameStore()
  const [progressReport, setProgressReport] = useState(null)
  const [learningCurve, setLearningCurve] = useState([])
  const [cognitiveStatus, setCognitiveStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchAnalytics = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const progressRes = await fetch(`http://localhost:8000/analytics/progress-report/${userId}?days=7`)
      const progressData = await progressRes.json()
      if (!progressData.error) {
        setProgressReport(progressData)
      }

      const curveRes = await fetch(`http://localhost:8000/analytics/learning-curve/${userId}`)
      const curveData = await curveRes.json()
      setLearningCurve(curveData.data_points || [])

      const cognitiveRes = await fetch(`http://localhost:8000/analytics/cognitive-load/${userId}`)
      const cognitiveData = await cognitiveRes.json()
      setCognitiveStatus(cognitiveData)
      
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchAnalytics()
  }, [userId])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      overflowY: 'auto',
      zIndex: 1000,
      padding: '20px'
    }}>
      <button
        onClick={onBack}
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          padding: '12px 24px',
          background: '#e74c3c',
          border: 'none',
          borderRadius: '10px',
          color: 'white',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          zIndex: 1001,
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        }}
      >
        ← Back to Menu
      </button>

      <div style={{ maxWidth: '1200px', margin: '80px auto 20px' }}>
        <h1 style={{ color: 'white', textAlign: 'center', fontSize: '3rem', marginBottom: '40px' }}>
          📊 Progress Dashboard
        </h1>
        
        {loading && (
          <div style={{ textAlign: 'center', color: 'white', fontSize: '1.5rem' }}>
            Loading analytics... ⏳
          </div>
        )}

        {progressReport && !loading && (
          <ProgressReportDisplay 
            data={progressReport}
            learningCurve={learningCurve}
            cognitiveStatus={cognitiveStatus}
          />
        )}
      </div>
    </div>
  )
}

// Import the ProgressReportModal from AnalyticsDashboard (simplified version)
function ProgressReportDisplay({ data, learningCurve, cognitiveStatus }) {
  return (
    <div style={{ color: 'white' }}>
      {/* Overall Performance */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '15px',
        padding: '30px',
        marginBottom: '20px'
      }}>
        <h2>🎯 Overall Performance</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
          <StatCard label="Total Attempts" value={data.overall_performance.total_attempts} icon="🎮" />
          <StatCard label="Success Rate" value={`${data.overall_performance.success_rate}%`} icon="✅" color="#2ecc71" />
          <StatCard label="Avg Reaction" value={`${data.overall_performance.avg_reaction_time.toFixed(1)}s`} icon="⚡" color="#f39c12" />
          <StatCard label="Improvement" value={`${data.overall_performance.improvement_rate > 0 ? '+' : ''}${data.overall_performance.improvement_rate}%`} icon="📈" color={data.overall_performance.improvement_rate > 0 ? '#2ecc71' : '#e74c3c'} />
        </div>
      </div>

      {/* Scenario Breakdown */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '15px',
        padding: '30px',
        marginBottom: '20px'
      }}>
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
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '10px',
      padding: '20px',
      textAlign: 'center',
      border: `2px solid ${color}`
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ fontSize: '1rem', opacity: 0.8, marginTop: '5px' }}>{label}</div>
    </div>
  )
}

function ScenarioBar({ scenario, stats }) {
  const getColor = (rate) => {
    if (rate >= 70) return '#2ecc71'
    if (rate >= 50) return '#f39c12'
    return '#e74c3c'
  }

  const icons = {
    ambulance: '🚑',
    police: '🚓',
    firetruck: '🚒',
    train: '🚂',
    ice_cream: '🍦'
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '1.1rem' }}>
        <span>{icons[scenario]} {scenario.charAt(0).toUpperCase() + scenario.slice(1)}</span>
        <span>
          <strong style={{ color: getColor(stats.success_rate) }}>
            {stats.success_rate}%
          </strong> ({stats.attempts} attempts)
        </span>
      </div>
      <div style={{
        width: '100%',
        height: '12px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${stats.success_rate}%`,
          height: '100%',
          background: getColor(stats.success_rate),
          transition: 'all 0.5s ease'
        }}/>
      </div>
    </div>
  )
}

// Main Start Screen Component
export default function StartScreen() {
  const startGame = useGameStore((state) => state.startGame)
  const setUserId = useGameStore((state) => state.setUserId)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)

  const handleStart = async () => {
    if (!name.trim()) return alert("Please enter your name (කරුණාකර ඔබේ නම ඇතුළත් කරන්න)")
    
    const unlockAudio = new Audio('/sounds/engine_loop.mp3')
    unlockAudio.volume = 0.1
    unlockAudio.play().then(() => unlockAudio.pause()).catch(e => console.log("Audio unlock failed", e))

    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/users/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name })
      })
      const data = await response.json()
      
      setUserId(data.id, data.username)
      startGame()
    } catch (error) {
      console.error("Login failed", error)
      alert("Connection failed. Starting offline mode.")
      startGame()
    } finally {
      setLoading(false)
    }
  }

  const handleDashboard = async () => {
    if (!name.trim()) return alert("Please enter your name (කරුණාකර ඔබේ නම ඇතුළත් කරන්න)")
    
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/users/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name })
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

  if (showDashboard) {
    return <DashboardView onBack={() => setShowDashboard(false)} />
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '10px', color: '#fff', textShadow: '3px 3px 6px rgba(0,0,0,0.3)' }}>
        🎧 Emergency Hero 3D
      </h1>
      <p style={{ fontSize: '1.3rem', marginBottom: '40px', opacity: 0.9 }}>
        Hearing Therapy Game for Children
      </p>
      
      {/* Instructions */}
      <div style={{ 
        background: 'rgba(255,255,255,0.15)', 
        padding: '25px', 
        borderRadius: '20px', 
        marginBottom: '40px', 
        maxWidth: '700px',
        backdropFilter: 'blur(10px)',
        border: '2px solid rgba(255,255,255,0.2)'
      }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '20px', color: '#f1c40f' }}>උපදෙස් (Instructions)</h2>
        <ul style={{ listStyle: 'none', padding: 0, fontSize: '1.3rem', lineHeight: '2' }}>
          <li>🚑 <strong>ගිලන් රථය (Ambulance)</strong>: දකුණට යන්න ➡️</li>
          <li>🚒 <strong>ගිනි නිවන රථය (Firetruck)</strong>: වමට යන්න ⬅️</li>
          <li>🚓 <strong>පොලිසිය (Police)</strong>: මැද රැඳී සිටින්න ⏺️</li>
        </ul>
        <p style={{ marginTop: '20px', fontSize: '1.1rem', color: '#ecf0f1' }}>
          🎵 ශබ්දයට සවන් දී නිවැරදි මංතීරුවට මාරු වන්න
        </p>
      </div>

      {/* Name Input */}
      <div style={{ marginBottom: '30px' }}>
        <input 
          type="text" 
          placeholder="Enter Your Name (ඔබේ නම)" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleStart()}
          style={{
            padding: '18px',
            fontSize: '1.5rem',
            borderRadius: '12px',
            border: '2px solid rgba(255,255,255,0.3)',
            width: '350px',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.9)'
          }}
        />
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '20px' }}>
        <button 
          onClick={handleStart}
          disabled={loading}
          style={{
            padding: '20px 45px',
            fontSize: '1.8rem',
            background: loading ? '#7f8c8d' : 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
            color: 'white',
            border: '2px solid white',
            borderRadius: '15px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => !loading && (e.target.style.transform = 'scale(1.05)')}
          onMouseOut={(e) => !loading && (e.target.style.transform = 'scale(1)')}
        >
          {loading ? '⏳ Loading...' : '🎮 Play Game'}
        </button>

        <button 
          onClick={handleDashboard}
          disabled={loading}
          style={{
            padding: '20px 45px',
            fontSize: '1.8rem',
            background: loading ? '#7f8c8d' : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
            color: 'white',
            border: '2px solid white',
            borderRadius: '15px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => !loading && (e.target.style.transform = 'scale(1.05)')}
          onMouseOut={(e) => !loading && (e.target.style.transform = 'scale(1)')}
        >
          {loading ? '⏳ Loading...' : '📊 View Dashboard'}
        </button>
      </div>
    </div>
  )
}
