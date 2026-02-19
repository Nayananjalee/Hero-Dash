/**
 * AudiogramInput Component - Clinical Audiometric Data Entry
 * ============================================================
 * Allows therapists/parents to enter pure-tone audiometry thresholds
 * at standard audiometric frequencies (250–8000 Hz).
 * 
 * Research Basis:
 * - ISO 8253-1:2010 — Standard audiometric test methods
 * - Keidser et al. (2011) — NAL-NL2 hearing aid prescription
 * - WHO (2021) — Hearing loss classification by PTA
 * - Clark (1981) — Audiometric classification scale
 * 
 * Features:
 * - Visual audiogram chart with interactive threshold markers
 * - Auto-calculates PTA (Pure Tone Average)
 * - Hearing aid type selection
 * - Submits to backend /audiogram/{user_id} endpoint
 * - Shows recommended EQ gains from half-gain rule
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const FREQUENCIES = [
  { hz: 250, label: '250 Hz', description: 'Low-frequency sounds (e.g., drums, traffic hum)' },
  { hz: 500, label: '500 Hz', description: 'Male speech fundamental frequency' },
  { hz: 1000, label: '1000 Hz', description: 'Core speech frequency' },
  { hz: 2000, label: '2000 Hz', description: 'Consonant clarity (s, f, th)' },
  { hz: 4000, label: '4000 Hz', description: 'High sibilant sounds (s, z)' },
  { hz: 8000, label: '8000 Hz', description: 'Ultra-high frequency sounds (cymbals, birds)' },
]

const HEARING_AID_TYPES = [
  { value: 'none', label: 'No Hearing Aid', icon: '🚫' },
  { value: 'bte', label: 'Behind-The-Ear (BTE)', icon: '🦻' },
  { value: 'ite', label: 'In-The-Ear (ITE)', icon: '👂' },
  { value: 'cochlear_implant', label: 'Cochlear Implant (CI)', icon: '🔋' },
]

// Hearing level classification by PTA
function classifyHearing(pta) {
  if (pta <= 15) return { label: 'Normal', color: '#2ecc71', icon: '🟢' }
  if (pta <= 25) return { label: 'Slight', color: '#a8e6cf', icon: '🟢' }
  if (pta <= 40) return { label: 'Mild', color: '#f1c40f', icon: '🟡' }
  if (pta <= 55) return { label: 'Moderate', color: '#e67e22', icon: '🟠' }
  if (pta <= 70) return { label: 'Moderately Severe', color: '#e74c3c', icon: '🔴' }
  if (pta <= 90) return { label: 'Severe', color: '#c0392b', icon: '⭕' }
  return { label: 'Profound', color: '#8e44ad', icon: '🟣' }
}

// Simple Audiogram Chart Component
function AudiogramChart({ thresholds }) {
  const chartWidth = 500
  const chartHeight = 280
  const padding = { top: 30, right: 30, bottom: 40, left: 50 }
  const plotWidth = chartWidth - padding.left - padding.right
  const plotHeight = chartHeight - padding.top - padding.bottom

  const freqPositions = FREQUENCIES.map((f, i) => padding.left + (i / (FREQUENCIES.length - 1)) * plotWidth)
  const dbMin = -10
  const dbMax = 120
  const dbToY = (db) => padding.top + ((db - dbMin) / (dbMax - dbMin)) * plotHeight

  const points = FREQUENCIES.map((f, i) => ({
    x: freqPositions[i],
    y: dbToY(thresholds[f.hz] || 30),
    db: thresholds[f.hz] || 30,
    hz: f.hz
  }))

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Region bands
  const regions = [
    { label: 'Normal', min: -10, max: 25, color: 'rgba(46,204,113,0.08)' },
    { label: 'Mild', min: 25, max: 40, color: 'rgba(241,196,15,0.08)' },
    { label: 'Moderate', min: 40, max: 55, color: 'rgba(230,126,34,0.08)' },
    { label: 'Severe', min: 70, max: 90, color: 'rgba(231,76,60,0.08)' },
    { label: 'Profound', min: 90, max: 120, color: 'rgba(142,68,173,0.08)' },
  ]

  return (
    <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
      {/* Region bands */}
      {regions.map((r, i) => (
        <rect key={i} x={padding.left} y={dbToY(r.min)} width={plotWidth} height={dbToY(r.max) - dbToY(r.min)} fill={r.color} />
      ))}
      
      {/* Grid lines - horizontal (dB) */}
      {[0, 20, 40, 60, 80, 100, 120].map(db => (
        <g key={db}>
          <line x1={padding.left} y1={dbToY(db)} x2={chartWidth - padding.right} y2={dbToY(db)} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          <text x={padding.left - 8} y={dbToY(db) + 4} fill="#999" fontSize="9" textAnchor="end">{db}</text>
        </g>
      ))}

      {/* Grid lines - vertical (frequency) */}
      {FREQUENCIES.map((f, i) => (
        <g key={f.hz}>
          <line x1={freqPositions[i]} y1={padding.top} x2={freqPositions[i]} y2={chartHeight - padding.bottom} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          <text x={freqPositions[i]} y={chartHeight - padding.bottom + 15} fill="#ccc" fontSize="9" textAnchor="middle">{f.label}</text>
        </g>
      ))}

      {/* Axis labels */}
      <text x={chartWidth / 2} y={chartHeight - 5} fill="#999" fontSize="10" textAnchor="middle">Frequency (Hz)</text>
      <text x={12} y={chartHeight / 2} fill="#999" fontSize="10" textAnchor="middle" transform={`rotate(-90, 12, ${chartHeight / 2})`}>Hearing Level (dB HL)</text>

      {/* Audiogram line */}
      <path d={pathData} fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinejoin="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="6" fill="#e74c3c" stroke="white" strokeWidth="1.5" />
          <text x={p.x} y={p.y - 10} fill="white" fontSize="8" textAnchor="middle" fontWeight="bold">{p.db}</text>
        </g>
      ))}
    </svg>
  )
}

