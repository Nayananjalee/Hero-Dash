import React from 'react'
import { useGameStore } from '../store'
import { motion, AnimatePresence } from 'framer-motion'

export default function EmergencyOverlay() {
  const { emergencyActive } = useGameStore()

  return (
    <AnimatePresence>
      {emergencyActive && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
          
          {/* Generic Warning Border (Does not give away the answer) */}
          <motion.div
            animate={{
              boxShadow: [
                `inset 0 0 50px 20px rgba(255, 165, 0, 0.5)`,
                `inset 0 0 50px 20px rgba(255, 0, 0, 0.5)`,
                `inset 0 0 50px 20px rgba(255, 165, 0, 0.5)`
              ]
            }}
            transition={{ duration: 0.5, repeat: Infinity }}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />

          {/* INSTRUCTION: Listen to the sound! */}
          <div style={{
            position: 'absolute',
            top: '15%',
            width: '100%',
            textAlign: 'center',
            color: 'white',
            fontSize: '2rem',
            textShadow: '0 0 10px black',
            zIndex: 25
          }}>
            🔊 Listen! Which vehicle is it? (ශබ්දයට සවන් දෙන්න!)
          </div>

          {/* LEFT OPTION (Always visible during emergency) */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            style={{
              position: 'absolute',
              left: 0,
              top: '30%',
              bottom: '30%',
              width: '250px',
              background: 'rgba(0, 0, 0, 0.8)',
              borderRight: '5px solid #e74c3c',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'white',
              borderTopRightRadius: '20px',
              borderBottomRightRadius: '20px',
              zIndex: 20
            }}
          >
            <span style={{ fontSize: '5rem' }}>🚒</span>
            <h3 style={{ fontSize: '1.5rem', margin: '10px 0' }}>Firetruck</h3>
            <h4 style={{ fontSize: '1.2rem', margin: '0 0 10px 0', color: '#e74c3c' }}>වමට (Left)</h4>
            <p style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '2rem' }}>⬅️</p>
          </motion.div>

          {/* RIGHT OPTION (Always visible during emergency) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            style={{
              position: 'absolute',
              right: 0,
              top: '30%',
              bottom: '30%',
              width: '250px',
              background: 'rgba(0, 0, 0, 0.8)',
              borderLeft: '5px solid #ecf0f1',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'white',
              borderTopLeftRadius: '20px',
              borderBottomLeftRadius: '20px',
              zIndex: 20
            }}
          >
            <span style={{ fontSize: '5rem' }}>🚑</span>
            <h3 style={{ fontSize: '1.5rem', margin: '10px 0' }}>Ambulance</h3>
            <h4 style={{ fontSize: '1.2rem', margin: '0 0 10px 0', color: '#ecf0f1' }}>දකුණට (Right)</h4>
            <p style={{ color: '#ecf0f1', fontWeight: 'bold', fontSize: '2rem' }}>➡️</p>
          </motion.div>

          {/* CENTER OPTION (Always visible during emergency) */}
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 40px',
              background: 'rgba(0, 0, 0, 0.8)',
              borderBottom: '5px solid #3498db',
              color: 'white',
              borderBottomLeftRadius: '20px',
              borderBottomRightRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '3rem' }}>🚓</span>
                <div>
                    <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Police</h3>
                    <h4 style={{ fontSize: '1rem', margin: '5px 0', color: '#3498db' }}>මැද (Center)</h4>
                    <p style={{ color: '#3498db', fontWeight: 'bold', margin: 0 }}>🛑</p>
                </div>
            </div>
          </motion.div>

          {/* TRAIN OPTION (Bottom Center) */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 40px',
              background: 'rgba(0, 0, 0, 0.8)',
              borderTop: '5px solid #e67e22',
              color: 'white',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '3rem' }}>🚂</span>
                <div>
                    <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Train</h3>
                    <h4 style={{ fontSize: '1rem', margin: '5px 0', color: '#e67e22' }}>දුම්රිය (Stop)</h4>
                    <p style={{ color: '#e67e22', fontWeight: 'bold', margin: 0 }}>⬇️ Arrow Down</p>
                </div>
            </div>
          </motion.div>

          {/* ICE CREAM OPTION (Top Left Corner) */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            style={{
              position: 'absolute',
              top: '10%',
              left: '20px',
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.8)',
              border: '3px solid #f1c40f',
              borderRadius: '15px',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 20
            }}
          >
            <span style={{ fontSize: '3rem' }}>🍦</span>
            <h3 style={{ fontSize: '1rem', margin: '5px 0' }}>Ice Cream</h3>
            <h4 style={{ fontSize: '0.8rem', margin: 0, color: '#f1c40f' }}>හෙමින් (Slow)</h4>
            <p style={{ color: '#f1c40f', fontWeight: 'bold', margin: 0 }}>Press 'S'</p>
          </motion.div>

        </div>
      )}
    </AnimatePresence>
  )
}
