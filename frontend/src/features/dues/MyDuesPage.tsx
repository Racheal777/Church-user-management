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
  Info,
  Wallet,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

  const isUpToDate = yearSummary.totalOutstanding <= 0;

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-700 transition-colors mb-4 text-[10px] font-black uppercase tracking-widest">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">My Stewardship</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Track your contributions and support the youth mission.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
           {yearOptions.map(y => (
             <button 
               key={y}
               onClick={() => setYearFilter(y)}
               className={clsx(
                 "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                 yearFilter === y ? "bg-white text-blue-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
               )}
             >
               {y}
             </button>
           ))}
        </div>
      </div>

      {personalDuesQuery.isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader label="Synchronizing your ledger..." />
        </div>
      ) : personalDuesQuery.data ? (
        <div className="space-y-10">
          
          {/* Featured Status Card */}
          <div className={clsx(
            "rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl transition-all duration-700",
            isUpToDate ? "bg-slate-900 shadow-slate-900/20" : "bg-blue-900 shadow-blue-900/20"
          )}>
             <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
             
             <div className="relative z-10 grid lg:grid-cols-[1fr_auto] gap-12 items-center">
                <div className="space-y-10">
                   <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                      {isUpToDate ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">
                        {isUpToDate ? "Account fully settled" : "Pending settlement"}
                      </span>
                   </div>
                   
                   <div>
                      <h2 className="text-5xl md:text-6xl font-black tracking-tighter leading-tight">
                        {isUpToDate ? "You're all set for the year!" : "Keep the momentum going."}
                      </h2>
                      <p className="mt-4 text-blue-100/60 font-medium max-w-lg">
                        Your contributions directly support our weekly activities and outreach programs. Thank you for your faithfulness.
                      </p>
                   </div>

                   <div className="flex flex-wrap gap-6 pt-4">
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-blue-100/30 uppercase tracking-widest">Total Paid</p>
                         <p className="text-3xl font-black">GHS {formatMoney(yearSummary.totalPaid)}</p>
                      </div>
                      <div className="w-px h-12 bg-white/10 hidden sm:block mt-2"></div>
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-blue-100/30 uppercase tracking-widest">Weeks Covered</p>
                         <p className="text-3xl font-black">{yearSummary.weeksPaid} <span className="text-sm text-blue-100/40">/ {yearSummary.totalWeeks}</span></p>
                      </div>
                   </div>
                </div>

                <div className="flex justify-center">
                   <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-10 border border-white/10 shadow-2xl">
                      <ProgressRing
                        value={yearSummary.totalPaid}
                        total={yearSummary.totalDue}
                        label="Yearly Target"
                        sublabel="Status"
                        size={240}
                      />
                   </div>
                </div>
             </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Calendar View */}
            <div className="lg:col-span-8 space-y-8">
               <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 group hover:border-blue-100 transition-all">
                  <div className="flex items-center justify-between mb-10">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700">
                           <CalendarIcon className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-lg font-black text-slate-900 tracking-tight">Settlement Calendar</h3>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly verification</p>
                        </div>
                     </div>
                     <div className="hidden sm:flex bg-slate-50 rounded-xl p-1">
                        <div className="px-4 py-1.5 text-[10px] font-black text-blue-700 bg-white shadow-sm rounded-lg uppercase tracking-widest">
                           {monthNames[currentMonth]}
                        </div>
                     </div>
                  </div>
                  
                  <div className="overflow-x-auto pb-4">
                    <DuesMonthCalendar
                      rows={personalDuesQuery.data.ledger}
                      year={Number(yearFilter)}
                      title=""
                      subtitle=""
                    />
                  </div>
               </div>

               <div className="bg-emerald-50/50 rounded-2xl p-8 border border-emerald-100 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                     <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900 leading-relaxed">
                      Did you know?
                    </p>
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mt-1">
                      Paying your dues upfront for the quarter helps the leadership plan outreach programs more effectively.
                    </p>
                  </div>
               </div>
            </div>

            {/* Actions & Insights */}
            <div className="lg:col-span-4 space-y-8">
               <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100 space-y-10">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Insights</h3>
                  
                  <div className="space-y-8">
                     <InsightItem 
                       icon={Wallet} 
                       label="Total Commitment" 
                       value={`GHS ${formatMoney(yearSummary.totalDue)}`} 
                       color="text-blue-700" 
                       bg="bg-blue-50"
                     />
                     <InsightItem 
                       icon={TrendingUp} 
                       label="Paid So Far" 
                       value={`GHS ${formatMoney(yearSummary.totalPaid)}`} 
                       color="text-emerald-700" 
                       bg="bg-emerald-50"
                     />
                     <InsightItem 
                       icon={Clock} 
                       label="Outstanding" 
                       value={`GHS ${formatMoney(yearSummary.totalOutstanding)}`} 
                       color="text-amber-700" 
                       bg="bg-amber-50"
                       isAlert={yearSummary.totalOutstanding > 0}
                     />
                  </div>

                  <div className="pt-8 border-t border-slate-50 space-y-4">
                    <button className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-2">
                       Download Statement
                       <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
                       Official Receipt available in profile
                    </p>
                  </div>
               </div>

               <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100 group hover:border-blue-100 transition-all">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Payment Methods</h3>
                  <div className="space-y-4">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                           <CreditCard className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-slate-600">MTN Mobile Money</p>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                           <Wallet className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-slate-600">Cash (Financial Sec.)</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-24 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
           <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              <Sparkles className="w-8 h-8" />
           </div>
           <p className="text-slate-900 font-black text-lg">No records found</p>
           <p className="text-slate-400 text-sm font-medium mt-1">Your settlement history will appear here once recorded.</p>
        </div>
      )}
    </div>
  );
}

function InsightItem({ icon: Icon, label, value, color, bg, isAlert }: any) {
  return (
    <div className="flex items-center justify-between group">
       <div className="flex items-center gap-4">
          <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg", bg, color)}>
             <Icon className="w-5 h-5" />
          </div>
          <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
             <p className={clsx("text-lg font-black tracking-tight transition-colors", isAlert && "text-amber-600")}>{value}</p>
          </div>
       </div>
    </div>
  );
}
