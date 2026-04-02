'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PathSelection from '@/components/PathSelection';
import LoreMode from '@/components/LoreMode';
import MiningGame from '@/components/game/MiningGame';
import { GameProvider } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/contexts/ClientContext';

type GameState = 'path-selection' | 'lore' | 'gameplay' | 'gameplay-hard';

export default function GamePage() {
    const [gameState, setGameState] = useState<GameState>('path-selection');
    const [showSecretMessage, setShowSecretMessage] = useState(false);
    const [showNoAccountPopup, setShowNoAccountPopup] = useState(false);
    const { isLoggedIn } = useAuth();
    const { isClient } = useClient();
    const router = useRouter();

    // Check for secret completion - runs once on mount using window.location
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const secretParam = params.get('secret');
        if (secretParam === 'completed') {
            setShowSecretMessage(true);
            // Clear URL param immediately
            window.history.replaceState({}, '', '/game');
            // Auto-dismiss after 6 seconds
            const timer = setTimeout(() => {
                setShowSecretMessage(false);
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, []);

    // Show popup and redirect if user has no account
    useEffect(() => {
        if (!isLoggedIn && !isClient) {
            setShowNoAccountPopup(true);
            const timer = setTimeout(() => {
                router.push('/client-signup');
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [isLoggedIn, isClient, router]);

    const handlePathSelection = (path: 'lore' | 'gameplay' | 'hard') => {
        if (path === 'lore') {
            setGameState('lore');
        } else if (path === 'hard') {
            setGameState('gameplay-hard');
        } else {
            setGameState('gameplay');
        }
    };

    // Determine if we're in hard mode
    const isHardMode = gameState === 'gameplay-hard';

    return (
        <div className="w-full h-screen">
            {/* No account popup */}
            {showNoAccountPopup && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">
                    <div className="bg-red-900 border-2 border-red-500 rounded-2xl px-8 py-6 shadow-2xl shadow-red-500/30 max-w-md mx-4 text-center">
                        <p className="text-red-100 text-xl font-bold mb-2">
                            Hey! U don&apos;t have an account, how do you want me to save your data?
                        </p>
                        <p className="text-red-300 text-lg font-bold">
                            .... Exactly
                        </p>
                        <p className="text-red-400/70 text-sm mt-3 animate-pulse">
                            Redirecting to signup...
                        </p>
                    </div>
                </div>
            )}

            {/* Secret completion message */}
            {showSecretMessage && (
                <div 
                    className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] cursor-pointer"
                    onClick={() => setShowSecretMessage(false)}
                >
                    <div className="bg-gradient-to-r from-purple-900 to-indigo-900 border-2 border-purple-500 rounded-xl px-6 py-4 shadow-2xl shadow-purple-500/30 animate-bounce">
                        <p className="text-purple-300 text-lg font-bold text-center">
                            Good job, check your pickaxe inventory ⛏️
                        </p>
                        <p className="text-purple-400/70 text-xs text-center mt-1">
                            *only for the normal game tho
                        </p>
                        <p className="text-gray-500 text-[10px] text-center mt-2">click to dismiss</p>
                    </div>
                </div>
            )}

            {gameState === 'path-selection' && (
                <PathSelection onSelectPath={handlePathSelection} />
            )}

            {gameState === 'lore' && (
                <LoreMode onNavigateToGameplay={() => {
                    setGameState('gameplay');
                }} />
            )}

            {(gameState === 'gameplay' || gameState === 'gameplay-hard') && (
                <GameProvider isHardMode={isHardMode} key={isHardMode ? 'hard' : 'normal'}>
                    <MiningGame onExit={() => setGameState('path-selection')} />
                </GameProvider>
            )}
        </div>
    );
}
