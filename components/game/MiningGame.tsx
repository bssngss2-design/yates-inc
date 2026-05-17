'use client';

import { useState, useCallback, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { PICKAXES, getNextRockUnlockInfo } from '@/lib/gameData';
import { AUTOCLICKER_COST, AUTOCLICKER_CPS, getPrestigePriceMultiplier, YATES_PICKAXE_ID, DARKNESS_PICKAXE_IDS, LIGHT_PICKAXE_IDS, GamePath, EXOTIC_ROCKS } from '@/types/game';
import GameShop from './GameShop';
import ShipmentModal from './ShipmentModal';
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
import GoldenCookie from './GoldenCookie';
import WanderingTrader from './WanderingTrader';
import SacrificeModal from './SacrificeModal';
import TaxPopup from './TaxPopup';
import BuildingDisplay from './BuildingDisplay';
import GameSettings from './GameSettings';
import ForemanJackTutorial from './ForemanJackTutorial';
import TempleModal from './TempleModal';
import WizardTowerSidebar from './WizardTowerSidebar';
import BankModal from './BankModal';
import ShadySamModal from './ShadySamModal';
import SideLevelPanel from './SideLevelPanel';
import AscensionTree from './AscensionTree';
import { MINER_BASE_DAMAGE, getScaledRockHP, BUILDINGS, BuildingType, getMinerCost } from '@/types/game';
import { ROCKS } from '@/lib/gameData';

interface MiningGameProps {
  onExit?: () => void;
}

/** Single ascension overlay so mobile + desktop PrestigeButtons and the terminal `prestige` command share one modal. */
function AscensionTreeHost() {
  const [open, setOpen] = useState(false);
  const [hcEarned, setHcEarned] = useState(0);
  useEffect(() => {
    const h = (e: Event) => {
      const ce = e as CustomEvent<{ hcEarned?: number }>;
      setHcEarned(typeof ce.detail?.hcEarned === 'number' ? ce.detail.hcEarned : 0);
      setOpen(true);
    };
    window.addEventListener('yates-open-ascension-tree', h);
    return () => window.removeEventListener('yates-open-ascension-tree', h);
  }, []);
  return <AscensionTree isOpen={open} onClose={() => setOpen(false)} hcEarned={hcEarned} />;
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
    getBonusBreakdown,
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
  const scaledAutoclickerCost = Math.floor(AUTOCLICKER_COST * getPrestigePriceMultiplier(gameState.prestigeCount, gameState.isHardMode, gameState.sideLevel || 0));

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
  const [showShadySam, setShowShadySam] = useState(false);
  const [showSideLevel, setShowSideLevel] = useState(false);
  const [customMinerAmount, setCustomMinerAmount] = useState('');
  const [expandedBonusStat, setExpandedBonusStat] = useState<string | null>(null);
  const [desktopStatsOpen, setDesktopStatsOpen] = useState(false);
  const [confirmingPath, setConfirmingPath] = useState<GamePath>(null);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [rockBroken, setRockBroken] = useState(false);
  /** Latest single-tap $ (Cookie-style “money per click” readout) */
  const [lastTapMoney, setLastTapMoney] = useState(0);

  // Anti-cheat warning modal state
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

  useLayoutEffect(() => {
    if (!desktopStatsOpen || !expandedBonusStat) return;
    const row = document.querySelector(`[data-bonus-row="${expandedBonusStat}"]`);
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [desktopStatsOpen, expandedBonusStat]);

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
    if (result.earnedMoney > 0) {
      setLastTapMoney(result.earnedMoney);
    }

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
      const scaledMaxHP = getScaledRockHP(currentRock.clicksToBreak, gameState.prestigeCount, gameState.isHardMode, gameState.sideLevel || 0);
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

  const isExoticActive = gameState.exoticRock?.active && gameState.exoticRock?.rockId;
  const scaledRockMaxHP = isExoticActive ? (gameState.exoticRock?.maxHP || 1) : getScaledRockHP(currentRock.clicksToBreak, gameState.prestigeCount, gameState.isHardMode, gameState.sideLevel || 0);
  const currentHP = isExoticActive ? (gameState.exoticRock?.currentHP || 0) : gameState.currentRockHP;
  const actualProgress = ((scaledRockMaxHP - currentHP) / scaledRockMaxHP) * 100;
  const progressPercent = rockBroken ? 100 : (displayProgress || actualProgress);
  const totalCoupons = gameState.coupons.discount30 + gameState.coupons.discount50 + gameState.coupons.discount100;

  const bonuses = getTotalBonuses();
  const minerDamageBonus = bonuses.minerDamageBonus + bonuses.minerSpeedBonus;
  const minerDps = Math.max(0, Math.ceil(gameState.minerCount * MINER_BASE_DAMAGE * (1 + minerDamageBonus)));

  const baselinePrestigeEarn = gameState.totalMoneyEarnedAtPrestigeStart ?? 0;
  const moneyEarnedThisPrestige = Math.max(0, (gameState.totalMoneyEarned ?? 0) - baselinePrestigeEarn);
  /** Miner-focused $/s estimate (damage converted via break reward vs rock HP); excludes bank/temple/other passives */
  const estimatedMinerMoneyPerSec = useMemo(() => {
    const hp = Math.max(1, scaledRockMaxHP);
    const approxPerBreak =
      currentRock.moneyPerBreak * gameState.prestigeMultiplier * Math.max(0.01, 1 + bonuses.moneyBonus);
    return (minerDps * approxPerBreak) / hp;
  }, [
    scaledRockMaxHP,
    currentRock.moneyPerBreak,
    gameState.prestigeMultiplier,
    bonuses.moneyBonus,
    minerDps,
  ]);

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
    const scaledPrice = Math.floor(nextPickaxe.price * getPrestigePriceMultiplier(gameState.prestigeCount, gameState.isHardMode, gameState.sideLevel || 0));
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
            Your account has been banned from Yates Co.
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

  // Player needs to pick a side if they've prestiged but haven't chosen yet
  const needsPathChoice = gameState.prestigeCount >= 1 && !gameState.chosenPath;
  const sidePathProgressPct = needsPathChoice
    ? 0
    : Math.min(100, Math.round(((gameState.sideLevel || 1) / 100) * 100));

  // =====================
  // BUILDING PANEL HELPERS (for desktop right panel)
  // =====================

  const getBuildingCount = (buildingId: string): number => {
    switch (buildingId) {
      case 'mine': return gameState.buildings.mine.count;
      case 'bank': return gameState.buildings.bank.owned ? 1 : 0;
      case 'factory': return gameState.buildings.factory.count;
      case 'temple': return gameState.buildings.temple.owned ? 1 : 0;
      case 'wizard_tower': return gameState.buildings.wizard_tower.owned ? 1 : 0;
      case 'shipment': return gameState.buildings.shipment.count;
      case 'gem_farm': return gameState.buildings.gem_farm?.count || 0;
      case 'alchemy_lab': return gameState.buildings.alchemy_lab?.count || 0;
      case 'time_machine': return gameState.buildings.time_machine?.count || 0;
      case 'antimatter_condenser': return gameState.buildings.antimatter_condenser?.owned ? 1 : 0;
      case 'prism': return gameState.buildings.prism?.owned ? 1 : 0;
      case 'chancemaker': return gameState.buildings.chancemaker?.count || 0;
      case 'fractal_engine': return gameState.buildings.fractal_engine?.count || 0;
      default: return 0;
    }
  };

  // Building data for right panel — sorted by price, filtered by path and progressive unlocking
  const availableBuildings = useMemo(() => {
    return BUILDINGS.filter(building => {
      if (building.pathRestriction !== null && building.pathRestriction !== gameState.chosenPath) return false;
      // Progressive unlocking: buildings only appear when player hits "see at" threshold
      const totalEarned = gameState.totalMoneyEarned || 0;
      const unlockThresholds: Record<string, number> = {
        mine: 200_000,
        gem_farm: 1_000_000,
        factory: 1_500_000,
        alchemy_lab: 10_000_000,
        time_machine: 1_000_000_000,
        bank: 10_000_000_000,
        antimatter_condenser: 20_000_000_000,
        prism: 225_000_000_000,
        chancemaker: 1_000_000_000_000,
        wizard_tower: 5_000_000_000_000,
        temple: 5_000_000_000_000,
        fractal_engine: 10_000_000_000_000,
        shipment: 50_000_000_000_000,
      };
      const threshold = unlockThresholds[building.id];
      if (threshold && totalEarned < threshold && getBuildingCount(building.id) === 0) return false;
      return true;
    });
  }, [gameState.chosenPath, gameState.totalMoneyEarned]);

  // Collapsible right sidebar state
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

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

  // Exotic rock helper — get the right image based on HP %
  const getExoticRockImage = useMemo(() => {
    if (!gameState.exoticRock?.active || !gameState.exoticRock?.rockId) return null;
    const exotic = EXOTIC_ROCKS.find(r => r.id === gameState.exoticRock.rockId);
    if (!exotic) return null;
    const hpPercent = gameState.exoticRock.maxHP > 0 ? gameState.exoticRock.currentHP / gameState.exoticRock.maxHP : 1;
    if (hpPercent <= 0.3) return exotic.images.hp30;
    if (hpPercent <= 0.7) return exotic.images.hp70;
    return exotic.images.full;
  }, [gameState.exoticRock]);

  // Building click handlers (open management modals)
  const [showTempleFromPanel, setShowTempleFromPanel] = useState(false);
  const [showWizardFromPanel, setShowWizardFromPanel] = useState(false);
  const [showBankFromPanel, setShowBankFromPanel] = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [forceOpenAchievements, setForceOpenAchievements] = useState(false);

  return (
    <div className="fixed inset-0 overflow-hidden select-none z-[100]">
      <AscensionTreeHost />
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
                <Image key={`rock-${getExoticRockImage || currentRock.id}`} src={gameState.isBlocked ? '/game/rocks/coal.png' : getExoticRockImage || currentRock.image} alt={gameState.isBlocked ? 'Bedrock' : (gameState.exoticRock?.active ? 'Exotic Rock' : currentRock.name)} fill unoptimized className={`object-contain drop-shadow-2xl pointer-events-none ${rockBroken ? 'scale-110 brightness-150' : ''} ${gameState.isBlocked ? 'grayscale brightness-50' : ''}`} />
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
                  <span className="text-gray-400 text-[10px] sm:text-xs">{formatNumber(currentHP)} / {formatNumber(scaledRockMaxHP)} HP</span>
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
      {/* DESKTOP — Cookie Clicker inspired layout */}
      {/* ============================================================ */}
      <div className="hidden lg:flex flex-col h-full min-h-0 relative z-10 font-serif antialiased [--cc-brown:#5c3317] [--cc-bg:#dcbfa6] [--cc-panel:#fdf6ea] [--cc-muted:#cbb896] [--cc-buy:#eec84a]" style={{ scrollbarWidth: 'none' }}>
        {/* Main 3-column row */}
        <div className="flex w-full flex-1 min-h-0 grow overflow-hidden shadow-[inset_0_0_0_6px_rgba(92,51,23,0.35)]">

          {/* ========== LEFT — click area (cream panel, CC “bakery zone”) */}
          <div className="w-[min(94vw,30rem)] xl:w-[32rem] flex-none flex flex-col gap-3 self-stretch overflow-y-auto px-4 py-3 bg-[linear-gradient(135deg,var(--cc-panel)_0%,#f0dec4_48%,var(--cc-bg)_100%)] border-r-4 border-[var(--cc-brown)]" style={{ scrollbarWidth: 'none' }}>
            <div className="flex items-center gap-2 flex-wrap">
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="flex items-center gap-2 rounded-sm px-3 py-1.5 border-2 border-t-[#fdf8ee] border-l-[#fdf8ee] border-r-[#3d2918] border-b-[#3d2918] bg-[#cfa87a] hover:bg-[#d8b892] shadow-[inset_0_-2px_0_rgba(0,0,0,0.12)] transition-colors shrink-0"
                >
                  <span className="text-[#3d2918] font-bold text-sm">✕</span>
                  <span className="text-[11px] font-bold text-[#2c1810] uppercase tracking-wider">Exit</span>
                  <span className="text-[9px] text-[#6b5344] hidden sm:inline">(ESC)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="ml-auto flex items-center gap-2 rounded-sm px-3 py-1.5 border-2 border-t-[#fdf8ee] border-l-[#fdf8ee] border-r-[#3d2918] border-b-[#3d2918] bg-[#e8dfd0] hover:bg-[#f2ebe0] shrink-0"
                title="Settings"
              >
                <span aria-hidden="true" className="text-base">⚙️</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2c1810]">Menu</span>
              </button>
            </div>

            <div className="rounded-sm px-3 py-2 border-4 border-double border-[var(--cc-brown)] bg-[#fffdf8]/95 shadow-[inset_0_3px_0_rgba(255,255,255,0.65)]">
              <span className="text-[10px] text-[#5c4332] uppercase tracking-[0.2em] block font-semibold opacity-95">Mining</span>
              <span className="block text-base font-black text-black leading-tight drop-shadow-[0_1px_0_rgba(255,255,240,1)] mt-1">
                {gameState.isBlocked ? 'Blocked' : currentRock.name}
                <span className="text-[13px] text-[#5c4332] font-bold ml-2">Lv.{currentRock.id}</span>
              </span>
              {gameState.minerCount > 0 && (
                <span className="block text-[11px] text-[#2d6b2d] font-bold mt-1">⛏️ {formatNumber(minerDps)} / s</span>
              )}
            </div>

            <div className="relative flex-shrink-0 flex flex-col items-center">
              <div className="w-72 h-72 max-w-full rounded-full bg-[radial-gradient(circle_at_center,rgba(255,230,176,0.55)_0%,transparent_65%)] blur-3xl animate-pulse pointer-events-none absolute top-2 left-1/2 -translate-x-1/2" />

              <div className="relative flex items-center justify-center">
                <div
                  className={`relative w-28 h-28 xl:w-32 xl:h-32 transition-transform origin-bottom-right -mr-4 xl:-mr-6 z-50 ${isSwinging ? 'rotate-[30deg]' : 'rotate-0'}`}
                  style={{ transitionDuration: '0.15s' }}
                >
                  <Image key={`pickaxe-${currentPickaxe.id}`} src={currentPickaxe.image} alt={currentPickaxe.name} fill unoptimized className="object-contain drop-shadow-2xl pointer-events-none" style={{ transform: 'rotate(-30deg)' }} />
                </div>

                <div
                  ref={rockRef}
                  onClick={handleMine}
                  onTouchEnd={handleMine}
                  className="relative z-40 w-56 h-56 xl:w-64 xl:h-64 cursor-pointer touch-manipulation flex items-center justify-center select-none pointer-events-auto"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className={`relative w-52 h-52 xl:w-60 xl:h-60 transition-transform hover:scale-105 active:scale-95 ${rockShake ? 'animate-shake' : ''} ${rockBroken ? 'animate-rock-break' : ''}`}>
                    <Image
                      key={`rock-${getExoticRockImage || currentRock.id}-${gameState.isBlocked ? 'bedrock' : currentRock.image}`}
                      src={gameState.isBlocked ? '/game/rocks/coal.png' : getExoticRockImage || currentRock.image}
                      alt={gameState.isBlocked ? 'Bedrock (Blocked)' : (gameState.exoticRock?.active ? 'Exotic Rock' : currentRock.name)}
                      fill unoptimized
                      className={`object-contain drop-shadow-2xl transition-all pointer-events-none ${rockBroken ? 'scale-110 brightness-150' : ''} ${gameState.isBlocked ? 'grayscale brightness-50' : ''}`}
                    />
                    {rockBroken && <div className="absolute inset-0 bg-white/50 rounded-full animate-flash-out pointer-events-none" />}
                    {moneyPopups.map((p) => (
                      <div key={p.id} className="absolute pointer-events-none animate-float-up font-black text-lg text-[#0a5c0a]" style={{ left: p.x, top: p.y, textShadow: '1px 1px 0 #fff, 2px 2px 3px rgba(0,0,0,0.25)' }}>+${formatNumber(p.amount)}</div>
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
            </div>

            {/* HP Bar + progression — CC progress strip */}
            <div className="w-full space-y-2 z-10">
              <div className="rounded-sm px-3 py-2 border-2 border-[#8b6914] bg-[#fef9f0] shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-black text-[#2c1810]">HP</span>
                  <span className="text-[11px] font-bold text-[#3d2918]">{formatNumber(currentHP)} / {formatNumber(scaledRockMaxHP)}</span>
                </div>
                <div className="w-full h-4 bg-[#c9a87a] rounded-sm overflow-hidden border-2 border-[#5c3317] shadow-[inset_0_3px_6px_rgba(0,0,0,0.2)]">
                  <div className="h-full bg-gradient-to-b from-[#f4c430] to-[#d4a017] border-r-2 border-[#8b6914] transition-all duration-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              {nextRockInfo.nextRock && (
                <div className="rounded-sm px-3 py-2 border-2 border-[#6b8f4a] bg-[#f4f9ef] shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]">
                  <div className="flex justify-between items-center mb-1 gap-2">
                    <span className="text-[11px] font-black text-[#1a3d1a] truncate">Next · {nextRockInfo.nextRock.name}</span>
                    <span className="text-[10px] font-bold text-[#3d5c2a] whitespace-nowrap">{Math.round(nextRockInfo.progress)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#a8c68a] rounded-sm overflow-hidden border-2 border-[#4a6b32]">
                    <div className="h-full bg-gradient-to-b from-[#8fd65a] to-[#4a9c2d] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition-all duration-150" style={{ width: `${nextRockInfo.progress}%` }} />
                  </div>
                  <span className="block text-[9px] font-bold text-[#5c4332] mt-1">{formatNumber(nextRockInfo.clicksNeeded)} clicks to go</span>
                </div>
              )}
              {!nextRockInfo.nextRock && (
                <div className="text-center py-2 rounded-sm px-3 border-4 border-double border-[var(--cc-brown)] bg-[#fff8e8]">
                  <span className="text-[11px] font-black text-[#7a4a00]">🏆 MAX ROCK</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 py-2 rounded-sm px-3 border-2 border-[#8b6914] bg-[#ebe0cc] shadow-[inset_0_2px_0_rgba(255,255,240,0.8)]">
                <span className="text-[11px] font-black text-[#2c1810]">Auto-clicker</span>
                {gameState.hasAutoclicker ? (
                  <button type="button" onClick={toggleAutoclicker} className={`px-3 py-1 rounded-sm text-[11px] font-black border-2 border-t-[#f5f5f5] border-l-[#f5f5f5] border-r-[#284848] border-b-[#284848] transition-all ${gameState.autoclickerEnabled ? 'bg-[#4a9ea4] text-white' : 'bg-[#cfd8d9] text-[#2c1810]'}`}>
                    {gameState.autoclickerEnabled ? 'ON' : 'OFF'}
                  </button>
                ) : (
                  <button type="button" onClick={buyAutoclicker} disabled={gameState.yatesDollars < scaledAutoclickerCost} className={`px-3 py-1 rounded-sm text-[11px] font-black border-2 border-t-[#fff] border-l-[#fff] border-r-[#4a3010] border-b-[#4a3010] transition-all ${gameState.yatesDollars >= scaledAutoclickerCost ? 'bg-[var(--cc-buy)] text-[#2c1810] hover:brightness-105' : 'bg-[#b8a896] text-[#6b5c4a] cursor-not-allowed'}`}>
                    Buy ${formatNumber(scaledAutoclickerCost)}
                  </button>
                )}
              </div>
            </div>

            <div className="h-0.5 bg-[var(--cc-brown)]/35 rounded-full" />

            {/* Achievements modal host only */}
            <AchievementsPanel isTrinketIndexOpen={showTrinketIndex} setIsTrinketIndexOpen={setShowTrinketIndex} forceOpen={forceOpenAchievements} onForceOpenHandled={() => setForceOpenAchievements(false)} hidden />

            {totalCoupons > 0 && (
              <div className="rounded-sm px-3 py-2 border-2 border-[#6b3d7a] bg-[#faf5ff] shadow-[inset_0_2px_0_rgba(255,255,255,0.9)]">
                <span className="text-[10px] text-[#5c4332] font-black uppercase tracking-wider">Coupons</span>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {gameState.coupons.discount30 > 0 && <div className="flex items-center gap-0.5 border border-[#2d6b2d] bg-[#e8f5e8] px-1.5 py-0.5 rounded-sm"><span className="text-[10px] text-[#0d4d0d] font-black">30%</span><span className="text-[#1a5c1a] font-black text-[10px]">×{gameState.coupons.discount30}</span></div>}
                  {gameState.coupons.discount50 > 0 && <div className="flex items-center gap-0.5 border border-[#1e4f7a] bg-[#e8f4fc] px-1.5 py-0.5 rounded-sm"><span className="text-[10px] text-[#0d4a7a] font-black">50%</span><span className="text-[#124a72] font-black text-[10px]">×{gameState.coupons.discount50}</span></div>}
                  {gameState.coupons.discount100 > 0 && <div className="flex items-center gap-0.5 border border-[#8b6914] bg-[#fff8dc] px-1.5 py-0.5 rounded-sm"><span className="text-[10px] text-[#8b6914] font-black">FREE</span><span className="text-[#6b4810] font-black text-[10px]">×{gameState.coupons.discount100}</span></div>}
                </div>
              </div>
            )}
          </div>

          {/* ========== CENTER — Bank + classic CC store list ========== */}
          <div className="grow flex flex-col min-h-0 min-w-0 relative overflow-hidden bg-[linear-gradient(180deg,#f4e4c8_0%,#eccd9b_40%,#dfb87a_88%,#cfa66a_100%)] border-x-4 border-[var(--cc-brown)] shadow-[inset_0_12px_28px_rgba(255,248,220,0.65)]">
            <div className="shrink-0 mx-3 mt-3 rounded-sm border-4 border-double border-[var(--cc-brown)] bg-[#fffef9] px-4 py-3 shadow-[inset_0_3px_0_rgba(255,255,255,0.9),0_4px_14px_rgba(60,35,12,0.2)]">
              <span className="text-[11px] font-black text-[#5c4332] uppercase tracking-[0.25em] text-center block">Bank</span>
              <p className="text-center text-4xl xl:text-[2.75rem] font-black text-black mt-1 leading-none tracking-tight" style={{ textShadow: '0 2px 0 #fff, 0 3px 8px rgba(70,42,14,0.15)' }}>
                ${formatNumber(gameState.yatesDollars)}
              </p>
            </div>

            {/* Store title bar */}
            <div className="shrink-0 mx-0 mt-1 px-2 py-1.5 flex items-center gap-2 flex-wrap bg-[linear-gradient(180deg,#c9a06a_0%,#a67c47_100%)] border-y-2 border-[#5c3317] shadow-[inset_0_1px_0_rgba(255,230,176,0.55)]">
              <span className="text-[15px] font-black text-black drop-shadow-[0_1px_0_rgba(255,240,210,1)] uppercase tracking-[0.15em]" style={{ textShadow: '0 2px 0 rgba(139,105,61,0.35)' }}>
                Store
              </span>
              <div className="flex items-center gap-1.5 flex-wrap font-sans">
                <span className="text-[10px] font-black text-black bg-[#ffeec9] px-2 py-0.5 rounded-sm border border-[#8b6914] shadow-[inset_0_1px_0_#fff]">
                  Lottery {gameState.lotteryTickets.toLocaleString()} 🎟️
                </span>
                <span className="text-[10px] font-black text-[#0d3d5c] bg-[#e8f4ff] px-2 py-0.5 rounded-sm border border-[#2a5f8f] shadow-[inset_0_1px_0_#fff]">
                  Stokens {gameState.stokens} 💎
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#3d2918] ml-auto opacity-95 hidden xl:inline truncate italic max-w-[12rem]">Mine fast. Spend faster.</span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto panel-no-scroll pb-5 pt-0 border-t-4 border-[#9c7248] shadow-[inset_0_4px_12px_rgba(80,50,22,0.12)] bg-[linear-gradient(180deg,rgba(255,248,230,0.4)_0%,transparent_140px)]">
              {availableBuildings.map(building => {
                const count = getBuildingCount(building.id);
                const cost = getBuildingCostForType(building.id);
                const canAfford = canAffordBuilding(building.id);
                const isMaxed = building.maxCount !== -1 && count >= building.maxCount;
                const isClickable = ['temple', 'wizard_tower', 'bank', 'shipment'].includes(building.id) && count > 0;

                const rowBg =
                  count > 0
                    ? 'bg-[#fffdf6] hover:bg-[#fffef9]'
                    : canAfford
                      ? 'bg-[#fff0c8] hover:bg-[#fff5d6]'
                      : 'bg-[#d4c4a8]/95';

                return (
                  <div
                    key={building.id}
                    role="presentation"
                    className={`flex items-stretch gap-2.5 border-b-[3px] border-[#b8956a] px-2.5 py-2 transition-colors shadow-[inset_0_1px_0_rgba(255,255,250,0.65)] font-sans ${rowBg} ${
                      canAfford || count > 0 ? '' : 'brightness-[0.97]'
                    }`}
                    onClick={() => {
                      if (isClickable) {
                        if (building.id === 'temple') setShowTempleFromPanel(true);
                        if (building.id === 'wizard_tower') setShowWizardFromPanel(true);
                        if (building.id === 'bank') setShowBankFromPanel(true);
                        if (building.id === 'shipment') setShowShipmentModal(true);
                      }
                    }}
                  >
                    <div className="w-12 h-12 flex-none self-center rounded-sm border-[3px] border-[#5c3317] bg-[linear-gradient(180deg,#fdfaf3,#e8d8bc)] flex items-center justify-center overflow-hidden shadow-[inset_0_3px_6px_rgba(255,255,255,0.75),inset_0_-2px_6px_rgba(0,0,0,0.12)]">
                      <Image src={building.image} alt={building.name} width={40} height={40} unoptimized className="object-contain drop-shadow-[0_1px_0_rgba(255,255,255,1)]" style={{ imageRendering: 'pixelated' }} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-1 flex-wrap leading-tight">
                        <span className="text-[15px] font-black text-black drop-shadow-[0_1px_0_rgba(255,254,246,1)]">{building.name}</span>
                        {count > 0 && (
                          <span className="text-[11px] font-black text-[#6b5344]">· {count}</span>
                        )}
                        {isClickable && (
                          <span className="text-[9px] font-black uppercase text-[#8b6914] border border-[#8b6914] bg-[#fff8dc] px-1 rounded-[1px]">Open</span>
                        )}
                      </div>
                      {count > 0 ? (
                        <span className="text-[11px] text-[#2d6b2d] font-bold mt-0.5">Purchased!</span>
                      ) : (
                        <p className="text-[10px] text-[#4a3928] mt-1 leading-snug line-clamp-2 font-semibold">{building.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-none justify-center pr-1 min-w-[4.5rem]">
                      {!isMaxed ? (
                        <>
                          <span className={`text-[12px] font-black ${canAfford ? 'text-[#069900]' : 'text-[#7a6a55]'}`}>
                            ${formatNumber(cost)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              buyBuilding(building.id);
                            }}
                            disabled={!canAfford}
                            className={`w-full min-w-[3.5rem] px-2 py-1 rounded-sm text-[11px] font-black uppercase tracking-wide border-2 border-t-[#fffefc] border-l-[#fffefc] border-r-[#4a3018] border-b-[#4a3018] shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] transition-all active:border-t-transparent active:border-l-transparent active:translate-x-px active:translate-y-px ${
                              canAfford
                                ? 'bg-[linear-gradient(180deg,#ffe97a,var(--cc-buy))] text-black hover:brightness-[1.03]'
                                : 'bg-[#a89880] border-t-[#c4b8a8] border-l-[#c4b8a8] text-[#5c5348] cursor-not-allowed shadow-none opacity-95'
                            }`}
                          >
                            Buy
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-[#0d5c26] font-black uppercase text-right">Owned</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========== RIGHT — Progress sidebar (matching CC panels) ========== */}
          <button
            type="button"
            onClick={() => setRightPanelCollapsed(prev => !prev)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 rounded-l-md border-2 border-r-0 border-[var(--cc-brown)] bg-[#e8d4b0] hover:bg-[#f0dfc0] px-1 py-4 text-black font-black text-xs shadow-[inset_2px_0_0_rgba(255,255,255,0.5)]"
            style={{ right: rightPanelCollapsed ? 0 : 320 }}
          >
            {rightPanelCollapsed ? '◀' : '▶'}
          </button>
          <div className={`${rightPanelCollapsed ? 'w-0 overflow-hidden opacity-0' : 'w-80'} flex-none flex flex-col self-stretch min-h-0 overflow-hidden bg-[linear-gradient(160deg,var(--cc-panel)_0%,#ebcfa6_58%,var(--cc-bg)_100%)] border-l-4 border-[var(--cc-brown)] panel-no-scroll transition-all duration-300`}>
            <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto panel-no-scroll p-3 border-b-[3px] border-[var(--cc-brown)]/40">
              <div className="flex justify-center shrink-0 [&_button]:rounded-sm [&_button]:border-2 [&_button]:border-t-[#f5dde8] [&_button]:border-l-[#f5dde8] [&_button]:border-r-[#4a2035] [&_button]:border-b-[#4a2035] [&_button]:shadow-[inset_0_-2px_0_rgba(0,0,0,0.12)] [&_button]:font-black">
                <PrestigeButton />
              </div>

              {/* Path */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <span className="text-[11px] font-black text-black">
                  {needsPathChoice ? 'Choose your side' : 'Light / Dark'}
                </span>
                {needsPathChoice && (
                  <span className="text-[10px] text-[#8b6914] font-black animate-pulse">Pick before you crumble!</span>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (needsPathChoice) setConfirmingPath('light');
                      else if (gameState.chosenPath === 'light') setShowSideLevel(true);
                    }}
                    disabled={!needsPathChoice && gameState.chosenPath !== 'light'}
                    className={`flex-1 flex flex-col items-center gap-0.5 rounded-sm border-[3px] px-2 py-2 shadow-[inset_0_2px_0_rgba(255,255,255,0.5)] transition-all ${
                      gameState.chosenPath === 'light'
                        ? 'border-[#b8952a] bg-[#fffbeb] hover:brightness-[1.02] cursor-pointer'
                        : needsPathChoice
                          ? 'border-[#d4bc6a] bg-[#fff8dc] hover:brightness-[1.03] cursor-pointer'
                          : 'border-[#a89880] bg-[#dfd5c8] opacity-65 cursor-default'
                    }`}
                  >
                    <span className="text-base leading-none">☀️</span>
                    <span className={`text-[10px] font-black ${gameState.chosenPath === 'light' ? 'text-[#8b6914]' : needsPathChoice ? 'text-[#a67c00]' : 'text-[#6b5c48]'}`}>Light</span>
                    <span className={`text-[11px] font-black ${gameState.chosenPath === 'light' ? 'text-black' : 'text-[#5c5348]'}`}>
                      {gameState.chosenPath === 'light' ? `Lv.${gameState.sideLevel || 1}` : needsPathChoice ? 'Pick' : 'Locked'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (needsPathChoice) setConfirmingPath('darkness');
                      else if (gameState.chosenPath === 'darkness') setShowSideLevel(true);
                    }}
                    disabled={!needsPathChoice && gameState.chosenPath !== 'darkness'}
                    className={`flex-1 flex flex-col items-center gap-0.5 rounded-sm border-[3px] px-2 py-2 shadow-[inset_0_2px_0_rgba(255,255,255,0.35)] transition-all ${
                      gameState.chosenPath === 'darkness'
                        ? 'border-[#5c4488] bg-[#efe8fb] hover:brightness-[1.02] cursor-pointer'
                        : needsPathChoice
                          ? 'border-[#8b74a8] bg-[#f5f0ff] hover:brightness-[1.03] cursor-pointer'
                          : 'border-[#9a8aa8] bg-[#e8e0f0] opacity-65 cursor-default'
                    }`}
                  >
                    <span className="text-base leading-none">🌙</span>
                    <span className={`text-[10px] font-black ${gameState.chosenPath === 'darkness' ? 'text-[#4a2870]' : needsPathChoice ? 'text-[#5c4490]' : 'text-[#6b6280]'}`}>Darkness</span>
                    <span className={`text-[11px] font-black ${gameState.chosenPath === 'darkness' ? 'text-black' : 'text-[#5c5480]'}`}>
                      {gameState.chosenPath === 'darkness' ? `Lv.${gameState.sideLevel || 1}` : needsPathChoice ? 'Pick' : 'Locked'}
                    </span>
                  </button>
                </div>
              </div>

              {gameState.prestigeCount > 0 && (
                <div className="shrink-0 font-sans px-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[9px] font-black uppercase text-[#4a3560]">Side path</span>
                    <span className="text-[9px] font-bold text-[#5c4488]">
                      {needsPathChoice ? '—' : `${sidePathProgressPct}%`}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-sm bg-[#dcd0ec] border-2 border-[#5c4488]/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-b from-[#c4a0e8] to-[#7a4cae] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-200"
                      style={{ width: `${needsPathChoice ? 0 : sidePathProgressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Active Buffs */}
              {activeEffects.length > 0 && (
                <div className="flex flex-col gap-2 shrink-0">
                  <span className="text-[11px] font-black text-black">Buffs</span>
                  {activeEffects.map(e => (
                    <div
                      key={e.id}
                      className={`flex items-center gap-2 rounded-sm border-2 px-3 py-1.5 font-sans shadow-[inset_0_2px_0_rgba(255,255,255,0.45)] ${
                        e.type === 'debuff' ? 'border-[#a04040] bg-[#fde8e8]' : 'border-[#8b6914] bg-[#fff8e8]'
                      }`}
                    >
                      <span className="text-sm leading-none">{e.icon}</span>
                      <span className={`grow text-[11px] font-semibold ${e.type === 'debuff' ? 'text-[#7a1515]' : 'text-[#4a3920]'}`}>{e.name}</span>
                      <span className={`text-[11px] font-black ${e.type === 'debuff' ? 'text-[#b02020]' : 'text-[#8b6914]'}`}>{fmtTime(e.timeLeft)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trinket slot + shop — slot sits directly above shop entry */}
            <div className="shrink-0 border-t-[3px] border-[var(--cc-brown)] bg-[#f2e6d4] px-4 py-2 flex flex-col gap-2">
              <div className="w-full flex justify-center font-sans">
                <TrinketSlot />
              </div>
              <TrinketShopButton hidden={showTrinketIndex} inline onOpen={() => setTrinketShopOpen(true)} />
            </div>

            {/* Miners Section */}
            <div className="shrink-0 px-4 py-3 bg-[linear-gradient(180deg,#dcbfa8,#cbb398)] border-t-[3px] border-[var(--cc-brown)]">
              <div className="rounded-sm border-[3px] border-double border-[var(--cc-brown)] bg-[#fefaf4] px-3 py-3 shadow-[inset_0_2px_8px_rgba(255,255,255,0.8)] font-sans">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">👷</span>
                    <div>
                      <span className="block text-sm font-black text-black">{gameState.minerCount} miners</span>
                      <span className="text-[10px] font-bold text-[#5c4332]">${formatNumber(minerCost)} each</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {[1, 5, 10, 50].map(amount => (
                    <button
                      type="button"
                      key={amount}
                      onClick={(e) => { e.stopPropagation(); if (amount === 1) buyMiner(); else buyMiners(amount); }}
                      disabled={gameState.yatesDollars < minerCost}
                      className={`flex-1 py-1.5 rounded-sm text-[10px] font-black border-2 border-t-[#fffefb] border-l-[#fffefb] border-r-[#4a3018] border-b-[#4a3018] transition-all ${
                        gameState.yatesDollars >= minerCost
                          ? 'bg-[linear-gradient(180deg,#ffe97a,var(--cc-buy))] text-black hover:brightness-[1.02]'
                          : 'bg-[#bdb0a2] text-[#5c5448] cursor-not-allowed border-t-[#d4cbc2] border-l-[#d4cbc2]'
                      }`}
                    >
                      +{amount}
                    </button>
                  ))}
                </div>
                {/* Custom buy amount */}
                <div className="flex gap-1.5 mt-1.5">
                  <input
                    type="number"
                    min={1}
                    placeholder="#"
                    value={customMinerAmount}
                    onChange={(e) => setCustomMinerAmount(e.target.value)}
                    className="flex-1 bg-[#fdfaf6] border-2 border-[#8b7355] rounded-sm px-2 py-1 text-[10px] text-black font-bold placeholder-[#998877] focus:outline-none focus:border-[#5c3317]"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const amt = parseInt(customMinerAmount, 10);
                      if (amt > 0) { buyMiners(amt); setCustomMinerAmount(''); }
                    }}
                    disabled={!customMinerAmount || parseInt(customMinerAmount, 10) <= 0 || gameState.yatesDollars < minerCost}
                    className={`px-3 py-1 rounded-sm text-[10px] font-black uppercase border-2 border-t-[#fffefb] border-l-[#fffefb] border-r-[#4a3018] border-b-[#4a3018] transition-all ${
                      customMinerAmount && parseInt(customMinerAmount, 10) > 0 && gameState.yatesDollars >= minerCost
                        ? 'bg-[linear-gradient(180deg,#ffe97a,var(--cc-buy))] text-black hover:brightness-[1.02]'
                        : 'bg-[#bdb0a2] text-[#5c5448] cursor-not-allowed'
                    }`}
                  >
                    Buy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {desktopStatsOpen && (
          <>
            <button
              type="button"
              aria-label="Close stats"
              className="fixed inset-0 bg-black/40 z-[45] lg:block hidden"
              onClick={() => setDesktopStatsOpen(false)}
            />
            <div className="fixed lg:block hidden z-[46] bottom-[5.65rem] right-4 left-4 max-w-xl mx-auto flex max-h-[calc(100dvh-5.75rem)] flex-col rounded-md border-[3px] border-double border-[var(--cc-brown)] bg-[var(--cc-panel)] shadow-[0_8px_36px_rgba(40,25,12,0.45)] overflow-hidden font-serif">
              <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b-[3px] border-[var(--cc-brown)] bg-[linear-gradient(180deg,#c9a06a,#a67842)]">
                <span className="text-sm font-black text-black uppercase tracking-[0.15em]" style={{ textShadow: '0 1px 0 rgba(255,245,214,1)' }}>
                  Stats
                </span>
                <button type="button" onClick={() => setDesktopStatsOpen(false)} className="text-[11px] font-black text-black hover:bg-[#fdf4e0] px-2 py-1 rounded-sm border border-[#5c3317] shadow-[inset_0_1px_0_#fff]">
                  Close ✕
                </button>
              </div>
              <div className="stats-panel-scroll flex w-full max-w-none flex-col gap-4 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 text-left touch-pan-y bg-[#fffefb] border-t-4 border-[#deb887] font-sans max-h-[calc(100dvh-5.75rem-3.25rem)]">
                <section className="w-full shrink-0 space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5c4332] border-b-2 border-[#c9a887] pb-1">
                    Totals &amp; rates
                  </h3>
                  <dl className="w-full rounded-sm border-2 border-[#8b6914] bg-[#fffdf6] p-3 space-y-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <div className="flex justify-between gap-2">
                      <dt className="text-[10px] font-black text-[#5c4332] uppercase">Total $ earned</dt>
                      <dd className="text-[11px] font-black text-black tabular-nums">${formatNumber(gameState.totalMoneyEarned ?? 0)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[10px] font-black text-[#5c4332] uppercase">This prestige $</dt>
                      <dd className="text-[11px] font-black text-black tabular-nums">${formatNumber(moneyEarnedThisPrestige)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[10px] font-black text-[#5c4332] uppercase">Cookie taps</dt>
                      <dd className="text-[11px] font-black text-black tabular-nums">{formatNumber(gameState.totalClicks ?? 0)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[10px] font-black text-[#5c4332] uppercase leading-tight">Money per tap <span className="normal-case font-semibold opacity-85">(last hit)</span></dt>
                      <dd className="text-[11px] font-black text-[#145214] tabular-nums">{lastTapMoney > 0 ? `$${formatNumber(lastTapMoney)}` : '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[10px] font-black text-[#5c4332] uppercase leading-tight">Money per sec <span className="normal-case font-semibold opacity-85">(~miners)</span></dt>
                      <dd className="text-[11px] font-black text-[#144a72] tabular-nums">${formatNumber(Math.round(estimatedMinerMoneyPerSec))}</dd>
                    </div>
                  </dl>
                </section>
                <section className="w-full shrink-0 flex flex-col gap-2">
                  <h3 className="shrink-0 text-[10px] font-black uppercase tracking-[0.2em] text-[#5c4332] border-b-2 border-[#c9a887] pb-1">
                    Bonuses
                  </h3>
                  <p className="shrink-0 text-[10px] text-[#6b5344] font-semibold">Tap a row for sources. Scroll when the list is long or expanded.</p>
                  <div className="flex w-full flex-col gap-1 rounded-sm border-2 border-[#8b6914] bg-[#fffdf6] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <div className="space-y-0.5">
                      {([
                        { key: 'moneyBonus' as const, icon: '💰', label: 'Money', color: 'text-green-700', val: bonuses.moneyBonus },
                        { key: 'rockDamageBonus' as const, icon: '💥', label: 'Damage', color: 'text-red-700', val: bonuses.rockDamageBonus },
                        { key: 'clickSpeedBonus' as const, icon: '⚡', label: 'Click', color: 'text-sky-800', val: bonuses.clickSpeedBonus },
                        { key: 'couponBonus' as const, icon: '🎟️', label: 'Lottery', color: 'text-amber-900', val: bonuses.couponBonus },
                        { key: 'luckBonus' as const, icon: '🍀', label: 'Luck', color: 'text-emerald-800', val: bonuses.luckBonus },
                        { key: 'dropChanceBonus' as const, icon: '🎯', label: 'Drops', color: 'text-indigo-800', val: bonuses.dropChanceBonus },
                        { key: 'minerDamageBonus' as const, icon: '⛏️', label: 'Miner Dmg', color: 'text-orange-900', val: bonuses.minerDamageBonus },
                        { key: 'minerSpeedBonus' as const, icon: '🏃', label: 'Miner Spd', color: 'text-teal-800', val: bonuses.minerSpeedBonus },
                      ]).map(s => (
                        <div key={s.key} data-bonus-row={s.key}>
                          <button
                            type="button"
                            onClick={() => setExpandedBonusStat(expandedBonusStat === s.key ? null : s.key)}
                            className={`w-full text-left text-[11px] font-bold ${s.color} flex items-center justify-between py-1.5 px-2 rounded-sm border border-transparent hover:border-[#b8956a] hover:bg-[#fff9ef] ${s.val <= 0 ? 'opacity-70' : ''}`}
                          >
                            <span>
                              {s.icon}{' '}
                              {s.val > 0 ? '+' : ''}
                              {s.key === 'luckBonus' || s.key === 'dropChanceBonus' ? s.val.toFixed(1) : `${(s.val * 100).toFixed(0)}%`}{' '}
                              {s.label}
                              {s.val <= 0 && <span className="text-[9px] font-semibold text-[#998877] ml-1">(none)</span>}
                            </span>
                            <span className="text-[10px] text-[#8b7355] font-black">{expandedBonusStat === s.key ? '▼' : '▶'}</span>
                          </button>
                          {expandedBonusStat === s.key && (
                            <div className="ml-2 mt-1 mb-2 p-2 rounded-sm bg-[#f5edd8] border-2 border-[#c9a887] space-y-1">
                              {getBonusBreakdown(s.key).map((entry, i) => (
                                <div key={i} className="flex justify-between text-[10px] gap-2 font-semibold">
                                  <span className="text-[#3d2920] shrink">{entry.source}</span>
                                  <span className={entry.value >= 0 ? 'text-[#0d6620]' : 'text-[#8b1515]'}>
                                    {entry.value >= 0 ? '+' : ''}
                                    {s.key === 'luckBonus' || s.key === 'dropChanceBonus' ? entry.value.toFixed(1) : `${(entry.value * 100).toFixed(0)}%`}
                                  </span>
                                </div>
                              ))}
                              {getBonusBreakdown(s.key).length === 0 && (
                                <div className="text-[10px] text-[#7a6655] font-semibold">No sources — stat is 0 or only from stacking elsewhere.</div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}


        {/* ========== BOTTOM MENU — Cookie Clicker “button panel” ========== */}
        <div className="shrink-0 flex items-center justify-center gap-3 border-t-[6px] border-[#2a1810] bg-[linear-gradient(180deg,#3d2920_0%,#2a1810_100%)] px-4 py-2.5 overflow-x-auto panel-no-scroll shadow-[inset_0_3px_0_rgba(255,230,176,0.08)] font-sans">
          <div className="flex items-center gap-2 min-h-[4.85rem]">
            <button
              type="button"
              onClick={() => setDesktopStatsOpen((v) => !v)}
              className={`flex h-14 w-[6.95rem] flex-col items-center justify-center gap-0.5 rounded-sm border-2 border-t-[#f5ebe0] border-l-[#f5ebe0] border-r-[#1f1410] border-b-[#1f1410] font-black shadow-[inset_0_-2px_4px_rgba(0,0,0,0.15)] transition-all shrink-0 active:border-t-transparent active:border-l-transparent active:translate-x-px active:translate-y-px ${
                desktopStatsOpen ? 'bg-[#c5e8ff] text-[#0d3d5c]' : 'bg-[#e9dcc8] text-[#1a2818] hover:brightness-[1.02]'
              }`}
              title="Stats"
            >
              <span className="text-lg leading-none">📈</span>
              <span className="text-[10px] uppercase tracking-wide">Stats</span>
            </button>

            <button
              type="button"
              onClick={() => setShowShop(true)}
              className="flex h-14 w-[6.95rem] flex-col items-center justify-center gap-0.5 rounded-sm border-2 border-t-[#fffaf0] border-l-[#fffaf0] border-r-[#3d2918] border-b-[#3d2918] bg-[linear-gradient(180deg,#ffe893,var(--cc-buy))] text-black font-black shadow-[inset_0_-2px_5px_rgba(80,42,12,0.15)] hover:brightness-[1.03] active:border-t-transparent active:border-l-transparent active:translate-x-px active:translate-y-px shrink-0"
            >
              <span className="text-lg leading-none">🛒</span>
              <span className="text-[10px] uppercase tracking-wide">Shop</span>
            </button>

            <button
              type="button"
              onClick={() => setForceOpenAchievements(true)}
              className="flex h-14 w-[6.95rem] flex-col items-center justify-center gap-0.5 rounded-sm border-2 border-t-[#f5ebe0] border-l-[#f5ebe0] border-r-[#1f1410] border-b-[#1f1410] bg-[#e4d8c9] hover:bg-[#ebe2d8] text-[#1c1814] font-black shadow-[inset_0_-2px_4px_rgba(0,0,0,0.12)] active:border-t-transparent active:border-l-transparent active:translate-x-px active:translate-y-px shrink-0"
            >
              <span className="text-lg leading-none">🏆</span>
              <span className="text-[10px] uppercase tracking-wide">Achiev.</span>
            </button>

            {(gameState.prestigeCount >= 2 || gameState.ownedTrinketIds.length > 0) && (
              <button
                type="button"
                onClick={() => setShowTrinketIndex(true)}
                className="flex h-14 w-[6.95rem] flex-col items-center justify-center gap-0.5 rounded-sm border-2 border-t-[#f7ecff] border-l-[#f7ecff] border-r-[#2a1438] border-b-[#2a1438] bg-[#e4cfe8] hover:bg-[#ecdaf2] text-[#2a1438] font-black shadow-[inset_0_-2px_4px_rgba(0,0,0,0.12)] active:border-t-transparent active:border-l-transparent active:translate-x-px active:translate-y-px shrink-0"
              >
                <span className="text-lg leading-none">💎</span>
                <span className="text-[10px] uppercase tracking-wide">Trink.</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowRanking(true)}
              className="flex h-14 w-[6.95rem] flex-col items-center justify-center gap-0.5 rounded-sm border-2 border-t-[#f5ebe0] border-l-[#f5ebe0] border-r-[#1f1410] border-b-[#1f1410] bg-[#ddd2c6] hover:bg-[#e5dcd2] text-[#1e1814] font-black shadow-[inset_0_-2px_4px_rgba(0,0,0,0.12)] active:border-t-transparent active:border-l-transparent active:translate-x-px active:translate-y-px shrink-0"
            >
              <span className="text-lg leading-none">📊</span>
              <span className="text-[10px] uppercase tracking-wide">Rank</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRockSelector(true)}
              className="flex h-14 w-[6.95rem] flex-col items-center justify-center gap-0.5 rounded-sm border-2 border-t-[#fbe8ff] border-l-[#fbe8ff] border-r-[#3a1436] border-b-[#3a1436] bg-[linear-gradient(180deg,#f0d8f5,#dcb8dc)] hover:brightness-[1.03] text-[#341030] font-black shadow-[inset_0_-2px_5px_rgba(40,10,44,0.12)] active:border-t-transparent active:border-l-transparent active:translate-x-px active:translate-y-px shrink-0"
            >
              <span className="text-lg leading-none">🔄</span>
              <span className="text-[10px] uppercase tracking-wide">Rocks</span>
            </button>

            {getBuildingCount('temple') > 0 && (
              <button
                type="button"
                onClick={() => setShowTempleFromPanel(true)}
                className="flex h-14 w-[6.95rem] flex-col items-center justify-center gap-0.5 rounded-sm border-2 border-t-[#ffe8ea] border-l-[#ffe8ea] border-r-[#3d1818] border-b-[#3d1818] bg-[linear-gradient(180deg,#fad4d9,#eab0b9)] hover:brightness-[1.02] text-[#381018] font-black shadow-[inset_0_-2px_5px_rgba(50,14,22,0.12)] active:border-t-transparent active:border-l-transparent active:translate-x-px active:translate-y-px shrink-0"
                title="Temple"
              >
                <span className="text-lg leading-none">🏛️</span>
                <span className="text-[10px] uppercase tracking-wide">Temple</span>
              </button>
            )}
            {gameState.chosenPath === 'darkness' && gameState.prestigeCount >= 5 && (
              <button
                type="button"
                onClick={() => setShowShadySam(true)}
                className="flex h-14 w-[6.95rem] flex-col items-center justify-center gap-0.5 rounded-sm border-2 border-t-[#e8e0f5] border-l-[#e8e0f5] border-r-[#241030] border-b-[#241030] bg-[#b8aac8] hover:bg-[#c4b9d6] shadow-[inset_0_-2px_5px_rgba(0,0,0,0.2)] active:border-t-transparent active:border-l-transparent active:translate-x-px active:translate-y-px shrink-0 font-black text-[#1a0824]"
              >
                <Image src="/game/buildings/shadysam.png" alt="Sam" width={28} height={28} style={{ imageRendering: 'pixelated' }} unoptimized />
                <span className="text-[10px] uppercase tracking-wide leading-none">Sam</span>
              </button>
            )}
          </div>

          {canBuyNextPickaxe && !showShop && (
            <button
              type="button"
              onClick={() => setShowShop(true)}
              className="flex h-14 shrink-0 px-5 flex-col items-center justify-center gap-0.5 rounded-sm border-2 border-t-[#d8ffd8] border-l-[#d8ffd8] border-r-[#103018] border-b-[#103018] bg-[linear-gradient(180deg,#8fd96a,#4aaf48)] animate-pulse ml-2 font-black text-black shadow-[inset_0_-2px_5px_rgba(0,0,0,0.15)] active:border-t-transparent active:border-l-transparent active:translate-x-px active:translate-y-px"
            >
              <span className="text-lg leading-none">⛏️</span>
              <span className="text-[10px] uppercase tracking-wide leading-tight">New!</span>
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

      {/* Path choice blocker — covers the mining area when player needs to pick a side */}
      {needsPathChoice && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center max-w-md px-6">
            <h2 className="text-3xl font-bold text-white mb-3">Choose Your Side</h2>
            <p className="text-gray-400 mb-8">Your first prestige has awakened something within you...</p>
            <div className="flex gap-6 justify-center">
              <button
                onClick={() => setConfirmingPath('light')}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-yellow-600/50 bg-yellow-900/10 hover:border-yellow-400 hover:bg-yellow-900/30 hover:scale-105 transition-all"
              >
                <span className="text-6xl">☀️</span>
                <span className="text-xl font-bold text-yellow-400 group-hover:text-yellow-300">Light</span>
                <span className="text-xs text-gray-400 group-hover:text-gray-300">Embrace the radiance</span>
              </button>
              <button
                onClick={() => setConfirmingPath('darkness')}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-purple-600/50 bg-purple-900/10 hover:border-purple-400 hover:bg-purple-900/30 hover:scale-105 transition-all"
              >
                <span className="text-6xl">🌑</span>
                <span className="text-xl font-bold text-purple-400 group-hover:text-purple-300">Darkness</span>
                <span className="text-xs text-gray-400 group-hover:text-gray-300">Power awaits those who dare</span>
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-6">Each path unlocks unique abilities, items, and secrets...</p>
          </div>
        </div>
      )}

      {/* Path confirmation modal */}
      {confirmingPath && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/80">
          <div className={`p-8 rounded-2xl border-2 max-w-md text-center ${
            confirmingPath === 'light'
              ? 'bg-gradient-to-b from-amber-900/80 to-yellow-900/60 border-yellow-500'
              : 'bg-gradient-to-b from-purple-900/80 to-red-900/60 border-red-500'
          }`}>
            <div className="text-6xl mb-4">
              {confirmingPath === 'light' ? '☀️' : '🌑'}
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              Choose the Path of {confirmingPath === 'light' ? 'Light' : 'Darkness'}?
            </h3>
            <p className="text-gray-300 mb-6">
              This choice is <span className="text-red-400 font-bold">permanent</span>.
              You cannot change your path once chosen.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmingPath(null)}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  selectPath(confirmingPath);
                  setConfirmingPath(null);
                }}
                className={`flex-1 px-6 py-3 font-bold rounded-xl transition-all transform hover:scale-105 cursor-pointer ${
                  confirmingPath === 'light'
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black'
                    : 'bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-500 hover:to-red-500 text-white'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <GoldenCookie />
      <WanderingTrader />
      <TaxPopup />
      <SacrificeModal isOpen={showSacrifice} onClose={() => setShowSacrifice(false)} />
      <GameSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <ForemanJackTutorial />
      {!showTrinketIndex && (
        <div className="lg:hidden fixed bottom-[180px] sm:bottom-[200px] left-2 sm:left-4 z-30 flex flex-col gap-2 w-[min(13.5rem,calc(100vw-1rem))] items-stretch">
          <div className="w-full flex justify-center font-sans pointer-events-auto">
            <TrinketSlot />
          </div>
          <TrinketShopButton inline onOpen={() => setTrinketShopOpen(true)} />
        </div>
      )}
      <TrinketShopModal isOpen={trinketShopOpen} onClose={() => setTrinketShopOpen(false)} />
      <TrinketIndex isOpen={showTrinketIndex} onClose={() => setShowTrinketIndex(false)} />
      <GameTerminal isOpen={showTerminal} onClose={() => setShowTerminal(false)} onMine={handleMine} />

      {/* Building management modals (from right panel clicks) */}
      {showTempleFromPanel && <TempleModal onClose={() => setShowTempleFromPanel(false)} />}
      <WizardTowerSidebar isOpen={showWizardFromPanel} onClose={() => setShowWizardFromPanel(false)} />
      {showBankFromPanel && <BankModal onClose={() => setShowBankFromPanel(false)} />}
      {showShipmentModal && <ShipmentModal onClose={() => setShowShipmentModal(false)} />}
      {showShadySam && <ShadySamModal onClose={() => setShowShadySam(false)} />}
      <SideLevelPanel isOpen={showSideLevel} onClose={() => setShowSideLevel(false)} />

      {/* CSS Animations */}
      <style jsx global>{`
        .stats-panel-scroll {
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: #b8956a #efe4d4;
        }
        .stats-panel-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .stats-panel-scroll::-webkit-scrollbar-track {
          background: #efe4d4;
          border-radius: 6px;
        }
        .stats-panel-scroll::-webkit-scrollbar-thumb {
          background: #b8956a;
          border-radius: 6px;
          border: 2px solid #efe4d4;
        }
        .stats-panel-scroll::-webkit-scrollbar-thumb:hover {
          background: #9c7248;
        }
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
