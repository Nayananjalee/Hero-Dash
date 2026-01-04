import React, { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'

// --- ASSETS & COMPONENTS ---

function Tree({ position }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.4, 2, 8]} />
        <meshStandardMaterial color="#5d4037" />
      </mesh>
      {/* Leaves */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <dodecahedronGeometry args={[1.5]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </mesh>
    </group>
  )
}

function Human({ position, speed = 1, color }) {
  const group = useRef()
  const body = useRef()
  const leftLeg = useRef()
  const rightLeg = useRef()
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime() * speed * 5
    // Walking animation
    leftLeg.current.rotation.x = Math.sin(t) * 0.5
    rightLeg.current.rotation.x = Math.sin(t + Math.PI) * 0.5
    body.current.position.y = 0.7 + Math.abs(Math.sin(t * 2)) * 0.05
    
    // Move forward slightly (simulated by world moving back, but local movement adds life)
    // For this scene, humans just walk in place or slowly along sidewalk
  })

  return (
    <group ref={group} position={position}>
      <group ref={body} position={[0, 0.7, 0]}>
        {/* Head */}
        <mesh position={[0, 0.6, 0]} castShadow>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#ffdbac" />
        </mesh>
        {/* Torso */}
        <mesh position={[0, 0.15, 0]} castShadow>
          <boxGeometry args={[0.3, 0.6, 0.2]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
      {/* Legs */}
      <group position={[0, 0.4, 0]}>
        <mesh ref={leftLeg} position={[-0.1, -0.3, 0]} castShadow>
          <boxGeometry args={[0.1, 0.6, 0.1]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh ref={rightLeg} position={[0.1, -0.3, 0]} castShadow>
          <boxGeometry args={[0.1, 0.6, 0.1]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>
    </group>
  )
}

function StreetLamp({ position }) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.15, 5]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      {/* Arm */}
      <mesh position={[0.5, 4.8, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.08, 0.08, 1.5]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      {/* Light Bulb */}
      <mesh position={[1, 4.2, 0]}>
        <coneGeometry args={[0.3, 0.5, 16, 1, true]} />
        <meshStandardMaterial color="#ffffcc" emissive="#ffffcc" emissiveIntensity={2} />
      </mesh>
      <pointLight position={[1, 4, 0]} intensity={1} distance={10} color="#ffffcc" />
    </group>
  )
}

function Building({ position, size, color, type }) {
  // Type 0: Modern Glass, Type 1: Brick/Concrete
  const windowColor = type === 0 ? "#87CEEB" : "#ffffcc"
  const wallColor = type === 0 ? "#bdc3c7" : color

  return (
    <group position={position}>
      <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={wallColor} metalness={type === 0 ? 0.8 : 0.1} roughness={type === 0 ? 0.1 : 0.8} />
      </mesh>
      {/* Windows / Details */}
      {type === 0 ? (
        // Glass Building Lines
        Array.from({ length: Math.floor(size[1] / 2) }).map((_, i) => (
           <mesh key={i} position={[0, i * 2 + 1, size[2]/2 + 0.01]}>
              <planeGeometry args={[size[0] * 0.9, 0.1]} />
              <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.2} />
           </mesh>
        ))
      ) : (
        // Traditional Windows
        Array.from({ length: Math.floor(size[1]) }).map((_, y) => 
          Array.from({ length: Math.floor(size[0] / 1.5) }).map((_, x) => (
             <mesh key={`${x}-${y}`} position={[(x - Math.floor(size[0]/1.5)/2) * 1.2 + 0.6, y + 1, size[2]/2 + 0.01]}>
                <planeGeometry args={[0.6, 0.8]} />
                <meshStandardMaterial color={windowColor} emissive={windowColor} emissiveIntensity={0.5} />
             </mesh>
          ))
        )
      )}
    </group>
  )
}

