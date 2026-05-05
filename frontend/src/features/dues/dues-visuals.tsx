import React from 'react';
import clsx from 'clsx';

type ProgressRingProps = {
  value: number;
  total: number;
  label: string;
  sublabel: string;
};

type MiniBarChartProps = {
  title: string;
  subtitle: string;
  items: Array<{
    label: string;
    value: number;
    tone?: "primary" | "blue" | "gold" | "green";
  }>;
  formatValue?: (value: number) => string;
};

export function ProgressRing({ value, total, label, sublabel }: ProgressRingProps) {
  const safeTotal = Math.max(total, 1);
  const progress = Math.min(Math.max(value / safeTotal, 0), 1);
  const circumference = 2 * Math.PI * 34;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative h-32 w-32 flex-none">
        {/* Background Track */}
        <svg viewBox="0 0 88 88" className="h-32 w-32 -rotate-90">
          <circle cx="44" cy="44" r="34" stroke="#f1f5f9" strokeWidth="8" fill="none" />
          {/* Progress Path */}
          <circle
            cx="44"
            cy="44"
            r="34"
            stroke="#1e40af"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-xl font-black text-slate-900">{Math.round(progress * 100)}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="text-xs font-bold text-slate-600">{sublabel}</p>
      </div>
    </div>
  );
}

export function MiniBarChart({ title, subtitle, items, formatValue = (value) => value.toString() }: MiniBarChartProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</h3>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{subtitle}</p>
      </div>
      <div className="space-y-5">
        {items.map((item) => {
          const width = `${(item.value / maxValue) * 100}%`;
          const barColor = 
            item.tone === "blue" ? "bg-blue-600" :
            item.tone === "gold" ? "bg-amber-500" :
            item.tone === "green" ? "bg-emerald-500" :
            "bg-blue-800";

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-widest">
                <span className="truncate text-slate-400">{item.label}</span>
                <span className="text-slate-900">{formatValue(item.value)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-50">
                <div 
                  className={clsx("h-full rounded-full transition-all duration-1000 ease-out", barColor)} 
                  style={{ width }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
