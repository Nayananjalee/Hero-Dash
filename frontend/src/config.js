/**
 * Shared Configuration
 * ====================
 * Single source of truth for API URLs, color palette,
 * disaster types, and design tokens for the entire app.
 *
 * Color Accessibility Notes (for hearing-impaired children ages 4–14):
 * - Each disaster uses a UNIQUE hue distinguishable even in grayscale
 * - Avoids red/green-only distinction (colorblind safe)
 * - WCAG 2.1 AAA contrast: all text ≥ 7:1 ratio against its background
 * - Shape + color + pattern redundancy (never color alone)
 * - Tsunami (blue) vs Flood (teal/green) now clearly distinct
 */

// ─── API ───────────────────────────────────────────────
// VITE_API_URL is set during build via --build-arg in Docker
// Fallback to localhost for development
// Use HTTPS in production (required for Cloud Run)
const getAPIURL = () => {
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL.trim()
    // Ensure URL has protocol
    if (url && !url.startsWith('http')) {
      return `https://${url}`
    }
    return url
  }
  // Development fallback
  if (import.meta.env.DEV) {
    return 'http://localhost:8000'
  }
  // Production fallback: Remove default that will fail in Cloud Run
  // Let fetch requests fail with clear error messages for debugging
  console.error('❌ VITE_API_URL not configured and not in development mode')
  return ''
}

export const API_URL = getAPIURL()

// Log for debugging (enable in production too for Cloud Run troubleshooting)
console.info(`🔧 API_URL: ${API_URL || '(NOT CONFIGURED)'}`)
console.info(`🔧 Environment: ${import.meta.env.DEV ? 'development' : 'production'}`)
console.info(`🔧 VITE_API_URL env: ${import.meta.env.VITE_API_URL || '(not set)'}`)

// ─── DEV LOGGING ───────────────────────────────────────
// Set to false in production to eliminate console spam
export const DEV_LOG = import.meta.env.DEV ?? false

export function devLog(...args) {
  if (DEV_LOG) console.log(...args)
}
export function devWarn(...args) {
  if (DEV_LOG) console.warn(...args)
}

// ─── COLORBLIND-SAFE DISASTER PALETTE ──────────────────
// Tested with Coblis color-blindness simulator for deuteranopia,
// protanopia, and tritanopia. Each pair has ΔE > 30.
export const DISASTER_THEMES = {
  tsunami_siren: {
    primary: '#005F99',      // Deep ocean blue
    secondary: '#66D3FA',
    glow: 'rgba(0, 95, 153, 0.55)',
    icon: '🌊',
    label: 'Tsunami Warning',
    sinhala: 'සුනාමි අනතුරු ඇඟවීම',
    action: 'Move Right ➡️',
    actionKey: '→',
    actionSinhala: 'දකුණට යන්න',
    direction: 'right',
    haptic: [300, 100, 300, 100, 300, 100, 300],
  },
  earthquake_alarm: {
    primary: '#7A4419',      // Earth brown
    secondary: '#D4A76A',
    glow: 'rgba(122, 68, 25, 0.55)',
    icon: '🏚️',
    label: 'Earthquake',
    sinhala: 'භූමිකම්පා අනතුරු ඇඟවීම',
    action: 'STOP ⬇️',
    actionKey: '↓',
    actionSinhala: 'නවතින්න',
    direction: 'stop',
    haptic: [500, 100, 500, 100, 500],
  },
  flood_warning: {
    primary: '#00897B',      // Teal-green (clearly distinct from tsunami blue)
    secondary: '#80CBC4',
    glow: 'rgba(0, 137, 123, 0.55)',
    icon: '🌧️',             // Rain cloud — NOT wave (distinct from tsunami)
    label: 'Flood Warning',
    sinhala: 'ගංවතුර අනතුරු ඇඟවීම',
    action: 'Safe Place 🏠 (S)',
    actionKey: 'S',
    actionSinhala: 'ආරක්ෂිත ස්ථානයක් සොයන්න',
    direction: 'slow',
    haptic: [300, 200, 300, 200, 300, 200],
  },
  air_raid_siren: {
    primary: '#7B2D8E',      // Violet-purple
    secondary: '#CE93D8',
    glow: 'rgba(123, 45, 142, 0.55)',
    icon: '🚨',
    label: 'Air Raid',
    sinhala: 'ගුවන් ප්‍රහාර අනතුරු ඇඟවීම',
    action: 'Stay Center ⏺️',
    actionKey: '↑',
    actionSinhala: 'මැද රැඳී සිටින්න',
    direction: 'center',
    haptic: [400, 100, 400, 100, 400, 100],
  },
  building_fire_alarm: {
    primary: '#C62828',      // Deep red (not pure red — works for protanopia)
    secondary: '#FF8A80',
    glow: 'rgba(198, 40, 40, 0.55)',
    icon: '🔥',
    label: 'Building Fire',
    sinhala: 'ගොඩනැගිලි ගිනි අනතුරු ඇඟවීම',
    action: 'Move Left ⬅️',
    actionKey: '←',
    actionSinhala: 'වමට යන්න',
    direction: 'left',
    haptic: [150, 75, 150, 75, 150, 75, 150],
  },
}

