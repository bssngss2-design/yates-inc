'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MiningGame from '@/components/game/MiningGame';
import { GameProvider } from '@/contexts/GameContext';

export default function GamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showNoAccountPopup, setShowNoAccountPopup] = useState(false);

    const isHardMode = searchParams.get('mode') === 'hard';

    useEffect(() => {
        const hasEmployee = !!localStorage.getItem('yates-employee');
        const hasClient = !!localStorage.getItem('yates-client');
        if (!hasEmployee && !hasClient) {
            setShowNoAccountPopup(true);
            const timer = setTimeout(() => {
                router.push('/client-signup');
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [router]);

    return (
        <div className="w-full h-screen">
            {showNoAccountPopup && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">
                    <div className="bg-red-900 border-2 border-red-500 rounded-2xl px-6 py-5 shadow-2xl shadow-red-500/30 max-w-sm mx-4 text-center">
                        <p className="text-red-100 text-lg font-bold">
                            No account = no saves.
                        </p>
                        <p className="text-red-300 font-bold mt-1">
                            .... Exactly
                        </p>
                        <p className="text-red-400/70 text-xs mt-2 animate-pulse">
                            Redirecting...
                        </p>
                    </div>
                </div>
            )}

            <GameProvider isHardMode={isHardMode} key={isHardMode ? 'hard' : 'normal'}>
                <MiningGame onExit={() => router.push('/info')} />
            </GameProvider>
        </div>
    );
}
