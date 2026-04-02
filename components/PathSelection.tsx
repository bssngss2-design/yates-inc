'use client';

import { useRouter } from 'next/navigation';

interface PathSelectionProps {
    onSelectPath: (path: 'lore' | 'gameplay' | 'hard') => void;
}

export default function PathSelection({ onSelectPath }: PathSelectionProps) {
    const router = useRouter();

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center overflow-auto p-4">
            <div className="max-w-2xl w-full space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">⛏️ Yates Mining</h1>
                    <p className="text-gray-400">Read before playing, or don&apos;t. I don&apos;t care.</p>
                </div>

                {/* Game Buttons */}
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => onSelectPath('gameplay')}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-12 py-4 rounded-xl font-bold text-xl shadow-xl hover:scale-105 active:scale-95 transition-all touch-manipulation"
                    >
                        🎮 PLAY GAME
                    </button>
                    <button
                        onClick={() => onSelectPath('hard')}
                        className="bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white px-12 py-4 rounded-xl font-bold text-xl shadow-xl hover:scale-105 active:scale-95 transition-all touch-manipulation"
                    >
                        💀 HARD MODE
                    </button>
                </div>

                {/* Tutorial Section */}
                <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 space-y-4">
                    <h2 className="text-xl font-bold text-yellow-400 border-b border-gray-700 pb-2">📖 Tutorial</h2>
                    
                    <div className="space-y-3 text-gray-300 text-sm sm:text-base">
                        <p>
                            <span className="text-cyan-400 font-bold">Press I</span> to open Cheats terminal, but you do need to be an Employee or have the Access code.
                        </p>

                        <p>
                            <span className="text-orange-400 font-bold">Data only saves after ~3 seconds.</span><br />
                            But with autoclicker/miners active it takes ~6 seconds.
                        </p>

                        <p>
                            If you have been encountering issues, please mail <span className="text-blue-400">Bernardo</span>.
                        </p>

                        <p>
                            To convert a Trinket into Relics, go to the Trinket shop and click on one of the Trinkets you own.<br />
                            <span className="text-gray-400 text-xs">*Relics are for Light side, and Talismans for Dark side.</span>
                        </p>

                        <p>
                            Coupons do nothing <em className="text-gray-500">yet</em> fr
                        </p>

                        <p>
                            To prestige you need to reach <span className="text-purple-400 font-bold">Titanium Quartz</span> rock (Rock 19) and <span className="text-purple-400 font-bold">Pin</span> pickaxe (Pickaxe 16) for your first prestige.<br />
                            <span className="text-gray-400 text-xs">*Requirements increase by +1 rock & +1 pickaxe every 5 prestiges.</span>
                        </p>

                        <p>
                            <span className="text-pink-400 font-bold">Premium products give buffs on the game!</span>
                        </p>

                        <p className="text-gray-400 text-xs">
                            *If you can&apos;t click just right, it&apos;s probably because you have Auto clicker on
                        </p>

                        <p 
                            onClick={() => router.push('/yates-inc/secret')}
                            className="text-gray-500 text-xs italic cursor-pointer hover:text-gray-400 transition-colors select-none"
                        >
                            ***I do not pretend to fix the Rankings title logic, nor the time :)
                        </p>
                    </div>
                </div>

                {/* Lore Button - smaller, at the bottom */}
                <div className="text-center pt-2">
                    <button
                        onClick={() => onSelectPath('lore')}
                        className="text-purple-400 hover:text-purple-300 text-sm underline underline-offset-4 transition-colors"
                    >
                        📜 Read the Lore instead
                    </button>
                </div>
            </div>
        </div>
    );
}
