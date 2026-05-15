'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/contexts/GameContext';
import { RouletteResult } from '@/types/game';

interface RouletteWheelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Wheel segment config matching the original spec
const SEGMENTS = [
  { label: 'Nothing', color: '#4b5563', emoji: '😐' },
  { label: 'Nothing', color: '#6b7280', emoji: '😐' },
  { label: 'Nothing', color: '#4b5563', emoji: '😐' },
  { label: '-80% Money', color: '#dc2626', emoji: '💀' },
  { label: 'Special Trinket!', color: '#eab308', emoji: '🎁' },
  { label: '5 Stokens', color: '#3b82f6', emoji: '💎' },
  { label: 'Nothing', color: '#6b7280', emoji: '😐' },
  { label: '10 Prestige', color: '#a855f7', emoji: '⭐' },
];

export default function RouletteWheel({ isOpen, onClose }: RouletteWheelProps) {
  const { spinRouletteWheel } = useGame();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'slowing' | 'result'>('ready');
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<RouletteResult | null>(null);
  const [tickSound, setTickSound] = useState(false);
  const hasSpun = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-spin when opened (user already paid 50Q)
  useEffect(() => {
    if (isOpen && !hasSpun.current) {
      hasSpun.current = true;
      // Small delay for dramatic effect
      setTimeout(() => {
        handleSpin();
      }, 500);
    }
  }, [isOpen]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      hasSpun.current = false;
      setPhase('ready');
      setRotation(0);
      setResult(null);
    }
  }, [isOpen]);

  // Tick sound effect simulation (visual flash)
  useEffect(() => {
    if (phase === 'spinning' || phase === 'slowing') {
      const interval = setInterval(() => {
        setTickSound(prev => !prev);
      }, phase === 'spinning' ? 50 : 150);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const handleSpin = () => {
    if (phase !== 'ready') return;

    setPhase('spinning');

    // Get the result
    const spinResult = spinRouletteWheel();
    setResult(spinResult);

    // Calculate target segment
    let targetSegmentIndex = 0;
    switch (spinResult.segment) {
      case 'nothing':
        const nothingSegments = [0, 1, 2, 6];
        targetSegmentIndex = nothingSegments[Math.floor(Math.random() * nothingSegments.length)];
        break;
      case 'money_loss':
        targetSegmentIndex = 3;
        break;
      case 'special_trinket':
        targetSegmentIndex = 4;
        break;
      case 'stokens':
        targetSegmentIndex = 5;
        break;
      case 'prestige_tokens':
        targetSegmentIndex = 7;
        break;
    }

    // Calculate rotation
    const segmentAngle = 360 / 8;
    const targetAngle = targetSegmentIndex * segmentAngle + segmentAngle / 2;
    const fullSpins = 6 + Math.floor(Math.random() * 3); // 6-8 full spins
    const finalRotation = fullSpins * 360 + (360 - targetAngle);

    // Start spin animation
    setTimeout(() => {
      setRotation(finalRotation);
      setPhase('slowing');
    }, 100);

    // Show result after spin
    setTimeout(() => {
      setPhase('result');
    }, 5500);
  };

  const getResultDisplay = () => {
    if (!result) return null;

    const configs: Record<string, { emoji: string; title: string; desc: string; color: string; bg: string }> = {
      nothing: {
        emoji: '😐',
        title: 'Nothing...',
        desc: 'The wheel giveth nothing.',
        color: 'text-gray-400',
        bg: 'from-gray-800 to-gray-900',
      },
      money_loss: {
        emoji: '💀',
        title: 'OUCH! -80% MONEY',
        desc: 'The wheel takes what it wants...',
        color: 'text-red-400',
        bg: 'from-red-900 to-gray-900',
      },
      special_trinket: {
        emoji: '🎁✨',
        title: "FORTUNE'S GAMBIT!",
        desc: 'You won the LEGENDARY trinket! +100% ALL stats!',
        color: 'text-yellow-400',
        bg: 'from-yellow-900 to-purple-900',
      },
      stokens: {
        emoji: '💎',
        title: '+5 STOKENS!',
        desc: 'Spend them wisely at the trader...',
        color: 'text-blue-400',
        bg: 'from-blue-900 to-gray-900',
      },
      prestige_tokens: {
        emoji: '⭐',
        title: '+10 PRESTIGE TOKENS!',
        desc: 'Fortune smiles upon you!',
        color: 'text-purple-400',
        bg: 'from-purple-900 to-gray-900',
      },
    };

    return configs[result.segment] || configs.nothing;
  };

  if (!mounted || !isOpen) return null;

  const resultDisplay = getResultDisplay();

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <div className="relative max-w-xl w-full">
        {/* Title with glow */}
        <h2 className={`text-4xl font-bold text-center mb-8 transition-all duration-300 ${
          phase === 'spinning' || phase === 'slowing' 
            ? 'text-purple-300 animate-pulse' 
            : 'text-purple-400'
        }`}>
          🎰 WHEEL OF FORTUNE 🎰
        </h2>

        {/* Wheel Container */}
        <div className="relative mx-auto" style={{ width: 340, height: 340 }}>
          {/* Outer glow ring */}
          <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
            phase === 'spinning' || phase === 'slowing'
              ? 'shadow-[0_0_60px_rgba(168,85,247,0.8)]'
              : 'shadow-[0_0_30px_rgba(168,85,247,0.4)]'
          }`} />

          {/* Pointer */}
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 transition-transform ${
            tickSound && (phase === 'spinning' || phase === 'slowing') ? 'scale-110' : 'scale-100'
          }`}>
            <div className="w-0 h-0 border-l-[18px] border-r-[18px] border-t-[36px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]" />
          </div>

          {/* Tick indicator light */}
          {(phase === 'spinning' || phase === 'slowing') && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full transition-all ${
              tickSound ? 'bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]' : 'bg-yellow-800'
            }`} />
          )}

          {/* Wheel */}
          <div
            className="relative w-full h-full rounded-full border-8 border-yellow-600/50 shadow-2xl overflow-hidden"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: phase === 'slowing' || phase === 'result'
                ? 'transform 5s cubic-bezier(0.15, 0.6, 0.2, 1)'
                : 'none',
            }}
          >
            {/* SVG Wheel */}
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {SEGMENTS.map((segment, i) => {
                const angle = (360 / 8) * i;
                const startAngle = (angle - 90) * (Math.PI / 180);
                const endAngle = (angle + 45 - 90) * (Math.PI / 180);
                
                const x1 = 100 + 100 * Math.cos(startAngle);
                const y1 = 100 + 100 * Math.sin(startAngle);
                const x2 = 100 + 100 * Math.cos(endAngle);
                const y2 = 100 + 100 * Math.sin(endAngle);

                const pathD = `M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`;

                // Text position
                const midAngle = (angle + 22.5 - 90) * (Math.PI / 180);
                const textX = 100 + 55 * Math.cos(midAngle);
                const textY = 100 + 55 * Math.sin(midAngle);
                const textRotation = angle + 22.5;

                return (
                  <g key={i}>
                    <path 
                      d={pathD} 
                      fill={segment.color} 
                      stroke="#1f2937" 
                      strokeWidth="2"
                    />
                    {/* Emoji */}
                    <text
                      x={100 + 70 * Math.cos(midAngle)}
                      y={100 + 70 * Math.sin(midAngle)}
                      fontSize="16"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRotation}, ${100 + 70 * Math.cos(midAngle)}, ${100 + 70 * Math.sin(midAngle)})`}
                    >
                      {segment.emoji}
                    </text>
                    {/* Label */}
                    <text
                      x={textX}
                      y={textY}
                      fill="white"
                      fontSize="7"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                      style={{ textShadow: '1px 1px 2px black' }}
                    >
                      {segment.label}
                    </text>
                  </g>
                );
              })}
              {/* Center hub */}
              <circle cx="100" cy="100" r="25" fill="#1f2937" stroke="#fbbf24" strokeWidth="3" />
              <circle cx="100" cy="100" r="18" fill="#fbbf24" />
              <text
                x="100"
                y="100"
                fill="#1f2937"
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                SPIN
              </text>
            </svg>
          </div>
        </div>

        {/* Status / Result */}
        <div className="mt-8 text-center min-h-[200px]">
          {phase === 'ready' && (
            <div className="text-purple-400 text-xl animate-pulse">
              Get ready...
            </div>
          )}

          {(phase === 'spinning' || phase === 'slowing') && (
            <div className="space-y-4">
              <div className="text-4xl animate-bounce">🎡</div>
              <div className="text-2xl font-bold text-purple-300 animate-pulse">
                {phase === 'spinning' ? 'SPINNING!' : 'Slowing down...'}
              </div>
              <div className="flex justify-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full bg-purple-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {phase === 'result' && resultDisplay && (
            <div className={`p-6 rounded-2xl bg-gradient-to-b ${resultDisplay.bg} border border-white/20 animate-[fadeIn_0.5s_ease-out]`}>
              <div className="text-6xl mb-4 animate-bounce">{resultDisplay.emoji}</div>
              <h3 className={`text-3xl font-bold ${resultDisplay.color} mb-2`}>
                {resultDisplay.title}
              </h3>
              <p className="text-gray-300 text-lg mb-6">{resultDisplay.desc}</p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-lg rounded-xl transition-all transform hover:scale-105 shadow-lg"
              >
                Continue
              </button>
            </div>
          )}
        </div>

        {/* Sparkles for special trinket win */}
        {phase === 'result' && result?.segment === 'special_trinket' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 bg-yellow-400 rounded-full animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 1}s`,
                  animationDuration: '1s',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}
