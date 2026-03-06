/**
 * TherapistDashboard Component - Comprehensive Clinical View
 * =============================================================
 * Full-page dashboard for audiologists, SLPs, and parents showing:
 * - SOAP clinical notes
 * - BKT skill mastery visualization
 * - IRT ability trajectory
 * - Spaced repetition memory states
 * - Psychometric validity metrics
 * - Training plan
 * - Achievement progress
 * - Pre/post assessment comparison
 * - Clinical report export
 * 
 * Research Basis:
 * - Moeller (2000): Family-centered early intervention
 * - DesJardin & Eisenberg (2024): Parent involvement in auditory rehab
 * - ASHA (2024): Telepractice documentation standards
 * - Jerger & Musiek (2000): Pediatric audiological assessment
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AudiogramInput from './AudiogramInput'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Sub-section components
function SOAPNote({ soap }) {
  if (!soap) return null
  const sections = [
    { key: 'subjective', label: 'S — Subjective', color: '#3498db', icon: '💬' },
    { key: 'objective', label: 'O — Objective', color: '#2ecc71', icon: '📊' },
    { key: 'assessment', label: 'A — Assessment', color: '#f39c12', icon: '🔍' },
    { key: 'plan', label: 'P — Plan', color: '#9b59b6', icon: '📋' },
  ]
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
      <h2 style={{ color: 'white', marginBottom: '15px' }}>📝 SOAP Clinical Note</h2>
      {sections.map(s => (
        <div key={s.key} style={{ 
          marginBottom: '12px', padding: '12px', background: `${s.color}15`,
          borderRadius: '10px', borderLeft: `4px solid ${s.color}`
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: s.color, marginBottom: '5px' }}>
            {s.icon} {s.label}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#ddd', lineHeight: '1.6' }}>
            {Array.isArray(soap[s.key]) 
              ? soap[s.key].map((item, i) => <div key={i}>• {item}</div>)
              : soap[s.key]
            }
          </div>
        </div>
      ))}
    </div>
  )
}

function BKTVisualization({ skills, mastery, label }) {
  if (!skills) return null
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
      <h2 style={{ color: 'white', marginBottom: '15px' }}>🧠 Bayesian Knowledge Tracing — Skill Mastery</h2>
      <div style={{ display: 'grid', gap: '12px' }}>
        {Object.entries(skills).map(([skill, data]) => {
          const pKnow = data?.p_know || data?.p_learned || 0
          const pct = Math.round(pKnow * 100)
          const color = pct >= 95 ? '#2ecc71' : pct >= 80 ? '#27ae60' : pct >= 60 ? '#f39c12' : pct >= 40 ? '#e67e22' : '#e74c3c'
          
          return (
            <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#ccc', minWidth: '180px', fontSize: '0.9rem' }}>
                {skill.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
              <div style={{ flex: 1, height: '18px', background: 'rgba(255,255,255,0.08)', borderRadius: '9px', overflow: 'hidden' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  style={{ height: '100%', background: color, borderRadius: '9px', position: 'relative' }}
                >
                  {pct >= 95 && <span style={{ position: 'absolute', right: '5px', top: '-1px', fontSize: '0.7rem' }}>✅</span>}
                </motion.div>
              </div>
              <span style={{ fontWeight: 'bold', color, minWidth: '50px', textAlign: 'right' }}>{pct}%</span>
              <span style={{ fontSize: '0.7rem', color: '#aaa', minWidth: '70px' }}>
                {data?.mastery_label || (pct >= 95 ? 'Mastered' : pct >= 80 ? 'Proficient' : 'Developing')}
              </span>
            </div>
          )
        })}
      </div>
      {mastery !== undefined && (
        <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(46,204,113,0.1)', borderRadius: '10px', textAlign: 'center' }}>
          <span style={{ color: '#ccc' }}>Overall Mastery: </span>
          <strong style={{ color: '#2ecc71', fontSize: '1.3rem' }}>{(mastery * 100).toFixed(1)}%</strong>
          <span style={{ color: '#aaa', marginLeft: '10px' }}>({label || 'Developing'})</span>
        </div>
      )}
    </div>
  )
}

function IRTDisplay({ irtData, trajectory }) {
  if (!irtData) return null
  
  const noData = !irtData.num_responses || irtData.num_responses === 0
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
      <h2 style={{ color: 'white', marginBottom: '15px' }}>📐 Item Response Theory — Ability Estimate</h2>
      {noData ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#aaa' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</div>
          <div style={{ fontSize: '1rem', color: '#ccc' }}>No assessment data yet</div>
          <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>Play some crisis scenarios to generate IRT ability estimates</div>
        </div>
      ) : (
      <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '15px' }}>
        {[
          { label: 'Ability (θ)', value: irtData.theta?.toFixed(2) ?? 'N/A', color: '#9b59b6' },
          { label: 'Std Error', value: irtData.se < 900 ? irtData.se?.toFixed(3) : 'N/A', color: '#3498db' },
          { label: 'Classification', value: irtData.ability_label || 'N/A', color: '#f39c12' },
          { label: 'Percentile', value: irtData.percentile_estimate ? `${irtData.percentile_estimate}th` : 'N/A', color: '#2ecc71' },
          { label: '95% CI', value: irtData.confidence_interval ? `[${irtData.confidence_interval[0]?.toFixed(2)}, ${irtData.confidence_interval[1]?.toFixed(2)}]` : 'N/A', color: '#e74c3c' },
        ].map(item => (
          <div key={item.label} style={{
            background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px',
            textAlign: 'center', border: `2px solid ${item.color}`
          }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: item.color }}>{item.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '4px' }}>{item.label}</div>
          </div>
        ))}
      </div>
      
      {/* IRT Trajectory Chart */}
      {trajectory && trajectory.length > 1 && (
        <div>
          <h3 style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px' }}>Ability Growth Trajectory</h3>
          <div style={{ height: '120px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', position: 'relative', overflow: 'hidden' }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Theta line */}
              <path 
                d={trajectory.map((p, i) => {
                  const x = (i / (trajectory.length - 1)) * 100
                  const y = 50 - (p.theta || 0) * 15 // Scale theta to chart
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                }).join(' ')}
                fill="none" stroke="#9b59b6" strokeWidth="2" vectorEffect="non-scaling-stroke"
              />
              {/* Zero line */}
              <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
            </svg>
            <div style={{ position: 'absolute', top: 5, left: 8, fontSize: '0.6rem', color: '#aaa' }}>θ increase →</div>
            <div style={{ position: 'absolute', bottom: 5, right: 8, fontSize: '0.6rem', color: '#aaa' }}>Responses →</div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}

function MemoryStatesDisplay({ memoryData }) {
  if (!memoryData || !memoryData.memory_states || memoryData.memory_states.length === 0) return null
  
  const icons = { tsunami_siren: '🌊', earthquake_alarm: '🏚️', flood_warning: '🌊', air_raid_siren: '🚨', building_fire_alarm: '🔥' }
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
      <h2 style={{ color: 'white', marginBottom: '5px' }}>🔄 Spaced Repetition — Memory States</h2>
      <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '12px' }}>
        Based on SM-2 algorithm & Ebbinghaus forgetting curve
      </p>
      <div style={{ display: 'grid', gap: '10px' }}>
        {memoryData.memory_states.map(state => {
          const color = state.memory_strength >= 0.8 ? '#2ecc71' : state.memory_strength >= 0.5 ? '#f39c12' : '#e74c3c'
          return (
            <div key={state.scenario_type} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px',
              background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
              border: state.is_due_for_review ? '2px solid #e74c3c' : '1px solid rgba(255,255,255,0.08)'
            }}>
              <span style={{ fontSize: '1.5rem' }}>{icons[state.scenario_type] || '🔊'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'white' }}>
                  {state.scenario_type.charAt(0).toUpperCase() + state.scenario_type.slice(1)}
                  {state.is_due_for_review && <span style={{ color: '#e74c3c', marginLeft: '8px', fontSize: '0.7rem' }}>⚠️ DUE</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${state.memory_strength * 100}%`, height: '100%', background: color, borderRadius: '3px' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color, fontWeight: 'bold' }}>
                    {state.strength_label}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#aaa' }}>
                <div>Rep #{state.repetition_number}</div>
                <div>EF: {state.easiness_factor}</div>
                <div>Next: {state.interval_days}d</div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#aaa' }}>
        <span>Avg Strength: <strong style={{ color: '#f39c12' }}>{(memoryData.average_strength * 100).toFixed(0)}%</strong></span>
        <span>Due for Review: <strong style={{ color: memoryData.due_for_review > 0 ? '#e74c3c' : '#2ecc71' }}>{memoryData.due_for_review}</strong></span>
      </div>
    </div>
  )
}

function TrainingPlanDisplay({ plan }) {
  if (!plan) return null
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
      <h2 style={{ color: 'white', marginBottom: '5px' }}>📅 Personalized Training Plan</h2>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '15px', flexWrap: 'wrap' }}>
        <Tag label="Phase" value={plan.plan_phase} color="#9b59b6" />
        <Tag label="Sessions/Week" value={plan.sessions_per_week} color="#3498db" />
        <Tag label="Session Length" value={`${plan.recommended_session_minutes} min`} color="#2ecc71" />
        <Tag label="Attention Span" value={`${Math.round(plan.attention_span_seconds / 60)} min`} color="#f39c12" />
      </div>
      
      {/* Focus Skills */}
      {plan.focus_skills && plan.focus_skills.length > 0 && (
        <div style={{ marginBottom: '12px', padding: '10px', background: 'rgba(231,76,60,0.1)', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#e74c3c', marginBottom: '6px' }}>
            🎯 Focus Areas (Below 60% Mastery)
          </div>
          {plan.focus_skills.map((skill, i) => (
            <div key={i} style={{ fontSize: '0.8rem', color: '#ddd', marginBottom: '3px' }}>
              • {skill.skill} — {(skill.current_mastery * 100).toFixed(0)}% mastery ({skill.priority} priority)
            </div>
          ))}
        </div>
      )}
      
      {/* Weekly Schedule */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
        {plan.weekly_plan?.map((day, i) => (
          <div key={i} style={{
            padding: '10px', borderRadius: '10px', fontSize: '0.75rem',
            background: day.session_minutes > 0 ? 'rgba(52,152,219,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${day.session_minutes > 0 ? 'rgba(52,152,219,0.3)' : 'rgba(255,255,255,0.05)'}`,
          }}>
            <div style={{ fontWeight: 'bold', color: day.session_minutes > 0 ? '#3498db' : '#666', marginBottom: '4px' }}>
              {day.day}
            </div>
            {day.session_minutes > 0 ? (
              <div style={{ color: '#ccc' }}>
                <div>{day.session_minutes} min</div>
                {day.activities?.filter(a => a.type !== 'rest').map((a, j) => (
                  <div key={j} style={{ fontSize: '0.65rem', color: '#999', marginTop: '2px' }}>
                    • {a.type === 'spaced_review' ? '🔄' : a.type === 'skill_practice' ? '🎯' : '🎮'} {a.duration_minutes}m
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#666' }}>😴 Rest</div>
            )}
          </div>
        ))}
      </div>
      
      {/* Tips */}
      {plan.tips && (
        <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(46,204,113,0.08)', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#2ecc71', marginBottom: '6px' }}>💡 Training Tips</div>
          {plan.tips.map((tip, i) => (
            <div key={i} style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '3px' }}>• {tip}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function Tag({ label, value, color }) {
  return (
    <div style={{
      padding: '4px 12px', borderRadius: '20px',
      background: `${color}20`, border: `1px solid ${color}`,
      fontSize: '0.8rem', color
    }}>
      <span style={{ color: '#aaa' }}>{label}: </span><strong>{value}</strong>
    </div>
  )
}

function AchievementsGrid({ achievements }) {
  if (!achievements) return null
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
      <h2 style={{ color: 'white', marginBottom: '5px' }}>🏆 Achievements & Milestones</h2>
      <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '12px' }}>
        {achievements.total_earned}/{achievements.total_available} earned ({achievements.completion_percentage}%)
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
        {[...(achievements.earned_achievements || []), ...(achievements.locked_achievements || [])].map(ach => (
          <div key={ach.id} style={{
            padding: '10px', borderRadius: '10px', textAlign: 'center',
            background: ach.earned ? 'rgba(243,156,18,0.15)' : 'rgba(255,255,255,0.03)',
            border: ach.earned ? '2px solid #f39c12' : '1px solid rgba(255,255,255,0.08)',
            opacity: ach.earned ? 1 : 0.5
          }}>
            <div style={{ fontSize: '1.8rem' }}>{ach.earned ? ach.icon : '🔒'}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: ach.earned ? '#f39c12' : '#666', marginTop: '4px' }}>
              {ach.name}
            </div>
            <div style={{ fontSize: '0.6rem', color: '#888', marginTop: '2px' }}>{ach.description}</div>
            {!ach.earned && (
              <div style={{ fontSize: '0.6rem', color: '#555', marginTop: '3px' }}>
                {ach.progress?.toFixed(0)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PsychometricValidity({ psych }) {
  if (!psych) return null
  
  const metrics = [
    { label: "Cronbach's α", value: psych.cronbachs_alpha, threshold: 0.7, desc: 'Internal Consistency' },
    { label: "Test-Retest r", value: psych.test_retest_reliability?.correlation ?? null, threshold: 0.7, desc: 'Temporal Stability' },
    { label: "SEM", value: psych.standard_error_of_measurement?.sem ?? null, threshold: null, desc: 'Measurement Precision' },
    { label: "MDC₉₅", value: psych.minimal_detectable_change?.mdc_95 ?? null, threshold: null, desc: 'Min. Detectable Change' },
  ]
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
      <h2 style={{ color: 'white', marginBottom: '5px' }}>📏 Psychometric Validity</h2>
      <p style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '12px' }}>
        Based on Nunnally & Bernstein (1994); AERA Standards (2014)
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
        {metrics.map(m => {
          const hasValue = m.value !== null && m.value !== undefined
          const valid = (m.threshold && hasValue) ? (m.value >= m.threshold) : null
          return (
            <div key={m.label} style={{
              padding: '12px', borderRadius: '10px', textAlign: 'center',
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${valid === true ? '#2ecc71' : valid === false ? '#e74c3c' : '#555'}`
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: valid === true ? '#2ecc71' : valid === false ? '#e74c3c' : '#aaa' }}>
                {hasValue ? m.value.toFixed(3) : 'N/A'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '2px' }}>{m.label}</div>
              <div style={{ fontSize: '0.65rem', color: '#888' }}>{m.desc}</div>
              {valid !== null && (
                <div style={{ fontSize: '0.6rem', color: valid ? '#2ecc71' : '#e74c3c', marginTop: '3px' }}>
                  {valid ? '✅ Acceptable' : `⚠️ Below ${m.threshold}`}
                </div>
              )}
              {!hasValue && m.threshold && (
                <div style={{ fontSize: '0.6rem', color: '#888', marginTop: '3px' }}>
                  ℹ️ Needs more data
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// TabButton helper
function TabButton({ active, label, icon, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
      background: active ? 'rgba(52,152,219,0.3)' : 'rgba(255,255,255,0.05)',
      border: active ? '2px solid #3498db' : '2px solid transparent',
      color: active ? '#3498db' : '#888', fontSize: '0.85rem', fontWeight: 'bold',
      transition: 'all 0.2s'
    }}>
      {icon} {label}
    </button>
  )
}

// ============================================================
// MAIN THERAPIST DASHBOARD
// ============================================================
export default function TherapistDashboard({ userId, onBack }) {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [dashboardData, setDashboardData] = useState(null)
  const [memoryStates, setMemoryStates] = useState(null)
  const [trainingPlan, setTrainingPlan] = useState(null)
  const [achievements, setAchievements] = useState(null)
  const [irtTrajectory, setIrtTrajectory] = useState(null)
  const [showAudiogram, setShowAudiogram] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!userId) return
    fetchAllData()
  }, [userId])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [dashRes, memRes, planRes, achRes, trajRes] = await Promise.allSettled([
        fetch(`${API_URL}/dashboard/therapist/${userId}`),
        fetch(`${API_URL}/spaced-repetition/memory-states/${userId}`),
        fetch(`${API_URL}/training-plan/${userId}`),
        fetch(`${API_URL}/achievements/${userId}`),
        fetch(`${API_URL}/irt/ability-trajectory/${userId}`)
      ])

      if (dashRes.status === 'fulfilled' && dashRes.value.ok)
        setDashboardData(await dashRes.value.json())
      if (memRes.status === 'fulfilled' && memRes.value.ok)
        setMemoryStates(await memRes.value.json())
      if (planRes.status === 'fulfilled' && planRes.value.ok)
        setTrainingPlan(await planRes.value.json())
      if (achRes.status === 'fulfilled' && achRes.value.ok)
        setAchievements(await achRes.value.json())
      if (trajRes.status === 'fulfilled' && trajRes.value.ok) {
        const data = await trajRes.value.json()
        setIrtTrajectory(data.trajectory)
      }
    } catch (err) {
      console.error('Failed to fetch therapist dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`${API_URL}/export/clinical-report/${userId}?days=90`)
      if (!res.ok) {
        const errText = await res.text()
        console.error('Export API error:', res.status, errText)
        alert(`Export failed: server returned ${res.status}. Please try again.`)
        setExporting(false)
        return
      }
      const data = await res.json()

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 15
      const contentW = pageW - margin * 2
      let y = 15

      // ── helpers ──
      const addPage = () => { doc.addPage(); y = 15 }
      const checkSpace = (need) => { if (y + need > 275) addPage() }
      const drawLine = (yy) => { doc.setDrawColor(180); doc.setLineWidth(0.3); doc.line(margin, yy, pageW - margin, yy) }

      const sectionTitle = (title) => {
        checkSpace(14)
        doc.setFillColor(33, 37, 68)
        doc.rect(margin, y - 1, contentW, 9, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(255, 255, 255)
        doc.text(title, margin + 3, y + 5.5)
        y += 12
        doc.setTextColor(40, 40, 40)
      }

      const labelValue = (label, value, x, width) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(110, 110, 110)
        doc.text(label, x, y)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.setTextColor(40, 40, 40)
        doc.text(String(value ?? 'N/A'), x, y + 4.5)
      }

      // ── HEADER ──
      doc.setFillColor(33, 37, 68)
      doc.rect(0, 0, pageW, 36, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(255, 255, 255)
      doc.text('Hero-Dash Clinical Assessment Report', pageW / 2, 14, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(200, 200, 220)
      doc.text('Adaptive Serious Game for Auditory Crisis Training', pageW / 2, 21, { align: 'center' })
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageW / 2, 27, { align: 'center' })
      doc.text(`Report Period: Last 90 days  |  Version ${data.report_version || '2.0'}`, pageW / 2, 32, { align: 'center' })
      y = 42

      // ── PATIENT INFO ──
      sectionTitle('1. Patient Information')
      const pt = data.patient || {}
      labelValue('Patient ID', pt.user_id, margin, 40)
      labelValue('Username', pt.username, margin + 45, 40)
      labelValue('Age Group', pt.age_group, margin + 90, 35)
      labelValue('Hearing Level', pt.hearing_level, margin + 130, 35)
      y += 11

      labelValue('Current Level', pt.current_level, margin, 40)
      labelValue('Total Score', pt.total_score, margin + 45, 40)
      labelValue('Account Created', pt.created_at ? new Date(pt.created_at).toLocaleDateString() : 'N/A', margin + 90, 50)
      y += 13

      // ── TRAINING SUMMARY ──
      sectionTitle('2. Training Summary')
      const ts = data.training_summary || {}
      labelValue('Total Sessions', ts.total_sessions, margin, 40)
      labelValue('Total Attempts', ts.total_attempts, margin + 45, 40)
      labelValue('Success Rate', ts.success_rate != null ? `${(ts.success_rate * 100).toFixed(1)}%` : 'N/A', margin + 90, 35)
      labelValue('Avg Reaction Time', ts.avg_reaction_time != null ? `${ts.avg_reaction_time.toFixed(2)}s` : 'N/A', margin + 130, 40)
      y += 11

      // per-scenario breakdown table
      if (ts.per_scenario) {
        checkSpace(40)
        const scenarioRows = Object.entries(ts.per_scenario).map(([name, s]) => [
          name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          s.attempts ?? 0,
          s.successes ?? 0,
          s.attempts ? `${((s.successes / s.attempts) * 100).toFixed(1)}%` : '0%',
          s.avg_rt != null ? `${s.avg_rt.toFixed(2)}s` : '-'
        ])
        doc.autoTable({
          startY: y,
          head: [['Scenario', 'Attempts', 'Successes', 'Accuracy', 'Avg RT']],
          body: scenarioRows,
          theme: 'grid',
          margin: { left: margin, right: margin },
          headStyles: { fillColor: [33, 37, 68], fontSize: 8, cellPadding: 2 },
          bodyStyles: { fontSize: 8, cellPadding: 2 },
          alternateRowStyles: { fillColor: [245, 245, 250] },
        })
        y = doc.lastAutoTable.finalY + 6
      } else {
        y += 4
      }

      // ── SOAP NOTE ──
      const soap = data.soap_note || {}
      if (soap.subjective || soap.objective || soap.assessment || soap.plan) {
        sectionTitle('3. SOAP Clinical Note')
        const soapSections = [
          { key: 'subjective', label: 'S — Subjective' },
          { key: 'objective', label: 'O — Objective' },
          { key: 'assessment', label: 'A — Assessment' },
          { key: 'plan', label: 'P — Plan' },
        ]
        for (const s of soapSections) {
          const content = soap[s.key]
          if (!content) continue
          checkSpace(16)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.setTextColor(33, 37, 68)
          doc.text(s.label, margin, y)
          y += 5
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8.5)
          doc.setTextColor(50, 50, 50)
          const items = Array.isArray(content) ? content : [content]
          for (const item of items) {
            const lines = doc.splitTextToSize(`• ${item}`, contentW - 5)
            checkSpace(lines.length * 4 + 2)
            doc.text(lines, margin + 3, y)
            y += lines.length * 4 + 1
          }
          y += 2
        }
      }

      // ── BKT SKILL MASTERY ──
      const bkt = data.bkt_skills || {}
      const bktSkills = bkt.skills || bkt
      if (Object.keys(bktSkills).length > 0) {
        sectionTitle('4. Bayesian Knowledge Tracing — Skill Mastery')
        const bktRows = Object.entries(bktSkills).map(([skill, d]) => {
          const pKnow = d?.p_know ?? d?.p_learned ?? 0
          return [
            skill.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            `${(pKnow * 100).toFixed(1)}%`,
            d?.total_attempts ?? '-',
            pKnow >= 0.95 ? 'Mastered' : pKnow >= 0.8 ? 'Proficient' : pKnow >= 0.6 ? 'Developing' : 'Emerging',
          ]
        })
        doc.autoTable({
          startY: y,
          head: [['Auditory Skill', 'P(Learned)', 'Attempts', 'Status']],
          body: bktRows,
          theme: 'grid',
          margin: { left: margin, right: margin },
          headStyles: { fillColor: [33, 37, 68], fontSize: 8, cellPadding: 2 },
          bodyStyles: { fontSize: 8, cellPadding: 2 },
          alternateRowStyles: { fillColor: [245, 245, 250] },
          didParseCell: (hookData) => {
            if (hookData.section === 'body' && hookData.column.index === 3) {
              const v = hookData.cell.raw
              if (v === 'Mastered') hookData.cell.styles.textColor = [39, 174, 96]
              else if (v === 'Proficient') hookData.cell.styles.textColor = [41, 128, 185]
              else if (v === 'Emerging') hookData.cell.styles.textColor = [192, 57, 43]
            }
          }
        })
        y = doc.lastAutoTable.finalY + 6
        if (bkt.overall_mastery != null) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.setTextColor(33, 37, 68)
          doc.text(`Overall Mastery: ${(bkt.overall_mastery * 100).toFixed(1)}% — ${bkt.mastery_label || ''}`, margin, y)
          y += 8
        }
      }

      // ── IRT ABILITY ESTIMATE ──
      const irt = data.irt_ability || {}
      if (irt.theta != null) {
        sectionTitle('5. Item Response Theory — Ability Estimate (2PL)')
        labelValue('Ability (theta)', irt.theta?.toFixed(3), margin, 40)
        labelValue('Std Error', irt.se < 900 ? irt.se?.toFixed(3) : 'N/A', margin + 45, 35)
        labelValue('Classification', irt.ability_label || 'N/A', margin + 85, 40)
        labelValue('Percentile', irt.percentile_estimate ? `${irt.percentile_estimate}th` : 'N/A', margin + 130, 35)
        y += 11
        if (irt.confidence_interval) {
          labelValue('95% Confidence Interval', `[${irt.confidence_interval[0]?.toFixed(3)}, ${irt.confidence_interval[1]?.toFixed(3)}]`, margin, 80)
          y += 11
        }
      }

      // ── IRT GROWTH TRAJECTORY ──
      const traj = data.irt_growth_trajectory || []
      if (traj.length > 1) {
        checkSpace(30)
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text('Ability Growth Trajectory (theta over responses):', margin, y)
        y += 5
        const trajRows = traj.map((p, i) => [
          `#${i + 1}`,
          p.theta?.toFixed(3) ?? '-',
          p.se?.toFixed(3) ?? '-',
          p.num_responses ?? '-'
        ])
        doc.autoTable({
          startY: y,
          head: [['Point', 'Theta', 'SE', 'Responses']],
          body: trajRows,
          theme: 'grid',
          margin: { left: margin, right: margin },
          headStyles: { fillColor: [33, 37, 68], fontSize: 7.5, cellPadding: 1.5 },
          bodyStyles: { fontSize: 7.5, cellPadding: 1.5 },
          alternateRowStyles: { fillColor: [245, 245, 250] },
          tableWidth: contentW * 0.5,
        })
        y = doc.lastAutoTable.finalY + 6
      }

      // ── PRE/POST COMPARISON ──
      const comp = data.pre_post_comparison
      if (comp && !comp.error) {
        sectionTitle('6. Pre/Post Intervention Comparison')
        labelValue('Baseline Accuracy', comp.baseline?.overall_accuracy != null ? `${(comp.baseline.overall_accuracy * 100).toFixed(1)}%` : 'N/A', margin, 45)
        labelValue('Post-Test Accuracy', comp.post_test?.overall_accuracy != null ? `${(comp.post_test.overall_accuracy * 100).toFixed(1)}%` : 'N/A', margin + 50, 45)
        labelValue("Cohen's d", comp.effect_size?.cohens_d?.toFixed(3) ?? 'N/A', margin + 100, 35)
        labelValue('p-value', comp.statistical_significance?.p_value?.toFixed(4) ?? 'N/A', margin + 140, 35)
        y += 11
        if (comp.effect_size?.interpretation) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8.5)
          doc.setTextColor(50, 50, 50)
          doc.text(`Effect Size Interpretation: ${comp.effect_size.interpretation}`, margin, y)
          y += 6
        }
      }

      // ── PSYCHOMETRIC VALIDITY ──
      const psych = data.psychometric_validity || {}
      if (psych.cronbachs_alpha != null) {
        sectionTitle('7. Psychometric Validity')
        const psychRows = [
          ["Cronbach's Alpha", psych.cronbachs_alpha?.toFixed(3) ?? '-', '>= 0.70', psych.cronbachs_alpha >= 0.7 ? 'Acceptable' : 'Below threshold'],
          ['Test-Retest r', psych.test_retest_reliability?.correlation?.toFixed(3) ?? '-', '>= 0.70', (psych.test_retest_reliability?.correlation ?? 0) >= 0.7 ? 'Acceptable' : 'Insufficient'],
          ['SEM', psych.standard_error_of_measurement?.sem?.toFixed(3) ?? '-', '-', 'Measurement precision'],
          ['MDC 95%', psych.minimal_detectable_change?.mdc_95?.toFixed(3) ?? '-', '-', 'Min detectable change'],
        ]
        doc.autoTable({
          startY: y,
          head: [['Metric', 'Value', 'Criterion', 'Interpretation']],
          body: psychRows,
          theme: 'grid',
          margin: { left: margin, right: margin },
          headStyles: { fillColor: [33, 37, 68], fontSize: 8, cellPadding: 2 },
          bodyStyles: { fontSize: 8, cellPadding: 2 },
          alternateRowStyles: { fillColor: [245, 245, 250] },
        })
        y = doc.lastAutoTable.finalY + 6
      }

      // ── CLINICAL RECOMMENDATIONS ──
      const recs = data.clinical_recommendations || []
      if (recs.length > 0) {
        sectionTitle('8. Clinical Recommendations')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(50, 50, 50)
        for (const rec of recs) {
          const recText = typeof rec === 'object' ? (rec.suggestion || rec.area || JSON.stringify(rec)) : String(rec)
          const lines = doc.splitTextToSize(`• ${recText}`, contentW - 5)
          checkSpace(lines.length * 4 + 2)
          doc.text(lines, margin + 3, y)
          y += lines.length * 4 + 2
        }
      }

      // ── DISCLAIMER ──
      checkSpace(20)
      drawLine(y)
      y += 5
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7)
      doc.setTextColor(130, 130, 130)
      const disclaimer = data.disclaimer || 'This report is generated by an automated system and should be interpreted by a qualified audiologist or speech-language pathologist.'
      const discLines = doc.splitTextToSize(disclaimer, contentW)
      doc.text(discLines, margin, y)
      y += discLines.length * 3.5 + 3

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text('Hero-Dash Adaptive Serious Game | ICTICM 2026 Research Project', pageW / 2, y, { align: 'center' })

      // ── PAGE NUMBERS ──
      const totalPages = doc.internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(150, 150, 150)
        doc.text(`Page ${i} of ${totalPages}`, pageW / 2, 290, { align: 'center' })
      }

      doc.save(`Hero-Dash_Clinical_Report_${userId}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
      alert(`Export failed: ${err.message || err}`)
    } finally {
      setExporting(false)
    }
  }

  if (showAudiogram) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        overflowY: 'auto'
      }}>
        {/* Sticky close button — always visible */}
        <button onClick={() => setShowAudiogram(false)} style={{
          position: 'fixed', top: '15px', right: '20px', zIndex: 1002,
          background: 'rgba(231,76,60,0.85)', border: '2px solid white', borderRadius: '50%',
          width: '44px', height: '44px', color: 'white', cursor: 'pointer', fontSize: '1.4rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
        }}>✕</button>
        <AudiogramInput 
          userId={userId} 
          onSave={() => setShowAudiogram(false)} 
          onCancel={() => setShowAudiogram(false)} 
        />
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      overflowY: 'auto', zIndex: 1000, color: 'white'
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 1001, padding: '15px 20px',
        background: 'rgba(15,12,41,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={onBack} style={{
            padding: '8px 20px', background: '#e74c3c', border: 'none', borderRadius: '10px',
            color: 'white', fontWeight: 'bold', cursor: 'pointer'
          }}>← Back</button>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>🏥 Therapist Dashboard</h1>
          {dashboardData?.user_info && (
            <span style={{ color: '#aaa', fontSize: '0.9rem' }}>
              {dashboardData.user_info.username} | {dashboardData.user_info.age_group} yrs | {dashboardData.user_info.hearing_level}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowAudiogram(true)} style={{
            padding: '8px 16px', background: 'rgba(155,89,182,0.3)', border: '1px solid #9b59b6',
            borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem'
          }}>🦻 Audiogram</button>
          <button onClick={handleExport} disabled={exporting} style={{
            padding: '8px 16px', background: 'rgba(46,204,113,0.3)', border: '1px solid #2ecc71',
            borderRadius: '10px', color: 'white', cursor: exporting ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.85rem'
          }}>{exporting ? '⏳' : '�'} Export Report</button>
          <button onClick={fetchAllData} style={{
            padding: '8px 16px', background: 'rgba(52,152,219,0.3)', border: '1px solid #3498db',
            borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem'
          }}>🔄 Refresh</button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ padding: '12px 20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <TabButton active={activeTab === 'overview'} label="Overview" icon="📊" onClick={() => setActiveTab('overview')} />
        <TabButton active={activeTab === 'skills'} label="Skills & BKT" icon="🧠" onClick={() => setActiveTab('skills')} />
        <TabButton active={activeTab === 'memory'} label="Memory" icon="🔄" onClick={() => setActiveTab('memory')} />
        <TabButton active={activeTab === 'plan'} label="Training Plan" icon="📅" onClick={() => setActiveTab('plan')} />
        <TabButton active={activeTab === 'achievements'} label="Achievements" icon="🏆" onClick={() => setActiveTab('achievements')} />
        <TabButton active={activeTab === 'clinical'} label="Clinical" icon="📝" onClick={() => setActiveTab('clinical')} />
      </div>

      {/* Content */}
      <div style={{ padding: '0 20px 30px', maxWidth: '1100px', margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', fontSize: '1.3rem', color: '#aaa' }}>
            Loading clinical data... ⏳
          </div>
        )}

        {!loading && (
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && dashboardData && (
                <>
                  {/* Quick Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                    {[
                      { label: 'Total Sessions', value: dashboardData.training_summary?.total_sessions || 0, icon: '📊', color: '#3498db' },
                      { label: 'Training Time', value: `${(dashboardData.training_summary?.total_training_minutes || 0).toFixed(0)} min`, icon: '⏱️', color: '#9b59b6' },
                      { label: 'Total Attempts', value: dashboardData.training_summary?.total_attempts || 0, icon: '🎮', color: '#2ecc71' },
                      { label: 'Accuracy', value: `${(dashboardData.training_summary?.overall_accuracy || 0).toFixed(1)}%`, icon: '✅', color: '#f39c12' },
                      { label: 'Current Level', value: dashboardData.user_info?.current_level || 1, icon: '🏆', color: '#e74c3c' },
                    ].map(stat => (
                      <div key={stat.label} style={{
                        background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '15px',
                        textAlign: 'center', border: `2px solid ${stat.color}`
                      }}>
                        <div style={{ fontSize: '1.5rem' }}>{stat.icon}</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                        <div style={{ fontSize: '0.75rem', color: '#aaa' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  
                  <SOAPNote soap={dashboardData.soap_note} />
                  
                  {/* Clinical Recommendations */}
                  {dashboardData.clinical_recommendations && dashboardData.clinical_recommendations.length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
                      <h2 style={{ color: 'white', marginBottom: '12px' }}>🏥 Clinical Recommendations</h2>
                      {dashboardData.clinical_recommendations.map((rec, i) => (
                        <div key={i} style={{
                          padding: '12px', marginBottom: '8px', borderRadius: '10px',
                          background: rec.severity === 'high_priority' ? 'rgba(231,76,60,0.15)' : 'rgba(52,152,219,0.1)',
                          borderLeft: `4px solid ${rec.severity === 'high_priority' ? '#e74c3c' : '#3498db'}`
                        }}>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                            {rec.severity === 'high_priority' ? '⚠️' : 'ℹ️'} {rec.area}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#ddd', marginTop: '3px' }}>{rec.suggestion}</div>
                          <div style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic', marginTop: '3px' }}>{rec.clinical_note}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* SKILLS TAB */}
              {activeTab === 'skills' && (
                <>
                  <BKTVisualization 
                    skills={dashboardData?.bkt_skill_mastery?.skills}
                    mastery={dashboardData?.bkt_skill_mastery?.overall_mastery}
                    label={dashboardData?.bkt_skill_mastery?.mastery_label}
                  />
                  <IRTDisplay irtData={dashboardData?.irt_ability} trajectory={irtTrajectory} />
                  <PsychometricValidity psych={dashboardData?.psychometric_validity} />
                </>
              )}

              {/* MEMORY TAB */}
              {activeTab === 'memory' && (
                <MemoryStatesDisplay memoryData={memoryStates} />
              )}

              {/* TRAINING PLAN TAB */}
              {activeTab === 'plan' && (
                <TrainingPlanDisplay plan={trainingPlan} />
              )}

              {/* ACHIEVEMENTS TAB */}
              {activeTab === 'achievements' && (
                <AchievementsGrid achievements={achievements} />
              )}

              {/* CLINICAL TAB */}
              {activeTab === 'clinical' && dashboardData && (
                <>
                  {/* Age-Normalized Scores */}
                  {dashboardData.clinical_scores?.normalized && (
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
                      <h2 style={{ color: 'white', marginBottom: '12px' }}>📊 Age-Normalized Clinical Scores</h2>
                      <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '12px' }}>
                        Aligned with SCAN-3:CH & CHAPPS norms for age group {dashboardData.user_info?.age_group}
                      </p>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {Object.entries(dashboardData.clinical_scores.normalized).map(([metric, data]) => (
                          <div key={metric} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px'
                          }}>
                            <span style={{ color: '#ccc', fontSize: '0.9rem' }}>
                              {metric.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                              {typeof data === 'object' ? (
                                <>
                                  <span style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                    z={data.z_score?.toFixed(2)}
                                  </span>
                                  <span style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                    p={data.percentile?.toFixed(0)}th
                                  </span>
                                  <span style={{ 
                                    fontSize: '0.8rem', fontWeight: 'bold',
                                    color: data.classification === 'Normal' ? '#2ecc71' : 
                                           data.classification === 'At Risk' ? '#f39c12' : '#e74c3c'
                                  }}>
                                    {data.classification || 'N/A'}
                                  </span>
                                </>
                              ) : (
                                <span style={{ color: '#ccc' }}>{typeof data === 'number' ? data.toFixed(2) : data}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <PsychometricValidity psych={dashboardData.psychometric_validity} />
                  <SOAPNote soap={dashboardData.soap_note} />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
