'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';
import { getShipmentDeliveryName, ShipmentDelivery } from '@/types/game';

interface ShipmentModalProps {
  onClose: () => void;
}

export default function ShipmentModal({ onClose }: ShipmentModalProps) {
  const { gameState, collectShipmentDelivery, speedUpShipments } = useGame();
  const [now, setNow] = useState(Date.now());
  const [collectedReward, setCollectedReward] = useState<{ displayName: string; type: string } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (collectedReward) {
      const timeout = setTimeout(() => setCollectedReward(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [collectedReward]);

  const shipmentState = gameState.buildings.shipment;
  const deliveries = shipmentState?.pendingDeliveries || [];
  const readyDeliveries = deliveries.filter(d => d.arrivalTime <= now);
  const pendingDeliveries = deliveries.filter(d => d.arrivalTime > now);
  const hasReady = readyDeliveries.length > 0;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCollect = (deliveryId: string) => {
    const result = collectShipmentDelivery(deliveryId);
    if (result) {
      setCollectedReward({ displayName: result.displayName, type: result.type });
    }
  };

  const rewardIcon = (type: string) => {
    switch (type) {
      case 'money': return '💰';
      case 'trinket': return '🔮';
      case 'exotic_rock': return '🪨';
      case 'prestige_tokens': return '⭐';
      case 'title': return '👑';
      default: return '📦';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-gradient-to-br from-gray-900/95 to-blue-950/95 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto border-2 border-blue-500/40 shadow-2xl">
        {/* Header with portal image */}
        <div className="relative h-48 overflow-hidden rounded-t-2xl">
          <Image
            src={hasReady ? '/game/buildings/shipment_portal_open.png' : '/game/buildings/shipment_portal_closed.png'}
            alt="Shipment Portal"
            fill
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">Shipment Portal</h2>
              <p className="text-blue-300 text-sm drop-shadow-lg">{shipmentState?.count || 0} portals active</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl bg-black/40 rounded-lg px-3 py-1">×</button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* No inline reward popup — we use a fixed toast instead */}

          {/* Stats */}
          <div className="flex gap-3">
            <div className="flex-1 bg-black/30 rounded-lg p-3 border border-blue-600/30 text-center">
              <div className="text-blue-400 text-[10px] font-bold uppercase">Portals</div>
              <div className="text-white font-bold text-lg">{shipmentState?.count || 0}</div>
            </div>
            <div className="flex-1 bg-black/30 rounded-lg p-3 border border-blue-600/30 text-center">
              <div className="text-blue-400 text-[10px] font-bold uppercase">Total Collected</div>
              <div className="text-white font-bold text-lg">{shipmentState?.totalDeliveries || 0}</div>
            </div>
          </div>

          {/* Ready deliveries */}
          {readyDeliveries.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-green-400 font-bold text-sm">📦 Ready to Collect! ({readyDeliveries.length})</h3>
              {readyDeliveries.map(d => (
                <div key={d.id} className="bg-green-900/20 border border-green-500/40 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold text-sm">{getShipmentDeliveryName(d)}</span>
                    <span className="text-green-400/70 text-[10px] ml-2 capitalize">{d.type.replace('_', ' ')}</span>
                  </div>
                  <button
                    onClick={() => handleCollect(d.id)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-lg transition-all active:scale-95"
                  >
                    Collect
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pending deliveries */}
          {pendingDeliveries.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-gray-400 font-bold text-sm">⏳ In Transit ({pendingDeliveries.length})</h3>
              {pendingDeliveries.map(d => (
                <div key={d.id} className="bg-black/20 border border-gray-700/30 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Delivery incoming...</span>
                  <span className="text-blue-400 font-bold text-sm font-mono">
                    {formatTime(d.arrivalTime - now)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Speed up buttons */}
          {pendingDeliveries.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-amber-400 font-bold text-sm">⚡ Speed Up Deliveries</h3>
              <p className="text-gray-500 text-[10px]">Halve the remaining time on all pending deliveries. Can stack up to 3 times.</p>
              <div className="flex gap-2">
                {[
                  { pct: 0.05, label: '5% of $' },
                  { pct: 0.10, label: '10% of $' },
                  { pct: 0.15, label: '15% of $' },
                ].map(opt => {
                  const cost = Math.floor(gameState.yatesDollars * opt.pct);
                  return (
                    <button
                      key={opt.pct}
                      onClick={() => speedUpShipments(opt.pct)}
                      disabled={cost <= 0}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        cost > 0
                          ? 'bg-amber-600/80 hover:bg-amber-500 text-white active:scale-95 border border-amber-500/50'
                          : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700/30'
                      }`}
                    >
                      <div>½ Time</div>
                      <div className="text-[9px] opacity-80">{opt.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {deliveries.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-sm">No deliveries yet. Buy more portals!</p>
            </div>
          )}

          <div className="bg-black/20 rounded-lg p-3 text-gray-500 text-xs space-y-1">
            <p>🚀 Each portal (max 5) has 1 delivery at a time.</p>
            <p>📦 Collect a delivery → portal sends a new one automatically (5-30 min).</p>
            <p>🎁 Rewards: exotic rocks, trinkets, prestige tokens, money, rare titles.</p>
          </div>
        </div>

      </div>

      {/* Floating collect toast */}
      {collectedReward && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] animate-[toastIn_0.3s_ease-out]">
          <div className="bg-green-900/95 border-2 border-green-500/70 rounded-xl px-6 py-3 shadow-2xl flex items-center gap-3 backdrop-blur-sm">
            <span className="text-2xl">{rewardIcon(collectedReward.type)}</span>
            <div>
              <p className="text-green-300 font-bold text-sm">Collected!</p>
              <p className="text-white font-bold text-base">{collectedReward.displayName}</p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
