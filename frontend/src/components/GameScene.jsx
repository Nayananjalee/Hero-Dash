import React, { useRef, useEffect, useMemo, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store'
import { AGE_SPEED } from '../config'
import * as THREE from 'three'

// ─── SHARED SPEED HOOK ─────────────────────────────────
// Single speed calculation instead of duplicating in Wheel×4, Road, InfiniteCity
function useSpeedValues() {
  const level = useGameStore((s) => s.level)
  const speedModifier = useGameStore((s) => s.speedModifier)
  const ageGroup = useGameStore((s) => s.ageGroup)
  const isPaused = useGameStore((s) => s.isPaused)
  const ageMult = AGE_SPEED[ageGroup] || 0.85
  const speed = (10 + (level - 1) * 2) * speedModifier * ageMult
  return { speed, isPaused }
}

const HALF_PI = Math.PI / 2
const NEG_HALF_PI = -Math.PI / 2
const PI = Math.PI

// --- ASSETS & COMPONENTS ---

const Tree = memo(function Tree({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.2, 0.4, 2, 6]} />
        <meshStandardMaterial color="#5d4037" />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <dodecahedronGeometry args={[1.5]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </mesh>
    </group>
  )
})

function Human({ position, speed: walkSpeed = 1, color }) {
  const leftLeg = useRef()
  const rightLeg = useRef()
  const isPaused = useGameStore((s) => s.isPaused)

  useFrame((state) => {
    if (isPaused) return
    const t = state.clock.getElapsedTime() * walkSpeed * 5
    leftLeg.current.rotation.x = Math.sin(t) * 0.5
    rightLeg.current.rotation.x = Math.sin(t + PI) * 0.5
  })

  return (
    <group position={position}>
      <group position={[0, 0.7, 0]}>
        <mesh position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.15, 6, 6]} />
          <meshStandardMaterial color="#ffdbac" />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.3, 0.6, 0.2]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
      <group position={[0, 0.4, 0]}>
        <mesh ref={leftLeg} position={[-0.1, -0.3, 0]}>
          <boxGeometry args={[0.1, 0.6, 0.1]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh ref={rightLeg} position={[0.1, -0.3, 0]}>
          <boxGeometry args={[0.1, 0.6, 0.1]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>
    </group>
  )
}

const StreetLamp = memo(function StreetLamp({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 5, 6]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[0.5, 4.8, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.08, 0.08, 1.5, 6]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[1, 4.2, 0]}>
        <coneGeometry args={[0.3, 0.5, 6, 1, true]} />
        <meshStandardMaterial color="#ffffcc" emissive="#ffffcc" emissiveIntensity={2} />
      </mesh>
    </group>
  )
})

const Building = memo(function Building({ position, size, color, type }) {
  const windowColor = type === 0 ? '#87CEEB' : '#ffffcc'
  const wallColor = type === 0 ? '#bdc3c7' : color
  const windowRows = Math.min(3, Math.floor(size[1] / 2))
  const windowCols = Math.min(2, Math.floor(size[0] / 1.5))

  return (
    <group position={position}>
      <mesh position={[0, size[1] / 2, 0]}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={wallColor} metalness={type === 0 ? 0.8 : 0.1} roughness={type === 0 ? 0.1 : 0.8} />
      </mesh>
      {/* Limited windows for performance */}
      {type === 0 ? (
        Array.from({ length: windowRows }).map((_, i) => (
           <mesh key={i} position={[0, i * 2 + 1, size[2]/2 + 0.01]}>
              <planeGeometry args={[size[0] * 0.9, 0.1]} />
              <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.2} />
           </mesh>
        ))
      ) : (
        Array.from({ length: Math.min(2, Math.floor(size[1])) }).map((_, y) => 
          Array.from({ length: windowCols }).map((_, x) => (
             <mesh key={`${x}-${y}`} position={[(x - windowCols/2) * 1.2 + 0.6, y + 1, size[2]/2 + 0.01]}>
                <planeGeometry args={[0.6, 0.8]} />
                <meshStandardMaterial color={windowColor} emissive={windowColor} emissiveIntensity={0.5} />
             </mesh>
          ))
        )
      )}
    </group>
  )
})

