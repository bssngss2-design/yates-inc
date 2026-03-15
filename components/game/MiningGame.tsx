'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { PICKAXES, getNextRockUnlockInfo } from '@/lib/gameData';
import { AUTOCLICKER_COST, AUTOCLICKER_CPS, getPrestigePriceMultiplier, YATES_PICKAXE_ID, DARKNESS_PICKAXE_IDS, LIGHT_PICKAXE_IDS } from '@/types/game';
import GameShop from './GameShop';
import RockSelector from './RockSelector';
import GameTerminal from './GameTerminal';
import PrestigeButton from './PrestigeButton';
import TrinketShopButton from './TrinketShopButton';
import TrinketShopModal from './TrinketShopModal';
import TrinketSlot from './TrinketSlot';
import MinerSprites from './MinerSprite';
import AchievementsPanel from './AchievementsPanel';
import TrinketIndex from './TrinketIndex';
import RankingPanel from './RankingPanel';
// CurrencyStore now integrated into GameShop tabs
import PathSelectionModal from './PathSelectionModal';
import GoldenCookie from './GoldenCookie';
import WanderingTrader from './WanderingTrader';
import SacrificeModal from './SacrificeModal';
import TaxPopup from './TaxPopup';
import BuildingDisplay from './BuildingDisplay';
import GameSettings from './GameSettings';
import ForemanJackTutorial from './ForemanJackTutorial';
import BuffBar from './BuffBar';
import TempleModal from './TempleModal';
import WizardTowerSidebar from './WizardTowerSidebar';
import BankModal from './BankModal';
import { MINER_BASE_DAMAGE, getScaledRockHP, BUILDINGS, BuildingType, getMinerCost } from '@/types/game';
import { ROCKS, getRockById } from '@/lib/gameData';

interface MiningGameProps {
  onExit?: () => void;
}

interface MoneyPopup {
  id: string;
  amount: number;
  x: number;
  y: number;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface CouponPopup {
  id: string;
  type: string;
  x: number;
  y: number;
}

export default function MiningGame({ onExit }: MiningGameProps) {
  const {
    gameState,
    currentPickaxe,
    currentRock,
    mineRock,
    buyAutoclicker,
    toggleAutoclicker,
    dismissWarning,
    submitAppeal,
    isBanned,
    banReason,
    getTotalBonuses,
    selectPath,
    buyBuilding,
    canAffordBuilding,
    getBuildingCostForType,
    buyMiner,
    buyMiners,
    getActiveBuffs,
    getActiveDebuffs,
    isWizardRitualActive,
    saveNow,
  } = useGame();

  const { employee } = useAuth();
  const isEmployee = !!employee?.id && /^\d+$/.test(employee.id);

  // Calculate scaled autoclicker cost (10% increase every 5 prestiges + hard mode multiplier)
  const scaledAutoclickerCost = Math.floor(AUTOCLICKER_COST * getPrestigePriceMultiplier(gameState.prestigeCount, gameState.isHardMode));

  const [moneyPopups, setMoneyPopups] = useState<MoneyPopup[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [couponPopups, setCouponPopups] = useState<CouponPopup[]>([]);
  const [isSwinging, setIsSwinging] = useState(false);
  const [rockShake, setRockShake] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showRockSelector, setShowRockSelector] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showTrinketIndex, setShowTrinketIndex] = useState(false);
  const [trinketShopOpen, setTrinketShopOpen] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [showSacrifice, setShowSacrifice] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // Stores moved into GameShop as tabs
  const [displayProgress, setDisplayProgress] = useState(0);
  const [rockBroken, setRockBroken] = useState(false);

  // Anti-cheat warning modal state
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

  // Show warning modal when warnings change
  useEffect(() => {
    if (gameState.isBlocked && gameState.antiCheatWarnings > 0 && !gameState.appealPending) {
      setShowWarningModal(true);
    }
  }, [gameState.isBlocked, gameState.antiCheatWarnings, gameState.appealPending]);

  const rockRef = useRef<HTMLDivElement>(null);
  const popupIdRef = useRef(0);
  const autoclickerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Autoclicker effect - 20 clicks per second when enabled
  useEffect(() => {
    if (gameState.hasAutoclicker && gameState.autoclickerEnabled) {
      autoclickerIntervalRef.current = setInterval(() => {
        mineRock();
      }, 1000 / AUTOCLICKER_CPS);
    } else {
      if (autoclickerIntervalRef.current) {
        clearInterval(autoclickerIntervalRef.current);
        autoclickerIntervalRef.current = null;
      }
    }

    return () => {
      if (autoclickerIntervalRef.current) {
        clearInterval(autoclickerIntervalRef.current);
      }
    };
  }, [gameState.hasAutoclicker, gameState.autoclickerEnabled, mineRock]);

  const handleMine = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    // Prevent default on touch to avoid double-firing
    if (e && 'touches' in e) {
      e.preventDefault();
    }

    // Mine the rock FIRST before any animations
    const result = mineRock();
    
    // Only animate if we actually mined
    if (result.earnedMoney > 0 || result.brokeRock) {
      // Trigger pickaxe swing animation
      setIsSwinging(true);
      setTimeout(() => setIsSwinging(false), 150);

      // Trigger rock shake
      setRockShake(true);
      setTimeout(() => setRockShake(false), 100);
    }

    // Handle rock break animation
    if (result.brokeRock) {
      setRockBroken(true);
      setDisplayProgress(100);
      setTimeout(() => {
        setRockBroken(false);
        setDisplayProgress(0);
      }, 300);
    } else {
      // Update display progress for click feedback, then reset to let actualProgress take over
      const scaledMaxHP = getScaledRockHP(currentRock.clicksToBreak, gameState.prestigeCount, gameState.isHardMode);
      const newProgress = ((scaledMaxHP - gameState.currentRockHP + 1) / scaledMaxHP) * 100;
      setDisplayProgress(Math.min(100, newProgress));
      // Reset displayProgress after animation so miners can update the bar via actualProgress
      setTimeout(() => setDisplayProgress(0), 200);
    }

    // Get rock position for popups and particles
    const rockRect = rockRef.current?.getBoundingClientRect();

    // Create money popup (only if we actually earned money)
    if (result.earnedMoney > 0) {
      const popupId = `popup-${popupIdRef.current++}`;
      const randomOffsetX = (Math.random() - 0.5) * 100;
      const randomOffsetY = (Math.random() - 0.5) * 50;

      setMoneyPopups((prev) => [
        ...prev,
        {
          id: popupId,
          amount: result.earnedMoney,
          x: (rockRect?.width || 200) / 2 + randomOffsetX,
          y: (rockRect?.height || 200) / 2 + randomOffsetY,
        },
      ]);

      // Remove popup after animation
      setTimeout(() => {
        setMoneyPopups((prev) => prev.filter((p) => p.id !== popupId));
      }, 1000);
    }

