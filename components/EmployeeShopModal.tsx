'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { usePaycheck } from '@/contexts/PaycheckContext';
import {
  useEmployeeShop,
  EMPLOYEE_SHOP_ITEMS,
  type ShopItem,
} from '@/contexts/EmployeeShopContext';

function formatCash(n: number): string {
  if (!isFinite(n)) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmployeeShopModal({ isOpen, onClose }: Props) {
  const { employee } = useAuth();
  const { currentUserPaycheck } = usePaycheck();
  const {
    buyItem,
    hasEffect,
    getEffect,
    motivationUsesRemaining,
  } = useEmployeeShop();
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  if (!isOpen) return null;
  if (!employee) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm text-center">
          <div className="text-lg font-bold mb-2">Only employees can shop here.</div>
          <button
            onClick={onClose}
            className="mt-2 bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const yates = Number(currentUserPaycheck?.yates_balance ?? 0);
  const walters = Number(currentUserPaycheck?.walters_balance ?? 0);

  const handleBuy = async (item: ShopItem) => {
    setBusyItem(item.id);
    setFlash(null);
    const currentBalance = item.currency === 'yates' ? yates : walters;
    const otherBalance = item.currency === 'yates' ? walters : yates;
    const res = await buyItem(item, employee.id, currentBalance, otherBalance);
    setBusyItem(null);
    if (res.success) {
      setFlash({ kind: 'ok', text: `Bought ${item.name}!` });
    } else {
      setFlash({ kind: 'err', text: res.error || 'Purchase failed' });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-4 border-orange-500 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-orange-500 text-white p-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black">🛍️ Shop w ur money</h2>
            <p className="text-xs sm:text-sm opacity-90 mt-0.5">
              Burn your paycheck on things that may or may not be a good idea.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Balance strip */}
        <div className="px-5 py-3 border-b-2 border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/20 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3 text-sm">
            <span className="text-yellow-700 dark:text-yellow-300 font-bold">
              Yates$: {formatCash(yates)}
            </span>
            <span className="text-purple-700 dark:text-purple-300 font-bold">
              Walters$: {formatCash(walters)}
            </span>
          </div>
          {flash && (
            <div
              className={`text-xs px-3 py-1 rounded-full font-bold ${
                flash.kind === 'ok'
                  ? 'bg-green-200 text-green-900'
                  : 'bg-red-200 text-red-900'
              }`}
            >
              {flash.text}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EMPLOYEE_SHOP_ITEMS.map((item) => {
              const ownsOneTime = item.oneTime && hasEffect(employee.id, item.effectType);
              const balance = item.currency === 'yates' ? yates : walters;
              const canAfford = balance >= item.price;
              const disabled = busyItem === item.id || ownsOneTime || !canAfford;

              const effect = getEffect(employee.id, item.effectType);
              const usesLeft =
                item.effectType === 'motivation_pack'
                  ? motivationUsesRemaining(employee.id)
                  : null;
              const expiresAt = effect?.expires_at
                ? new Date(effect.expires_at).getTime()
                : null;

              return (
                <div
                  key={item.id}
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 hover:border-orange-400 transition-colors flex flex-col"
                >
                  <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg overflow-hidden flex items-center justify-center relative">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    ) : (
                      <span className="text-5xl">🎁</span>
                    )}
                    {ownsOneTime && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                        Owned
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex-1">
                    <div className="font-black text-gray-900 dark:text-white">{item.name}</div>
                    <div className="text-xs italic text-orange-600 dark:text-orange-400 mt-0.5">
                      &ldquo;{item.tagline}&rdquo;
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      {item.description}
                    </p>
                    {usesLeft !== null && usesLeft > 0 && (
                      <div className="mt-2 text-xs font-bold text-green-600 dark:text-green-400">
                        💊 {usesLeft} pill{usesLeft === 1 ? '' : 's'} ready
                      </div>
                    )}
                    {expiresAt && expiresAt > Date.now() && (
                      <div className="mt-2 text-xs font-bold text-orange-600 dark:text-orange-400">
                        ⏱ Active until {new Date(expiresAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="font-black text-gray-900 dark:text-white">
                      {formatCash(item.price)}{' '}
                      <span className="text-xs font-normal text-gray-500">
                        {item.currency === 'yates' ? 'Yates$' : 'Walters$'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={disabled}
                      className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-colors ${
                        disabled
                          ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      {busyItem === item.id
                        ? '...'
                        : ownsOneTime
                          ? 'Owned'
                          : !canAfford
                            ? 'Broke'
                            : 'Buy'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center text-xs text-gray-500 italic">
            I will be coming up with more things just wait!!
          </div>
        </div>
      </div>
    </div>
  );
}