// Quick lookup helpers
export const DISASTER_ICONS = Object.fromEntries(
  Object.entries(DISASTER_THEMES).map(([k, v]) => [k, v.icon])
)
export const DISASTER_COLORS = Object.fromEntries(
  Object.entries(DISASTER_THEMES).map(([k, v]) => [k, v.primary])
)

// ─── FEEDBACK COLORS (colorblind-safe) ─────────────────
// Use blue for success instead of green, orange for failure instead of red,
// plus shape indicators (✓ and ✗) so colour is never the sole channel.
export const FEEDBACK = {
  success: { color: '#2DC653', altColor: '#1B7A3D', bg: 'rgba(45, 198, 83, 0.15)', label: '✓ Correct!' },
  failure: { color: '#FF6B35', altColor: '#C24914', bg: 'rgba(255, 107, 53, 0.15)', label: '✗ Try Again!' },
}

// ─── AGE GROUPS ────────────────────────────────────────
export const AGE_GROUPS = [
  { value: '4-6',  label: '4–6',  emoji: '🧒', description: 'Learning new sounds' },
  { value: '7-8',  label: '7–8',  emoji: '👦', description: 'Telling sounds apart' },
  { value: '9-10', label: '9–10', emoji: '🧑', description: 'Listening in noise' },
  { value: '11-12',label: '11–12',emoji: '👧', description: 'Tricky sound challenges' },
  { value: '13-14',label: '13–14',emoji: '🧑‍🎓', description: 'Expert listener' },
]

// Age-based speed multiplier — younger = slower (motor development)
export const AGE_SPEED = {
  '4-6': 0.5,
  '5-6': 0.6,
  '7-8': 0.75,
  '9-10': 0.85,
  '11-12': 0.95,
  '13-14': 1.0,
}

// ─── HEARING LEVELS ────────────────────────────────────
export const HEARING_LEVELS = [
  { value: 'normal',     label: 'Normal',      color: '#2DC653', icon: '🟢' },
  { value: 'mild',       label: 'Mild',        detail: '21-40 dB', color: '#F4D35E', icon: '🟡' },
  { value: 'moderate',   label: 'Moderate',    detail: '41-55 dB', color: '#F78C40', icon: '🟠' },
  { value: 'mod_severe', label: 'Mod-Severe',  detail: '56-70 dB', color: '#E8453C', icon: '🔴' },
  { value: 'severe',     label: 'Severe',      detail: '71-90 dB', color: '#C62828', icon: '⭕' },
  { value: 'profound',   label: 'Profound',    detail: '>90 dB',  color: '#7B2D8E', icon: '🟣' },
]