const CityBlock = memo(function CityBlock({ zOffset }) {
  const elements = useMemo(() => {
    const items = []
    // Left side building
    items.push({ 
        type: 'building', 
        props: { position: [-18, 0, 0], size: [8, 8 + Math.random() * 12, 8], color: '#e74c3c', style: Math.random() > 0.5 ? 0 : 1 } 
    })
    // Right side building
    items.push({ 
        type: 'building', 
        props: { position: [18, 0, 0], size: [8, 8 + Math.random() * 12, 8], color: '#f1c40f', style: Math.random() > 0.5 ? 0 : 1 } 
    })
    
    // Reduced decoration — 1 tree + 1 lamp + 1 human per side
    // Left Sidewalk
    items.push({ type: 'tree', props: { position: [-12, 0, -3] } })
    items.push({ type: 'lamp', props: { position: [-11, 0, 4] } })
    items.push({ type: 'human', props: { position: [-13, 0, 0], color: Math.random() > 0.5 ? '#3498db' : '#e67e22', speed: 0.5 + Math.random() } })

    // Right Sidewalk
    items.push({ type: 'tree', props: { position: [12, 0, -3] } })
    items.push({ type: 'lamp', props: { position: [11, 0, 4] } })
    items.push({ type: 'human', props: { position: [13, 0, 0], color: Math.random() > 0.5 ? '#2ecc71' : '#e74c3c', speed: 0.5 + Math.random() } })

    return items
  }, [])

  return (
    <group position={[0, 0, zOffset]}>
      {elements.map((el, i) => {
        if (el.type === 'building') return <Building key={i} {...el.props} type={el.props.style} />
        if (el.type === 'tree') return <Tree key={i} {...el.props} />
        if (el.type === 'lamp') return <StreetLamp key={i} {...el.props} />
        if (el.type === 'human') return <Human key={i} {...el.props} />
        return null
      })}
    </group>
  )
})

function InfiniteCity() {
  const group = useRef()
  const { speed, isPaused } = useSpeedValues()
  
  useFrame((state, delta) => {
    if (isPaused) return
    group.current.position.z += delta * speed
    if (group.current.position.z > 20) {
        group.current.position.z = 0
    }
  })

  return (
    <group ref={group}>
      {[0, 1, 2, 3, 4].map((i) => (
        <CityBlock key={i} zOffset={-i * 20} />
      ))}
    </group>
  )
}

