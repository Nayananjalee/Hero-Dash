/**
 * Professional Clinical PDF Report Generator
 * =============================================
 * Generates a multi-page clinical assessment PDF for therapist/audiologist review.
 * Uses jsPDF + jspdf-autotable for professional table layouts.
 */

import jsPDF from 'jspdf'
import 'jspdf-autotable'

// ─── Constants ─────────────────────────────────────────
const COLORS = {
  primary: [0, 95, 153],       // #005F99 — header blue
  dark: [30, 30, 50],          // dark background text
  accent: [241, 196, 15],      // gold accent
  success: [45, 198, 83],      // green
  warning: [230, 126, 34],     // orange
  danger: [231, 76, 60],       // red
  gray: [120, 120, 140],
  lightGray: [220, 220, 230],
  white: [255, 255, 255],
}

const PAGE_MARGIN = 20
const PAGE_WIDTH = 210  // A4 mm
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2

// ─── Helpers ───────────────────────────────────────────

function addPageHeader(doc, title) {
  const pageH = doc.internal.pageSize.getHeight()
  // Header bar
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, PAGE_WIDTH, 14, 'F')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.white)
  doc.text('Hero-Dash Clinical Report', PAGE_MARGIN, 9)
  doc.text(title, PAGE_WIDTH - PAGE_MARGIN, 9, { align: 'right' })

  // Footer
  doc.setFillColor(...COLORS.lightGray)
  doc.rect(0, pageH - 10, PAGE_WIDTH, 10, 'F')
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.gray)
  doc.text('Confidential — For authorized clinical use only', PAGE_MARGIN, pageH - 4)
  doc.text(`Page ${doc.internal.getNumberOfPages()}`, PAGE_WIDTH - PAGE_MARGIN, pageH - 4, { align: 'right' })
}

function sectionTitle(doc, y, text) {
  doc.setFillColor(...COLORS.primary)
  doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, 8, 'F')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.white)
  doc.text(text, PAGE_MARGIN + 3, y + 5.5)
  return y + 12
}

function labelValue(doc, y, label, value, x = PAGE_MARGIN) {
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.gray)
  doc.text(label, x, y)
  doc.setTextColor(...COLORS.dark)
  doc.setFont(undefined, 'bold')
  doc.text(String(value ?? 'N/A'), x + 50, y)
  doc.setFont(undefined, 'normal')
  return y + 5.5
}

function checkPage(doc, y, needed = 30) {
  if (y + needed > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage()
    addPageHeader(doc, 'Clinical Report (cont.)')
    return 22
  }
  return y
}

// ─── Main Generator ────────────────────────────────────

