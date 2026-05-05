import { ArrowUpRight, ChevronUp, ChevronDown, Minus, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import type { ReactNode } from 'react';

interface TrendData {
  direction: 'up' | 'down' | 'neutral';
  delta: string | number;
  /** When true, "up" is bad (red) and "down" is good (green). Used for Critical Follow-ups. */
  invertColors?: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: TrendData;
  variant?: 'primary' | 'white';
  icon?: LucideIcon;
  description?: string;
  onClick?: () => void;
  as?: 'button' | 'div';
  children?: ReactNode;
}

function getTrendColor(direction: 'up' | 'down' | 'neutral', invert?: boolean) {
  if (direction === 'neutral') return { text: 'text-slate-500', bg: 'bg-slate-50 border-slate-100' };
  if (direction === 'up') {
    return invert
      ? { text: 'text-red-600', bg: 'bg-red-50 border-red-100' }
      : { text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' };
  }
  // down
  return invert
    ? { text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' }
    : { text: 'text-red-600', bg: 'bg-red-50 border-red-100' };
}

function getTrendPrimaryColor(direction: 'up' | 'down' | 'neutral', invert?: boolean) {
  if (direction === 'neutral') return { text: 'text-white/60', bg: 'bg-white/10 border-white/10' };
  if (direction === 'up') {
    return invert
      ? { text: 'text-red-300', bg: 'bg-red-400/20 border-red-400/20' }
      : { text: 'text-emerald-300', bg: 'bg-emerald-400/20 border-emerald-400/20' };
  }
  return invert
    ? { text: 'text-emerald-300', bg: 'bg-emerald-400/20 border-emerald-400/20' }
    : { text: 'text-red-300', bg: 'bg-red-400/20 border-red-400/20' };
}

function TrendIcon({ direction }: { direction: 'up' | 'down' | 'neutral' }) {
  if (direction === 'up') return <ChevronUp className="w-3 h-3" />;
  if (direction === 'down') return <ChevronDown className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
}

function trendLabel(direction: 'up' | 'down' | 'neutral') {
  if (direction === 'up') return 'from last week';
  if (direction === 'down') return 'from last week';
  return 'no change';
}

export function StatCard({ title, value, trend, variant = 'white', description, onClick, as, children }: StatCardProps) {
  const Wrapper = onClick ? 'button' : (as ?? 'div');
  const clickProps = onClick ? { onClick, type: 'button' as const, style: { cursor: 'pointer' } } : {};

  if (variant === 'primary') {
    const colors = trend ? getTrendPrimaryColor(trend.direction, trend.invertColors) : null;
    return (
      <Wrapper
        className="bg-blue-800 text-white rounded-xl p-6 relative overflow-hidden shadow-md shadow-blue-900/10 transition-transform hover:scale-[1.02] duration-300 text-left w-full"
        {...clickProps}
      >
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="flex justify-between items-start mb-6 relative z-10">
          <h3 className="font-bold text-xs uppercase tracking-widest text-blue-100/70">{title}</h3>
          <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div className="text-4xl font-bold mb-4 relative z-10 tracking-tight">{value}</div>
        {trend && colors ? (
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-100/60 relative z-10">
            <span className={clsx("flex items-center px-2 py-1 rounded-lg gap-1 border", colors.bg, colors.text)}>
              {trend.delta} <TrendIcon direction={trend.direction} />
            </span>
            {trendLabel(trend.direction)}
          </div>
        ) : null}
        {children}
      </Wrapper>
    );
  }

  const colors = trend ? getTrendColor(trend.direction, trend.invertColors) : null;
  return (
    <Wrapper
      className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-blue-100 duration-300 group text-left w-full"
      {...clickProps}
    >
      <div className="flex justify-between items-start mb-6">
        <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">{title}</h3>
        <div className="w-8 h-8 rounded-xl border border-slate-100 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all">
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>
      <div className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">{value}</div>
      {trend && colors ? (
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span className={clsx("flex items-center px-2 py-1 rounded-lg gap-1 border", colors.bg, colors.text)}>
            {trend.delta} <TrendIcon direction={trend.direction} />
          </span>
          {trendLabel(trend.direction)}
        </div>
      ) : description ? (
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span className="text-blue-600">{description}</span>
        </div>
      ) : null}
      {children}
    </Wrapper>
  );
}
