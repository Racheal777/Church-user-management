import { useQuery } from "@tanstack/react-query";
import { 
  ChevronLeft, 
  CreditCard, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  ArrowRight,
  Info
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";

import { Loader } from "../../components/Loader";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import { DuesMonthCalendar, YearFilterChips, formatMoney, getYearOptions, getYearSummary, monthNames, currentMonth, currentYear } from "./shared-dues-ui";
import { ProgressRing } from "./dues-visuals";
import clsx from "clsx";

export function MyDuesPage() {
  const { member, accessToken } = useAuth();
  const [yearFilter, setYearFilter] = useState(String(currentYear));

  const personalDuesQuery = useQuery({
    queryKey: ["my-dues", member?.id],
    queryFn: () => api.getDues(accessToken!),
    enabled: Boolean(accessToken)
  });

  const yearOptions = getYearOptions(personalDuesQuery.data);
  const yearSummary = getYearSummary(personalDuesQuery.data, yearFilter);

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-blue-700 transition-colors mb-2 text-xs font-bold uppercase tracking-widest">
            <ChevronLeft className="w-4 h-4" />
            Back Home
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">My Dues</h1>
          <p className="text-slate-500 text-sm font-medium">Keep track of your contributions and support.</p>
        </div>
        <div className="hidden md:flex items-center gap-3 bg-blue-50 text-blue-700 px-5 py-3 rounded-2xl border border-blue-100">
          <CreditCard className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-widest">Settlement Center</span>
        </div>
      </div>

      {personalDuesQuery.isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader label="Synchronizing ledger..." />
        </div>
      ) : personalDuesQuery.data ? (
        <div className="space-y-10">
          
          {/* Main Status Card */}
          <div className="bg-slate-900 rounded-2xl p-10 md:p-16 text-white relative overflow-hidden shadow-lg shadow-blue-900/10 group">
             <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-600 rounded-full blur-[120px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
             <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-red-600 rounded-full blur-[120px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
             
             <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                   <div>
                      <p className="text-[10px] font-black text-blue-100/10 uppercase tracking-[0.3em] mb-3">Yearly Progress · {yearFilter}</p>
                      <h2 className="text-5xl font-black tracking-tighter">Stay Consistent</h2>
                   </div>
                   <div className="flex flex-wrap gap-4">
                      <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex-1 min-w-[140px]">
                         <p className="text-[9px] font-black text-blue-100/10 uppercase tracking-widest mb-1">Paid Amount</p>
                         <p className="text-2xl font-bold">GHS {formatMoney(yearSummary.totalPaid)}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex-1 min-w-[140px]">
                         <p className="text-[9px] font-black text-blue-100/10 uppercase tracking-widest mb-1">Status</p>
                         <p className={clsx(
                           "text-2xl font-bold",
                           yearSummary.totalOutstanding > 0 ? "text-amber-400" : "text-emerald-400"
                         )}>
                           {yearSummary.totalOutstanding > 0 ? 'Pending' : 'Settled'}
                         </p>
                      </div>
                   </div>
                   <YearFilterChips years={yearOptions} activeYear={yearFilter} onChange={setYearFilter} />
                </div>

                <div className="flex justify-center md:justify-end">
                   <div className="bg-white/5 backdrop-blur-3xl rounded-2xl p-8 border border-white/10 shadow-lg">
                      <ProgressRing
                        value={yearSummary.totalPaid}
                        total={yearSummary.totalDue}
                        label="Yearly Target"
                        sublabel="Settlement Ratio"
                      />
                   </div>
                </div>
             </div>
          </div>

          <div className="grid md:grid-cols-12 gap-8">
            {/* Calendar Column */}
            <div className="md:col-span-7 space-y-8">
               <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Outlook</h3>
                        <p className="text-sm font-bold text-slate-900">{monthNames[currentMonth]} {yearFilter}</p>
                     </div>
                     <Sparkles className="w-5 h-5 text-blue-100" />
                  </div>
                  <DuesMonthCalendar
                    rows={personalDuesQuery.data.ledger}
                    year={Number(yearFilter)}
                    title=""
                    subtitle=""
                  />
               </div>

               <div className="bg-blue-50/50 rounded-2xl p-8 border border-blue-100 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                     <Info className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-bold text-blue-800 leading-relaxed uppercase tracking-widest pt-1">
                    Dues are recorded every Monday. Please ensure your payments are confirmed by the financial secretary to keep your status updated.
                  </p>
               </div>
            </div>

            {/* Stats Column */}
            <div className="md:col-span-5 space-y-8">
               <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 space-y-10">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Settlement Summary</h3>
                  
                  <div className="space-y-8">
                     <SummaryItem 
                       icon={TrendingUp} 
                       label="Contribution Target" 
                       value={`GHS ${formatMoney(yearSummary.totalDue)}`} 
                       color="text-blue-700" 
                       bg="bg-blue-50"
                     />
                     <SummaryItem 
                       icon={ShieldCheck} 
                       label="Weeks Covered" 
                       value={`${yearSummary.weeksPaid} of ${yearSummary.totalWeeks}`} 
                       color="text-emerald-700" 
                       bg="bg-emerald-50"
                     />
                     <SummaryItem 
                       icon={Clock} 
                       label="Remaining Balance" 
                       value={`GHS ${formatMoney(yearSummary.totalOutstanding)}`} 
                       color="text-amber-700" 
                       bg="bg-amber-50"
                     />
                  </div>

                  <div className="pt-8 border-t border-slate-50">
                    <button className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-2">
                       Request Statement
                       <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
           <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No records available yet.</p>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ icon: Icon, label, value, color, bg }: any) {
  return (
    <div className="flex items-center justify-between group">
       <div className="flex items-center gap-4">
          <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", bg, color)}>
             <Icon className="w-5 h-5" />
          </div>
          <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
             <p className="text-sm font-bold text-slate-900">{value}</p>
          </div>
       </div>
    </div>
  );
}