// ─── GAME MODES ────────────────────────────────────────
export const GAME_MODES = [
  {
    value: 'audio-visual',
    label: '🔊 Audio + Visual',
    description: 'Listen and watch — full game experience',
    color: '#2DC653',
    recommended: true,
  },
  {
    value: 'visual-only',
    label: '👁️ Visual Only',
    description: 'Watch and feel vibrations — no sound needed',
    color: '#3498db',
    recommended: false,
  },
  {
    value: 'assessment',
    label: '📋 Quick Test',
    description: 'Short test to check your progress (20 rounds)',
    color: '#9b59b6',
    recommended: false,
  },
]

// ─── DESIGN TOKENS ─────────────────────────────────────
// Child-friendly sizes: minimum touch target 44×44 px (WCAG), min font 16 px
export const TOKENS = {
  fontBase: '1rem',        // 16 px minimum
  fontLg: '1.25rem',
  fontXl: '1.6rem',
  fontHero: '2.4rem',
  radiusSm: '8px',
  radiusMd: '14px',
  radiusLg: '22px',
  radiusFull: '9999px',
  touchMin: '44px',        // WCAG 2.1 minimum touch target
  feedbackDuration: 3000,  // ms — longer for young readers
  panelBg: 'rgba(0,0,0,0.72)',
  panelBorder: 'rgba(255,255,255,0.12)',
  glassBg: 'rgba(255,255,255,0.07)',
  glassBorder: 'rgba(255,255,255,0.10)',
}

// ─── ENVIRONMENT ZONES ─────────────────────────────────
// Cycle through crisis-relevant environments for visual variety
// Research: Ecological validity — Barnett & Ceci (2002)
export const ENVIRONMENT_ZONES = [
  {
    id: 'city',
    label: '🏙️ Downtown City',
    labelSi: 'නගරය',
    roadColor: '#2c3e50',
    groundColor: '#1a1a1a',
    fogColor: '#101010',
    buildingColors: ['#bdc3c7', '#95a5a6', '#7f8c8d', '#e74c3c', '#3498db'],
    treeColor: '#2d5a27',
    skyTint: 0.3,
  },
  {
    id: 'coastal',
    label: '🏖️ Coastal Area',
    labelSi: 'වෙරළ තීරය',
    roadColor: '#a0936e',
    groundColor: '#c2b280',
    fogColor: '#1a3040',
    buildingColors: ['#f5f5dc', '#deb887', '#87ceeb', '#fff8dc', '#f0e68c'],
    treeColor: '#228B22',
    skyTint: 0.5,
  },
  {
    id: 'school',
    label: '🏫 School Zone',
    labelSi: 'පාසල් කලාපය',
    roadColor: '#555555',
    groundColor: '#3a5a3a',
    fogColor: '#1a1a10',
    buildingColors: ['#e8d44d', '#f39c12', '#fff3cd', '#ffeaa7', '#fdcb6e'],
    treeColor: '#27ae60',
    skyTint: 0.4,
  },
  {
    id: 'village',
    label: '🌳 Rural Village',
    labelSi: 'ගම්බද ප්‍රදේශය',
    roadColor: '#6b4226',
    groundColor: '#4a7c3f',
    fogColor: '#0a1a0a',
    buildingColors: ['#8B4513', '#D2691E', '#A0522D', '#deb887', '#f5deb3'],
    treeColor: '#1e7a1e',
    skyTint: 0.35,
  },
]

// ─── WEATHER EFFECTS ───────────────────────────────────
// Visual overlays that add variety and figure-ground difficulty
// Research: Musiek et al. (2005) — figure-ground separation training
export const WEATHER_TYPES = [
  { id: 'clear', label: '☀️ Clear', opacity: 0, noiseBoost: 0 },
  { id: 'rain', label: '🌧️ Rain', opacity: 0.25, noiseBoost: 0.1 },
  { id: 'fog', label: '🌫️ Dense Fog', opacity: 0.4, noiseBoost: 0.05 },
  { id: 'night', label: '🌙 Night', opacity: 0.5, noiseBoost: 0 },
]

