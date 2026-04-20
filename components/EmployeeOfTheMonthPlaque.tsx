'use client';

import Image from 'next/image';
import { useAdmin } from '@/contexts/AdminContext';

/**
 * Renders the gold "Employee of the Month" plaque with the current
 * winner's name and date overlaid on top of the PNG frame.
 *
 * The plaque PNG already contains [YOUR NAME] and [CURRENT DATE]
 * placeholder text in the design, so we position our overlays right
 * on top of those regions and let the absolute-positioned text cover them.
 */

type Size = 'sm' | 'md' | 'lg';

interface Props {
  size?: Size;
  className?: string;
}

// Plaque PNG is roughly 375 × 670 (portrait, aspect 0.56:1).
const PLAQUE_ASPECT = '375 / 670';

const SIZES: Record<Size, { w: number; label: string }> = {
  sm: { w: 220, label: 'text-[10px]' },
  md: { w: 320, label: 'text-xs' },
  lg: { w: 420, label: 'text-sm' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const day = d.getDate();
  const yy = String(d.getFullYear()).slice(-2);
  return `${month} ${day}, '${yy}`;
}

export default function EmployeeOfTheMonthPlaque({ size = 'md', className = '' }: Props) {
  const { eotm } = useAdmin();

  const { w, label } = SIZES[size];

  if (!eotm) {
    return (
      <div
        className={`relative mx-auto ${className}`}
        style={{ width: w, aspectRatio: PLAQUE_ASPECT }}
      >
        {/* Still render the frame so the feature is visible */}
        <Image
          src="/shop/EmployeeOfTheMonth.png"
          alt="Employee of the Month plaque (empty)"
          fill
          sizes={`${w}px`}
          className="object-contain select-none pointer-events-none opacity-60"
        />
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <div className="bg-black/60 text-white rounded-lg px-3 py-2 max-w-[85%]">
            <div className="text-2xl mb-1">👑</div>
            <div className={`font-bold ${label}`}>No Employee of the Month</div>
            <div className={`${label} italic opacity-80 mt-0.5`}>
              Logan hasn't crowned anyone yet.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative mx-auto ${className}`}
      style={{ width: w, aspectRatio: PLAQUE_ASPECT }}
    >
      <Image
        src="/shop/EmployeeOfTheMonth.png"
        alt="Employee of the Month plaque"
        fill
        sizes={`${w}px`}
        className="object-contain select-none pointer-events-none"
        priority={size === 'lg'}
      />

      {/* Name overlay — covers the "[YOUR NAME]" slot, cropped inside the gold frame */}
      <div
        className="absolute flex items-center justify-center text-center"
        style={{
          left: '24%',
          right: '24%',
          top: '25.5%',
          height: '6%',
          background: '#b8863a',
        }}
      >
        <span
          className="font-serif font-black leading-none"
          style={{
            fontSize: `${Math.max(10, w * 0.052)}px`,
            color: '#2a1a08',
            maxWidth: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={eotm.employee_name}
        >
          {eotm.employee_name}
        </span>
      </div>

      {/* Date overlay — covers the "[CURRENT DATE]" slot, cropped inside the gold frame */}
      <div
        className="absolute flex items-center justify-center text-center"
        style={{
          left: '24%',
          right: '24%',
          top: '82.5%',
          height: '4.5%',
          background: '#b8863a',
        }}
      >
        <span
          className="font-serif font-bold uppercase tracking-wider whitespace-nowrap"
          style={{
            fontSize: `${Math.max(8, w * 0.032)}px`,
            color: '#2a1a08',
          }}
        >
          {formatDate(eotm.set_date)}
        </span>
      </div>
    </div>
  );
}
