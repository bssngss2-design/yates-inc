'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';
import { GOLDEN_COOKIE_MIN_SPAWN, GOLDEN_COOKIE_MAX_SPAWN, TRINKETS } from '@/types/game';
import { PICKAXES } from '@/lib/gameData';

interface RewardPopup {
  id: string;
  type: string;
  value: number | string;
  x: number;
  y: number;
}

// Cookie styles based on path
const COOKIE_STYLES = {
  light: {
    image: '/game/cookieclicker.jpeg',
    alt: 'Golden Cookie',
    glowColor: 'bg-yellow-400/30',
    sparkleColor: 'bg-yellow-300',
    hintColor: 'text-yellow-300',
    borderColor: 'border-yellow-500',
    dropShadow: 'drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]',
  },
  darkness: {
    image: '/game/darkCookie.png',
    alt: 'Dark Cookie',
    glowColor: 'bg-purple-500/40',
    sparkleColor: 'bg-purple-400',
    hintColor: 'text-purple-300',
    borderColor: 'border-purple-500',
    dropShadow: 'drop-shadow-[0_0_20px_rgba(147,51,234,0.8)]',
  },
};

export default function GoldenCookie() {
  const { gameState, claimGoldenCookieReward, consumePendingGoldenCookie } = useGame();
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isClicked, setIsClicked] = useState(false);
  const [rewardPopups, setRewardPopups] = useState<RewardPopup[]>([]);
  const spawnTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const popupIdRef = useRef(0);
  const lastPendingCheck = useRef(false);

  // Get random spawn time between min and max
  const getRandomSpawnTime = () => {
    return Math.floor(Math.random() * (GOLDEN_COOKIE_MAX_SPAWN - GOLDEN_COOKIE_MIN_SPAWN)) + GOLDEN_COOKIE_MIN_SPAWN;
  };

  // Get random position on screen (avoiding edges)
  const getRandomPosition = () => {
    const x = Math.floor(Math.random() * 60) + 20; // 20-80% of screen width
    const y = Math.floor(Math.random() * 50) + 25; // 25-75% of screen height
    return { x, y };
  };

  // Schedule next cookie spawn
  const scheduleNextSpawn = useCallback(() => {
    if (spawnTimeoutRef.current) {
      clearTimeout(spawnTimeoutRef.current);
    }

    const spawnTime = getRandomSpawnTime();
    spawnTimeoutRef.current = setTimeout(() => {
      setPosition(getRandomPosition());
      setIsVisible(true);
      setIsClicked(false);
    }, spawnTime);
  }, []);

  // Determine if cookies should spawn based on path
  // Light path: Always spawn (Temple feature)
  // Darkness path: Only spawn if ritual is active
  const shouldSpawnCookies = gameState.chosenPath === 'light' || 
    (gameState.chosenPath === 'darkness' && gameState.goldenCookieRitualActive);

  // Get cookie style based on path
  const cookieStyle = gameState.chosenPath === 'darkness' ? COOKIE_STYLES.darkness : COOKIE_STYLES.light;

  // Spawn cookies based on path conditions
  useEffect(() => {
    if (!shouldSpawnCookies) {
      setIsVisible(false);
      if (spawnTimeoutRef.current) {
        clearTimeout(spawnTimeoutRef.current);
      }
      return;
    }

    // Start spawn cycle
    scheduleNextSpawn();

    return () => {
      if (spawnTimeoutRef.current) {
        clearTimeout(spawnTimeoutRef.current);
      }
    };
  }, [shouldSpawnCookies, scheduleNextSpawn]);

  // Watch for prayer-triggered golden cookies (Light path Temple)
  useEffect(() => {
    const pending = gameState.buildings.temple.pendingGoldenCookie;
    
    // Only trigger when pendingGoldenCookie changes from false to true
    if (pending && !lastPendingCheck.current) {
      // Immediately spawn a golden cookie from prayer
      setPosition(getRandomPosition());
      setIsVisible(true);
      setIsClicked(false);
      // Consume the pending flag
      consumePendingGoldenCookie();
    }
    
    lastPendingCheck.current = pending;
  }, [gameState.buildings.temple.pendingGoldenCookie, consumePendingGoldenCookie]);

  // Get reward display text
  const getRewardText = (type: string, value: number | string): { emoji: string; text: string; color: string } => {
    switch (type) {
      case 'yates_pickaxe':
        return { emoji: '⛏️', text: 'YATES PICKAXE!', color: 'text-yellow-400' };
      case 'yates_totem':
        return { emoji: '🗿', text: 'YATES TOTEM!', color: 'text-red-400' };
      case 'money':
        return { emoji: '💵', text: `+$${formatNumber(value as number)}`, color: 'text-green-400' };
      case 'trinket': {
        const trinket = TRINKETS.find(t => t.id === value);
        return { emoji: '💎', text: trinket?.name || 'Random Trinket!', color: 'text-purple-400' };
      }
      case 'owo_title':
        return { emoji: '👀', text: 'OwO TITLE! (+500% ALL)', color: 'text-pink-400' };
      case 'admin_commands':
        return { emoji: '💻', text: 'ADMIN COMMANDS (5min)', color: 'text-cyan-400' };
      default:
        return { emoji: '🎁', text: 'Mystery Reward!', color: 'text-white' };
    }
  };

  const formatNumber = (num: number): string => {
    if (!isFinite(num)) return '∞';
    if (num >= 1e42) return `${(num / 1e42).toFixed(1)}Tr`;
    if (num >= 1e39) return `${(num / 1e39).toFixed(1)}Dr`;
    if (num >= 1e36) return `${(num / 1e36).toFixed(1)}Un`;
    if (num >= 1e33) return `${(num / 1e33).toFixed(1)}Dc`;
    if (num >= 1e30) return `${(num / 1e30).toFixed(1)}No`;
    if (num >= 1e27) return `${(num / 1e27).toFixed(1)}Oc`;
    if (num >= 1e24) return `${(num / 1e24).toFixed(1)}Sp`;
    if (num >= 1e21) return `${(num / 1e21).toFixed(1)}Sx`;
    if (num >= 1e18) return `${(num / 1e18).toFixed(1)}Qi`;
    if (num >= 1e15) return `${(num / 1e15).toFixed(1)}Q`;
    if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  // Handle cookie click
  const handleClick = () => {
    if (isClicked) return;
    setIsClicked(true);

    // Claim reward
    const reward = claimGoldenCookieReward();
    if (reward) {
      // Show reward popup
      const popup: RewardPopup = {
        id: `reward-${popupIdRef.current++}`,
        type: reward.type,
        value: reward.value,
        x: position.x,
        y: position.y,
      };
      setRewardPopups(prev => [...prev, popup]);

      // Remove popup after animation
      setTimeout(() => {
        setRewardPopups(prev => prev.filter(p => p.id !== popup.id));
      }, 3000);
    }

    // Hide cookie with animation
    setTimeout(() => {
      setIsVisible(false);
      // Schedule next spawn
      scheduleNextSpawn();
    }, 500);
  };

  if (!isVisible && rewardPopups.length === 0) return null;

  return (
    <>
      {/* Golden/Dark Cookie */}
      {isVisible && (
        <div
          className={`fixed z-[150] cursor-pointer transition-all duration-300 ${
            isClicked ? 'scale-150 opacity-0' : 'hover:scale-110'
          }`}
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          onClick={handleClick}
        >
          {/* Glow effect - changes based on path */}
          <div className={`absolute inset-0 -m-4 ${cookieStyle.glowColor} rounded-full blur-xl animate-pulse`} />
          
          {/* Sparkle particles - changes based on path */}
          <div className="absolute inset-0 -m-8">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 ${cookieStyle.sparkleColor} rounded-full animate-sparkle`}
                style={{
                  left: `${50 + Math.cos(i * 45 * Math.PI / 180) * 40}%`,
                  top: `${50 + Math.sin(i * 45 * Math.PI / 180) * 40}%`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
          
          {/* Cookie image - changes based on path */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 animate-bounce-slow">
            <Image
              src={cookieStyle.image}
              alt={cookieStyle.alt}
              fill
              className={`object-contain rounded-full ${cookieStyle.dropShadow}`}
              unoptimized
            />
          </div>
          
          {/* Click hint - changes based on path */}
          <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 ${cookieStyle.hintColor} text-xs font-bold whitespace-nowrap animate-pulse`}>
            CLICK ME!
          </div>
        </div>
      )}

      {/* Reward Popups */}
      {rewardPopups.map(popup => {
        const reward = getRewardText(popup.type, popup.value);
        return (
          <div
            key={popup.id}
            className="fixed z-[200] pointer-events-none animate-reward-popup"
            style={{
              left: `${popup.x}%`,
              top: `${popup.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className={`bg-black/90 border-2 ${cookieStyle.borderColor} rounded-xl px-6 py-4 text-center shadow-2xl ${reward.color}`}>
              <div className="text-4xl mb-2">{reward.emoji}</div>
              <div className="text-xl font-bold">{reward.text}</div>
              {(popup.type === 'yates_pickaxe' || popup.type === 'yates_totem' || popup.type === 'owo_title') && (
                <div className={`${cookieStyle.hintColor} text-sm mt-1 animate-pulse`}>LEGENDARY!</div>
              )}
            </div>
          </div>
        );
      })}

      {/* Animations */}
      <style jsx global>{`
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes reward-popup {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
          }
          40% {
            transform: translate(-50%, -50%) scale(1);
          }
          80% {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -150%) scale(0.8);
          }
        }
        
        .animate-sparkle {
          animation: sparkle 1.5s ease-in-out infinite;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        
        .animate-reward-popup {
          animation: reward-popup 3s ease-out forwards;
        }
      `}</style>
    </>
  );
}
