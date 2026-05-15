'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';

interface ShadySamModalProps {
  onClose: () => void;
}

type BoxTier = 'sketchy' | 'suspicious' | 'cursed';

const MYSTERY_BOXES = [
  {
    tier: 'sketchy' as BoxTier,
    name: 'Sketchy Box',
    cost: 500_000,
    closedImage: '/game/shadysam/sketchy_closed.png',
    openGoodImage: '/game/shadysam/sketchy_open.png',
    openBadImage: '/game/shadysam/sketchy_open.png',
    goodHints: ['50% → 10% of your $', '40% → random buff', '10% → nothing'],
    badHints: [],
  },
  {
    tier: 'suspicious' as BoxTier,
    name: 'Suspicious Crate',
    cost: 50_000_000,
    closedImage: '/game/shadysam/suspicious_closed.png',
    openGoodImage: '/game/shadysam/suspicious_open.png',
    openBadImage: '/game/shadysam/suspicious_open.png',
    goodHints: ['40% → 5 Stokens', '20% → 40% of $', '30% → buff', '10% → trinket'],
    badHints: [],
  },
  {
    tier: 'cursed' as BoxTier,
    name: 'Cursed Chest',
    cost: 5_000_000_000,
    closedImage: '/game/shadysam/cursed_closed.png',
    openGoodImage: '/game/shadysam/cursed_open_good.png',
    openBadImage: '/game/shadysam/cursed_open_bad.png',
    goodHints: ['50% → 60% of $', '40% → mega buff', '10% → rare trinket'],
    badHints: [],
  },
];

export default function ShadySamModal({ onClose }: ShadySamModalProps) {
  const { gameState, openMysteryBox } = useGame();
  const [phase, setPhase] = useState<'shop' | 'opening' | 'result'>('shop');
  const [selectedTier, setSelectedTier] = useState<BoxTier | null>(null);
  const [result, setResult] = useState<{ isGood: boolean; reward: string } | null>(null);

  const formatNumber = (num: number): string => {
    if (num >= 1e18) return `${(num / 1e18).toFixed(1)}Qi`;
    if (num >= 1e15) return `${(num / 1e15).toFixed(1)}Q`;
    if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return Math.floor(num).toString();
  };

  const handleOpenBox = (tier: BoxTier) => {
    setSelectedTier(tier);
    setPhase('opening');

    setTimeout(() => {
      const boxResult = openMysteryBox(tier);
      if (boxResult) {
        setResult(boxResult);
      } else {
        setResult({ isGood: false, reward: "Can't afford this box!" });
      }
      setPhase('result');
    }, 2000);
  };

  const currentBox = selectedTier ? MYSTERY_BOXES.find(b => b.tier === selectedTier) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={phase === 'shop' ? onClose : undefined} />

      <div className="relative bg-gradient-to-br from-gray-900/95 to-purple-950/95 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border-2 border-purple-500/40 shadow-2xl">
        <div className="bg-gradient-to-r from-gray-800 to-purple-900 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">
              <Image src="/game/buildings/shadysam.png" alt="Sam" width={32} height={32} className="inline mr-2" style={{ imageRendering: 'pixelated' }} unoptimized />
              Shady Sam&apos;s Mystery Boxes
            </h2>
            <p className="text-purple-300 text-sm">Pick a box... if you dare</p>
          </div>
          {phase === 'shop' && (
            <button onClick={onClose} className="text-white/80 hover:text-white text-3xl leading-none p-2">×</button>
          )}
        </div>

        <div className="p-6">
          <div className="bg-black/30 rounded-xl p-3 border border-yellow-600/30 flex justify-between items-center mb-5">
            <span className="text-yellow-400 font-bold text-sm">💵 Your Cash</span>
            <span className="text-white font-bold">${formatNumber(gameState.yatesDollars)}</span>
          </div>

          {phase === 'shop' && (
            <div className="grid grid-cols-3 gap-3">
              {MYSTERY_BOXES.map(box => {
                const canAfford = gameState.yatesDollars >= box.cost;
                return (
                  <button
                    key={box.tier}
                    onClick={() => canAfford && handleOpenBox(box.tier)}
                    disabled={!canAfford}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      canAfford
                        ? 'border-purple-500/50 bg-black/30 hover:border-purple-400 hover:bg-purple-900/20 hover:scale-105 cursor-pointer'
                        : 'border-gray-700/30 bg-black/20 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Image src={box.closedImage} alt={box.name} width={96} height={96} unoptimized className="object-contain" />
                    <span className="text-white font-bold text-xs text-center">{box.name}</span>
                    <span className={`text-[10px] font-bold ${canAfford ? 'text-yellow-400' : 'text-gray-500'}`}>
                      ${formatNumber(box.cost)}
                    </span>
                    <div className="text-[9px] text-center space-y-0.5">
                      {box.goodHints.map((h, i) => (
                        <div key={`g${i}`} className="text-green-400/70">✓ {h}</div>
                      ))}
                      {box.badHints.map((h, i) => (
                        <div key={`b${i}`} className="text-red-400/70">✕ {h}</div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {phase === 'opening' && currentBox && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="animate-bounce">
                <Image src={currentBox.closedImage} alt={currentBox.name} width={160} height={160} unoptimized className="object-contain" />
              </div>
              <p className="text-purple-300 text-lg font-bold animate-pulse">Opening {currentBox.name}...</p>
              <div className="flex gap-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-3 h-3 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {phase === 'result' && currentBox && result && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Image
                src={result.isGood ? currentBox.openGoodImage : currentBox.openBadImage}
                alt="Result"
                width={180}
                height={180}
                unoptimized
                className="object-contain"
              />
              <div className="text-center">
                <p className="text-3xl mb-2">{result.reward.includes('Nothing') ? '😐' : '🎉'}</p>
                <p className={`text-lg font-bold px-4 py-2 rounded-lg ${
                  result.reward.includes('Nothing') ? 'text-gray-400 bg-gray-800/50' :
                  result.reward.includes('trinket') ? 'text-purple-300 bg-purple-900/40 border border-purple-500/30' :
                  result.reward.includes('Stokens') ? 'text-blue-300 bg-blue-900/40 border border-blue-500/30' :
                  'text-green-300 bg-green-900/40 border border-green-500/30'
                }`}>
                  {result.reward}
                </p>
              </div>
              <button
                onClick={() => { setPhase('shop'); setSelectedTier(null); setResult(null); }}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