    // Create particles
    for (let i = 0; i < 5; i++) {
      const particleId = `particle-${popupIdRef.current++}`;
      setParticles((prev) => [
        ...prev,
        {
          id: particleId,
          x: (rockRect?.width || 200) / 2,
          y: (rockRect?.height || 200) / 2,
          vx: (Math.random() - 0.5) * 20,
          vy: -Math.random() * 15 - 5,
        },
      ]);

      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== particleId));
      }, 500);
    }

    // Lottery ticket drop notification (rebranded from coupons)
    if (result.couponDrop) {
      const couponId = `lottery-${popupIdRef.current++}`;
      setCouponPopups((prev) => [
        ...prev,
        {
          id: couponId,
          type: result.couponDrop!,
          x: (rockRect?.width || 200) / 2,
          y: 0,
        },
      ]);

      setTimeout(() => {
        setCouponPopups((prev) => prev.filter((c) => c.id !== couponId));
      }, 2000);
    }
  }, [mineRock, gameState.currentRockHP, currentRock.clicksToBreak]);

  // QQ quick save: track last Q press to detect double-tap
  const lastQPressRef = useRef(0);

  // Keyboard handler - ESC to exit, I for terminal, + to mine, QQ to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const activeElement = document.activeElement as HTMLElement;
      
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        activeElement?.tagName === 'INPUT' || 
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.contentEditable === 'true'
      ) {
        return;
      }

      const preventedKeys = ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'];
      if (preventedKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.key === 'Escape' && onExit) {
        onExit();
      }

      if (e.key === 'i' || e.key === 'I') {
        setShowTerminal(prev => !prev);
      }

      if (e.key === 'r' || e.key === 'R') {
        setShowRanking(prev => !prev);
      }

      if (e.key === '+' || e.key === '=') {
        handleMine();
      }

      if (e.key === 'q' || e.key === 'Q') {
        const now = Date.now();
        if (now - lastQPressRef.current < 400) {
          saveNow();
          lastQPressRef.current = 0;
        } else {
          lastQPressRef.current = now;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [onExit, handleMine, saveNow]);

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

  const getCouponLabel = (type: string): string => {
    switch (type) {
      case 'discount30': return '🎟️ +1 LOTTERY TICKET!';
      case 'discount50': return '🎟️ +1 LOTTERY TICKET!';
      case 'discount100': return '🎟️ +1 LOTTERY TICKET!';
      default: return '🎟️ LOTTERY TICKET!';
    }
  };

  const scaledRockMaxHP = getScaledRockHP(currentRock.clicksToBreak, gameState.prestigeCount, gameState.isHardMode);
  const actualProgress = ((scaledRockMaxHP - gameState.currentRockHP) / scaledRockMaxHP) * 100;
  const progressPercent = rockBroken ? 100 : (displayProgress || actualProgress);
  const totalCoupons = gameState.coupons.discount30 + gameState.coupons.discount50 + gameState.coupons.discount100;

  // Calculate actual damage per second for miners (matching miner tick logic)
  const bonuses = getTotalBonuses();
  const minerRock = getRockById(gameState.currentRockId) || ROCKS[0];
  // Only use miner-specific bonuses that the actual miner tick uses
  const minerDamageBonus = bonuses.minerDamageBonus + bonuses.minerSpeedBonus;
  const minerDps = Math.ceil(gameState.minerCount * MINER_BASE_DAMAGE * (1 + minerDamageBonus));

  // Check if player can buy the next pickaxe (sequential order, accounting for path-locked pickaxes)
  const canBuyNextPickaxe = useMemo(() => {
    // Find the highest owned regular pickaxe (excluding Yates)
    const regularOwnedIds = gameState.ownedPickaxeIds.filter(id => id !== YATES_PICKAXE_ID);
    const highestOwnedId = regularOwnedIds.length > 0 ? Math.max(...regularOwnedIds) : 0;
    
    // Determine which pickaxe IDs to skip based on player's path
    const skippedIds = new Set<number>([YATES_PICKAXE_ID]);
    if (gameState.chosenPath === 'darkness') {
      LIGHT_PICKAXE_IDS.forEach(id => skippedIds.add(id));
    } else if (gameState.chosenPath === 'light') {
      DARKNESS_PICKAXE_IDS.forEach(id => skippedIds.add(id));
    } else {
      // No path chosen - skip all path-restricted pickaxes
      LIGHT_PICKAXE_IDS.forEach(id => skippedIds.add(id));
      DARKNESS_PICKAXE_IDS.forEach(id => skippedIds.add(id));
    }
    
    // Find the effective next ID by skipping unbuyable pickaxes
    let effectiveNextId = highestOwnedId + 1;
    while (skippedIds.has(effectiveNextId) && effectiveNextId <= 30) {
      effectiveNextId++;
    }
    
    // Next pickaxe in sequence (after skipping path-locked ones)
    const nextPickaxe = PICKAXES.find(p => p.id === effectiveNextId);
    if (!nextPickaxe) return false;
    
    // Can afford it? (with prestige price scaling AND hard mode multiplier)
    const scaledPrice = Math.floor(nextPickaxe.price * getPrestigePriceMultiplier(gameState.prestigeCount, gameState.isHardMode));
    return gameState.yatesDollars >= scaledPrice;
  }, [gameState.ownedPickaxeIds, gameState.yatesDollars, gameState.prestigeCount, gameState.chosenPath, gameState.isHardMode]);

  // Get next rock unlock progress (scaled by prestige, based on current rock)
  const nextRockInfo = useMemo(() => {
    return getNextRockUnlockInfo(gameState.totalClicks, gameState.prestigeCount, gameState.currentRockId);
  }, [gameState.totalClicks, gameState.prestigeCount, gameState.currentRockId]);

  // Show ban screen if user is banned
  if (isBanned) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[100]">
        <div className="text-center p-8 max-w-md">
          <div className="text-8xl mb-6">🚫</div>
          <h1 className="text-4xl font-bold text-red-500 mb-4">BANNED</h1>
          <p className="text-white text-lg mb-4">
            Your account has been banned from Yates Inc.
          </p>
          {banReason && (
            <p className="text-gray-400 mb-6">
              <span className="text-gray-500">Reason:</span> {banReason}
            </p>
          )}
          
          {/* Appeal Section */}
          {!gameState.appealPending ? (
            <div className="mt-6 space-y-4">
              <p className="text-gray-400 text-sm mb-3">
                Think this is unfair? Submit an appeal:
              </p>
              <textarea
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
                placeholder="Explain why you should be unbanned..."
                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 resize-none"
                rows={3}
              />
              <button
                onClick={async () => {
                  if (!appealText.trim()) return;
                  setIsSubmittingAppeal(true);
                  const success = await submitAppeal(appealText);
                  setIsSubmittingAppeal(false);
                  if (success) {
                    setAppealText('');
                  }
                }}
                disabled={!appealText.trim() || isSubmittingAppeal}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-bold transition-colors"
              >
                {isSubmittingAppeal ? 'Submitting...' : 'Submit Appeal'}
              </button>
            </div>
          ) : (
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
              <div className="text-2xl mb-2">⏳</div>
              <p className="text-yellow-400 font-bold">Appeal Pending</p>
              <p className="text-gray-400 text-sm">Check your inbox for updates</p>
            </div>
          )}
          
          {onExit && (
            <button
              onClick={onExit}
              className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Exit
            </button>
          )}
        </div>
      </div>
    );
  }

  // Get background image based on current rock level
  const getBackgroundForRock = (rockId: number): string | null => {
    if (rockId >= 26) return '/game/bg-26-29.png';
    if (rockId >= 21) return '/game/bg-21-25.png';
    if (rockId >= 16) return '/game/bg-16-20.png';
    if (rockId >= 11) return '/game/bg-11-15.png';
    if (rockId >= 6) return '/game/bg-6-10.png';
    return null; // Default cave gradient for rocks 1-5
  };

  const backgroundImage = getBackgroundForRock(gameState.currentRockId);

  // =====================
  // BUILDING PANEL HELPERS (for desktop right panel)
  // =====================

  // Building data for right panel
  const availableBuildings = useMemo(() => {
    return BUILDINGS.filter(building => {
      if (building.id === 'shipment') return false; // Skip shipment
      if (building.pathRestriction !== null && building.pathRestriction !== gameState.chosenPath) return false;
      return true;
    });
  }, [gameState.chosenPath]);

  const getBuildingCount = (buildingId: string): number => {
    switch (buildingId) {
      case 'mine': return gameState.buildings.mine.count;
      case 'bank': return gameState.buildings.bank.owned ? 1 : 0;
      case 'factory': return gameState.buildings.factory.count;
      case 'temple': return gameState.buildings.temple.owned ? 1 : 0;
      case 'wizard_tower': return gameState.buildings.wizard_tower.owned ? 1 : 0;
      case 'shipment': return gameState.buildings.shipment.count;
      default: return 0;
    }
  };

  // Miner cost
  const minerCost = getMinerCost(gameState.minerCount, gameState.prestigeCount, gameState.isHardMode);

  // Active buffs for left panel (reuses BuffBar logic)
  const [activeEffects, setActiveEffects] = useState<{ id: string; name: string; icon: string; timeLeft: number; type: string }[]>([]);
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const effects: typeof activeEffects = [];
      const buffs_list = getActiveBuffs();
      const debuffs_list = getActiveDebuffs();
      buffs_list.forEach(b => {
        const tl = Math.max(0, (b.startTime + b.duration) - now);
        effects.push({ id: b.id, name: b.name, icon: b.icon, timeLeft: tl, type: 'buff' });
      });
      if (isWizardRitualActive() && gameState.buildings.wizard_tower.ritualEndTime) {
        effects.push({ id: 'ritual', name: 'Dark Ritual', icon: '🔮', timeLeft: Math.max(0, gameState.buildings.wizard_tower.ritualEndTime - now), type: 'ritual' });
      }
      if (gameState.sacrificeBuff) {
        effects.push({ id: 'sacrifice', name: 'Sacrifice', icon: '🩸', timeLeft: Math.max(0, gameState.sacrificeBuff.endsAt - now), type: 'sacrifice' });
      }
      debuffs_list.forEach(d => {
        const tl = d.duration === null ? -1 : Math.max(0, (d.startTime + d.duration) - now);
        effects.push({ id: d.id, name: d.name, icon: d.icon, timeLeft: tl, type: 'debuff' });
      });
      setActiveEffects(effects);
    }, 250);
    return () => clearInterval(interval);
  }, [getActiveBuffs, getActiveDebuffs, isWizardRitualActive, gameState.buildings.wizard_tower.ritualEndTime, gameState.sacrificeBuff]);

  const fmtTime = (ms: number) => {
    if (ms < 0) return '∞';
    const s = Math.ceil(ms / 1000);
    if (s >= 60) return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
    return `${s}s`;
  };

  // Building click handlers (open management modals)
  const [showTempleFromPanel, setShowTempleFromPanel] = useState(false);
  const [showWizardFromPanel, setShowWizardFromPanel] = useState(false);
  const [showBankFromPanel, setShowBankFromPanel] = useState(false);
  const [forceOpenAchievements, setForceOpenAchievements] = useState(false);

  return (
    <div className="fixed inset-0 overflow-hidden select-none z-[100]">
      {/* Cave Background - changes based on rock level */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={backgroundImage ? {
          backgroundImage: `url('${backgroundImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {
          background: `
            radial-gradient(ellipse at 50% 30%, #3d2817 0%, #1a0f0a 50%, #0d0705 100%),
            linear-gradient(180deg, #2d1f15 0%, #1a0f0a 100%)
          `,
        }}
      >
        {!backgroundImage && (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 60%, rgba(255, 150, 50, 0.1) 0%, transparent 50%)',
          }}
        />
      </div>

      {/* ============================================================ */}
      {/* MOBILE LAYOUT (< lg) — Top bar + floating buildings + bottom stats */}
      {/* ============================================================ */}
      <div className="lg:hidden">
        {/* Top bar */}
        <div className="fixed z-40 flex top-2 left-2 right-2 justify-between items-start gap-2">
          <div className="flex flex-col gap-1 sm:gap-2">
            {onExit && (
              <button onClick={onExit} className="bg-black/80 backdrop-blur-sm hover:bg-red-900/80 rounded-lg sm:rounded-xl px-2 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-2 border border-gray-600/30 hover:border-red-500/50 shadow-lg transition-colors group touch-manipulation" title="Press ESC to exit">
                <span className="text-gray-400 group-hover:text-red-400 transition-colors text-sm sm:text-base">✕</span>
                <span className="text-gray-400 group-hover:text-red-300 font-medium text-xs sm:text-sm transition-colors">EXIT</span>
              </button>
            )}
            <div className="bg-black/60 backdrop-blur-md rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-2 border border-yellow-600/20 shadow-lg">
              <span className="text-lg sm:text-2xl">💰</span>
              <span className="text-yellow-400 font-bold text-base sm:text-xl">${formatNumber(gameState.yatesDollars)}</span>
            </div>
            {totalCoupons > 0 && (
              <div className="bg-black/80 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-purple-600/30 shadow-lg">
                <div className="flex items-center gap-1.5 sm:gap-3">
                  {gameState.coupons.discount30 > 0 && <div className="flex items-center gap-0.5 bg-green-600/20 px-1.5 py-0.5 rounded"><span className="text-[10px] text-green-400 font-bold">30%</span><span className="text-green-300 font-bold text-[10px]">×{gameState.coupons.discount30}</span></div>}
                  {gameState.coupons.discount50 > 0 && <div className="flex items-center gap-0.5 bg-blue-600/20 px-1.5 py-0.5 rounded"><span className="text-[10px] text-blue-400 font-bold">50%</span><span className="text-blue-300 font-bold text-[10px]">×{gameState.coupons.discount50}</span></div>}
                  {gameState.coupons.discount100 > 0 && <div className="flex items-center gap-0.5 bg-yellow-600/20 px-1.5 py-0.5 rounded"><span className="text-[10px] text-yellow-400 font-bold">FREE</span><span className="text-yellow-300 font-bold text-[10px]">×{gameState.coupons.discount100}</span></div>}
                </div>
              </div>
            )}
            {gameState.hasAutoclicker ? (
              <button onClick={toggleAutoclicker} className={`bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1.5 border shadow-lg transition-all touch-manipulation cursor-pointer ${gameState.autoclickerEnabled ? 'border-cyan-500/50 shadow-cyan-500/20' : 'border-gray-600/50'}`}>
                <div className="flex items-center gap-1.5">
                  <span className={gameState.autoclickerEnabled ? 'text-cyan-400 animate-pulse' : 'text-gray-500'}>🤖</span>
                  <span className={`text-[10px] font-bold ${gameState.autoclickerEnabled ? 'text-cyan-300' : 'text-gray-400'}`}>{gameState.autoclickerEnabled ? 'ON' : 'OFF'}</span>
                </div>
              </button>
            ) : (
              <button onClick={buyAutoclicker} disabled={gameState.yatesDollars < scaledAutoclickerCost} className={`bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1.5 border shadow-lg transition-all touch-manipulation ${gameState.yatesDollars >= scaledAutoclickerCost ? 'border-cyan-500/50 cursor-pointer' : 'border-gray-600/30 opacity-60 cursor-not-allowed'}`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">🤖</span>
                  <span className="text-[10px] text-gray-300 font-bold">AUTO</span>
                  <span className={`text-[10px] font-bold ${gameState.yatesDollars >= scaledAutoclickerCost ? 'text-cyan-400' : 'text-gray-500'}`}>${formatNumber(scaledAutoclickerCost)}</span>
                </div>
              </button>
            )}
            <PrestigeButton />
            <TrinketSlot />
          </div>

          <div className="flex flex-col items-end gap-1 sm:gap-2">
            <button onClick={() => setShowShop(true)} className="bg-gradient-to-br from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 active:from-amber-700 active:to-amber-900 text-white font-bold py-2 sm:py-3 px-3 sm:px-6 rounded-lg sm:rounded-xl text-sm sm:text-lg transition-all shadow-lg hover:scale-105 active:scale-95 border border-amber-400/30 touch-manipulation">
              🛒 <span className="hidden xs:inline">SHOP</span>
            </button>
            <button onClick={() => setShowRanking(true)} className="bg-gradient-to-br from-cyan-600 to-cyan-800 text-white font-bold py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all shadow-lg border border-cyan-400/30 touch-manipulation">
              🏆 <span className="hidden xs:inline">RANKING</span>
            </button>
            {canBuyNextPickaxe && !showShop && (
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg shadow-lg animate-pulse cursor-pointer border border-green-400/30 touch-manipulation" onClick={() => setShowShop(true)}>
                <span className="text-xs sm:text-sm font-bold">⛏️ <span className="hidden xs:inline">New pickaxe!</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: Center mining area */}
        <div className="absolute inset-0 flex items-center justify-center pt-16 pb-32 px-2">
          <div className="relative flex items-center">
            <div className={`relative w-16 h-16 sm:w-28 sm:h-28 transition-transform origin-bottom-right -mr-4 sm:-mr-8 z-50 ${isSwinging ? 'rotate-[30deg]' : 'rotate-0'}`} style={{ transitionDuration: '0.15s' }}>
              <Image key={`pickaxe-${currentPickaxe.id}`} src={currentPickaxe.image} alt={currentPickaxe.name} fill unoptimized className="object-contain drop-shadow-2xl pointer-events-none" style={{ transform: 'rotate(-30deg)' }} />
            </div>
            <div ref={rockRef} onClick={handleMine} onTouchEnd={handleMine} className="relative z-40 w-56 h-56 sm:w-64 sm:h-64 cursor-pointer touch-manipulation flex items-center justify-center select-none pointer-events-auto" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <div className={`relative w-48 h-48 sm:w-56 sm:h-56 transition-transform hover:scale-105 active:scale-95 ${rockShake ? 'animate-shake' : ''} ${rockBroken ? 'animate-rock-break' : ''}`}>
                <Image key={`rock-${currentRock.id}`} src={gameState.isBlocked ? '/game/rocks/coal.png' : currentRock.image} alt={gameState.isBlocked ? 'Bedrock' : currentRock.name} fill unoptimized className={`object-contain drop-shadow-2xl pointer-events-none ${rockBroken ? 'scale-110 brightness-150' : ''} ${gameState.isBlocked ? 'grayscale brightness-50' : ''}`} />
                {rockBroken && <div className="absolute inset-0 bg-white/50 rounded-full animate-flash-out pointer-events-none" />}
                {moneyPopups.map((p) => <div key={p.id} className="absolute pointer-events-none animate-float-up text-yellow-400 font-bold text-2xl" style={{ left: p.x, top: p.y, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>+${formatNumber(p.amount)}</div>)}
                {particles.map((p) => <div key={p.id} className="absolute w-2 h-2 bg-amber-600 rounded-full pointer-events-none animate-particle" style={{ left: p.x, top: p.y, '--vx': `${p.vx}px`, '--vy': `${p.vy}px` } as React.CSSProperties} />)}
                {couponPopups.map((p) => <div key={p.id} className="absolute left-1/2 -translate-x-1/2 -top-12 pointer-events-none animate-bounce-in"><span className="text-amber-400 font-bold text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">+1 🎟️</span></div>)}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Floating building display */}
        <BuildingDisplay />

        {/* Mobile: Bottom stats */}
        <div className="fixed bottom-0 left-0 right-0 p-2 sm:p-4 z-30">
          <div className="max-w-2xl mx-auto space-y-2">
            <div className="flex gap-2 items-start">
              <div className="flex-1 bg-black/80 backdrop-blur-sm rounded-lg p-2 sm:p-3 border border-gray-700/50">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-300 font-medium text-xs sm:text-sm">⛏️ {currentRock.name}</span>
                  <span className="text-gray-400 text-[10px] sm:text-xs">{formatNumber(gameState.currentRockHP)} / {formatNumber(scaledRockMaxHP)} HP</span>
                </div>
                <div className="w-full h-2 sm:h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-150" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              {gameState.minerCount > 0 && (
                <div className="bg-black/90 backdrop-blur-sm rounded-lg px-3 py-2 border-2 border-yellow-500 shadow-xl pointer-events-none">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <span className="text-2xl">⛏️</span>
                    <div><p className="text-orange-400 font-bold text-xs">{formatNumber(minerDps)} dmg/s</p><p className="font-bold text-sm">{gameState.minerCount} Miners</p></div>
                  </div>
                </div>
              )}
            </div>
            {nextRockInfo.nextRock && (
              <div className="bg-black/80 backdrop-blur-sm rounded-lg p-2 border border-blue-700/50">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-blue-300 font-medium text-xs">🔓 Next: {nextRockInfo.nextRock.name}</span>
                  <span className="text-blue-400 text-[10px]">{formatNumber(nextRockInfo.clicksNeeded)} clicks</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-150" style={{ width: `${nextRockInfo.progress}%` }} />
                </div>
              </div>
            )}
            <div className="flex justify-center gap-2">
              <button onClick={() => setShowRockSelector(true)} className="bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-gray-700/50 touch-manipulation">
                <span className="text-gray-400 text-[10px]">Rock</span>
                <span className="text-white font-bold block text-xs">{currentRock.id}/{ROCKS.length}</span>
              </button>
              <div className="bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-gray-700/50">
                <span className="text-gray-400 text-[10px]">Power</span>
                <span className="text-white font-bold block text-xs">{formatNumber(currentPickaxe.clickPower)}</span>
              </div>
              <div className="bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-gray-700/50 max-w-[120px]">
                <span className="text-gray-400 text-[10px]">Pickaxe</span>
                <span className="text-white font-bold block text-xs truncate">{currentPickaxe.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DESKTOP LAYOUT (>= lg) — True 3-column Cookie Clicker style */}
      {/* ============================================================ */}
      <div className="hidden lg:flex flex-col h-full relative z-10">
        {/* Main 3-column row */}
        <div className="flex w-full grow overflow-hidden">

          {/* ========== LEFT PANEL ========== */}
          <div className="w-80 flex-none flex flex-col gap-3 self-stretch overflow-y-auto px-4 py-4 bg-gray-950/90 backdrop-blur-md border-r border-gray-700/40" style={{ scrollbarWidth: 'none' }}>
            {/* Exit */}
            {onExit && (
              <button onClick={onExit} className="flex items-center gap-2 bg-gray-900/60 hover:bg-red-900/60 rounded-lg px-3 py-2 border border-gray-700/30 hover:border-red-500/40 transition-colors group">
                <span className="text-gray-400 group-hover:text-red-400 text-sm">✕</span>
                <span className="text-gray-400 group-hover:text-red-300 font-medium text-xs">EXIT</span>
                <span className="text-gray-600 text-[10px] ml-auto">(ESC)</span>
              </button>
            )}

            {/* Currency Card */}
            <div className="rounded-lg border border-amber-600/30 bg-gray-950/80 px-4 py-3 shadow-lg">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Yates Dollars</span>
              <span className="block text-2xl font-bold text-yellow-400 mt-0.5">${formatNumber(gameState.yatesDollars)}</span>
              {gameState.minerCount > 0 && (
                <span className="block text-xs text-amber-500/70 mt-1">⛏️ {formatNumber(minerDps)} dmg/s</span>
              )}
            </div>

            {/* Secondary currencies */}
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg border border-amber-600/20 bg-gray-950/60 px-3 py-2">
                <span className="text-[10px] text-gray-500">🎟️ Lottery</span>
                <span className="block text-sm font-bold text-amber-400">{gameState.lotteryTickets.toLocaleString()}</span>
              </div>
              <div className="flex-1 rounded-lg border border-blue-600/20 bg-gray-950/60 px-3 py-2">
                <span className="text-[10px] text-gray-500">💎 Stokens</span>
                <span className="block text-sm font-bold text-blue-400">{gameState.stokens}</span>
              </div>
            </div>

            {/* Mining Level (rocks broken = levels) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Mining Level</span>
                <span className="text-xs font-bold text-amber-400">{gameState.rocksMinedCount || 0}</span>
              </div>
              {gameState.prestigeCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Prestige</span>
                  <span className="text-[10px] font-bold text-purple-400">Lv.{gameState.prestigeCount} (×{gameState.prestigeMultiplier.toFixed(1)})</span>
                </div>
              )}
              {(gameState.rocksMinedCount || 0) < 202 ? (
                <div className="text-[10px] text-gray-500">🔒 Lv.202 — Change sides</div>
              ) : (
                <div className="text-[10px] text-green-400">✅ Lv.202 — Can change sides!</div>
              )}
            </div>

            <div className="h-px bg-gray-700/40" />

            {/* Trinket Slots */}
            <TrinketSlot />

            {/* Prestige Button */}
            <PrestigeButton />

            {/* Achievements (hidden here, accessible from bottom bar) */}
            <AchievementsPanel isTrinketIndexOpen={showTrinketIndex} setIsTrinketIndexOpen={setShowTrinketIndex} forceOpen={forceOpenAchievements} onForceOpenHandled={() => setForceOpenAchievements(false)} hidden />

            <div className="h-px bg-gray-700/40" />

            {/* Coupons */}
            {totalCoupons > 0 && (
              <div className="bg-gray-950/60 rounded-lg px-3 py-2 border border-purple-600/20">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Coupons</span>
                <div className="flex items-center gap-2 mt-1">
                  {gameState.coupons.discount30 > 0 && <div className="flex items-center gap-0.5 bg-green-600/20 px-1.5 py-0.5 rounded"><span className="text-[10px] text-green-400 font-bold">30%</span><span className="text-green-300 font-bold text-[10px]">×{gameState.coupons.discount30}</span></div>}
                  {gameState.coupons.discount50 > 0 && <div className="flex items-center gap-0.5 bg-blue-600/20 px-1.5 py-0.5 rounded"><span className="text-[10px] text-blue-400 font-bold">50%</span><span className="text-blue-300 font-bold text-[10px]">×{gameState.coupons.discount50}</span></div>}
                  {gameState.coupons.discount100 > 0 && <div className="flex items-center gap-0.5 bg-yellow-600/20 px-1.5 py-0.5 rounded"><span className="text-[10px] text-yellow-400 font-bold">FREE</span><span className="text-yellow-300 font-bold text-[10px]">×{gameState.coupons.discount100}</span></div>}
                </div>
              </div>
            )}

            {/* Active Buffs */}
            {activeEffects.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-white">Active Buffs</span>
                {activeEffects.map(e => (
                  <div key={e.id} className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
                    e.type === 'debuff' ? 'border-red-800/40 bg-red-900/20' : 'border-amber-800/30 bg-amber-900/20'
                  }`}>
                    <span className="text-sm">{e.icon}</span>
                    <span className={`grow text-[11px] ${e.type === 'debuff' ? 'text-red-300' : 'text-amber-200'}`}>{e.name}</span>
                    <span className={`text-[11px] font-bold ${e.type === 'debuff' ? 'text-red-400' : 'text-amber-400'}`}>{fmtTime(e.timeLeft)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Bonuses summary */}
            {(bonuses.moneyBonus > 0 || bonuses.rockDamageBonus > 0 || bonuses.couponBonus > 0) && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-white">Bonuses</span>
                <div className="space-y-0.5">
                  {bonuses.moneyBonus > 0 && <div className="text-[11px] text-green-400">💰 +{(bonuses.moneyBonus * 100).toFixed(0)}% Money</div>}
                  {bonuses.rockDamageBonus > 0 && <div className="text-[11px] text-red-400">💥 +{(bonuses.rockDamageBonus * 100).toFixed(0)}% Damage</div>}
                  {bonuses.clickSpeedBonus > 0 && <div className="text-[11px] text-cyan-400">⚡ +{(bonuses.clickSpeedBonus * 100).toFixed(0)}% Speed</div>}
                  {bonuses.couponBonus > 0 && <div className="text-[11px] text-amber-400">🎟️ +{(bonuses.couponBonus * 100).toFixed(0)}% Lottery</div>}
                  {bonuses.minerDamageBonus > 0 && <div className="text-[11px] text-orange-400">⛏️ +{(bonuses.minerDamageBonus * 100).toFixed(0)}% Miners</div>}
                </div>
              </div>
            )}

            {/* Path Progress */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-white">Path Progress</span>
              <div className="flex gap-2">
                <div className={`flex-1 flex flex-col items-center gap-1 rounded-lg border px-2 py-2 ${
                  gameState.chosenPath === 'light' ? 'border-yellow-600/50 bg-yellow-900/20' : 'border-gray-700/30 bg-gray-800/30 opacity-50'
                }`}>
                  <span className="text-base">☀️</span>
                  <span className={`text-[10px] ${gameState.chosenPath === 'light' ? 'text-yellow-300' : 'text-gray-500'}`}>Light</span>
                  <span className={`text-xs font-bold ${gameState.chosenPath === 'light' ? 'text-yellow-400' : 'text-gray-600'}`}>
                    {gameState.chosenPath === 'light' ? `Lv.${gameState.prestigeCount}` : 'Locked'}
                  </span>
                </div>
                <div className={`flex-1 flex flex-col items-center gap-1 rounded-lg border px-2 py-2 ${
                  gameState.chosenPath === 'darkness' ? 'border-purple-600/50 bg-purple-900/20' : 'border-gray-700/30 bg-gray-800/30 opacity-50'
                }`}>
                  <span className="text-base">🌙</span>
                  <span className={`text-[10px] ${gameState.chosenPath === 'darkness' ? 'text-purple-300' : 'text-gray-500'}`}>Darkness</span>
                  <span className={`text-xs font-bold ${gameState.chosenPath === 'darkness' ? 'text-purple-400' : 'text-gray-600'}`}>
                    {gameState.chosenPath === 'darkness' ? `Lv.${gameState.prestigeCount}` : 'Locked'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========== CENTER PANEL ========== */}
          <div className="grow flex flex-col items-center justify-center relative overflow-hidden">
            {/* Rock Level heading */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
              <span className="text-2xl font-bold text-white drop-shadow-lg">Rock Level {currentRock.id}</span>
            </div>

            {/* Rock glow */}
            <div className="absolute w-96 h-96 rounded-full bg-amber-500/15 blur-3xl animate-pulse pointer-events-none" />

            {/* Pickaxe + Rock */}
            <div className="relative flex items-center">
              <div
                className={`relative w-32 h-32 xl:w-40 xl:h-40 transition-transform origin-bottom-right -mr-8 z-50 ${isSwinging ? 'rotate-[30deg]' : 'rotate-0'}`}
                style={{ transitionDuration: '0.15s' }}
              >
                <Image key={`pickaxe-${currentPickaxe.id}`} src={currentPickaxe.image} alt={currentPickaxe.name} fill unoptimized className="object-contain drop-shadow-2xl pointer-events-none" style={{ transform: 'rotate(-30deg)' }} />
              </div>

              <div
                ref={rockRef}
                onClick={handleMine}
                onTouchEnd={handleMine}
                className="relative z-40 w-72 h-72 xl:w-80 xl:h-80 cursor-pointer touch-manipulation flex items-center justify-center select-none pointer-events-auto"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className={`relative w-64 h-64 xl:w-72 xl:h-72 transition-transform hover:scale-105 active:scale-95 ${rockShake ? 'animate-shake' : ''} ${rockBroken ? 'animate-rock-break' : ''}`}>
                  <Image
                    key={`rock-${currentRock.id}-${gameState.isBlocked ? 'bedrock' : currentRock.image}`}
                    src={gameState.isBlocked ? '/game/rocks/coal.png' : currentRock.image}
                    alt={gameState.isBlocked ? 'Bedrock (Blocked)' : currentRock.name}
                    fill unoptimized
                    className={`object-contain drop-shadow-2xl transition-all pointer-events-none ${rockBroken ? 'scale-110 brightness-150' : ''} ${gameState.isBlocked ? 'grayscale brightness-50' : ''}`}
                  />
                  {rockBroken && <div className="absolute inset-0 bg-white/50 rounded-full animate-flash-out pointer-events-none" />}
                  {moneyPopups.map((p) => (
                    <div key={p.id} className="absolute pointer-events-none animate-float-up text-yellow-400 font-bold text-2xl" style={{ left: p.x, top: p.y, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>+${formatNumber(p.amount)}</div>
                  ))}
                  {particles.map((p) => (
                    <div key={p.id} className="absolute w-2 h-2 bg-amber-600 rounded-full pointer-events-none animate-particle" style={{ left: p.x, top: p.y, '--vx': `${p.vx}px`, '--vy': `${p.vy}px` } as React.CSSProperties} />
                  ))}
                  {couponPopups.map((p) => (
                    <div key={p.id} className="absolute left-1/2 -translate-x-1/2 -top-12 pointer-events-none animate-bounce-in">
                      <span className="text-amber-400 font-bold text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">+1 🎟️</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* HP Bar + Next Rock (inside center, below rock) */}
            <div className="w-full max-w-lg px-4 mt-4 space-y-2 z-20">
              {/* Rock HP */}
              <div className="bg-black/60 rounded-lg px-3 py-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-white">HP</span>
                  <span className="text-xs text-gray-200">{formatNumber(gameState.currentRockHP)} / {formatNumber(scaledRockMaxHP)}</span>
                </div>
                <div className="w-full h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
                  <div className="h-full bg-gradient-to-r from-amber-600 to-amber-500 shadow-[0_0_10px_rgba(234,88,12,0.5)] transition-all duration-150" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              {/* Next Rock */}
              {nextRockInfo.nextRock && (
                <div className="bg-black/60 rounded-lg px-3 py-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-white font-medium">Next: {nextRockInfo.nextRock.name}</span>
                    <span className="text-xs text-gray-200">{Math.round(nextRockInfo.progress)}% — {formatNumber(nextRockInfo.clicksNeeded)} clicks left</span>
                  </div>
                  <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
                    <div className="h-full bg-gradient-to-r from-green-600 to-emerald-500 transition-all duration-150" style={{ width: `${nextRockInfo.progress}%` }} />
                  </div>
                </div>
              )}
              {!nextRockInfo.nextRock && (
                <div className="text-center py-1 bg-black/60 rounded-lg px-3">
                  <span className="text-yellow-400 font-bold text-xs">🏆 MAX ROCK UNLOCKED!</span>
                </div>
              )}

              {/* Autoclicker toggle */}
              <div className="flex items-center justify-center gap-3 pt-1 bg-black/50 backdrop-blur-sm rounded-full px-4 py-1.5">
                <span className="text-xs text-white font-medium">Auto-clicker</span>
                {gameState.hasAutoclicker ? (
                  <button onClick={toggleAutoclicker} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${gameState.autoclickerEnabled ? 'bg-cyan-600 text-white shadow-cyan-500/30 shadow-lg' : 'bg-gray-800 text-gray-300 border border-gray-600'}`}>
                    {gameState.autoclickerEnabled ? 'ON' : 'OFF'}
                  </button>
                ) : (
                  <button onClick={buyAutoclicker} disabled={gameState.yatesDollars < scaledAutoclickerCost} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${gameState.yatesDollars >= scaledAutoclickerCost ? 'bg-cyan-700 text-cyan-100 hover:bg-cyan-600' : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'}`}>
                    Buy ${formatNumber(scaledAutoclickerCost)}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ========== RIGHT PANEL — Buildings ========== */}
          <div className="w-80 flex-none flex flex-col self-stretch overflow-y-auto bg-gray-950/90 backdrop-blur-md border-l border-gray-700/40 panel-no-scroll">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/30">
              <span className="text-sm font-bold text-white">Buildings</span>
              <div className="flex items-center gap-2">
                {gameState.stokens > 0 && (
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded">💎 {gameState.stokens}</span>
                )}
                {gameState.lotteryTickets > 0 && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded">🎟️ {gameState.lotteryTickets}</span>
                )}
              </div>
            </div>

            {/* Building List */}
            <div className="flex-1 flex flex-col gap-2 p-3 overflow-y-auto panel-no-scroll">
              {availableBuildings.map(building => {
                const count = getBuildingCount(building.id);
                const cost = getBuildingCostForType(building.id);
                const canAfford = canAffordBuilding(building.id);
                const isMaxed = building.maxCount !== -1 && count >= building.maxCount;
                const isClickable = ['temple', 'wizard_tower', 'bank'].includes(building.id) && count > 0;

                return (
                  <div
                    key={building.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors ${
                      count > 0
                        ? 'border-gray-700/50 bg-gray-800/50 hover:border-amber-500/40 hover:bg-gray-800/70 cursor-pointer'
                        : canAfford
                          ? 'border-gray-700/30 bg-gray-800/30 hover:border-amber-500/30 cursor-pointer'
                          : 'border-gray-700/20 bg-gray-900/40 opacity-60'
                    }`}
                    onClick={() => {
                      if (isClickable) {
                        if (building.id === 'temple') setShowTempleFromPanel(true);
                        if (building.id === 'wizard_tower') setShowWizardFromPanel(true);
                        if (building.id === 'bank') setShowBankFromPanel(true);
                      }
                    }}
                  >
                    {/* Building Image */}
                    <div className="w-12 h-12 flex-none rounded-md border border-gray-700/50 bg-gray-900/60 flex items-center justify-center overflow-hidden">
                      <Image src={building.image} alt={building.name} width={48} height={48} unoptimized className="object-contain" style={{ imageRendering: 'pixelated' }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white">{building.name}</span>
                        {isClickable && <span className="text-[9px] text-yellow-400">⚙️</span>}
                      </div>
                      {count > 0 && (
                        <span className="text-[11px] text-amber-400">Level {count}</span>
                      )}
                      {count === 0 && !canAfford && (
                        <span className="text-[11px] text-gray-500">{building.description.slice(0, 40)}...</span>
                      )}
                    </div>

                    {/* Cost / Buy */}
                    <div className="flex flex-col items-end gap-1 flex-none">
                      {!isMaxed ? (
                        <>
                          <span className={`text-[11px] font-bold ${canAfford ? 'text-yellow-400' : 'text-gray-500'}`}>
                            ${formatNumber(cost)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              buyBuilding(building.id);
                            }}
                            disabled={!canAfford}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                              canAfford
                                ? 'bg-amber-600 hover:bg-amber-500 text-white active:scale-95'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            Buy
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-green-400 font-bold">OWNED</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trinket Shop — below buildings */}
            <div className="border-t border-gray-700/30 px-4 py-3">
              <TrinketShopButton hidden={showTrinketIndex} inline onOpen={() => setTrinketShopOpen(true)} />
            </div>

            {/* Miners Section */}
            <div className="border-t border-gray-700/30 px-4 py-3">
              <div className="rounded-lg border border-gray-700/40 bg-gray-800/60 px-3 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👷</span>
                    <div>
                      <span className="block text-sm font-bold text-white">{gameState.minerCount} miners</span>
                      <span className="text-[10px] text-gray-400">${formatNumber(minerCost)} each</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {[1, 5, 10, 50].map(amount => (
                    <button
                      key={amount}
                      onClick={(e) => { e.stopPropagation(); if (amount === 1) buyMiner(); else buyMiners(amount); }}
                      disabled={gameState.yatesDollars < minerCost}
                      className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${
                        gameState.yatesDollars >= minerCost
                          ? 'bg-amber-600 hover:bg-amber-500 text-white active:scale-95'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      +{amount}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== BOTTOM ACTION BAR — Arcade Style ========== */}
        <div className="flex items-center justify-center gap-4 border-t-4 border-gray-800 bg-gray-900/90 backdrop-blur-md px-6 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3">
            {/* Shop */}
            <button
              onClick={() => setShowShop(true)}
              className="flex h-14 w-28 flex-col items-center justify-center gap-0.5 rounded-lg border-r-4 border-b-4 border-amber-800 bg-amber-600 hover:bg-amber-500 active:border-r-0 active:border-b-0 active:translate-x-1 active:translate-y-1 transition-all"
            >
              <span className="text-lg">🛒</span>
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Shop</span>
            </button>

            {/* Achievements */}
            <button
              onClick={() => setForceOpenAchievements(true)}
              className="flex h-14 w-28 flex-col items-center justify-center gap-0.5 rounded-lg border-r-4 border-b-4 border-gray-700 bg-gray-600 hover:bg-gray-500 active:border-r-0 active:border-b-0 active:translate-x-1 active:translate-y-1 transition-all"
            >
              <span className="text-lg">🏆</span>
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Achievments</span>
            </button>

            {/* Trinket Collection */}
            <button
              onClick={() => setShowTrinketIndex(true)}
              className="flex h-14 w-28 flex-col items-center justify-center gap-0.5 rounded-lg border-r-4 border-b-4 border-purple-800 bg-purple-700 hover:bg-purple-600 active:border-r-0 active:border-b-0 active:translate-x-1 active:translate-y-1 transition-all"
            >
              <span className="text-lg">💎</span>
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Trinkets</span>
            </button>

            {/* Ranking */}
            <button
              onClick={() => setShowRanking(true)}
              className="flex h-14 w-28 flex-col items-center justify-center gap-0.5 rounded-lg border-r-4 border-b-4 border-gray-700 bg-gray-600 hover:bg-gray-500 active:border-r-0 active:border-b-0 active:translate-x-1 active:translate-y-1 transition-all"
            >
              <span className="text-lg">📊</span>
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Ranking</span>
            </button>

            {/* Prestige */}
            <button
              onClick={() => setShowRockSelector(true)}
              className="flex h-14 w-28 flex-col items-center justify-center gap-0.5 rounded-lg border-r-4 border-b-4 border-purple-800 bg-purple-600 hover:bg-purple-500 active:border-r-0 active:border-b-0 active:translate-x-1 active:translate-y-1 transition-all"
            >
              <span className="text-lg">🔄</span>
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Rocks</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(true)}
              className="flex h-14 w-28 flex-col items-center justify-center gap-0.5 rounded-lg border-r-4 border-b-4 border-gray-700 bg-gray-600 hover:bg-gray-500 active:border-r-0 active:border-b-0 active:translate-x-1 active:translate-y-1 transition-all"
            >
              <span className="text-lg">⚙️</span>
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Settings</span>
            </button>
          </div>

          {/* New Pickaxe notification */}
          {canBuyNextPickaxe && !showShop && (
            <button
              onClick={() => setShowShop(true)}
              className="flex h-14 px-4 flex-col items-center justify-center gap-0.5 rounded-lg border-r-4 border-b-4 border-green-800 bg-green-600 hover:bg-green-500 active:border-r-0 active:border-b-0 active:translate-x-1 active:translate-y-1 transition-all animate-pulse"
            >
              <span className="text-lg">⛏️</span>
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">New Pick!</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* OVERLAYS & MODALS (shared between mobile + desktop) */}
      {/* ============================================================ */}
      {showShop && <GameShop onClose={() => setShowShop(false)} />}
      {showRockSelector && <RockSelector onClose={() => setShowRockSelector(false)} />}
      <RankingPanel isOpen={showRanking} onClose={() => setShowRanking(false)} isHardMode={gameState.isHardMode} />
      <MinerSprites />
      {gameState.showPathSelection && <PathSelectionModal onSelectPath={selectPath} />}
      <GoldenCookie />
      <WanderingTrader />
      <TaxPopup />
      <SacrificeModal isOpen={showSacrifice} onClose={() => setShowSacrifice(false)} />
      <GameSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <ForemanJackTutorial />
      {/* Floating trinket shop button — mobile only (desktop uses inline version in right panel) */}
      <div className="lg:hidden">
        <TrinketShopButton hidden={showTrinketIndex} onOpen={() => setTrinketShopOpen(true)} />
      </div>
      <TrinketShopModal isOpen={trinketShopOpen} onClose={() => setTrinketShopOpen(false)} />
      <TrinketIndex isOpen={showTrinketIndex} onClose={() => setShowTrinketIndex(false)} />
      <GameTerminal isOpen={showTerminal} onClose={() => setShowTerminal(false)} onMine={handleMine} />

      {/* Building management modals (from right panel clicks) */}
      {showTempleFromPanel && <TempleModal onClose={() => setShowTempleFromPanel(false)} />}
      <WizardTowerSidebar isOpen={showWizardFromPanel} onClose={() => setShowWizardFromPanel(false)} />
      {showBankFromPanel && <BankModal onClose={() => setShowBankFromPanel(false)} />}

      {/* CSS Animations */}
      <style jsx global>{`
        .panel-no-scroll::-webkit-scrollbar { display: none; }
        .panel-no-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes float-up {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-60px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes particle {
          0% { opacity: 1; transform: translate(0, 0); }
          100% { opacity: 0; transform: translate(var(--vx), calc(var(--vy) + 50px)); }
        }
        @keyframes bounce-in {
          0% { opacity: 0; transform: translateX(-50%) scale(0.5); }
          50% { transform: translateX(-50%) scale(1.2); }
          100% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        .animate-float-up { animation: float-up 1s ease-out forwards; }
        .animate-shake { animation: shake 0.1s ease-in-out; }
        .animate-particle { animation: particle 0.5s ease-out forwards; }
        .animate-bounce-in { animation: bounce-in 0.3s ease-out forwards; }

        @keyframes rock-break {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes flash-out {
          0% { opacity: 0.8; }
          100% { opacity: 0; }
        }
        .animate-rock-break { animation: rock-break 0.3s ease-out; }
        .animate-flash-out { animation: flash-out 0.3s ease-out forwards; }
      `}</style>

      {/* Anti-Cheat Warning Modals */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4">
          <div className="bg-gray-900 border-2 border-red-500 rounded-xl max-w-md w-full p-6 text-center shadow-2xl">
            {gameState.antiCheatWarnings === 1 && (
              <>
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-red-400 mb-4">WARNING 1 of 3</h2>
                <p className="text-white text-lg mb-6">This is your first warning out of 3! Stop auto clicking!!</p>
                <button onClick={() => { setShowWarningModal(false); dismissWarning(); }} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition-colors">I Understand</button>
              </>
            )}
            {gameState.antiCheatWarnings === 2 && (
              <>
                <div className="text-6xl mb-4">🔥</div>
                <h2 className="text-2xl font-bold text-orange-400 mb-4">WARNING 2 of 3</h2>
                <p className="text-white text-lg mb-6">If you do this one more time you&apos;re cooked!</p>
                <button onClick={() => { setShowWarningModal(false); dismissWarning(); }} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition-colors">Last Chance...</button>
              </>
            )}
            {gameState.antiCheatWarnings >= 3 && !gameState.appealPending && (
              <>
                <div className="text-6xl mb-4">💀</div>
                <h2 className="text-2xl font-bold text-red-500 mb-4">FINAL WARNING</h2>
                <p className="text-white text-lg mb-6">Just get out.</p>
                <div className="space-y-4">
                  <textarea value={appealText} onChange={(e) => setAppealText(e.target.value)} placeholder="Wait! I can explain... (write your appeal)" className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 resize-none" rows={3} />
                  <div className="flex gap-3">
                    <button onClick={async () => { if (!appealText.trim()) return; setIsSubmittingAppeal(true); const success = await submitAppeal(appealText); setIsSubmittingAppeal(false); if (success) { setShowWarningModal(false); setAppealText(''); } }} disabled={!appealText.trim() || isSubmittingAppeal} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-bold transition-colors">
                      {isSubmittingAppeal ? 'Submitting...' : 'Submit Appeal'}
                    </button>
                  </div>
                  <p className="text-gray-400 text-sm">Check your email in a lil to see if you got approved or not.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Appeal Pending Overlay */}
      {gameState.appealPending && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4">
          <div className="bg-gray-900 border-2 border-yellow-500 rounded-xl max-w-md w-full p-6 text-center shadow-2xl">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Appeal Pending</h2>
            <p className="text-white text-lg mb-4">Your appeal has been sent to the admins.</p>
            <p className="text-gray-400">Check your email for updates. You cannot play until your appeal is reviewed.</p>
          </div>
        </div>
      )}
    </div>
  );
}
