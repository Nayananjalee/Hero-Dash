import React, { useState } from 'react'
import { useGameStore } from '../store'

export default function UI() {
  const { score, level, feedback, gameStarted, setGameStarted } = useGameStore()
  const [isPaused, setIsPaused] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const handlePause = () => {
    setIsPaused(!isPaused)
  }

  const handleExit = () => {
    setShowExitConfirm(true)
  }

  const confirmExit = () => {
    setGameStarted(false)
    setShowExitConfirm(false)
    setIsPaused(false)
    window.location.reload()
  }

  if (!gameStarted) return null

  return (
    <>
      {/* Game Controls - Top Right */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 100,
        display: 'flex',
        gap: '10px'
      }}>
        <button
          onClick={handlePause}
          style={{
            padding: '12px 24px',
            background: isPaused ? '#2ecc71' : '#f39c12',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          {isPaused ? '▶️ Resume' : '⏸️ Pause'}
        </button>
        <button
          onClick={handleExit}
          style={{
            padding: '12px 24px',
            background: '#e74c3c',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          🚪 Exit
        </button>
      </div>

      {/* Score Display - Top Left */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        zIndex: 5,
        pointerEvents: 'none'
      }}>
        <h1 style={{ 
          margin: 0, 
          textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000', 
          fontSize: '3rem',
          color: '#fff'
        }}>
          Score: {score}
        </h1>
        <h2 style={{ 
          margin: '10px 0', 
          textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000', 
          color: '#f1c40f',
          fontSize: '2rem'
        }}>
          Level: {level}
        </h2>
      </div>

      {/* Controls Hint - Bottom Center */}
      <div style={{
        position: 'absolute',
        bottom: 30,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '1.3rem',
        background: 'rgba(0,0,0,0.7)',
        padding: '15px 30px',
        borderRadius: '15px',
        color: 'white',
        textShadow: '1px 1px 2px #000',
        border: '2px solid rgba(255,255,255,0.3)',
        zIndex: 5,
        pointerEvents: 'none'
      }}>
        ⬅️ Left Arrow | Right Arrow ➡️
      </div>

      {/* Feedback Messages */}
      {feedback && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '5rem',
          fontWeight: 'bold',
          textShadow: '0 0 30px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,1)',
          color: feedback.includes('Correct') ? '#2ecc71' : '#e74c3c',
          animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          zIndex: 200
        }}>
          {feedback}
        </div>
      )}

      {/* Pause Overlay */}
      {isPaused && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '50px',
            borderRadius: '25px',
            textAlign: 'center',
            color: 'white',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <h1 style={{ fontSize: '4rem', margin: '0 0 20px 0' }}>⏸️ PAUSED</h1>
            <p style={{ fontSize: '1.3rem', marginBottom: '40px', opacity: 0.9 }}>
              Game is paused. Click Resume to continue.
            </p>
            <button
              onClick={handlePause}
              style={{
                padding: '18px 50px',
                background: '#2ecc71',
                border: 'none',
                borderRadius: '15px',
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              ▶️ Resume Game
            </button>
          </div>
        </div>
      )}

      {/* Exit Confirmation */}
      {showExitConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
            padding: '50px',
            borderRadius: '25px',
            textAlign: 'center',
            color: 'white',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ fontSize: '2.5rem', margin: '0 0 20px 0' }}>🚪 Exit Game?</h2>
            <p style={{ fontSize: '1.2rem', marginBottom: '40px', lineHeight: '1.6' }}>
              Your progress is saved automatically.<br/>
              You'll return to the main menu.
            </p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button
                onClick={confirmExit}
                style={{
                  padding: '15px 40px',
                  background: 'rgba(255,255,255,0.2)',
                  border: '2px solid white',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.3)'
                  e.target.style.transform = 'scale(1.05)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.2)'
                  e.target.style.transform = 'scale(1)'
                }}
              >
                Yes, Exit
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{
                  padding: '15px 40px',
                  background: '#2ecc71',
                  border: '2px solid white',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#27ae60'
                  e.target.style.transform = 'scale(1.05)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#2ecc71'
                  e.target.style.transform = 'scale(1)'
                }}
              >
                Continue Playing
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes popIn {
          from { 
            transform: translate(-50%, -50%) scale(0);
            opacity: 0;
          }
          to { 
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
