'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PathSelection from '@/components/PathSelection';
import LoreMode from '@/components/LoreMode';

export default function InfoPage() {
    const router = useRouter();
    const [showLore, setShowLore] = useState(false);
    const [showSecretMessage, setShowSecretMessage] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const secretParam = params.get('secret');
        if (secretParam === 'completed') {
            setShowSecretMessage(true);
            window.history.replaceState({}, '', '/info');
            const timer = setTimeout(() => {
                setShowSecretMessage(false);
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handlePathSelection = (path: 'lore' | 'gameplay' | 'hard') => {
        if (path === 'lore') {
            setShowLore(true);
        } else if (path === 'hard') {
            router.push('/game?mode=hard');
        } else {
            router.push('/game');
        }
    };

    return (
        <div className="w-full h-screen">
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

            {showLore ? (
                <LoreMode onNavigateToGameplay={() => router.push('/game')} />
            ) : (
                <PathSelection onSelectPath={handlePathSelection} />
            )}
        </div>
    );
}