function Car() {
  const mesh = useRef()
  const lane = useGameStore((state) => state.lane)
  const setLane = useGameStore((state) => state.setLane)
  const setSpeed = useGameStore((state) => state.setSpeed)
  const isPaused = useGameStore((state) => state.isPaused)
  const isGameOver = useGameStore((state) => state.isGameOver)
  
  // Pass speed to Wheel components via ref (eliminates 16 store subscriptions)
  const { speed } = useSpeedValues()
  const speedRef = useRef(speed)
  const pausedRef = useRef(isPaused)
  speedRef.current = speed
  pausedRef.current = isPaused
  
  // Smooth movement
  useFrame((state, delta) => {
    const targetX = lane * 3.5
    const moveStep = Math.min(delta * 5, 0.1) 
    const tiltStep = Math.min(delta * 10, 0.1)
    mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, targetX, moveStep)
    const dist = mesh.current.position.x - targetX
    mesh.current.rotation.z = THREE.MathUtils.lerp(mesh.current.rotation.z, dist * 0.1, tiltStep)
  })

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isPaused || isGameOver) return
      if (e.key === 'ArrowLeft' || e.key === 'a') setLane(Math.max(-1, lane - 1))
      if (e.key === 'ArrowRight' || e.key === 'd') setLane(Math.min(1, lane + 1))
      if (e.key === 'ArrowUp' || e.key === 'w') {
        // ArrowUp also confirms "Stay Center" for air_raid_siren
        const state = useGameStore.getState()
        if (state.emergencyActive && state.targetLane === 0 && !state.responseLocked) {
          setLane(lane) // Re-trigger lane check at current position
        } else {
          setSpeed(1)
        }
      }
      if (e.key === 'ArrowDown') setSpeed(0)
      if (e.key === 's' || e.key === 'S' || e.key === ' ') setSpeed(0.5)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lane, setLane, setSpeed, isPaused, isGameOver])

  // Touch controls — swipe left/right for lane, tap zones for speed
  useEffect(() => {
    let touchStartX = null
    const handleTouchStart = (e) => {
      if (isPaused || isGameOver) return
      touchStartX = e.touches[0].clientX
    }
    const handleTouchEnd = (e) => {
      if (isPaused || isGameOver || touchStartX === null) return
      const dx = e.changedTouches[0].clientX - touchStartX
      const dy = e.changedTouches[0].clientY
      const screenH = window.innerHeight
      touchStartX = null
      if (Math.abs(dx) > 40) {
        if (dx > 0) setLane(Math.min(1, lane + 1))
        else setLane(Math.max(-1, lane - 1))
      } else if (dy > screenH * 0.65) {
        setSpeed(0)
      } else if (dy < screenH * 0.35) {
        setSpeed(1)
      } else {
        setSpeed(0.5)
      }
    }
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [lane, setLane, setSpeed, isPaused, isGameOver])

  return (
    <group ref={mesh} position={[0, 0, 0]}>
      {/* Chassis — brighter child-friendly colour */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.8, 0.5, 4]} />
        <meshStandardMaterial color="#FF6B35" metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Cabin */}
      <mesh position={[0, 1.2, -0.2]}>
        <boxGeometry args={[1.4, 0.7, 2.2]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Wheels — use refs instead of store subscriptions */}
      <Wheel position={[-0.9, 0.35, 1.2]} speedRef={speedRef} pausedRef={pausedRef} />
      <Wheel position={[0.9, 0.35, 1.2]} speedRef={speedRef} pausedRef={pausedRef} />
      <Wheel position={[-0.9, 0.35, -1.2]} speedRef={speedRef} pausedRef={pausedRef} />
      <Wheel position={[0.9, 0.35, -1.2]} speedRef={speedRef} pausedRef={pausedRef} />

      {/* Headlights */}
      <mesh position={[-0.6, 0.6, 2.01]}>
        <circleGeometry args={[0.2, 8]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      <mesh position={[0.6, 0.6, 2.01]}>
        <circleGeometry args={[0.2, 8]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      <spotLight position={[0, 0.6, 2.1]} angle={0.6} penumbra={0.5} intensity={3} distance={20} target-position={[0, 0, 10]} />

      {/* Taillights */}
      <mesh position={[-0.6, 0.6, -2.01]} rotation={[0, PI, 0]}>
        <circleGeometry args={[0.2, 8]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh position={[0.6, 0.6, -2.01]} rotation={[0, PI, 0]}>
        <circleGeometry args={[0.2, 8]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
    </group>
  )
}

function Wheel({ position, speedRef, pausedRef }) {
  const wheelRef = useRef()

  useFrame((state, delta) => {
    if (pausedRef.current) return
    wheelRef.current.rotation.x -= delta * speedRef.current * 0.5
  })

  return (
    <group position={position} ref={wheelRef}>
      <mesh rotation={[0, 0, HALF_PI]}>
        <cylinderGeometry args={[0.35, 0.35, 0.4, 12]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh rotation={[0, 0, HALF_PI]}>
        <cylinderGeometry args={[0.2, 0.2, 0.41, 8]} />
        <meshStandardMaterial color="#555" />
      </mesh>
    </group>
  )
}

function Road() {
  const roadRef = useRef()
  const { speed, isPaused } = useSpeedValues()
  
  useFrame((state, delta) => {
    if (isPaused) return
    roadRef.current.position.z += delta * speed
    if (roadRef.current.position.z > 20) {
      roadRef.current.position.z = 0
    }
  })

  return (
    <group ref={roadRef}>
      <mesh rotation={[NEG_HALF_PI, 0, 0]} position={[0, 0, -60]}>
        <planeGeometry args={[20, 180]} />
        <meshStandardMaterial color="#2c3e50" roughness={0.8} />
      </mesh>
      
      {[-3.5, 3.5].map((x, i) => (
        <mesh key={i} rotation={[NEG_HALF_PI, 0, 0]} position={[x, 0.02, -60]}>
          <planeGeometry args={[0.2, 180]} />
          <meshStandardMaterial color="white" />
        </mesh>
      ))}
      
      {/* Center dashed line — reduced from 15 to 10 */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} rotation={[NEG_HALF_PI, 0, 0]} position={[0, 0.02, -i * 12]}>
          <planeGeometry args={[0.2, 5]} />
          <meshStandardMaterial color="yellow" />
        </mesh>
      ))}

      <mesh rotation={[NEG_HALF_PI, 0, 0]} position={[-14, 0.1, -60]}>
        <planeGeometry args={[8, 180]} />
        <meshStandardMaterial color="#95a5a6" />
      </mesh>
      <mesh rotation={[NEG_HALF_PI, 0, 0]} position={[14, 0.1, -60]}>
        <planeGeometry args={[8, 180]} />
        <meshStandardMaterial color="#95a5a6" />
      </mesh>
    </group>
  )
}

export default function GameScene() {
  return (
    <>
      <Car />
      <Road />
      <InfiniteCity />
      <mesh rotation={[NEG_HALF_PI, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </>
  )
}
