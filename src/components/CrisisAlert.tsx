import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { getGood } from '../data/goods';
import type { CrisisEvent } from '../types/game';

export default function CrisisAlert() {
  const crisisEvents = useGameStore((s) => s.crisisEvents);
  const dismissCrisisEvent = useGameStore((s) => s.dismissCrisisEvent);
  const [visibleEvent, setVisibleEvent] = useState<CrisisEvent | null>(null);

  useEffect(() => {
    if (crisisEvents.length > 0 && !visibleEvent) {
      setVisibleEvent(crisisEvents[0]);
    } else if (crisisEvents.length === 0) {
      setVisibleEvent(null);
    }
  }, [crisisEvents, visibleEvent]);

  useEffect(() => {
    if (visibleEvent) {
      const timer = setTimeout(() => {
        dismissCrisisEvent(visibleEvent.id);
        setVisibleEvent(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [visibleEvent, dismissCrisisEvent]);

  if (!visibleEvent) return null;

  const isStart = visibleEvent.type === 'start';
  const good = getGood(visibleEvent.crisis.goodId);
  const severity = Math.round(visibleEvent.crisis.severity * 100);

  const handleClose = () => {
    dismissCrisisEvent(visibleEvent.id);
    setVisibleEvent(null);
  };

  return (
    <div className="fixed top-20 right-4 z-40 w-80 animate-slide-in">
      <div
        className={`relative overflow-hidden rounded-xl border p-4 backdrop-blur-md shadow-lg ${
          isStart
            ? 'border-rose-500/50 bg-rose-950/80'
            : 'border-emerald-500/50 bg-emerald-950/80'
        }`}
      >
        <div
          className={`absolute top-0 left-0 h-1 ${
            isStart ? 'bg-rose-500' : 'bg-emerald-500'
          } animate-shrink`}
          style={{ animationDuration: '5s' }}
        />

        <div className="flex items-start gap-3">
          <div className="text-3xl">
            {isStart ? '📉' : '📈'}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className={`font-orbitron font-bold text-sm tracking-wider ${
                isStart ? 'text-rose-300' : 'text-emerald-300'
              }`}
            >
              {isStart ? '⚠️ 市场危机爆发' : '✅ 市场危机解除'}
            </div>
            <div className="mt-1 font-semibold text-white">
              {visibleEvent.crisis.title}
            </div>
            <div className="mt-1 text-xs text-slate-300 leading-relaxed">
              {visibleEvent.crisis.description}
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs">
              {good && (
                <span className="flex items-center gap-1 text-slate-300">
                  <span>{good.icon}</span>
                  <span>{good.name}</span>
                </span>
              )}
              <span className={isStart ? 'text-rose-400' : 'text-emerald-400'}>
                严重度 {severity}%
              </span>
              {isStart && (
                <span className="text-slate-400">
                  持续 {visibleEvent.crisis.totalTicks} 周期
                </span>
              )}
            </div>
            {visibleEvent.crisis.chainReactionAffected.length > 0 && (
              <div className="mt-2 text-xs text-amber-300">
                🔗 连锁反应影响:{' '}
                {visibleEvent.crisis.chainReactionAffected
                  .map((id) => getGood(id)?.name ?? id)
                  .join('、')}
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
