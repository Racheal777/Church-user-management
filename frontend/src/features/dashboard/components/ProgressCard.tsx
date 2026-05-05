import React from 'react';

interface ProgressCardProps {
  title: string;
  percentage: number;
  label: string;
  legend: {
    label: string;
    color: string;
    pattern?: boolean;
  }[];
}

export function ProgressCard({ title, percentage, label, legend }: ProgressCardProps) {
  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between h-full transition-all hover:shadow-md hover:border-blue-100 duration-300">
      <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-8">{title}</h3>
      
      <div className="flex justify-center my-auto">
        <div className="relative w-48 h-24 overflow-hidden">
          {/* Background Semi-circle */}
          <div 
            className="absolute top-0 left-0 w-48 h-48 rounded-full border-[20px] border-slate-100" 
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f1f5f9 0px, #f1f5f9 2px, transparent 2px, transparent 6px)' }}
          ></div>
          
          {/* Progress Semi-circle (Primary Blue) */}
          <div 
            className="absolute top-0 left-0 w-48 h-48 rounded-full border-[20px] border-blue-700 transition-all duration-1000 ease-out" 
            style={{ clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 ${100 - percentage}%)` }}
          ></div>

          {/* Mask to create the semi-circle effect */}
          <div className="absolute inset-0 bg-white" style={{ clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)' }}></div>
        </div>
      </div>
      
      <div className="flex justify-center -mt-10 relative z-10 mb-8">
        <div className="text-center bg-white px-4">
          <span className="block text-4xl font-bold text-slate-900 leading-none tracking-tight">{percentage}%</span>
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{label}</span>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest w-full justify-center mt-auto">
        {legend.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-slate-500">
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ 
                backgroundColor: item.color === '#1b5e44' ? '#1e40af' : item.color, // map old green to blue if it exists
                backgroundImage: item.pattern ? 'repeating-linear-gradient(45deg, #e2e8f0 0px, #e2e8f0 1px, transparent 1px, transparent 3px)' : undefined
              }}
            ></div>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