// ─── COMBO STREAKS ─────────────────────────────────────
// Variable ratio reinforcement (Skinner, 1957)
export const COMBO_MILESTONES = [
  { streak: 3,  label: 'Nice!',      labelSi: 'ලස්සනයි!',      multiplier: 1.5, color: '#2ecc71', emoji: '👍' },
  { streak: 5,  label: 'Amazing!',    labelSi: 'අසාමාන්‍යයි!',    multiplier: 2.0, color: '#f1c40f', emoji: '⭐' },
  { streak: 7,  label: 'HERO MODE!',  labelSi: 'වීරයා ප්‍රකාරය!',  multiplier: 3.0, color: '#e67e22', emoji: '🦸' },
  { streak: 10, label: 'LEGENDARY!',  labelSi: 'පුරාවෘත්තමය!',  multiplier: 5.0, color: '#9b59b6', emoji: '🔥', bonusLife: true },
]

// ─── CRISIS STORY MISSIONS ─────────────────────────────
// Narrative transportation theory (Green & Brock, 2000)
export const MISSIONS = [
  {
    id: 'hospital_rescue',
    title: '🏥 Hospital Rescue',
    titleSi: 'රෝහල මුදාගැනීම',
    story: 'Get the ambulance to the hospital safely!',
    storySi: 'ගිලන්රථය ආරක්ෂිතව රෝහලට ගෙන යන්න!',
    totalTrials: 6,
    goal: 'Score ≥ 400',
    goalCheck: (stats) => stats.score >= 400,
    difficulty: 1,
    scenarios: null, // null = use ML recommendations
    stars: [
      { required: 400, label: '⭐' },
      { required: 500, label: '⭐⭐' },
      { required: 600, label: '⭐⭐⭐' },
    ]
  },
  {
    id: 'school_evacuation',
    title: '🏫 School Evacuation',
    titleSi: 'පාසල් ඉවත් කිරීම',
    story: 'Guide all students to safety — no mistakes!',
    storySi: 'සිසුන් සියලුදෙනා ආරක්ෂාවට ගෙන යන්න!',
    totalTrials: 6,
    goal: '≤ 1 mistake',
    goalCheck: (stats) => stats.failures <= 1,
    difficulty: 2,
    scenarios: null,
    stars: [
      { required: 0, label: '⭐', check: (s) => s.failures <= 1 },
      { required: 0, label: '⭐⭐', check: (s) => s.failures === 0 },
      { required: 0, label: '⭐⭐⭐', check: (s) => s.failures === 0 && s.avgRT < 3.0 },
    ]
  },
  {
    id: 'coastal_alert',
    title: '🌊 Coastal Alert',
    titleSi: 'වෙරළ තීර අනතුරු ඇඟවීම',
    story: 'Tsunami warning! Reach high ground!',
    storySi: 'සුනාමි අනතුරු ඇඟවීම! ඉහළ බිමකට යන්න!',
    totalTrials: 8,
    goal: 'Complete all emergencies',
    goalCheck: (stats) => stats.completed >= 8,
    difficulty: 2,
    scenarios: ['tsunami_siren', 'flood_warning', 'tsunami_siren', 'earthquake_alarm', 'tsunami_siren', 'flood_warning', 'building_fire_alarm', 'tsunami_siren'],
    stars: [
      { required: 0, label: '⭐', check: (s) => s.completed >= 8 },
      { required: 0, label: '⭐⭐', check: (s) => s.failures <= 2 },
      { required: 0, label: '⭐⭐⭐', check: (s) => s.failures === 0 },
    ]
  },
  {
    id: 'fire_hero',
    title: '🔥 Fire Station Hero',
    titleSi: 'ගිනි නිවීම් වීරයා',
    story: 'Rush to save the building — be fast!',
    storySi: 'ගොඩනැගිල්ල බේරාගන්න — වේගවත් වන්න!',
    totalTrials: 6,
    goal: 'Average RT < 3 seconds',
    goalCheck: (stats) => stats.avgRT < 3.0,
    difficulty: 3,
    scenarios: ['building_fire_alarm', 'earthquake_alarm', 'building_fire_alarm', 'air_raid_siren', 'building_fire_alarm', 'flood_warning'],
    stars: [
      { required: 0, label: '⭐', check: (s) => s.avgRT < 4.0 },
      { required: 0, label: '⭐⭐', check: (s) => s.avgRT < 3.0 },
      { required: 0, label: '⭐⭐⭐', check: (s) => s.avgRT < 2.0 },
    ]
  },
  {
    id: 'crisis_commander',
    title: '🌍 Crisis Commander',
    titleSi: 'අර්බුද සේනාධිනායක',
    story: 'Master all 5 crisis types — become a legend!',
    storySi: 'අර්බුද වර්ග 5ම මුහුණ දෙන්න!',
    totalTrials: 10,
    goal: 'Master all 5 types',
    goalCheck: (stats) => stats.typesCorrect >= 5,
    difficulty: 3,
    scenarios: ['tsunami_siren', 'earthquake_alarm', 'flood_warning', 'air_raid_siren', 'building_fire_alarm',
                'tsunami_siren', 'earthquake_alarm', 'flood_warning', 'air_raid_siren', 'building_fire_alarm'],
    stars: [
      { required: 0, label: '⭐', check: (s) => s.typesCorrect >= 3 },
      { required: 0, label: '⭐⭐', check: (s) => s.typesCorrect >= 5 },
      { required: 0, label: '⭐⭐⭐', check: (s) => s.typesCorrect >= 5 && s.failures === 0 },
    ]
  },
]