export default function generatePDFReport(data) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // ──────────────── PAGE 1: COVER ────────────────
  // Blue header block
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, PAGE_WIDTH, 70, 'F')

  doc.setFontSize(24)
  doc.setTextColor(...COLORS.white)
  doc.text('Clinical Assessment Report', PAGE_MARGIN, 30)

  doc.setFontSize(12)
  doc.text('Hero-Dash Auditory Training System', PAGE_MARGIN, 40)

  doc.setFontSize(10)
  doc.setTextColor(200, 220, 255)
  doc.text(`Generated: ${dateStr}`, PAGE_MARGIN, 52)
  doc.text('Report Version 2.0 — Confidential', PAGE_MARGIN, 58)

  // Patient info box
  let y = 80
  doc.setDrawColor(...COLORS.primary)
  doc.setLineWidth(0.5)
  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 38, 3, 3, 'S')

  y += 8
  const patient = data.patient || {}
  y = labelValue(doc, y, 'Patient Name:', patient.username || 'Unknown')
  y = labelValue(doc, y, 'Age Group:', patient.age_group || 'N/A')
  y = labelValue(doc, y, 'Hearing Level:', patient.hearing_level || 'N/A')
  y = labelValue(doc, y, 'Current Level:', patient.current_level ?? 'N/A')
  y = labelValue(doc, y, 'Member Since:', patient.member_since ? new Date(patient.member_since).toLocaleDateString() : 'N/A')

  // ──────────────── SOAP NOTE ────────────────
  y = 130
  y = sectionTitle(doc, y, 'SOAP Clinical Note')
  const soap = data.soap_note || {}

  const soapSections = [
    { label: 'S — Subjective', text: soap.subjective },
    { label: 'O — Objective', text: soap.objective },
    { label: 'A — Assessment', text: soap.assessment },
    { label: 'P — Plan', text: Array.isArray(soap.plan) ? soap.plan.map((p, i) => `${i + 1}. ${p}`).join('\n') : soap.plan },
  ]

  for (const section of soapSections) {
    y = checkPage(doc, y, 20)
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.primary)
    doc.setFont(undefined, 'bold')
    doc.text(section.label, PAGE_MARGIN, y)
    doc.setFont(undefined, 'normal')
    y += 5
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.dark)
    const lines = doc.splitTextToSize(section.text || 'N/A', CONTENT_WIDTH - 5)
    doc.text(lines, PAGE_MARGIN + 2, y)
    y += lines.length * 4.5 + 4
  }

  // ──────────────── TRAINING SUMMARY ────────────────
  y = checkPage(doc, y, 35)
  y = sectionTitle(doc, y, 'Training Summary')

  const ts = data.training_summary || {}
  doc.autoTable({
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [['Metric', 'Value']],
    body: [
      ['Total Sessions', String(ts.total_sessions ?? 0)],
      ['Total Training Time', `${ts.total_training_minutes ?? 0} minutes`],
      ['Total Attempts', String(ts.total_attempts ?? 0)],
      ['Overall Accuracy', `${ts.overall_accuracy ?? 0}%`],
    ],
    headStyles: { fillColor: COLORS.primary, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [240, 243, 250] },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 8

  // ──────────────── PAGE 2: BKT SKILL MASTERY ────────────────
  doc.addPage()
  addPageHeader(doc, 'Skill Mastery Analysis')
  y = 22

  y = sectionTitle(doc, y, 'Bayesian Knowledge Tracing (BKT) — Skill Mastery')

  const bkt = data.bkt_skills || {}
  const skills = bkt.skills || {}
  const skillRows = []
  for (const [name, info] of Object.entries(skills)) {
    if (typeof info === 'object') {
      skillRows.push([
        name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        `${((info.p_learned || info.p_know || 0) * 100).toFixed(1)}%`,
        info.mastery_label || (info.p_learned >= 0.95 ? 'Mastered' : info.p_learned >= 0.6 ? 'Developing' : 'Emerging'),
        String(info.total_attempts ?? 0),
      ])
    }
  }

  if (skillRows.length) {
    doc.autoTable({
      startY: y,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [['Skill', 'P(Learned)', 'Status', 'Attempts']],
      body: skillRows,
      headStyles: { fillColor: COLORS.primary, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [240, 243, 250] },
      theme: 'grid',
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 2) {
          const val = hookData.cell.raw
          if (val === 'Mastered') hookData.cell.styles.textColor = COLORS.success
          else if (val === 'Developing') hookData.cell.styles.textColor = COLORS.warning
          else hookData.cell.styles.textColor = COLORS.danger
        }
      }
    })
    y = doc.lastAutoTable.finalY + 5
  }

  // Overall mastery summary
  y = checkPage(doc, y, 15)
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.dark)
  doc.text(`Overall Mastery: ${((bkt.overall_mastery || 0) * 100).toFixed(1)}% — ${bkt.mastery_label || 'N/A'}`, PAGE_MARGIN, y)
  y += 10

  // ──────────────── IRT ABILITY ────────────────
  y = checkPage(doc, y, 40)
  y = sectionTitle(doc, y, 'Item Response Theory (IRT) — Ability Estimate')

  const irt = data.irt_ability || {}
  doc.autoTable({
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [['Parameter', 'Value']],
    body: [
      ['Ability (θ)', (irt.theta ?? 0).toFixed(3)],
      ['Standard Error', (irt.standard_error ?? 0).toFixed(3)],
      ['95% Confidence Interval', irt.confidence_interval_95
        ? `[${irt.confidence_interval_95[0]?.toFixed(2)}, ${irt.confidence_interval_95[1]?.toFixed(2)}]`
        : 'N/A'],
      ['Ability Label', irt.ability_label || 'N/A'],
      ['Clinical Range', irt.clinical_range || 'N/A'],
      ['Attempts Used', String(irt.attempts_used ?? 0)],
    ],
    headStyles: { fillColor: COLORS.primary, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [240, 243, 250] },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 10

  // ──────────────── CLINICAL SCORES ────────────────
  y = checkPage(doc, y, 40)
  y = sectionTitle(doc, y, 'Age-Normalized Clinical Scores')

  const rawScores = data.clinical_scores?.raw || {}
  const normScores = data.clinical_scores?.normalized || {}
  const scoreRows = []
  for (const [key, val] of Object.entries(rawScores)) {
    const normVal = normScores[key]
    scoreRows.push([
      key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      typeof val === 'number' ? val.toFixed(1) : String(val ?? 'N/A'),
      typeof normVal === 'number' ? normVal.toFixed(1) : String(normVal ?? '—'),
    ])
  }

  if (scoreRows.length) {
    doc.autoTable({
      startY: y,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [['Score', 'Raw', 'Normalized']],
      body: scoreRows,
      headStyles: { fillColor: COLORS.primary, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [240, 243, 250] },
      theme: 'grid',
    })
    y = doc.lastAutoTable.finalY + 10
  } else {
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.gray)
    doc.text('No clinical score data available yet.', PAGE_MARGIN, y)
    y += 8
  }

  // ──────────────── PAGE 3: PSYCHOMETRICS + RECOMMENDATIONS ────────────────
  doc.addPage()
  addPageHeader(doc, 'Psychometrics & Recommendations')
  y = 22

  // Psychometric Validity
  y = sectionTitle(doc, y, 'Psychometric Validity Metrics')

  const psych = data.psychometric_validity || {}
  const psychRows = []
  for (const [key, val] of Object.entries(psych)) {
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      for (const [sk, sv] of Object.entries(val)) {
        psychRows.push([
          `${key.replace(/_/g, ' ')} → ${sk.replace(/_/g, ' ')}`.replace(/\b\w/g, c => c.toUpperCase()),
          typeof sv === 'number' ? sv.toFixed(4) : String(sv ?? 'N/A'),
        ])
      }
    } else {
      psychRows.push([
        key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        typeof val === 'number' ? val.toFixed(4) : String(val ?? 'N/A'),
      ])
    }
  }

  if (psychRows.length) {
    doc.autoTable({
      startY: y,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [['Metric', 'Value']],
      body: psychRows,
      headStyles: { fillColor: COLORS.primary, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 243, 250] },
      theme: 'grid',
    })
    y = doc.lastAutoTable.finalY + 10
  }

  // Pre/Post Comparison
  const comparison = data.pre_post_comparison
  if (comparison && comparison.baseline_accuracy !== undefined) {
    y = checkPage(doc, y, 40)
    y = sectionTitle(doc, y, 'Pre/Post Intervention Comparison')

    doc.autoTable({
      startY: y,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [['Metric', 'Value']],
      body: [
        ['Baseline Accuracy', `${(comparison.baseline_accuracy ?? 0).toFixed(1)}%`],
        ['Post-Test Accuracy', `${(comparison.post_test_accuracy ?? 0).toFixed(1)}%`],
        ['Improvement', `${(comparison.improvement ?? 0).toFixed(1)}%`],
        ['Effect Size (Cohen\'s d)', (comparison.effect_size ?? 0).toFixed(3)],
        ['Statistically Significant', comparison.statistically_significant ? 'Yes' : 'No'],
        ['p-value', comparison.p_value !== undefined ? comparison.p_value.toFixed(4) : 'N/A'],
      ],
      headStyles: { fillColor: COLORS.primary, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [240, 243, 250] },
      theme: 'grid',
    })
    y = doc.lastAutoTable.finalY + 10
  }

  // IRT Growth Trajectory
  const trajectory = data.irt_growth_trajectory
  if (Array.isArray(trajectory) && trajectory.length > 0) {
    y = checkPage(doc, y, 40)
    y = sectionTitle(doc, y, 'IRT Ability Growth Trajectory')

    const trajRows = trajectory.map((t, i) => [
      `Point ${i + 1}`,
      (t.theta ?? 0).toFixed(3),
      (t.se ?? 0).toFixed(3),
      String(t.attempts ?? ''),
    ])

    doc.autoTable({
      startY: y,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [['#', 'Ability (θ)', 'Std Error', 'Attempts']],
      body: trajRows,
      headStyles: { fillColor: COLORS.primary, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 243, 250] },
      theme: 'grid',
    })
    y = doc.lastAutoTable.finalY + 10
  }

  // Clinical Recommendations
  y = checkPage(doc, y, 30)
  y = sectionTitle(doc, y, 'Clinical Recommendations')

  const recs = data.clinical_recommendations || []
  if (recs.length) {
    doc.autoTable({
      startY: y,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [['Priority', 'Area', 'Recommendation']],
      body: recs.map(r => [
        (r.severity || r.priority || 'info').replace(/_/g, ' ').toUpperCase(),
        (r.area || r.category || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        r.suggestion || r.recommendation || '',
      ]),
      headStyles: { fillColor: COLORS.primary, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 243, 250] },
      columnStyles: { 2: { cellWidth: 90 } },
      theme: 'grid',
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 0) {
          const val = hookData.cell.raw
          if (val.includes('HIGH')) hookData.cell.styles.textColor = COLORS.danger
          else if (val.includes('MEDIUM')) hookData.cell.styles.textColor = COLORS.warning
          else hookData.cell.styles.textColor = COLORS.success
        }
      }
    })
    y = doc.lastAutoTable.finalY + 10
  } else {
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.gray)
    doc.text('No specific clinical recommendations at this time.', PAGE_MARGIN, y)
    y += 8
  }

  // ──────────────── DISCLAIMER ────────────────
  y = checkPage(doc, y, 25)
  doc.setDrawColor(...COLORS.lightGray)
  doc.setLineWidth(0.3)
  doc.line(PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN, y)
  y += 6
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.gray)
  const disclaimer = data.disclaimer ||
    'This report is generated by an automated system and should be interpreted by a qualified audiologist or speech-language pathologist.'
  const disclaimerLines = doc.splitTextToSize(disclaimer, CONTENT_WIDTH)
  doc.text(disclaimerLines, PAGE_MARGIN, y)

  // Add headers/footers to all pages
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    if (i > 1) addPageHeader(doc, 'Clinical Report')

    // Footer on every page
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.gray)
    doc.text(`Page ${i} of ${totalPages}`, PAGE_WIDTH - PAGE_MARGIN, pageH - 4, { align: 'right' })
  }

  // Download
  const username = (data.patient?.username || 'patient').replace(/[^a-zA-Z0-9]/g, '_')
  const dateFile = now.toISOString().split('T')[0]
  doc.save(`Hero-Dash_Clinical_Report_${username}_${dateFile}.pdf`)
}
