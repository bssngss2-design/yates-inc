'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeShop } from '@/contexts/EmployeeShopContext';

/**
 * Walking Super Energy Bomb. Wanders across the viewport while the employee
 * has an active `energy_bomb` effect. It shakes, spins, and occasionally barks
 * "WAKE UP".
 */
export default function WalkingBomb() {
  const { employee } = useAuth();
  const { hasActiveBomb } = useEmployeeShop();
  const [pos, setPos] = useState({ x: 20, y: 20 });
  const [dir, setDir] = useState<1 | -1>(1);
  const [showBark, setShowBark] = useState(false);
  const active = employee ? hasActiveBomb(employee.id) : false;

  useEffect(() => {
    if (!active) return;
    let animId: number;
    let last = performance.now();
    let xRef = Math.random() * (window.innerWidth - 120);
    let yRef = Math.random() * (window.innerHeight - 120) + 80;
    let xDir = Math.random() < 0.5 ? -1 : 1;
    let yDir = Math.random() < 0.5 ? -1 : 1;
    const speed = 60; // px/sec

    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      xRef += xDir * speed * dt;
      yRef += yDir * speed * dt * 0.6;
      const maxX = window.innerWidth - 100;
      const maxY = window.innerHeight - 100;
      if (xRef < 0) { xRef = 0; xDir = 1; }
      if (xRef > maxX) { xRef = maxX; xDir = -1; }
      if (yRef < 80) { yRef = 80; yDir = 1; }
      if (yRef > maxY) { yRef = maxY; yDir = -1; }
      setPos({ x: xRef, y: yRef });
      setDir(xDir > 0 ? 1 : -1);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    // Random barks
    const barkInterval = setInterval(() => {
      if (Math.random() < 0.5) {
        setShowBark(true);
        setTimeout(() => setShowBark(false), 1200);
      }
    }, 5000);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(barkInterval);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="fixed z-[115] pointer-events-none animate-bomb-shake"
      style={{
        left: pos.x,
        top: pos.y,
        transform: `scaleX(${dir})`,
        width: 80,
        height: 80,
      }}
    >
      <div className="relative w-full h-full">
        <Image
          src="/shop/Superenergybomb.png"
          alt="Energy Bomb"
          fill
          className="object-contain drop-shadow-lg"
          sizes="80px"
        />
        {showBark && (
          <div
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full whitespace-nowrap animate-bark"
            style={{ transform: `translate(-50%, 0) scaleX(${dir})` }}
          >
            WAKE UP!!
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes bomb-shake {
          0%, 100% { transform: scaleX(${dir}) rotate(-4deg); }
          25% { transform: scaleX(${dir}) rotate(4deg); }
          50% { transform: scaleX(${dir}) rotate(-2deg); }
          75% { transform: scaleX(${dir}) rotate(6deg); }
        }
        .animate-bomb-shake { animation: bomb-shake 0.25s ease-in-out infinite; }

        @keyframes bark {
          0% { opacity: 0; transform: translate(-50%, 10px) scaleX(${dir}); }
          30% { opacity: 1; transform: translate(-50%, 0) scaleX(${dir}); }
          100% { opacity: 0; transform: translate(-50%, -10px) scaleX(${dir}); }
        }
        .animate-bark { animation: bark 1.2s ease-out forwards; }
      `}</style>
    </div>
  );
}