export default function AudiogramInput({ userId, onSave, onCancel }) {
  const [thresholds, setThresholds] = useState({
    250: 30, 500: 35, 1000: 40, 2000: 45, 4000: 55, 8000: 60
  })
  const [hearingAidType, setHearingAidType] = useState('none')
  const [saving, setSaving] = useState(false)
  const [eqGains, setEqGains] = useState(null)
  const [saved, setSaved] = useState(false)

  // Calculate PTA (Pure Tone Average: 500, 1000, 2000 Hz)
  const pta = ((thresholds[500] || 0) + (thresholds[1000] || 0) + (thresholds[2000] || 0)) / 3
  const classification = classifyHearing(pta)

  // Load existing audiogram data
  useEffect(() => {
    if (!userId) return
    fetch(`${API_URL}/audiogram/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.audiogram) {
          const a = data.audiogram
          setThresholds({
            250: a['250hz'] || 30,
            500: a['500hz'] || 35,
            1000: a['1000hz'] || 40,
            2000: a['2000hz'] || 45,
            4000: a['4000hz'] || 55,
            8000: a['8000hz'] || 60
          })
          if (data.hearing_aid_type) setHearingAidType(data.hearing_aid_type)
          if (data.eq_profile) setEqGains(data.eq_profile)
        }
      })
      .catch(() => {})
  }, [userId])

  const handleThresholdChange = (hz, value) => {
    const v = Math.max(-10, Math.min(120, parseInt(value) || 0))
    setThresholds(prev => ({ ...prev, [hz]: v }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/audiogram/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          thresholds_250hz: thresholds[250],
          thresholds_500hz: thresholds[500],
          thresholds_1000hz: thresholds[1000],
          thresholds_2000hz: thresholds[2000],
          thresholds_4000hz: thresholds[4000],
          thresholds_8000hz: thresholds[8000],
          hearing_aid_type: hearingAidType
        })
      })
      const data = await res.json()
      if (data.eq_profile) setEqGains(data.eq_profile)
      setSaved(true)
      if (onSave) onSave(data)
    } catch (err) {
      alert('Failed to save audiogram. Check connection.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(0,0,0,0.92)', borderRadius: '20px', padding: '25px',
        maxWidth: '700px', width: '100%', color: 'white',
        border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 15px 50px rgba(0,0,0,0.5)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>🦻 Audiogram Data Entry</h2>
        {onCancel && (
          <button onClick={onCancel} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
            width: '35px', height: '35px', color: 'white', cursor: 'pointer', fontSize: '1.2rem'
          }}>✕</button>
        )}
      </div>

      <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '15px' }}>
        Enter pure-tone thresholds from audiometric assessment (dB HL). 
        Values are used to customize game audio via NAL-NL2 half-gain prescription.
      </p>

      {/* Audiogram Chart */}
      <AudiogramChart thresholds={thresholds} />

      {/* Threshold Sliders */}
      <div style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: '1rem', color: '#f1c40f', marginBottom: '12px' }}>Pure-Tone Thresholds (dB HL)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {FREQUENCIES.map(f => (
            <div key={f.hz} style={{ 
              background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{f.label}</span>
                <span style={{ fontWeight: 'bold', color: classifyHearing(thresholds[f.hz]).color }}>
                  {thresholds[f.hz]} dB
                </span>
              </div>
              <input 
                type="range" min="-10" max="120" step="5"
                value={thresholds[f.hz]}
                onChange={(e) => handleThresholdChange(f.hz, e.target.value)}
                style={{ width: '100%', accentColor: '#e74c3c' }}
              />
              <div style={{ fontSize: '0.65rem', color: '#888' }}>{f.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PTA and Classification */}
      <div style={{ 
        marginTop: '15px', padding: '12px', background: `${classification.color}22`,
        borderRadius: '10px', border: `2px solid ${classification.color}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Pure Tone Average (PTA: 500+1000+2000 Hz ÷ 3)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: classification.color }}>
            {classification.icon} {pta.toFixed(1)} dB HL — {classification.label}
          </div>
        </div>
      </div>

      {/* Hearing Aid Type */}
      <div style={{ marginTop: '15px' }}>
        <h3 style={{ fontSize: '1rem', color: '#f1c40f', marginBottom: '8px' }}>Hearing Device</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {HEARING_AID_TYPES.map(ha => (
            <button key={ha.value} onClick={() => { setHearingAidType(ha.value); setSaved(false); }}
              style={{
                padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
                background: hearingAidType === ha.value ? 'rgba(52,152,219,0.3)' : 'rgba(255,255,255,0.05)',
                border: hearingAidType === ha.value ? '2px solid #3498db' : '2px solid rgba(255,255,255,0.1)',
                color: 'white', fontSize: '0.85rem', transition: 'all 0.2s'
              }}
            >
              {ha.icon} {ha.label}
            </button>
          ))}
        </div>
      </div>

      {/* EQ Gains Preview */}
      {eqGains && (
        <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(46,204,113,0.1)', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#2ecc71', marginBottom: '6px' }}>
            🎛️ Recommended EQ Gains (Half-Gain Rule)
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {Object.entries(eqGains).map(([freq, gain]) => (
              <div key={freq} style={{ 
                background: 'rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 10px',
                fontSize: '0.75rem', textAlign: 'center'
              }}>
                <div style={{ color: '#aaa' }}>{freq}</div>
                <div style={{ fontWeight: 'bold', color: gain > 0 ? '#2ecc71' : '#888' }}>+{gain} dB</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button onClick={onCancel} style={{
            padding: '10px 25px', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)',
            borderRadius: '10px', color: 'white', fontSize: '1rem', cursor: 'pointer'
          }}>Cancel</button>
        )}
        <button onClick={handleSave} disabled={saving} style={{
          padding: '10px 30px', 
          background: saved ? '#2ecc71' : saving ? '#7f8c8d' : 'linear-gradient(135deg, #3498db, #2980b9)',
          border: '2px solid white', borderRadius: '10px', color: 'white',
          fontSize: '1rem', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer'
        }}>
          {saving ? '⏳ Saving...' : saved ? '✅ Saved!' : '💾 Save Audiogram'}
        </button>
      </div>
    </motion.div>
  )
}
