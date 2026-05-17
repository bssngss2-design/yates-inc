'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useGame } from '@/contexts/GameContext';
import { BUILDINGS } from '@/types/game';
import TempleModal from './TempleModal';
import WizardTowerSidebar from './WizardTowerSidebar';
import BankModal from './BankModal';

export default function BuildingDisplay() {
  const { gameState } = useGame();
  const [showTempleModal, setShowTempleModal] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

  // Get all owned buildings with their counts
  // Filter out buildings that don't match the player's path
  const ownedBuildings = BUILDINGS.filter(building => {
    if (
      gameState.chosenPath !== null &&
      building.pathRestriction !== null &&
      building.pathRestriction !== gameState.chosenPath
    ) {
      return false;
    }
    const count = getBuildingCount(building.id);
    return count > 0;
  }).map(building => ({
    ...building,
    count: getBuildingCount(building.id),
  }));

  function getBuildingCount(buildingId: string): number {
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
  }

  // Don't render if no buildings owned
  if (ownedBuildings.length === 0) return null;

  const handleBuildingClick = (buildingId: string) => {
    if (buildingId === 'temple' && gameState.buildings.temple.owned) {
      setShowTempleModal(true);
    }
    if (buildingId === 'wizard_tower' && gameState.buildings.wizard_tower.owned) {
      setShowWizardModal(true);
    }
    if (buildingId === 'bank' && gameState.buildings.bank.owned) {
      setShowBankModal(true);
    }
  };

  // Buildings that have management modals
  const clickableBuildings = ['temple', 'wizard_tower', 'bank'];

  return (
    <>
      {/* Mobile: Compact horizontal bar at bottom-right, above stats */}
      <div className="fixed right-2 bottom-[180px] z-[35] pointer-events-auto sm:hidden">
        <div className="bg-black/90 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-amber-600/30 flex flex-wrap gap-1 max-w-[160px] justify-end">
          {ownedBuildings.map((building) => {
            const isClickable = clickableBuildings.includes(building.id);
            const emojiMap: Record<string, string> = {
              mine: '⛏️',
              bank: '🏦',
              factory: '🏭',
              temple: '⛪',
              wizard_tower: '🧙',
              shipment: '🚀',
              gem_farm: '💎',
              alchemy_lab: '⚗️',
              time_machine: '⏰',
              antimatter_condenser: '⚛️',
              prism: '🔮',
              chancemaker: '🍀',
              fractal_engine: '🔷',
            };
            const shortName = emojiMap[building.id] || '🏠';
            
            return (
              <button
                key={building.id}
                onClick={() => isClickable && handleBuildingClick(building.id)}
                className={`flex items-center gap-0.5 bg-amber-900/30 rounded px-1.5 py-0.5 ${isClickable ? 'active:bg-amber-700/50' : ''}`}
                title={`${building.name}${isClickable ? ' (tap to manage)' : ''}`}
              >
                <span className="text-sm">{shortName}</span>
                <span className="text-amber-400 font-bold text-[10px]">{building.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop (sm-lg only): Full building display with images — hidden on lg+ where right panel exists */}
      <div className="hidden sm:flex lg:hidden fixed right-4 bottom-[200px] z-[35] flex-col gap-2 pointer-events-auto items-end">
        {ownedBuildings.map((building) => {
          const isClickable = clickableBuildings.includes(building.id);
          const maxVisible = 2;
          
          return (
            <div 
              key={building.id}
              onClick={() => isClickable && handleBuildingClick(building.id)}
              className={`flex items-center gap-1 flex-row-reverse ${isClickable ? 'cursor-pointer' : ''}`}
            >
              <div className="bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 border border-amber-600/30 min-w-[70px]">
                <span className="text-amber-400 font-bold text-xs">{building.count}x</span>
                <span className="text-gray-300 text-xs truncate">{building.name}</span>
                {isClickable && <span className="text-yellow-400 text-[10px]">⚙️</span>}
              </div>
              
              <div className="flex items-center gap-0.5 flex-row-reverse">
                {Array.from({ length: Math.min(building.count, maxVisible) }).map((_, index) => (
                  <div 
                    key={index}
                    className="w-12 h-12 relative animate-building-idle"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <Image
                      src={`/game/buildings/${building.id}.png`}
                      alt={building.name}
                      fill
                      className="object-contain drop-shadow-lg"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                ))}
                
                {building.count > maxVisible && (
                  <div className="w-8 h-8 flex items-center justify-center bg-black/70 rounded border border-amber-600/30">
                    <span className="text-amber-400 font-bold text-[10px]">+{building.count - maxVisible}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Temple Modal */}
      {showTempleModal && (
        <TempleModal onClose={() => setShowTempleModal(false)} />
      )}

      {/* Wizard Tower Sidebar */}
      <WizardTowerSidebar 
        isOpen={showWizardModal} 
        onClose={() => setShowWizardModal(false)} 
      />

      {/* Bank Modal */}
      {showBankModal && (
        <BankModal onClose={() => setShowBankModal(false)} />
      )}
    </>
  );
}
