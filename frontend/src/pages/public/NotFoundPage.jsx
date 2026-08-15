import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home, Download, Play, RotateCcw, Volume2, VolumeX, Award, Sparkles, Shield } from 'lucide-react';
import SEOManager from '../../seo/SEOManager';

// Web Audio API Sound Synthesizer (No external asset dependencies!)
const playSynthesizerSound = (type, isMuted) => {
  if (isMuted) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === 'jump') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'score') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.07); // A5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'crash') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.3);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.32);
    }
  } catch (e) {
    // Fail-safe for modern browser autoplay policies
  }
};

// Robust Canvas rounded rectangle helper (fully compatible with older browsers and SSR/JSDOM environments)
const drawRoundRect = (ctx, x, y, width, height, radius) => {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }
};

export default function NotFoundPage() {
  const canvasRef = useRef(null);
  
  // React State (primarily for HTML layout overlay displays)
  const [gameState, setGameState] = useState('IDLE'); // IDLE, RUNNING, CRASHED
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem('chameleon_run_highscore') || '0', 10);
    } catch (e) {
      return 0;
    }
  });
  const [muted, setMuted] = useState(true); // Muted by default to respect browser policies
  const [chameleonColorIndex, setChameleonColorIndex] = useState(0);
  const [showColorMilestone, setShowColorMilestone] = useState(false);

  // List of stunning neon colors for the color-shifting Chameleon
  const neonColors = [
    { name: 'Neon Lime', hex: '#22C55E' },
    { name: 'Vibrant Cyan', hex: '#06B6D4' },
    { name: 'Electric Indigo', hex: '#8B5CF6' },
    { name: 'Vapor Pink', hex: '#EC4899' },
    { name: 'Sunset Gold', hex: '#F59E0B' },
  ];

  // Game variable references to prevent React re-renders in 60FPS loop
  const gameRef = useRef({
    state: 'IDLE',
    score: 0,
    highScore: 0,
    muted: true,
    chameleonColorIndex: 0,
    showColorMilestone: false,
    scrollOffset: 0,
    chameleon: {
      x: 70,
      y: 180 - 25, // floorY is 180, height is 25
      width: 44,
      height: 25,
      vy: 0,
      isJumping: false,
      isDucking: false,
    },
    obstacles: [],
    particles: [],
    backgroundStars: [],
    speed: 5.5,
    lastObstacleSpawnTime: 0,
    time: 0,
    runFrame: 0,
  });

  // Keep tracking references to only update React states on changes (eliminates loops)
  const lastReactState = useRef('IDLE');
  const lastReactScore = useRef(0);
  const lastReactColorIndex = useRef(0);
  const lastReactMilestone = useRef(false);

  // Load High Score on Mount safely
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chameleon_run_highscore');
      if (saved) {
        const val = parseInt(saved, 10);
        setHighScore(val);
        gameRef.current.highScore = val;
      }
    } catch (e) {
      // Safe fallback
    }
  }, []);

  // Handle Mute Toggle
  const toggleMute = (e) => {
    e.stopPropagation();
    const nextMuted = !muted;
    setMuted(nextMuted);
    gameRef.current.muted = nextMuted;
  };

  // Keyboard controls handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      const g = gameRef.current;
      
      // Prevent browser default scrolling actions for game keys
      if (['Space', ' ', 'ArrowUp', 'ArrowDown', 'KeyS', 's', 'S'].includes(e.key) || e.keyCode === 32) {
        if (g.state === 'RUNNING') {
          e.preventDefault();
        }
      }

      if (e.key === ' ' || e.key === 'Spacebar' || e.keyCode === 32 || e.key === 'ArrowUp') {
        if (g.state === 'IDLE' || g.state === 'CRASHED') {
          startGame();
        } else if (g.state === 'RUNNING' && !g.chameleon.isJumping && !g.chameleon.isDucking) {
          g.chameleon.vy = -11;
          g.chameleon.isJumping = true;
          playSynthesizerSound('jump', g.muted);

          // Add dust burst
          for (let i = 0; i < 6; i++) {
            g.particles.push({
              x: g.chameleon.x + 15,
              y: 180,
              vx: (Math.random() - 0.5) * 4 - 2,
              vy: -Math.random() * 2 - 1,
              color: neonColors[g.chameleonColorIndex].hex,
              size: Math.random() * 2 + 2,
              life: 1.0,
              decay: 0.04 + Math.random() * 0.03
            });
          }
        }
      }

      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        if (g.state === 'RUNNING' && !g.chameleon.isJumping) {
          g.chameleon.isDucking = true;
        }
      }
    };

    const handleKeyUp = (e) => {
      const g = gameRef.current;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        g.chameleon.isDucking = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const startGame = () => {
    const g = gameRef.current;
    g.state = 'RUNNING';
    g.score = 0;
    g.obstacles = [];
    g.particles = [];
    g.speed = 5.5;
    g.chameleonColorIndex = 0;
    g.chameleon.y = 180 - g.chameleon.height;
    g.chameleon.vy = 0;
    g.chameleon.isJumping = false;
    g.chameleon.isDucking = false;

    setGameState('RUNNING');
    setScore(0);
    setChameleonColorIndex(0);
    setShowColorMilestone(false);
  };

  // Main Canvas Loop (Runs once on mount - no dependencies to prevent teardowns/restarts)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // Extremely critical check for SSR/Prerender/Test engines

    let animationFrameId;
    const g = gameRef.current;
    const floorY = 180;

    // Initialize parallax space stars background
    if (g.backgroundStars.length === 0) {
      for (let i = 0; i < 25; i++) {
        g.backgroundStars.push({
          x: Math.random() * 800,
          y: Math.random() * 120,
          size: Math.random() * 1.5 + 0.5,
          brightness: Math.random(),
          speed: Math.random() * 0.2 + 0.05
        });
      }
    }

    const loop = () => {
      try {
        g.time += 16.67; // approx ms per frame
        g.scrollOffset += g.state === 'RUNNING' ? g.speed : 0.8;

        const width = 800; // Fixed logical canvas dimensions
        const height = 220;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        // Clear canvas with deep cosmic background
        ctx.fillStyle = '#090D17';
        ctx.fillRect(0, 0, width, height);

        // 1. Draw Starry Sky
        g.backgroundStars.forEach(star => {
          star.x -= star.speed * (g.state === 'RUNNING' ? g.speed * 0.08 : 0.2);
          if (star.x < 0) star.x = width;
          
          const alpha = Math.abs(Math.sin(g.time * 0.003 + star.brightness * 10)) * 0.8 + 0.2;
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fillRect(star.x, star.y, star.size, star.size);
        });

        // 2. Draw Scrolling Neon Floor
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#06B6D4';
        ctx.beginPath();
        ctx.moveTo(0, floorY);
        ctx.lineTo(width, floorY);
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset glow

        // Perspective vertical scrolling grid lines
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
        ctx.lineWidth = 1;
        const gridSpacing = 50;
        const offset = g.scrollOffset % gridSpacing;
        for (let i = -1; i < (width / gridSpacing) + 2; i++) {
          const x = i * gridSpacing - offset;
          ctx.beginPath();
          ctx.moveTo(x, floorY);
          ctx.lineTo(x - 35, height); // Perspective angle
          ctx.stroke();
        }

        // Horizontal ground project grid lines
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
        for (let y = floorY + 10; y < height; y += 12) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // 3. Handle Running Chameleon Physics
        if (g.state === 'RUNNING') {
          g.runFrame++;
          
          // Apply Gravity
          g.chameleon.vy += 0.55; // Gravity force
          g.chameleon.y += g.chameleon.vy;

          // Ground collision
          const currentHeight = g.chameleon.isDucking ? g.chameleon.height * 0.65 : g.chameleon.height;
          const targetGroundY = floorY - currentHeight;

          if (g.chameleon.y >= targetGroundY) {
            g.chameleon.y = targetGroundY;
            g.chameleon.vy = 0;
            if (g.chameleon.isJumping) {
              g.chameleon.isJumping = false;
              // Landing dust
              for (let i = 0; i < 4; i++) {
                g.particles.push({
                  x: g.chameleon.x + 10,
                  y: floorY,
                  vx: (Math.random() - 0.5) * 3,
                  vy: -Math.random() * 1.5,
                  color: neonColors[g.chameleonColorIndex].hex,
                  size: Math.random() * 1.5 + 1.5,
                  life: 0.8,
                  decay: 0.05
                });
              }
            }
          }

          // Increment Score
          g.score += 0.15; // Slow smooth incremental score
          const roundedScore = Math.floor(g.score);
          
          if (roundedScore !== lastReactScore.current) {
            // Sync Color Shift Milestone Check every 100 points
            if (roundedScore > 0 && roundedScore % 100 === 0) {
              const nextIndex = (g.chameleonColorIndex + 1) % neonColors.length;
              g.chameleonColorIndex = nextIndex;
              g.showColorMilestone = true;
              playSynthesizerSound('score', g.muted);
              
              // Speed boost
              g.speed += 0.5;
              
              // Highlight shift particles
              for (let i = 0; i < 15; i++) {
                g.particles.push({
                  x: g.chameleon.x + 20,
                  y: g.chameleon.y + 10,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6 - 2,
                  color: neonColors[nextIndex].hex,
                  size: Math.random() * 3 + 2,
                  life: 1.0,
                  decay: 0.03
                });
              }

              // Hide the milestone banner after 2.2 seconds
              setTimeout(() => {
                g.showColorMilestone = false;
              }, 2200);
            }
          }

          // Running dust particles
          if (!g.chameleon.isJumping && g.runFrame % 6 === 0) {
            g.particles.push({
              x: g.chameleon.x,
              y: floorY - 3,
              vx: -g.speed * 0.3 - Math.random() * 1.5,
              vy: -Math.random() * 1,
              color: 'rgba(255, 255, 255, 0.15)',
              size: Math.random() * 1.5 + 1.5,
              life: 0.7,
              decay: 0.04
            });
          }
        }

        // 4. Obstacle Management (Spawning & Updating)
        if (g.state === 'RUNNING') {
          const timeSinceLastSpawn = Date.now() - g.lastObstacleSpawnTime;
          const minSpawnInterval = Math.max(1200, 2000 - g.speed * 120);
          
          if (timeSinceLastSpawn > minSpawnInterval && Math.random() < 0.35) {
            const rand = Math.random();
            let type = 'SERVER';
            if (rand > 0.65) type = 'ROUTER';
            else if (rand > 0.4) type = 'GLITCH_CLOUD';

            g.obstacles.push({
              type,
              x: width + 50,
              width: type === 'SERVER' ? 24 : type === 'ROUTER' ? 32 : 30,
              height: type === 'SERVER' ? 42 : type === 'ROUTER' ? 24 : 20,
              y: type === 'SERVER' ? floorY - 42 : type === 'ROUTER' ? floorY - 24 : floorY - 65,
            });
            g.lastObstacleSpawnTime = Date.now();
          }
        }

        // Update & Draw Obstacles
        for (let i = g.obstacles.length - 1; i >= 0; i--) {
          const obs = g.obstacles[i];
          if (g.state === 'RUNNING') {
            obs.x -= g.speed;
          }

          // Draw obstacle based on type
          ctx.save();
          ctx.translate(obs.x, obs.y);

          if (obs.type === 'SERVER') {
            // Purple glowing server tower
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#8B5CF6';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#8B5CF6';
            drawRoundRect(ctx, 0, 0, obs.width, obs.height, 4);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Horizontal server dividers
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(2, 4, obs.width - 4, 8);
            ctx.fillRect(2, 16, obs.width - 4, 8);
            ctx.fillRect(2, 28, obs.width - 4, 8);

            // Glowing LED
            ctx.fillStyle = Math.floor(g.time / 250) % 2 === 0 ? '#10B981' : '#059669';
            ctx.beginPath();
            ctx.arc(obs.width - 6, 8, 2, 0, Math.PI * 2);
            ctx.arc(obs.width - 6, 20, 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = Math.floor(g.time / 250) % 2 === 1 ? '#EF4444' : '#B91C1C';
            ctx.beginPath();
            ctx.arc(obs.width - 6, 32, 2, 0, Math.PI * 2);
            ctx.fill();

          } else if (obs.type === 'ROUTER') {
            // Blue glowing router
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#3B82F6';
            drawRoundRect(ctx, 0, 8, obs.width, obs.height - 8, 3);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Double router antennas
            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(5, 8); ctx.lineTo(2, 0);
            ctx.moveTo(obs.width - 5, 8); ctx.lineTo(obs.width - 2, 0);
            ctx.stroke();

            // Wireless waves
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
            ctx.lineWidth = 1;
            const r = (Math.floor(g.time / 180) % 3) * 3 + 2;
            ctx.beginPath();
            ctx.arc(2, 0, r, -Math.PI / 3, Math.PI / 3, true);
            ctx.stroke();

            // Blinking cyan status light
            ctx.fillStyle = '#06B6D4';
            ctx.beginPath();
            ctx.arc(8, 14, 1.5, 0, Math.PI * 2);
            ctx.fill();

          } else if (obs.type === 'GLITCH_CLOUD') {
            // Floating yellow warning grid cloud
            ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#F59E0B';
            
            ctx.beginPath();
            ctx.arc(5, 10, 8, 0, Math.PI * 2);
            ctx.arc(15, 6, 10, 0, Math.PI * 2);
            ctx.arc(25, 10, 8, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Inner glitch horizontal strip
            if (Math.floor(g.time / 120) % 3 === 0) {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.fillRect(2, 8, obs.width - 4, 2);
            }
          }

          ctx.restore();

          // Precise Collision Hitbox Checking (Slightly narrower than display width for better playability)
          const chamW = g.chameleon.width - 8;
          const chamH = g.chameleon.isDucking ? g.chameleon.height * 0.65 : g.chameleon.height - 4;
          const chamX = g.chameleon.x + 4;
          const chamY = g.chameleon.y + (g.chameleon.isDucking ? g.chameleon.height * 0.35 : 2);

          if (
            chamX < obs.x + obs.width &&
            chamX + chamW > obs.x &&
            chamY < obs.y + obs.height &&
            chamY + chamH > obs.y
          ) {
            // CRASH!
            g.state = 'CRASHED';
            playSynthesizerSound('crash', g.muted);

            // Explosion Particles
            for (let j = 0; j < 25; j++) {
              g.particles.push({
                x: g.chameleon.x + 20,
                y: g.chameleon.y + 10,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - 3,
                color: j % 2 === 0 ? neonColors[g.chameleonColorIndex].hex : '#EF4444',
                size: Math.random() * 3 + 2,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02
              });
            }

            // Save High Score safely
            const finalScore = Math.floor(g.score);
            if (finalScore > g.highScore) {
              g.highScore = finalScore;
              setHighScore(finalScore);
              try {
                localStorage.setItem('chameleon_run_highscore', finalScore.toString());
              } catch (e) {
                // Ignore safe storage errors
              }
            }
          }

          // Remove offscreen obstacles
          if (obs.x < -100) {
            g.obstacles.splice(i, 1);
          }
        }

        // 5. Update & Draw Particles
        for (let i = g.particles.length - 1; i >= 0; i--) {
          const p = g.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= p.decay;
          
          if (p.life <= 0) {
            g.particles.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 6. Draw Vector Chameleon
        drawChameleon(
          ctx,
          g.chameleon.x,
          g.chameleon.y,
          g.chameleon.width,
          g.chameleon.height,
          g.state,
          g.runFrame,
          g.chameleon.isDucking,
          neonColors[g.chameleonColorIndex].hex
        );

        // --- Low-overhead, zero-loop state synchronization to React HTML UI overlays ---
        if (g.state !== lastReactState.current) {
          lastReactState.current = g.state;
          setGameState(g.state);
        }
        const currentFloorScore = Math.floor(g.score);
        if (currentFloorScore !== lastReactScore.current) {
          lastReactScore.current = currentFloorScore;
          setScore(currentFloorScore);
        }
        if (g.chameleonColorIndex !== lastReactColorIndex.current) {
          lastReactColorIndex.current = g.chameleonColorIndex;
          setChameleonColorIndex(g.chameleonColorIndex);
        }
        if (g.showColorMilestone !== lastReactMilestone.current) {
          lastReactMilestone.current = g.showColorMilestone;
          setShowColorMilestone(g.showColorMilestone);
        }

        animationFrameId = requestAnimationFrame(loop);
      } catch (err) {
        console.error('Chameleon Run game loop exception:', err);
        // Fail-safe restart to prevent black screening on transient WebGL/2D Context losses
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Vector Drawing for the beautiful running Chameleon
  const drawChameleon = (ctx, x, y, width, height, state, runFrame, isDucking, color) => {
    ctx.save();
    ctx.translate(x, y);

    const bodyColor = color;

    // Apply squish factor if ducking
    if (isDucking) {
      ctx.scale(1.2, 0.65);
      ctx.translate(-5, 10);
    }

    // Glow effects
    ctx.shadowBlur = 15;
    ctx.shadowColor = bodyColor;

    // 1. Coiled tail spiral
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-11, 4, 8, 0, Math.PI * 1.8, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-11, 4, 4, 0, Math.PI * 1.5, false);
    ctx.stroke();

    // 2. Main body torso
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(12, 5, 20, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crest spikes
    ctx.beginPath();
    ctx.moveTo(1, -4);
    ctx.lineTo(4, -11);
    ctx.lineTo(7, -4);
    ctx.lineTo(10, -11);
    ctx.lineTo(13, -4);
    ctx.lineTo(16, -11);
    ctx.lineTo(19, -4);
    ctx.closePath();
    ctx.fill();

    // 3. Curved head structure
    ctx.beginPath();
    ctx.arc(28, -1, 10, -Math.PI / 2, Math.PI / 2, false);
    ctx.lineTo(18, 9);
    ctx.closePath();
    ctx.fill();

    // Nose beak tip
    ctx.beginPath();
    ctx.moveTo(34, -3);
    ctx.lineTo(37, 2);
    ctx.lineTo(32, 4);
    ctx.closePath();
    ctx.fill();

    // Small black mouth line
    ctx.strokeStyle = '#05060b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(29, 3);
    ctx.lineTo(34, 3);
    ctx.stroke();

    // 4. Glowing Chameleon Eye (rolls around dynamically)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(26, -4, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#090D17';
    ctx.beginPath();
    if (state === 'CRASHED') {
      // Exploded X eye
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1.5;
      ctx.moveTo(24, -6.5); ctx.lineTo(28, -1.5);
      ctx.moveTo(28, -6.5); ctx.lineTo(24, -1.5);
      ctx.stroke();
    } else {
      let eyeAngle = 0;
      if (state === 'RUNNING') {
        eyeAngle = (runFrame * 0.12) % (Math.PI * 2);
      } else {
        eyeAngle = -0.5; // looking forward
      }
      
      const pupilX = 26 + Math.cos(eyeAngle) * 2;
      const pupilY = -4 + Math.sin(eyeAngle) * 2;
      ctx.arc(pupilX, pupilY, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Animating running legs
    ctx.shadowBlur = 0; // Turn off shadows on thin lines
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    const legSwing = Math.sin(runFrame * 0.4) * 0.65;
    
    // Jump positions versus walk positions
    const fLegAngle1 = state === 'RUNNING' ? legSwing : 0.6;
    const fLegAngle2 = state === 'RUNNING' ? -legSwing : -0.2;
    const bLegAngle1 = state === 'RUNNING' ? -legSwing : -0.4;
    const bLegAngle2 = state === 'RUNNING' ? legSwing : 0.4;

    // Front Leg 1
    ctx.beginPath();
    ctx.moveTo(21, 9);
    ctx.lineTo(21 + Math.sin(fLegAngle1) * 9, 9 + Math.cos(fLegAngle1) * 9);
    ctx.stroke();

    // Front Leg 2
    ctx.beginPath();
    ctx.moveTo(25, 9);
    ctx.lineTo(25 + Math.sin(fLegAngle2) * 9, 9 + Math.cos(fLegAngle2) * 9);
    ctx.stroke();

    // Back Leg 1
    ctx.beginPath();
    ctx.moveTo(5, 10);
    ctx.lineTo(5 + Math.sin(bLegAngle1) * 9, 10 + Math.cos(bLegAngle1) * 9);
    ctx.stroke();

    // Back Leg 2
    ctx.beginPath();
    ctx.moveTo(9, 10);
    ctx.lineTo(9 + Math.sin(bLegAngle2) * 9, 10 + Math.cos(bLegAngle2) * 9);
    ctx.stroke();

    ctx.restore();
  };

  // Tap Canvas to Jump (Mobile support)
  const handleCanvasClick = () => {
    const g = gameRef.current;
    if (g.state === 'IDLE' || g.state === 'CRASHED') {
      startGame();
    } else if (g.state === 'RUNNING') {
      if (!g.chameleon.isJumping && !g.chameleon.isDucking) {
        g.chameleon.vy = -11;
        g.chameleon.isJumping = true;
        playSynthesizerSound('jump', g.muted);
        
        for (let i = 0; i < 6; i++) {
          g.particles.push({
            x: g.chameleon.x + 15,
            y: 180,
            vx: (Math.random() - 0.5) * 4 - 2,
            vy: -Math.random() * 2 - 1,
            color: neonColors[g.chameleonColorIndex].hex,
            size: Math.random() * 2 + 2,
            life: 1.0,
            decay: 0.04 + Math.random() * 0.03
          });
        }
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-12">
      <SEOManager
        title="404 — Page Not Found"
        description="The requested page could not be found, but you can play Chameleon Run while you're here!"
        noIndex={true}
      />

      {/* Floating Alert Circle Indicator */}
      <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto animate-bounce shadow-lg shadow-cyan-500/5">
        <AlertCircle className="w-8 h-8" />
      </div>

      {/* Header Titles */}
      <div className="space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400 uppercase tracking-widest">
          <Shield className="w-3.5 h-3.5" />
          <span>Error 404 — Disconnected</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-100 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-sm md:text-base text-slate-400 max-w-lg mx-auto">
          The connection was dropped, but we have established an interactive bypass. Play **Chameleon Run** below while we sync!
        </p>
      </div>

      {/* ARCADE GAME MODULE (Liquid Glass Box Wrapper) */}
      <div className="liquid-glass-card max-w-2xl mx-auto rounded-3xl overflow-hidden relative border border-slate-800 bg-slate-950/40 p-4 md:p-6 shadow-2xl">
        
        {/* Game Stats Toolbar */}
        <div className="flex items-center justify-between px-2 pb-4 border-b border-slate-800 text-slate-300 font-mono text-sm">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              <Award className="w-4 h-4 text-cyan-400" />
              <span>Score: <strong className="text-cyan-300">{score}</strong></span>
            </span>
            <span className="flex items-center space-x-1.5 opacity-80">
              <Award className="w-4 h-4 text-purple-400" />
              <span>Best: <strong className="text-purple-300">{highScore}</strong></span>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Dynamic color-shift notification badge */}
            {showColorMilestone && (
              <span className="flex items-center space-x-1 text-xs text-amber-400 font-bold animate-pulse bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <Sparkles className="w-3 h-3" />
                <span>Shift: {neonColors[chameleonColorIndex].name}!</span>
              </span>
            )}
            
            {/* Mute button */}
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
              title={muted ? 'Unmute game sound' : 'Mute game sound'}
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Interactive Game Canvas Box */}
        <div 
          onClick={handleCanvasClick}
          className="relative mt-4 w-full h-[220px] bg-[#090D17] rounded-2xl overflow-hidden border border-slate-900 cursor-pointer group"
        >
          <canvas 
            ref={canvasRef} 
            className="w-full h-full block"
          />

          {/* OVERLAYS */}
          {gameState === 'IDLE' && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-filter backdrop-blur-[3px] flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-pulse">
                <Play className="w-5 h-5 ml-1" />
              </div>
              <div className="space-y-1 text-center">
                <h3 className="font-semibold text-slate-200">Chameleon Run</h3>
                <p className="text-xs text-slate-400 px-4">
                  Press <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-700 text-[10px]">SPACE</kbd> or <strong className="text-cyan-400">TAP/CLICK</strong> to Jump, <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-700 text-[10px]">DOWN ARROW</kbd> to Duck.
                </p>
              </div>
            </div>
          )}

          {gameState === 'CRASHED' && (
            <div className="absolute inset-0 bg-rose-950/80 backdrop-filter backdrop-blur-[3px] flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-center">
                <h3 className="font-semibold text-rose-300">Connection Terminated (Game Over)</h3>
                <p className="text-xs text-slate-400 px-4">
                  Final Score: <strong className="text-rose-400">{score}</strong>. Tap or Press Space to reboot pairing!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile quick-tap action control guide */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Tap/Click Canvas to Leap</span>
          <span className="hidden md:inline">Use Arrow Down / S key to crawl under Glitch Wifi signals</span>
        </div>
      </div>

      {/* Primary Navigation Options */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          to="/"
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
        <Link
          to="/download"
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center space-x-2 cursor-pointer transition-colors"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Download Apps</span>
        </Link>
      </div>
    </div>
  );
}