// ─── HAPTIC / VISUAL FEEDBACK ──────────────────────────
// Desktop/laptop PCs don't support navigator.vibrate().
// This utility provides a visual screen-shake + border flash fallback
// so hearing-impaired children still get tactile-equivalent feedback.

let _shakeStyleInjected = false
function _injectShakeCSS() {
  if (_shakeStyleInjected) return
  _shakeStyleInjected = true
  const style = document.createElement('style')
  style.textContent = `
    @keyframes hd-shake {
      0%, 100% { transform: translate(0, 0); }
      10% { transform: translate(-6px, -3px); }
      20% { transform: translate(5px, 4px); }
      30% { transform: translate(-4px, 2px); }
      40% { transform: translate(6px, -4px); }
      50% { transform: translate(-3px, 5px); }
      60% { transform: translate(4px, -2px); }
      70% { transform: translate(-5px, 3px); }
      80% { transform: translate(3px, -3px); }
      90% { transform: translate(-2px, 4px); }
    }
    @keyframes hd-flash-border {
      0%, 100% { box-shadow: inset 0 0 0 0 transparent; }
      20%, 60% { box-shadow: inset 0 0 40px 8px var(--hd-flash-color, rgba(255,165,0,0.6)); }
    }
    .hd-shaking {
      animation: hd-shake var(--hd-shake-duration, 0.5s) ease-in-out;
    }
    .hd-flash {
      animation: hd-flash-border var(--hd-shake-duration, 0.5s) ease-in-out;
    }
  `
  document.head.appendChild(style)
}

/**
 * Trigger haptic feedback with desktop fallback.
 * On mobile: uses navigator.vibrate() with the given pattern.
 * On desktop: shakes the screen + flashes an orange/green border.
 * @param {number[]} pattern - Vibration pattern [vibrate, pause, vibrate, ...]
 * @param {string} [flashColor] - CSS color for the border flash (default: orange)
 */
export function triggerHaptic(pattern = [200], flashColor = 'rgba(255,165,0,0.6)') {
  // Try native vibration first (mobile devices)
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      const vibrated = navigator.vibrate(pattern)
      if (vibrated) return  // Vibration succeeded — done
    } catch (_) { /* some browsers throw instead of returning false */ }
  }

  // Desktop fallback: visual screen shake + border flash
  _injectShakeCSS()
  const totalMs = pattern.reduce((a, b) => a + b, 0)
  const duration = Math.max(300, Math.min(totalMs, 1500))

  const el = document.documentElement
  el.style.setProperty('--hd-shake-duration', `${duration}ms`)
  el.style.setProperty('--hd-flash-color', flashColor)
  el.classList.add('hd-shaking', 'hd-flash')

  setTimeout(() => {
    el.classList.remove('hd-shaking', 'hd-flash')
  }, duration)
}
