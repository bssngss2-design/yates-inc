'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function CatEasterEgg() {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: '50%', left: '50%' });
    const router = useRouter();

    useEffect(() => {
        // Show cat after 7 seconds
        const timer = setTimeout(() => {
            // Random position (avoiding edges)
            const top = Math.floor(Math.random() * 80) + 10 + '%';
            const left = Math.floor(Math.random() * 80) + 10 + '%';

            setPosition({ top, left });
            setIsVisible(true);
        }, 7000);

        return () => clearTimeout(timer);
    }, []);

    const handleClick = () => {
        setIsVisible(false);
        router.push('/info');
    };

    if (!isVisible) return null;

    return (
        <div
            onClick={handleClick}
            className="fixed z-50 cursor-pointer animate-spin-slow hover:scale-110 transition-transform"
            style={{ top: position.top, left: position.left }}
        >
            <Image
                src="/misc/cutcat.png"
                alt="Secret Cat"
                width={64}
                height={64}
                className="pixelated object-contain"
            />
        </div>
    );
}
