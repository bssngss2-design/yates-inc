'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/contexts/GameContext';
import { ASCENSION_NODES, AscensionNode, summarizeAscensionNodeEffects } from '@/types/game';

interface AscensionTreeProps {
  isOpen: boolean;
  onClose: () => void;
  hcEarned?: number;
}

const PATH_COLORS: Record<string, string> = {
  origin: '#fbbf24', money: '#22c55e', damage: '#ef4444', clickSpeed: '#06b6d4',
  building: '#f97316', antimatter: '#a855f7', prism: '#eab308', bank: '#3b82f6',
  wizardA: '#7c3aed', wizardB: '#8b5cf6', traderA: '#10b981', traderB: '#14b8a6',
  afkDuration: '#6366f1', afkProduction: '#818cf8', trinkets: '#ec4899',
  luck: '#f59e0b', drops: '#84cc16',
};

const ZOOM_MIN = 0.38;
const ZOOM_MAX = 1.75;
const ZOOM_STEP = 1.08;

function formatHeavenlyNumber(num: number): string {
  if (!isFinite(num)) return '—';
  const n = Math.floor(num);
  if (n >= 1e42) return `${(n / 1e42).toFixed(1)}Tr`;
  if (n >= 1e39) return `${(n / 1e39).toFixed(1)}Dr`;
  if (n >= 1e36) return `${(n / 1e36).toFixed(1)}Un`;
  if (n >= 1e33) return `${(n / 1e33).toFixed(1)}Dc`;
  if (n >= 1e30) return `${(n / 1e30).toFixed(1)}No`;
  if (n >= 1e27) return `${(n / 1e27).toFixed(1)}Oc`;
  if (n >= 1e24) return `${(n / 1e24).toFixed(1)}Sp`;
  if (n >= 1e21) return `${(n / 1e21).toFixed(1)}Sx`;
  if (n >= 1e18) return `${(n / 1e18).toFixed(1)}Qi`;
  if (n >= 1e15) return `${(n / 1e15).toFixed(1)}Q`;
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}

