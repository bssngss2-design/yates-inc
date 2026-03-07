'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/contexts/GameContext';
import { WanderingTraderOffer, TRINKETS } from '@/types/game';
import TrinketSelectionModal from './TrinketSelectionModal';
import RouletteWheel from './RouletteWheel';
import WanderingTraderDialog from './WanderingTraderDialog';

interface WanderingTraderShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Format number with suffix
function formatNumber(num: number): string {
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
  return num.toFixed(0);
}

// Get cost display text
function getCostDisplay(offer: WanderingTraderOffer): string {
  switch (offer.cost.type) {
    case 'money':
      return `$${formatNumber(offer.cost.amount || 0)}`;
    case 'all_money':
      return '💀 ALL YOUR MONEY';
    case 'trinkets':
      return `🎁 ${offer.cost.trinketCount || 2} Trinkets`;
    case 'debuff':
      if (offer.cost.debuff) {
        const percent = Math.abs(offer.cost.debuff.value * 100).toFixed(0);
        const duration = (offer.cost.debuff.duration / 1000).toFixed(0);
        return `⚠️ -${percent}% Click Speed (${duration}s)`;
      }
      return 'Debuff';
    case 'free':
      return '✨ FREE';
    default:
      return '???';
  }
}

export default function WanderingTraderShopModal({ isOpen, onClose }: WanderingTraderShopModalProps) {
  const { 
    gameState, 
    getWanderingTraderOffers, 
    purchaseWanderingTraderOffer,
    dismissWanderingTrader,
    getStokens,
  } = useGame();
  
  const [mounted, setMounted] = useState(false);
  const [offers, setOffers] = useState<WanderingTraderOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<WanderingTraderOffer | null>(null);
  const [showTrinketPicker, setShowTrinketPicker] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setOffers(getWanderingTraderOffers());
    }
  }, [isOpen, getWanderingTraderOffers]);

  // Timer is cleared when shop opens - player has unlimited time to browse

  // Clear message after 3 seconds
  useEffect(() => {
    if (purchaseMessage) {
      const timeout = setTimeout(() => setPurchaseMessage(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [purchaseMessage]);

  const handlePurchase = (offer: WanderingTraderOffer) => {
    // Check if offer requires trinket selection
    if (offer.cost.type === 'trinkets') {
      setSelectedOffer(offer);
      setShowTrinketPicker(true);
      return;
    }

    // Check if offer is roulette
    if (offer.effect.type === 'roulette') {
      // First purchase the roulette spin
      const success = purchaseWanderingTraderOffer(offer.id);
      if (success) {
        setSelectedOffer(offer);
        setShowRoulette(true);
      } else {
        setPurchaseMessage({ type: 'error', text: 'Not enough money!' });
      }
      return;
    }

    // Check affordability for money costs
    if (offer.cost.type === 'money' && gameState.yatesDollars < (offer.cost.amount || 0)) {
      setPurchaseMessage({ type: 'error', text: 'Not enough money!' });
      return;
    }

    // Regular purchase
    const success = purchaseWanderingTraderOffer(offer.id);
    if (success) {
      setPurchaseMessage({ type: 'success', text: 'Purchase successful!' });
      setOffers(getWanderingTraderOffers());
    } else {
      setPurchaseMessage({ type: 'error', text: 'Purchase failed!' });
    }
  };

  const handleTrinketSelection = (selectedTrinketIds: string[]) => {
    if (!selectedOffer) return;
    
    const success = purchaseWanderingTraderOffer(selectedOffer.id, selectedTrinketIds);
    if (success) {
      setPurchaseMessage({ type: 'success', text: 'Purchase successful!' });
      setOffers(getWanderingTraderOffers());
    } else {
      setPurchaseMessage({ type: 'error', text: 'Purchase failed!' });
    }
    
    setShowTrinketPicker(false);
    setSelectedOffer(null);
  };

  const handleRouletteComplete = () => {
    setShowRoulette(false);
    setSelectedOffer(null);
    setOffers(getWanderingTraderOffers());
  };

  const handleLeave = () => {
    dismissWanderingTrader();
    onClose();
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-b from-gray-950 via-purple-950/60 to-gray-950 rounded-2xl border border-amber-500/30 shadow-[0_0_40px_rgba(168,85,247,0.15)] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — mysterious merchant */}
        <div className="bg-gradient-to-r from-purple-950/90 via-amber-950/30 to-purple-950/90 px-4 sm:px-6 py-3 sm:py-4 border-b border-amber-500/20 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl">🧙</span>
              <div>
                <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-300 to-purple-300 bg-clip-text text-transparent">Wandering Trader</h2>
                <p className="text-purple-400/80 text-xs sm:text-sm italic">&quot;Hmm... what do you seek?&quot;</p>
              </div>
            </div>
            <div className="text-right flex flex-col gap-0.5">
              <div className="text-yellow-400 text-xs sm:text-sm font-bold">💰 ${formatNumber(gameState.yatesDollars)}</div>
              <div className="text-purple-400 text-[10px] sm:text-xs">💎 {getStokens()} Stokens</div>
            </div>
          </div>
        </div>

        {/* Show Dialog OR Shop Content - not both */}
        {showDialog ? (
          /* Dialog Content - replaces shop content when browsing more */
          <WanderingTraderDialog
            isOpen={showDialog}
            onClose={() => {
              setShowDialog(false);
              setOffers(getWanderingTraderOffers());
            }}
            isInline={true}
          />
        ) : (
          <>
            {/* Purchase message */}
            {purchaseMessage && (
              <div className={`mx-6 mt-4 p-3 rounded-lg text-center font-bold ${
                purchaseMessage.type === 'success' 
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {purchaseMessage.text}
              </div>
            )}

            {/* Offers — compact rows */}
            <div className="p-3 sm:p-4 space-y-2">
              {offers.length === 0 ? (
                <div className="text-center text-purple-400/60 py-8">
                  <span className="text-4xl">🤷</span>
                  <p className="mt-2 text-sm italic">The merchant has nothing left...</p>
                </div>
              ) : (
                offers.map((offer) => (
                  <div 
                    key={offer.id}
                    className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-gray-900/60 border border-purple-500/15 hover:border-amber-500/30 transition-all group"
                  >
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-bold text-xs sm:text-sm truncate group-hover:text-amber-200 transition-colors">{offer.name}</span>
                      </div>
                      <p className="text-gray-500 text-[10px] sm:text-xs truncate">{offer.description}</p>
                      <span className={`text-[10px] sm:text-xs font-bold ${
                        offer.cost.type === 'free' ? 'text-green-400' :
                        offer.cost.type === 'all_money' ? 'text-red-400' :
                        'text-amber-400'
                      }`}>
                        {getCostDisplay(offer)}
                      </span>
                    </div>

                    {/* Action */}
                    <button
                      onClick={() => handlePurchase(offer)}
                      className={`flex-shrink-0 font-bold py-1.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm transition-all touch-manipulation whitespace-nowrap ${
                        offer.effect.type === 'roulette'
                          ? 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black shadow-lg shadow-amber-500/20'
                          : 'bg-purple-600/80 hover:bg-purple-500 text-white'
                      }`}
                    >
                      {offer.effect.type === 'roulette' ? '🎰 SPIN' : 'BUY'}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-950/80 px-3 sm:px-6 py-3 border-t border-amber-500/10 rounded-b-2xl flex justify-between items-center gap-2">
              <p className="text-purple-400/40 text-[10px] sm:text-xs italic flex-1 min-w-0 truncate">
                {gameState.wtDialogCompleted 
                  ? `"${gameState.wtMoneyTax * 100}% of your earnings are mine now..."`
                  : '"The void whispers many secrets..."'
                }
              </p>
              <div className="flex gap-1.5 flex-shrink-0">
                {!gameState.wtDialogCompleted && (
                  <button
                    onClick={() => setShowDialog(true)}
                    className="px-3 py-1.5 bg-purple-800/60 hover:bg-purple-700 text-purple-300 rounded-lg transition-colors text-xs font-medium"
                  >
                    Browse More
                  </button>
                )}
                <button
                  onClick={handleLeave}
                  className="px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-300 rounded-lg transition-colors text-xs font-medium"
                >
                  Leave
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Trinket Selection Modal */}
      {showTrinketPicker && selectedOffer && (
        <TrinketSelectionModal
          isOpen={showTrinketPicker}
          onClose={() => {
            setShowTrinketPicker(false);
            setSelectedOffer(null);
          }}
          requiredCount={selectedOffer.cost.trinketCount || 2}
          onConfirm={handleTrinketSelection}
        />
      )}

      {/* Roulette Wheel */}
      {showRoulette && (
        <RouletteWheel
          isOpen={showRoulette}
          onClose={handleRouletteComplete}
        />
      )}
    </div>,
    document.body
  );
}
