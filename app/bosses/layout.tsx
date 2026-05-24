'use client';

import { BossProvider } from '@/contexts/BossContext';

export default function BossesLayout({ children }: { children: React.ReactNode }) {
    return <BossProvider>{children}</BossProvider>;
}
