import React, { useState, useEffect } from 'react'
import { useGameStore } from '../store'

export default function AnalyticsDashboard() {
  const { userId } = useGameStore()
  const [progressReport, setProgressReport] = useState(null)
  const [learningCurve, setLearningCurve] = useState([])
  const [cognitiveStatus, setCognitiveStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchAnalytics = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      // Fetch progress report
      const progressRes = await fetch(`http://localhost:8000/analytics/progress-report/${userId}?days=7`)
      const progressData = await progressRes.json()
      if (!progressData.error) {
        setProgressReport(progressData)
      }

      // Fetch learning curve
      const curveRes = await fetch(`http://localhost:8000/analytics/learning-curve/${userId}`)
      const curveData = await curveRes.json()
      setLearningCurve(curveData.data_points || [])

      // Fetch cognitive load
      const cognitiveRes = await fetch(`http://localhost:8000/analytics/cognitive-load/${userId}`)
      const cognitiveData = await cognitiveRes.json()
      setCognitiveStatus(cognitiveData)
      
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!userId) {
    return null
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      right: 20,
      zIndex: 10,
      pointerEvents: 'auto'
    }}>
      <button
        onClick={fetchAnalytics}
        style={{
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '12px',
          color: 'white',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          transition: 'transform 0.2s'
        }}
        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      >
        📊 View Analytics
      </button>

      {loading && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.9)',
          padding: '30px',
          borderRadius: '20px',
          color: 'white',
          fontSize: '1.5rem',
          zIndex: 1000
        }}>
          Loading analytics... 📊
        </div>
      )}

      {progressReport && !loading && (
        <ProgressReportModal 
          data={progressReport}
          learningCurve={learningCurve}
          cognitiveStatus={cognitiveStatus}
          onClose={() => {
            setProgressReport(null)
            setLearningCurve([])
            setCognitiveStatus(null)
          }}
        />
      )}
    </div>
  )
}