function CityBlock({ zOffset }) {
  const elements = useMemo(() => {
    const items = []
    // Left side buildings
    items.push({ 
        type: 'building', 
        props: { position: [-18, 0, 0], size: [8, 10 + Math.random() * 20, 8], color: '#e74c3c', style: Math.random() > 0.5 ? 0 : 1 } 
    })
    // Right side buildings
    items.push({ 
        type: 'building', 
        props: { position: [18, 0, 0], size: [8, 10 + Math.random() * 20, 8], color: '#f1c40f', style: Math.random() > 0.5 ? 0 : 1 } 
    })
    
    // Trees & Lamps & Humans
    for(let i=0; i<2; i++) {
        // Left Sidewalk
        items.push({ type: 'tree', props: { position: [-12, 0, -5 + i * 10] } })
        items.push({ type: 'lamp', props: { position: [-11, 0, 0] } })
        items.push({ type: 'human', props: { position: [-13, 0, -2 + i * 5], color: Math.random() > 0.5 ? 'blue' : 'red', speed: 0.5 + Math.random() } })

        // Right Sidewalk
        items.push({ type: 'tree', props: { position: [12, 0, -5 + i * 10] } })
        items.push({ type: 'lamp', props: { position: [11, 0, 0] } }) // Rotated lamp logic needed if precise, but simple for now
        items.push({ type: 'human', props: { position: [13, 0, 2 + i * 5], color: Math.random() > 0.5 ? 'green' : 'orange', speed: 0.5 + Math.random() } })
    }

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
}

function InfiniteCity() {
  const group = useRef()
  const [blocks, setBlocks] = useState([0, 1, 2, 3, 4])
  const level = useGameStore((state) => state.level)
  const speedModifier = useGameStore((state) => state.speedModifier)
  
  useFrame((state, delta) => {
    // Slower base speed, increases gently with level
    const speed = (10 + (level - 1) * 2) * speedModifier
    group.current.position.z += delta * speed 
    
    // Reset position to loop seamlessly
    if (group.current.position.z > 20) {
        group.current.position.z = 0
    }
  })

  return (
    <group ref={group}>
      {[-2, -1, 0, 1, 2, 3, 4, 5].map((i) => (
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
  
  // Smooth movement
  useFrame((state, delta) => {
    const targetX = lane * 3.5 // Wider lanes
    
    // Clamp delta to prevent overshooting/flipping on lag spikes
    const moveStep = Math.min(delta * 5, 0.1) 
    const tiltStep = Math.min(delta * 10, 0.1)

    mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, targetX, moveStep)
    
    // Car tilt when moving
    // Calculate tilt based on distance to target
    const dist = mesh.current.position.x - targetX
    const targetTilt = dist * 0.1
    
    mesh.current.rotation.z = THREE.MathUtils.lerp(mesh.current.rotation.z, targetTilt, tiltStep)
  })

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') setLane(Math.max(-1, lane - 1))
      if (e.key === 'ArrowRight' || e.key === 'd') setLane(Math.min(1, lane + 1))
      
      // Speed Controls
      if (e.key === 'ArrowUp' || e.key === 'w') setSpeed(1) // Resume / Go
      if (e.key === 'ArrowDown') setSpeed(0) // Stop (Train)
      if (e.key === 's' || e.key === ' ') setSpeed(0.5) // Slow Down (Ice Cream)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lane, setLane, setSpeed])

  return (
    <group ref={mesh} position={[0, 0, 0]}>
      {/* Chassis */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.5, 4]} />
        <meshStandardMaterial color="#e74c3c" metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Cabin */}
      <mesh position={[0, 1.2, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.7, 2.2]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Wheels */}
      <Wheel position={[-0.9, 0.35, 1.2]} />
      <Wheel position={[0.9, 0.35, 1.2]} />
      <Wheel position={[-0.9, 0.35, -1.2]} />
      <Wheel position={[0.9, 0.35, -1.2]} />

      {/* Headlights */}
      <mesh position={[-0.6, 0.6, 2.01]}>
        <circleGeometry args={[0.2, 32]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      <mesh position={[0.6, 0.6, 2.01]}>
        <circleGeometry args={[0.2, 32]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      <spotLight position={[0.6, 0.6, 2.1]} angle={0.5} penumbra={0.5} intensity={2} distance={20} castShadow target-position={[0.6, 0, 10]} />
      <spotLight position={[-0.6, 0.6, 2.1]} angle={0.5} penumbra={0.5} intensity={2} distance={20} castShadow target-position={[-0.6, 0, 10]} />

      {/* Taillights */}
      <mesh position={[-0.6, 0.6, -2.01]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.2, 32]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh position={[0.6, 0.6, -2.01]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.2, 32]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
    </group>
  )
}

function Wheel({ position }) {
  const wheelRef = useRef()
  const level = useGameStore((state) => state.level)
  const speedModifier = useGameStore((state) => state.speedModifier)

  useFrame((state, delta) => {
    const speed = (10 + (level - 1) * 2) * speedModifier
    wheelRef.current.rotation.x -= delta * speed * 0.5 // Spin wheels based on speed
  })
  return (
    <group position={position} ref={wheelRef}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.4, 32]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.41, 16]} />
        <meshStandardMaterial color="#555" />
      </mesh>
    </group>
  )
}

function Road() {
  const roadRef = useRef()
  const level = useGameStore((state) => state.level)
  const speedModifier = useGameStore((state) => state.speedModifier)
  
  useFrame((state, delta) => {
    // Speed increases with level
    // Base speed 10 + (level * 2) - Matches City Speed
    const speed = (10 + (level - 1) * 2) * speedModifier
    roadRef.current.position.z += delta * speed
    if (roadRef.current.position.z > 20) {
      roadRef.current.position.z = 0
    }
  })

  return (
    <group ref={roadRef}>
      {/* Main Road Asphalt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -100]} receiveShadow>
        <planeGeometry args={[20, 300]} />
        <meshStandardMaterial color="#2c3e50" roughness={0.8} />
      </mesh>
      
      {/* Lane Markers */}
      {[-3.5, 3.5].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, -100]}>
          <planeGeometry args={[0.2, 300]} />
          <meshStandardMaterial color="white" />
        </mesh>
      ))}
      
      {/* Center Dashed Line */}
      {Array.from({ length: 30 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -i * 10]}>
          <planeGeometry args={[0.2, 5]} />
          <meshStandardMaterial color="yellow" />
        </mesh>
      ))}

      {/* Sidewalks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-14, 0.1, -100]} receiveShadow>
        <planeGeometry args={[8, 300]} />
        <meshStandardMaterial color="#95a5a6" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[14, 0.1, -100]} receiveShadow>
        <planeGeometry args={[8, 300]} />
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
      {/* Infinite Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </>
  )
}
