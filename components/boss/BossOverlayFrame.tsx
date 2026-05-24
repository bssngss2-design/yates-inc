'use client';

import { ReactNode } from 'react';

const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

interface BossOverlayFrameProps {
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    maxWidth?: string;
}

/** Shared Dark Fantasy gold-framed modal shell (matches Index / Boss Store). */
export default function BossOverlayFrame({
    title,
    subtitle,
    onClose,
    children,
    footer,
    maxWidth = 'max-w-lg',
}: BossOverlayFrameProps) {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <div
                className={`relative flex max-h-[90vh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl border-2 border-solid border-[#c9a227]/55 bg-gradient-to-b from-[#1e1608]/98 via-[#130f03]/98 to-[#0c0900]/99 shadow-[0px_0px_0px_1px_#c9a22748,0px_30px_80px_-12px_#000000]`}
            >
                <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f0d878]/70 to-transparent" />

                <div className="relative z-10 flex w-full items-center justify-center bg-gradient-to-r from-[#7a5a0c] via-[#d4a820] to-[#7a5a0c] py-1.5 shadow-[0px_2px_10px_0px_#c9a2274f]">
                    <div className="absolute left-0 top-0 h-full w-3 bg-[#4a3408] [clip-path:polygon(0_0,100%_0,100%_100%,0_50%)]" />
                    <div className="absolute right-0 top-0 h-full w-3 bg-[#4a3408] [clip-path:polygon(0_0,100%_50%,100%_100%,0_100%)]" />
                    <div className="flex flex-col items-center gap-0.5 py-0.5">
                        <div className="flex items-center gap-2.5">
                            <span className="text-[#3a2502]">✦</span>
                            <span className="text-xs font-bold tracking-[0.35em] text-[#1c1203] drop-shadow-[0_1px_0px_#c9a22780]">
                                {title}
                            </span>
                            <span className="text-[#3a2502]">✦</span>
                        </div>
                        {subtitle && (
                            <span className="text-[9px] tracking-[0.2em] text-[#3a2502]/80">{subtitle}</span>
                        )}
                    </div>
                </div>

                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-md border border-solid border-[#c9a227]/45 bg-[#1a1025]/80 text-[#f0d878] transition-colors hover:border-[#c9a227]/80 hover:bg-[#2a1a35]"
                >
                    <XIcon />
                </button>

                <div className="pointer-events-none absolute left-3 top-9 h-5 w-5 border-l-2 border-t-2 border-solid border-[#c9a227]/55" />
                <div className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-solid border-[#c9a227]/55" />
                <div className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-solid border-[#c9a227]/55" />

                <div className="relative z-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

                {footer && (
                    <div className="relative z-10 border-t border-solid border-[#c9a22733] px-6 py-4">{footer}</div>
                )}

                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a227]/30 to-transparent" />
            </div>
        </div>
    );
}
