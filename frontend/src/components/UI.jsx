import React, { useState } from 'react'
import { useGameStore } from '../store'
import { FEEDBACK, TOKENS } from '../config'

export default function UI() {
  const { score, level, feedback, gameStarted, isPaused, lives, isGameOver } = useGameStore()
  const stopGame = useGameStore((state) => state.stopGame)
  const setPaused = useGameStore((state) => state.setPaused)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const handlePause = () => {
    setPaused(!isPaused)
  }

  const handleExit = () => {
    // Pause the game when showing exit dialog
    setPaused(true)
    setShowExitConfirm(true)
  }

  const confirmExit = () => {
    stopGame()
    setShowExitConfirm(false)
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
        gap: '10px',
        pointerEvents: 'auto'
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
        <div style={{
          fontSize: '2rem',
          display: 'flex',
          gap: '4px',
          marginTop: '5px'
        }}>
          {[1, 2, 3].map((i) => (
            <span key={i} style={{ 
              opacity: i <= lives ? 1 : 0.25,
              filter: i <= lives ? 'none' : 'grayscale(1)',
              transition: 'opacity 0.3s, filter 0.3s'
            }}>
              ❤️
            </span>
          ))}
        </div>
      </div>

      {/* Controls Hint - Bottom Center (complete guide) */}
      <div style={{
        position: 'absolute',
        bottom: 30,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: TOKENS.fontLg,
        background: TOKENS.panelBg,
        padding: '15px 30px',
        borderRadius: TOKENS.radiusMd,
        color: 'white',
        textShadow: '1px 1px 2px #000',
        border: `2px solid ${TOKENS.panelBorder}`,
        zIndex: 5,
        pointerEvents: 'none',
        display: 'flex',
        gap: '18px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <span>⬅️ Left</span>
        <span>➡️ Right</span>
        <span>⬇️ Stop</span>
        <span>🇸 Safe Place</span>
        <span>⬆️ Go</span>
      </div>

      {/* Feedback Messages — colorblind-safe, bigger for young readers */}
      {feedback && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '5.5rem',
          fontWeight: 'bold',
          textShadow: '0 0 30px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,1)',
          color: feedback.includes('Correct') ? FEEDBACK.success.color : FEEDBACK.failure.color,
          animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          zIndex: 200,
          padding: '20px 40px',
          background: feedback.includes('Correct') ? FEEDBACK.success.bg : FEEDBACK.failure.bg,
          borderRadius: TOKENS.radiusLg,
        }}>
          {feedback.includes('Correct') ? FEEDBACK.success.label : FEEDBACK.failure.label}
        </div>
      )}

      {/* Game Over Overlay */}
      {isGameOver && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.92)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10001,
          pointerEvents: 'auto'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #c0392b 0%, #96281B 100%)',
            padding: '50px 60px',
            borderRadius: '25px',
            textAlign: 'center',
            color: 'white',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <h1 style={{ fontSize: '4rem', margin: '0 0 10px 0' }}>💔 Game Over</h1>
            <p style={{ fontSize: '1.4rem', margin: '0 0 10px 0', opacity: 0.9 }}>
              ක්‍රීඩාව අවසානයි
            </p>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '15px',
              padding: '20px',
              margin: '20px 0'
            }}>
              <p style={{ fontSize: '2rem', margin: '0 0 8px 0', fontWeight: 'bold' }}>🏆 Score: {score}</p>
              <p style={{ fontSize: '1.3rem', margin: 0, opacity: 0.85 }}>📊 Level: {level}</p>
            </div>
            <p style={{ fontSize: '1.1rem', marginBottom: '30px', opacity: 0.8 }}>
              You used all 3 lives. Try again!
            </p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  useGameStore.getState().stopGame()
                  setTimeout(() => useGameStore.getState().startGame(), 100)
                }}
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
                🔄 Play Again
              </button>
              <button
                onClick={() => useGameStore.getState().stopGame()}
                style={{
                  padding: '18px 50px',
                  background: '#7f8c8d',
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
                🚪 Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Overlay — only show when paused AND exit confirm is NOT open */}
      {isPaused && !showExitConfirm && (
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
          zIndex: 9999,
          pointerEvents: 'auto'
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
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
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
              <button
                onClick={handleExit}
                style={{
                  padding: '18px 50px',
                  background: '#e74c3c',
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
                🚪 Exit Game
              </button>
            </div>
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
          zIndex: 10000,
          pointerEvents: 'auto'
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
                onClick={() => {
                  setShowExitConfirm(false)
                  setPaused(false) // Resume game when continuing
                }}
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