function ProgressReportModal({ data, learningCurve, cognitiveStatus, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      overflow: 'auto',
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        borderRadius: '20px',
        padding: '30px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        color: 'white',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          borderBottom: '2px solid rgba(255,255,255,0.2)',
          paddingBottom: '20px'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem' }}>📊 Progress Analytics</h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.8 }}>
              {data.user_info.username} • Level {data.user_info.current_level}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            ✕
          </button>
        </div>

        {/* Overall Performance */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '15px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '1.3rem' }}>🎯 Overall Performance</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
            <StatCard 
              label="Total Attempts"
              value={data.overall_performance.total_attempts}
              icon="🎮"
            />
            <StatCard 
              label="Success Rate"
              value={`${data.overall_performance.success_rate}%`}
              icon="✅"
              color="#2ecc71"
            />
            <StatCard 
              label="Avg Reaction"
              value={`${data.overall_performance.avg_reaction_time.toFixed(1)}s`}
              icon="⚡"
              color="#f39c12"
            />
            <StatCard 
              label="Improvement"
              value={`${data.overall_performance.improvement_rate > 0 ? '+' : ''}${data.overall_performance.improvement_rate}%`}
              icon="📈"
              color={data.overall_performance.improvement_rate > 0 ? '#2ecc71' : '#e74c3c'}
            />
          </div>
        </div>

        {/* Scenario Breakdown */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '15px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '1.3rem' }}>🚨 Scenario Performance</h2>
          {Object.entries(data.scenario_breakdown).map(([scenario, stats]) => (
            <ScenarioBar 
              key={scenario}
              scenario={scenario}
              stats={stats}
            />
          ))}
        </div>

        {/* Current State */}
        {cognitiveStatus && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '1.3rem' }}>🧠 Current Cognitive State</h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Cognitive Load:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '200px', height: '10px', background: 'rgba(255,255,255,0.2)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${cognitiveStatus.cognitive_load * 100}%`,
                      height: '100%',
                      background: getCognitiveLoadColor(cognitiveStatus.cognitive_load)
                    }}/>
                  </div>
                  <strong>{cognitiveStatus.load_level}</strong>
                </div>
              </div>
              <div style={{
                padding: '12px',
                background: cognitiveStatus.flow_state.in_flow ? 'rgba(46, 204, 113, 0.2)' : 'rgba(52, 152, 219, 0.2)',
                borderRadius: '8px',
                border: `2px solid ${cognitiveStatus.flow_state.in_flow ? '#2ecc71' : '#3498db'}`
              }}>
                {cognitiveStatus.flow_state.in_flow ? '✨ In Flow State!' : '🎯 Not in flow state'}
                <div style={{ fontSize: '0.85rem', marginTop: '5px', opacity: 0.9 }}>
                  {cognitiveStatus.flow_state.reason}
                </div>
              </div>
              <div style={{ 
                padding: '12px', 
                background: 'rgba(52, 152, 219, 0.2)', 
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}>
                💡 <strong>Recommendation:</strong> {cognitiveStatus.recommendation}
              </div>
            </div>
          </div>
        )}

        {/* Clinical Recommendations */}
        {data.clinical_recommendations && data.clinical_recommendations.length > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '1.3rem' }}>🏥 Clinical Recommendations</h2>
            {data.clinical_recommendations.map((rec, idx) => (
              <div 
                key={idx}
                style={{
                  background: rec.severity === 'high_priority' ? 'rgba(231, 76, 60, 0.2)' : 'rgba(52, 152, 219, 0.2)',
                  border: `2px solid ${rec.severity === 'high_priority' ? '#e74c3c' : '#3498db'}`,
                  borderRadius: '10px',
                  padding: '15px',
                  marginBottom: '10px'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {rec.severity === 'high_priority' ? '⚠️' : 'ℹ️'} {rec.area}
                </div>
                <div style={{ fontSize: '0.9rem', marginBottom: '5px' }}>
                  {rec.suggestion}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, fontStyle: 'italic' }}>
                  {rec.clinical_note}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Next Steps */}
        {data.next_steps && data.next_steps.length > 0 && (
          <div style={{
            background: 'rgba(46, 204, 113, 0.2)',
            borderRadius: '15px',
            padding: '20px',
            border: '2px solid #2ecc71'
          }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '1.3rem' }}>🎯 Next Steps</h2>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {data.next_steps.map((step, idx) => (
                <li key={idx} style={{ marginBottom: '8px' }}>{step}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Learning Curve Preview */}
        {learningCurve.length > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            padding: '20px',
            marginTop: '20px'
          }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '1.3rem' }}>📈 Learning Progress</h2>
            <SimpleLearningCurve data={learningCurve.slice(-20)} />
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color = '#3498db' }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '10px',
      padding: '15px',
      textAlign: 'center',
      border: `2px solid ${color}`
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '5px' }}>{icon}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '5px' }}>{label}</div>
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
    <div style={{ marginBottom: '15px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '5px',
        fontSize: '0.9rem'
      }}>
        <span>{icons[scenario]} {scenario.charAt(0).toUpperCase() + scenario.slice(1)}</span>
        <span>
          <strong style={{ color: getColor(stats.success_rate) }}>
            {stats.success_rate}%
          </strong>
          {' '}({stats.attempts} attempts)
        </span>
      </div>
      <div style={{
        width: '100%',
        height: '10px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '5px',
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

function SimpleLearningCurve({ data }) {
  const maxAttempts = data.length
  const points = data.map((point, idx) => ({
    x: (idx / maxAttempts) * 100,
    y: (1 - point.moving_average) * 100
  }))

  const pathData = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ')

  return (
    <div style={{ position: 'relative', width: '100%', height: '150px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '10px' }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Grid lines */}
        <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
        <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
        
        {/* Learning curve */}
        <path 
          d={pathData} 
          fill="none" 
          stroke="#3498db" 
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Area fill */}
        <path 
          d={`${pathData} L 100 100 L 0 100 Z`}
          fill="rgba(52, 152, 219, 0.2)"
        />
      </svg>
      
      <div style={{ 
        position: 'absolute', 
        bottom: '10px', 
        left: '10px', 
        fontSize: '0.7rem', 
        opacity: 0.7 
      }}>
        Attempts →
      </div>
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        fontSize: '0.7rem', 
        opacity: 0.7 
      }}>
        ← Success Rate
      </div>
    </div>
  )
}

function getCognitiveLoadColor(load) {
  if (load < 0.3) return '#2ecc71'
  if (load < 0.6) return '#f39c12'
  return '#e74c3c'
}
