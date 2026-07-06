import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Landmark,
  CreditCard,
  ArrowRight,
  X,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import {
  currentMonth,
  currentYear,
  DuesMonthCalendar,
  formatDate,
  formatMoney,
  getYearSummary,
  MONTHLY_DUES_AMOUNT,
  monthNames,
} from "./shared-dues-ui";
import clsx from "clsx";

export function ManageDuesPage() {
  const { member, accessToken } = useAuth();
  const toast = useToast();
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [memberYearFilter, setMemberYearFilter] = useState(String(currentYear));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [graphView, setGraphView] = useState<"month" | "week">("month");

  const reportQuery = useQuery({
    queryKey: ["dues-reports"],
    queryFn: () => api.getDuesReport(accessToken!),
    enabled: Boolean(member?.permissions.canManageFinance && accessToken)
  });
  const membersQuery = useQuery({
    queryKey: ["finance-members"],
    queryFn: () => api.listMembers({ activeStatus: "all" }, accessToken!),
    enabled: Boolean(member?.permissions.canManageFinance && accessToken)
  });
  const selectedMemberDuesQuery = useQuery({
    queryKey: ["selected-member-dues", selectedMemberId],
    queryFn: () => api.getMemberDues(selectedMemberId, accessToken!),
    enabled: Boolean(member?.permissions.canManageFinance && selectedMemberId && accessToken)
  });

  const selectedMember = membersQuery.data?.members.find((item) => item.id === selectedMemberId) ?? null;
  const selectedAmountValue = Number(paymentAmount);
  const selectedAmountCents = Number.isFinite(selectedAmountValue) ? Math.round(selectedAmountValue * 100) : 0;
  const amountRemainderCents = selectedAmountCents % (MONTHLY_DUES_AMOUNT * 100);
  const monthsCoveredPreview = selectedAmountCents > 0 ? Math.floor(selectedAmountCents / (MONTHLY_DUES_AMOUNT * 100)) : 0;
  const memberYearSummary = getYearSummary(selectedMemberDuesQuery.data, memberYearFilter);
  
  const outstandingMonths = useMemo(
    () =>
      [...(selectedMemberDuesQuery.data?.ledger.filter((entry) => entry.status !== "paid") ?? [])].sort(
        (left, right) => new Date(left.weekOf).getTime() - new Date(right.weekOf).getTime()
      ),
    [selectedMemberDuesQuery.data?.ledger]
  );
  const projectedMonths = outstandingMonths.slice(0, monthsCoveredPreview);

  async function recordCashPayment() {
    if (!accessToken || !selectedMemberId || !paymentAmount) return;
    if (!Number.isFinite(selectedAmountValue) || selectedAmountValue <= 0) {
      toast.error({ title: "Error", description: "Invalid amount." });
      return;
    }
    if (amountRemainderCents !== 0) {
      toast.error({ title: "Error", description: `Dues are GHS ${MONTHLY_DUES_AMOUNT.toFixed(2)} increments.` });
      return;
    }
    try {
      const result = await api.recordCashPayment({ memberId: selectedMemberId, amount: selectedAmountValue }, accessToken);
      toast.success({
        title: "Success",
        description: `GHS ${result.amountApplied.toFixed(2)} recorded for ${result.monthsCovered ?? result.weeksCovered} months.`
      });
      setPaymentAmount("");
      setIsDrawerOpen(false);
      await selectedMemberDuesQuery.refetch();
      await reportQuery.refetch();
    } catch (error) {
      toast.error({ title: "Error", description: error instanceof Error ? error.message : "Payment failed." });
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Financial Hub</h1>
          <p className="text-slate-500 text-sm font-medium">Dues management and monthly overview.</p>
        </div>
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-md shadow-blue-900/5 text-sm uppercase tracking-widest active:scale-95"
        >
          <CreditCard className="w-5 h-5" />
          Record Payment
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Visual Comparison */}
        <div className="lg:col-span-8 space-y-8">
          {/* Dues Graph Card */}
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 overflow-hidden relative">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">Monthly Dues</h3>
                <p className="text-2xl font-black text-slate-900">
                  GHS {formatMoney(reportQuery.data?.summary.totalReceivedSoFar ?? 0)}
                  <span className="text-sm font-medium text-slate-400 ml-2">received</span>
                </p>
              </div>
              <div className="flex bg-slate-50 p-1 rounded-xl">
                <button
                  onClick={() => setGraphView("month")}
                  className={clsx("px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all", graphView === "month" ? "bg-white text-blue-700 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >Month</button>
                <button
                  onClick={() => setGraphView("week")}
                  className={clsx("px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all", graphView === "week" ? "bg-white text-blue-700 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >Recent</button>
              </div>
            </div>
            <DuesBarChart history={reportQuery.data?.history} view={graphView} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Stats Summary */}
            <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100">
               <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-slate-400 mb-8">Revenue Stream</h3>
               <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                          <Landmark className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Received</p>
                          <p className="text-base font-bold text-slate-900">GHS {formatMoney(reportQuery.data?.summary.totalReceivedSoFar ?? 0)}</p>
                       </div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">↑ 8%</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
                          <CheckCircle2 className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Met</p>
                          <p className="text-base font-bold text-slate-900">{Math.round((reportQuery.data?.summary.totalReceivedSoFar ?? 0) / (reportQuery.data?.summary.projectedYearAmount ?? 1) * 100)}%</p>
                       </div>
                    </div>
                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Target: 25k</span>
                 </div>
               </div>
            </div>

            {/* Top Contributors Mini */}
            <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100">
               <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-slate-400 mb-8">Top Payers</h3>
               <div className="space-y-4">
                 {(reportQuery.data?.topPayers ?? []).slice(0, 3).map((payer: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between group">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-[10px]">
                            {idx + 1}
                          </div>
                          <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700 transition-colors">{payer.firstName} {payer.lastName}</span>
                       </div>
                       <span className="text-xs font-black text-slate-900">GHS {formatMoney(payer.amountPaid)}</span>
                    </div>
                 ))}
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Alerts & Small Calendar */}
        <div className="lg:col-span-4 space-y-8">
          {/* Smaller Calendar */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-[10px] uppercase tracking-[0.25em] text-slate-400">Activity</h3>
                <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">{monthNames[currentMonth]}</span>
             </div>
             {/* Mini Calendar implementation without the large cells */}
             <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["M", "T", "W", "T", "F", "S", "S"].map(d => (
                  <div key={d} className="text-[8px] font-black text-slate-300">{d}</div>
                ))}
             </div>
             <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 31 }).map((_, i) => (
                  <div key={i} className={clsx(
                    "aspect-square rounded-lg flex items-center justify-center text-[9px] font-bold transition-all",
                    i + 1 === new Date().getDate() ? "bg-blue-700 text-white shadow-lg shadow-blue-900/5" : 
                    Math.random() > 0.7 ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400"
                  )}>
                    {i + 1}
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Side Drawer for Record Payment */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-white z-[60] shadow-lg flex flex-col p-10 overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Record Receipt</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Entry Console</p>
                  </div>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-8 flex-1">
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Search Member</label>
                   <select
                     className="w-full bg-slate-50 border-none rounded-2xl pl-6 pr-6 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700 appearance-none cursor-pointer"
                     value={selectedMemberId}
                     onChange={(event) => {
                       setSelectedMemberId(event.target.value);
                       setPaymentAmount("");
                     }}
                   >
                     <option value="">Select Member...</option>
                     {membersQuery.data?.members.map((item) => (
                       <option key={item.id} value={item.id}>
                         {item.firstName} {item.lastName}
                       </option>
                     ))}
                   </select>
                </div>

                {selectedMember && selectedMemberDuesQuery.data && (
                  <div className="space-y-8">
                     <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg shadow-blue-900/10">
                        <div className="absolute -right-10 -top-10 w-48 h-48 bg-blue-600 rounded-full blur-[80px] opacity-20"></div>
                        <h4 className="text-xl font-black uppercase tracking-tight mb-2">{selectedMember.firstName} {selectedMember.lastName}</h4>
                        <p className="text-[10px] text-blue-100/50 font-bold uppercase tracking-widest mb-6">{selectedMember.role.replace('_', ' ')}</p>
                        <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-6">
                           <div>
                              <p className="text-[8px] font-black text-blue-100/10 uppercase tracking-widest mb-1">Paid</p>
                              <p className="text-lg font-bold">GHS {formatMoney(memberYearSummary.totalPaid)}</p>
                           </div>
                           <div>
                              <p className="text-[8px] font-black text-blue-100/10 uppercase tracking-widest mb-1">Pending</p>
                              <p className="text-lg font-bold text-red-400">GHS {formatMoney(memberYearSummary.totalOutstanding)}</p>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <DuesMonthCalendar
                           rows={selectedMemberDuesQuery.data.ledger}
                           year={currentYear}
                           title="Monthly View"
                           subtitle="Current month status"
                        />

                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Payment Amount (GHS)</label>
                           <input
                              className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-2xl font-black text-blue-900 placeholder:text-slate-200"
                              type="number"
                              min={MONTHLY_DUES_AMOUNT}
                              step={MONTHLY_DUES_AMOUNT}
                              value={paymentAmount}
                              placeholder="0.00"
                              onChange={(event) => setPaymentAmount(event.target.value)}
                           />
                        </div>

                        {paymentAmount && (
                           <div className={clsx(
                             "p-6 rounded-2xl border transition-all",
                             amountRemainderCents !== 0 ? "bg-red-50 border-red-100 text-red-600" : "bg-blue-50 border-blue-100 text-blue-700"
                           )}>
                              {amountRemainderCents !== 0 ? (
                                 <p className="text-xs font-bold">Please enter a multiple of GHS {MONTHLY_DUES_AMOUNT.toFixed(2)}</p>
                              ) : (
                                 <div className="space-y-4">
                                    <p className="text-xs font-bold uppercase tracking-widest">Allocating to {monthsCoveredPreview} months:</p>
                                    <div className="flex flex-wrap gap-2">
                                       {projectedMonths.map((week) => (
                                          <span key={week.id} className="text-[8px] font-black uppercase tracking-widest bg-white px-2 py-1 rounded-md border border-blue-100">
                                             {formatDate(week.weekOf)}
                                          </span>
                                       ))}
                                    </div>
                                 </div>
                              )}
                           </div>
                        )}
                     </div>
                  </div>
                )}
              </div>

              <div className="pt-10 mt-auto border-t border-slate-50 flex gap-4">
                <button onClick={() => setIsDrawerOpen(false)} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs">Cancel</button>
                <button 
                  onClick={() => void recordCashPayment()}
                  className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-md shadow-blue-900/5 disabled:opacity-30 flex items-center justify-center gap-2"
                  disabled={!selectedMemberId || !paymentAmount || amountRemainderCents !== 0} 
                >
                  Record Payment
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DuesBarChart({
  history,
  view = "month",
}: {
  history?: Array<{ month: string; amount: number }>;
  view?: "month" | "week";
}) {
  const fallback = [
    { month: "Jan", amount: 320 },
    { month: "Feb", amount: 480 },
    { month: "Mar", amount: 400 },
    { month: "Apr", amount: 560 },
    { month: "May", amount: 640 },
    { month: "Jun", amount: 720 },
  ];

  const allData = history && history.length > 0 ? history : fallback;
  const data = view === "week" ? allData.slice(-4) : allData;
  const maxAmount = Math.max(...data.map(d => d.amount), 1);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="relative">
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
        {[0.75, 0.5, 0.25].map(p => (
          <div key={p} className="flex items-center gap-3">
            <span className="text-[9px] font-black text-slate-200 w-10 text-right shrink-0">
              GHS {formatMoney(maxAmount * p)}
            </span>
            <div className="flex-1 h-px bg-slate-50" />
          </div>
        ))}
      </div>

      <div className="flex items-end justify-between gap-3 h-52 pl-14 pb-6 border-b border-slate-50">
        {data.map((item, i) => (
          <div
            key={`${view}-${i}`}
            className="flex-1 flex flex-col items-center gap-2 relative cursor-pointer group"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="w-full h-full flex items-end">
              <motion.div
                key={`${view}-bar-${i}`}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.45, delay: i * 0.05, ease: "easeOut" }}
                className={clsx(
                  "w-full rounded-t-xl origin-bottom transition-colors duration-200",
                  hoveredIdx === i
                    ? "bg-blue-700 shadow-lg shadow-blue-900/10"
                    : "bg-blue-100 group-hover:bg-blue-200"
                )}
                style={{ height: `${(item.amount / maxAmount) * 100}%` }}
              />
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.month}</span>

            <AnimatePresence>
              {hoveredIdx === i && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-3 py-2 rounded-xl shadow-xl z-20 flex flex-col items-center pointer-events-none whitespace-nowrap border border-slate-800"
                >
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.month}</span>
                  <span className="text-xs font-black text-white mt-0.5">GHS {formatMoney(item.amount)}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
