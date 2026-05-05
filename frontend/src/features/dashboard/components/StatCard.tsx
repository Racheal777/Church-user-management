import React from 'react';
import { ArrowUpRight, ChevronUp, LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'primary' | 'white';
  icon?: LucideIcon;
  description?: string;
}

export function StatCard({ title, value, trend, variant = 'white', icon: Icon, description }: StatCardProps) {
  if (variant === 'primary') {
    return (
      <div className="bg-blue-800 text-white rounded-xl p-6 relative overflow-hidden shadow-md shadow-blue-900/10 transition-transform hover:scale-[1.02] duration-300">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="flex justify-between items-start mb-6 relative z-10">
          <h3 className="font-bold text-xs uppercase tracking-widest text-blue-100/70">{title}</h3>
          <button className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/5 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        <div className="text-4xl font-bold mb-4 relative z-10 tracking-tight">{value}</div>
        {trend && (
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-100/60 relative z-10">
            <span className="flex items-center bg-white/10 px-2 py-1 rounded-lg text-white gap-1 border border-white/10">
              {trend.value} <ChevronUp className="w-3 h-3" />
            </span>
            {trend.label}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-blue-100 duration-300 group">
      <div className="flex justify-between items-start mb-6">
        <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">{title}</h3>
        <button className="w-8 h-8 rounded-xl border border-slate-100 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all">
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
      <div className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">{value}</div>
      {trend ? (
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-lg gap-1 border border-blue-100">
            {trend.value} <ChevronUp className="w-3 h-3" />
          </span>
          {trend.label}
        </div>
      ) : description ? (
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span className="text-blue-600">{description}</span>
        </div>
      ) : null}
    </div>
  );
}
