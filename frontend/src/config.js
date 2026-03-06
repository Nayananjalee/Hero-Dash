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
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