export default function AscensionTree({ isOpen, onClose, hcEarned }: AscensionTreeProps) {
  const { gameState, buyAscensionNode, equipTitle, setAscensionTreeOpen } = useGame();
  const [mounted, setMounted] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.72);
  const dragging = useRef(false);
  const dragRef = useRef({ mx: 0, my: 0, panX: 0, panY: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const [hoverNode, setHoverNode] = useState<AscensionNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [titleCelebration, setTitleCelebration] = useState<{ name: string; id: string } | null>(null);

  const stars = useMemo(() => {
    return [...Array(120)].map((_, i) => {
      const r = (i * 9301 + 49297) % 233280 / 233280;
      return {
        left: `${(i * 37) % 100}%`,
        top: `${(i * 59) % 100}%`,
        size: 0.6 + (r * 2.2),
        opacity: 0.12 + r * 0.5,
        delay: `${(r * 4).toFixed(2)}s`,
        dur: `${3 + r * 4}s`,
      };
    });
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    setAscensionTreeOpen(isOpen);
    return () => { if (isOpen) setAscensionTreeOpen(false); };
  }, [isOpen, setAscensionTreeOpen]);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !isOpen) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const dir = e.deltaY > 0 ? -1 : 1;
      setZoom((prev) => {
        const z = dir > 0 ? prev / ZOOM_STEP : prev * ZOOM_STEP;
        const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
        return Number.isFinite(next) ? next : prev;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isOpen]);

  const owned = gameState.ownedAscensionNodeIds || [];
  const hc = gameState.heavenlyChips || 0;

  const getNodeState = useCallback((node: AscensionNode): 'locked' | 'available' | 'purchased' => {
    if (owned.includes(node.id)) return 'purchased';
    if (node.id === 'origin') return hc >= node.cost ? 'available' : 'locked';
    if (node.requires && !owned.includes(node.requires)) return 'locked';
    if (!node.requires && !owned.includes('origin')) return 'locked';
    return hc >= node.cost ? 'available' : 'locked';
  }, [owned, hc]);

  const getEdgeStyle = useCallback(
    (parentId: string, childId: string, pathColor: string) => {
      const pOwn = owned.includes(parentId);
      const cOwn = owned.includes(childId);
      const child = ASCENSION_NODES.find((n) => n.id === childId);
      if (!child) return { stroke: '#6b7280', width: 2, dash: '10 8', opacity: 0.35 };
      const st = getNodeState(child);
      if (pOwn && cOwn) return { stroke: pathColor, width: 4, dash: 'none', opacity: 1 };
      if (pOwn && st !== 'locked') return { stroke: pathColor, width: 3.5, dash: '14 7', opacity: 0.92 };
      return { stroke: '#d4d4d8', width: 2.5, dash: '6 10', opacity: 0.42 };
    },
    [owned, getNodeState]
  );

  const handleBgMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-hit')) return;
    dragging.current = true;
    dragRef.current = { mx: e.clientX, my: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleBgMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const d = dragRef.current;
    setPan({
      x: d.panX + e.clientX - d.mx,
      y: d.panY + e.clientY - d.my,
    });
  };

  const endDrag = () => {
    dragging.current = false;
  };

  const tryBuy = (node: AscensionNode) => {
    if (getNodeState(node) !== 'available') {
      setToastMsg('Need more Heavenly Chips or prerequisites');
      return;
    }
    const { success, unlockedTitleName, unlockedTitleId } = buyAscensionNode(node.id);
    if (success) {
      setSelectedId(node.id);
      if (unlockedTitleName && unlockedTitleId) {
        setTitleCelebration({ name: unlockedTitleName, id: unlockedTitleId });
      } else {
        setToastMsg('Purchased!');
      }
    } else {
      setToastMsg("Can't purchase that right now");
    }
  };

  const formatEffect = (node: AscensionNode): { main: string; flavor?: string } => {
    const p = summarizeAscensionNodeEffects(node.effects);
    const main = p.join(' · ') || 'Path unlock';
    return { main, flavor: node.description !== main ? node.description : undefined };
  };

  if (!mounted || !isOpen) return null;

  const zoomPct = Math.round((Number.isFinite(zoom) ? zoom : 1) * 100);

  return createPortal(
    <div
      ref={viewportRef}
      className="fixed inset-0 z-[10000] overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ background: 'radial-gradient(ellipse at center, #0c0c3a 0%, #050518 40%, #000005 100%)' }}
      onMouseDown={handleBgMouseDown}
      onMouseMove={handleBgMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: s.size,
              height: s.size,
              left: s.left,
              top: s.top,
              opacity: s.opacity,
              animation: `twinkle ${s.dur} ease-in-out infinite`,
              animationDelay: s.delay,
            }}
          />
        ))}
      </div>

      {/* Compact top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none px-3 pt-3">
        <div className="pointer-events-auto mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2 sm:gap-3">
          <div
            className="flex items-center gap-3 rounded-md border border-amber-600/50 bg-black/55 px-3 py-1.5"
            style={{ boxShadow: '0 0 14px rgba(180,130,50,0.2)' }}
          >
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-amber-400/90">Prestige</div>
              <div className="text-lg font-bold leading-tight text-amber-200">{gameState.prestigeCount}</div>
            </div>
            <div className="h-8 w-px bg-amber-700/40" />
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-yellow-400/90">Heavenly Chips</div>
              <div className="flex items-center gap-1 text-lg font-bold leading-tight text-lime-300">
                <span aria-hidden>✨</span>
                {formatHeavenlyNumber(hc)}
              </div>
            </div>
            {hcEarned !== undefined && hcEarned > 0 && (
              <>
                <div className="h-8 w-px bg-amber-700/40" />
                <span className="rounded-full border border-emerald-600/50 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  +{formatHeavenlyNumber(hcEarned)} this prestige
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border-2 border-red-500/55 bg-gradient-to-b from-red-800 to-red-950 px-6 py-2 text-sm font-bold text-white shadow-lg transition hover:from-red-700 hover:to-red-900"
          >
            CONTINUE
          </button>
        </div>
      </div>

      {/* World: single transform (pan + zoom) from viewport center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <svg
            className="pointer-events-none absolute left-1/2 top-1/2 overflow-visible"
            style={{ transform: 'translate(-50%, -50%)' }}
            width={5200}
            height={5200}
            viewBox="-2600 -2600 5200 5200"
          >
            {ASCENSION_NODES.filter((n) => n.requires).map((node) => {
              const parent = ASCENSION_NODES.find((p) => p.id === node.requires);
              if (!parent) return null;
              const x1 = parent.position.x;
              const y1 = parent.position.y;
              const x2 = node.position.x;
              const y2 = node.position.y;
              const color = PATH_COLORS[node.pathId] || '#94a3b8';
              const es = getEdgeStyle(parent.id, node.id, color);
              return (
                <line
                  key={`l-${node.id}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={es.stroke}
                  strokeWidth={es.width}
                  strokeDasharray={es.dash === 'none' ? undefined : es.dash}
                  opacity={es.opacity}
                />
              );
            })}
            {ASCENSION_NODES.filter((n) => n.id !== 'origin' && !n.requires).map((node) => {
              const x1 = 0;
              const y1 = 0;
              const x2 = node.position.x;
              const y2 = node.position.y;
              const color = PATH_COLORS[node.pathId] || '#94a3b8';
              const es = getEdgeStyle('origin', node.id, color);
              return (
                <line
                  key={`lo-${node.id}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={es.stroke}
                  strokeWidth={es.width}
                  strokeDasharray={es.dash === 'none' ? undefined : es.dash}
                  opacity={es.opacity}
                />
              );
            })}
          </svg>

          {ASCENSION_NODES.map((node) => {
            const state = getNodeState(node);
            const x = node.position.x;
            const y = node.position.y;
            const color = PATH_COLORS[node.pathId] || '#fbbf24';
            const hasIcon = Boolean(node.icon);
            const grantsTitle = Boolean(node.effects.titleReward);
            const size = hasIcon || grantsTitle ? 52 : node.id === 'origin' ? 58 : 38;
            const isSel = selectedId === node.id;
            const imgPx = Math.max(20, size - 10);

            return (
              <button
                key={node.id}
                type="button"
                className="node-hit absolute flex items-center justify-center rounded-full transition-all duration-150 overflow-hidden"
                style={{
                  left: x - size / 2,
                  top: y - size / 2,
                  width: size,
                  height: size,
                  background:
                    state === 'purchased'
                      ? `radial-gradient(circle, ${color}, ${color}88)`
                      : state === 'available'
                        ? `radial-gradient(circle, ${color}66, ${color}22)`
                        : 'radial-gradient(circle, #1a1a2e, #0a0a15)',
                  border: `${isSel ? 4 : 3}px solid ${
                    state === 'purchased' ? color : state === 'available' ? color + 'cc' : '#3f3f54'
                  }`,
                  boxShadow:
                    state === 'purchased'
                      ? `0 0 16px ${color}99`
                      : state === 'available'
                        ? `0 0 12px ${color}66`
                        : 'inset 0 0 6px rgba(0,0,0,0.6)',
                  zIndex: 2,
                  animation: state === 'available' ? 'nodePulse 2.5s ease-in-out infinite' : 'none',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId((id) => (id === node.id ? null : node.id));
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  tryBuy(node);
                }}
                onMouseEnter={(e) => {
                  setHoverNode(node);
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHoverNode((h) => (h?.id === node.id ? null : h))}
              >
                {node.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={node.icon} alt="" width={imgPx} height={imgPx} className="pointer-events-none object-contain" />
                ) : (
                  <span
                    className="select-none font-bold text-white"
                    style={{ fontSize: grantsTitle ? 22 : node.id === 'origin' ? 17 : 12 }}
                  >
                    {node.id === 'origin' ? '◆' : grantsTitle ? '👑' : '●'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hover tooltip (Cookie-Clicker style) */}
      {hoverNode && (() => {
        const st = getNodeState(hoverNode);
        const badgePurchased = st === 'purchased';
        const badgeText = badgePurchased ? 'Purchased' : st === 'available' ? 'Available' : 'Locked';
        const fx = formatEffect(hoverNode);
        const pathColor = PATH_COLORS[hoverNode.pathId] || '#fbbf24';
        const pad = 14;
        const tw = Math.min(340, typeof window !== 'undefined' ? window.innerWidth - 24 : 340);
        let left = tooltipPos.x + pad;
        let top = tooltipPos.y + pad;
        if (typeof window !== 'undefined') {
          if (left + tw > window.innerWidth - 8) left = tooltipPos.x - tw - pad;
          if (top + 220 > window.innerHeight) top = window.innerHeight - 230;
        }
        return (
          <div
            className="pointer-events-none fixed z-[10001] rounded-lg border-2 bg-gray-950/98 px-3 py-2 shadow-2xl backdrop-blur-md"
            style={{ left, top, width: tw, borderColor: pathColor }}
          >
            <div className="flex items-start gap-2 border-b border-gray-700/80 pb-2">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-600 bg-gray-900"
                aria-hidden
              >
                {hoverNode.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hoverNode.icon} alt="" width={36} height={36} className="object-contain" />
                ) : (
                  <span className="text-lg">✨</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="break-words text-sm font-bold leading-tight text-white">{hoverNode.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="rounded bg-violet-900/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-200">
                    Heavenly
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      badgePurchased
                        ? 'bg-emerald-900/50 text-emerald-200'
                        : st === 'available'
                          ? 'bg-lime-900/40 text-lime-200'
                          : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {badgeText}
                  </span>
                  {hoverNode.effects.titleReward && (
                    <span className="rounded bg-amber-900/45 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200">
                      Title
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="flex items-center justify-end gap-0.5 text-lime-300">
                  <span>✨</span>
                  <span className="text-sm font-bold">{formatHeavenlyNumber(hoverNode.cost)}</span>
                </div>
                <div className="text-[9px] font-medium text-lime-400/90">Heavenly Chips</div>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white">{fx.main}</p>
            {fx.flavor && <p className="mt-1 text-[11px] italic leading-snug text-gray-400">{fx.flavor}</p>}
            {st === 'available' && (
              <p className="mt-2 text-[10px] text-amber-200/90">Double-click to purchase</p>
            )}
          </div>
        );
      })()}

      {titleCelebration && (
        <div className="fixed inset-0 z-[10003] flex items-center justify-center bg-black/70 p-4">
          <div
            className="pointer-events-auto max-w-md rounded-xl border-2 border-amber-400/60 bg-gradient-to-b from-gray-900 to-black p-6 text-center shadow-2xl"
            role="dialog"
            aria-labelledby="asc-title-head"
          >
            <p className="text-sm font-bold uppercase tracking-widest text-amber-300/90">Title unlocked</p>
            <h2 id="asc-title-head" className="mt-2 bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-3xl font-black text-transparent">
              {titleCelebration.name}
            </h2>
            <p className="mt-3 text-sm text-gray-300">
              It&apos;s in your title collection now. Equip it from the titles panel whenever you want to flex.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-500"
                onClick={() => {
                  const id = titleCelebration.id;
                  const name = titleCelebration.name;
                  setTitleCelebration(null);
                  window.setTimeout(() => {
                    const ok = equipTitle(id);
                    setToastMsg(
                      ok ? `Equipped: ${name}` : "Couldn't equip yet — open the titles panel and equip manually (save syncing)."
                    );
                  }, 100);
                }}
              >
                Equip now
              </button>
              <button
                type="button"
                className="rounded-lg border border-gray-500 px-5 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800"
                onClick={() => setTitleCelebration(null)}
              >
                Nice
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="absolute left-1/2 top-24 z-[10002] -translate-x-1/2 rounded-lg border border-emerald-500/40 bg-emerald-950/95 px-5 py-2 text-sm font-semibold text-emerald-100 shadow-lg">
          {toastMsg}
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-20 rounded border border-gray-700/60 bg-black/50 px-2 py-1 text-[10px] text-gray-400">
        Zoom: {zoomPct}% · wheel · drag pan
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.15;
          }
          50% {
            opacity: 0.65;
          }
        }
        @keyframes nodePulse {
          0%,
          100% {
            box-shadow: 0 0 6px currentColor;
          }
          50% {
            box-shadow: 0 0 18px currentColor;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
