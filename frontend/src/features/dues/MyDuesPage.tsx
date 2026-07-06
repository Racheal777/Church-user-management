import { useQuery } from "@tanstack/react-query";
import { 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight,
  Zap,
  Download,
  Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type DuesLedgerItem } from "../../lib/api";
import { useAuth } from "../../providers/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import { formatMoney, MONTHLY_DUES_AMOUNT } from "./shared-dues-ui";
import clsx from "clsx";

export function MyDuesPage() {
  const { member, accessToken } = useAuth();
  const toast = useToast();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const duesQuery = useQuery({
    queryKey: ["dues", member?.id],
    queryFn: () => api.getDues(accessToken!),
    enabled: Boolean(accessToken)
  });

  const ledger = duesQuery.data?.ledger || [];
  const summary = duesQuery.data?.summary;
  const annualBreakdown = duesQuery.data?.annualBreakdown || [];
  const years = annualBreakdown.map(b => b.year);

  const sortedMonths = useMemo(() => {
    const now = new Date();
    return [...ledger]
      .filter(item => new Date(item.weekOf).getUTCFullYear() === selectedYear)
      .sort((a, b) => {
        // Unpaid/Advance first, then Paid
        if (a.status !== "paid" && b.status === "paid") return -1;
        if (a.status === "paid" && b.status !== "paid") return 1;
        
        // If both are unpaid/advance, sort by date ascending (oldest first)
        if (a.status !== "paid" && b.status !== "paid") {
          return new Date(a.weekOf).getTime() - new Date(b.weekOf).getTime();
        }
        
        // If both are paid, sort by date descending (newest first)
        return new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime();
      });
  }, [ledger, selectedYear]);

  const visibleMonths = useMemo(() => {
    const defaultCount = 5;
    const requiredCount = selectedMonths.length;
    const showCount = Math.max(defaultCount, requiredCount);
    return sortedMonths.slice(0, showCount);
  }, [sortedMonths, selectedMonths]);

  const yearSummary = useMemo(() => {
    return annualBreakdown.find(b => b.year === selectedYear);
  }, [annualBreakdown, selectedYear]);

  const [customAmount, setCustomAmount] = useState("");

  const toggleMonth = (monthOf: string) => {
    if (selectedMonths.includes(monthOf)) {
      setSelectedMonths(selectedMonths.filter(w => w !== monthOf));
    } else {
      setSelectedMonths([...selectedMonths, monthOf]);
    }
  };

  const handleAmountChange = (val: string) => {
      setCustomAmount(val);
    const amount = parseFloat(val);
    if (isNaN(amount) || amount <= 0) {
      setSelectedMonths([]);
      return;
    }

    const monthCount = Math.floor(amount / MONTHLY_DUES_AMOUNT);
    if (monthCount === 0) {
      setSelectedMonths([]);
      return;
    }

    const allUnpaid = [...ledger]
      .filter(w => w.status === "unpaid")
      .sort((a, b) => new Date(a.weekOf).getTime() - new Date(b.weekOf).getTime());

    const toSelect = allUnpaid.slice(0, monthCount).map(w => w.weekOf);
    setSelectedMonths(toSelect);
  };

  const totalSelected = selectedMonths.length * MONTHLY_DUES_AMOUNT;

  async function handlePayment() {
    if (!accessToken || !member || selectedMonths.length === 0) return;
    
    try {
      const { authorization_url } = await api.initiateMomoPayment({
        member_id: member.id,
        month_dates: selectedMonths.sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
        total_amount: totalSelected
      }, accessToken);
      
      // Open Paystack Checkout
      window.location.href = authorization_url;
    } catch (error) {
      toast.error({ title: "Payment Failed", description: error instanceof Error ? error.message : "Unable to initiate payment." });
    }
  }

  async function handleDownload() {
    if (!accessToken) return;
    setIsDownloading(true);
    try {
      const blob = await api.downloadStatement(selectedYear, accessToken);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Stewardship_Statement_${selectedYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error({ title: "Download Failed", description: "Could not generate statement PDF." });
    } finally {
      setIsDownloading(false);
    }
  }

  if (duesQuery.isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
      </div>
    );
  }

  const isAllPaid = (yearSummary?.monthsPending ?? yearSummary?.weeksPending ?? 0) === 0;

  return (
    <div className="mx-auto max-w-lg space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="space-y-6 px-2">
        <div className="flex items-center justify-between">
           <div>
              <Link to="/" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-blue-700 transition-colors mb-2 text-[10px] font-black uppercase tracking-widest">
                <ChevronLeft className="w-3 h-3" />
                Back
              </Link>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Dues</h1>
             
           </div>
           <div className="flex bg-slate-100 p-1 rounded-xl">
             {years.length ? years.map(y => (
               <button 
                 key={y}
                 onClick={() => {
                   setSelectedYear(y);
                   setSelectedMonths([]);
                 }}
                 className={clsx(
                   "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                   selectedYear === y ? "bg-white text-blue-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
                 )}
               >
                 {y}
               </button>
             )) : <span className="px-4 py-1.5 text-[10px] text-slate-400 font-bold">{selectedYear}</span>}
           </div>
        </div>
      </div>

      {/* Status Banner */}
      <div className="px-2 space-y-4">
        <div className={clsx(
          "rounded-[2rem] p-6 flex items-start gap-4 shadow-sm",
          summary?.totalOutstanding === 0 && (summary?.monthsPaid ?? summary?.weeksPaid ?? 0) > 0 ? "bg-emerald-50 text-emerald-800 border border-emerald-100" :
          summary?.totalOutstanding! > 0 ? "bg-amber-50 text-amber-800 border border-amber-100" :
          "bg-blue-50 text-blue-800 border border-blue-100"
        )}>
           <div className={clsx(
             "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
             summary?.totalOutstanding === 0 && (summary?.monthsPaid ?? summary?.weeksPaid ?? 0) > 0 ? "bg-emerald-100 text-emerald-600" :
             summary?.totalOutstanding! > 0 ? "bg-amber-100 text-amber-600" :
             "bg-blue-100 text-blue-600"
           )}>
             {summary?.totalOutstanding === 0 ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
           </div>
           <div>
              <p className="text-lg font-black tracking-tight leading-tight">
                {summary?.statusMessage}
              </p>
              <p className="text-xs font-medium opacity-70 mt-0.5">
                {summary?.totalOutstanding! > 0 
                  ? `GHS ${formatMoney(summary?.totalOutstanding!)} outstanding — clear your arrears below`
                  : "Your contributions are up to date."}
              </p>
           </div>
        </div>

        {/* Quick Amount Input */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
           <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Pay</span>
              {customAmount && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                  Covers {Math.floor(parseFloat(customAmount) / MONTHLY_DUES_AMOUNT)} months
                </span>
              )}
           </div>
           <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 text-lg">GHS</span>
              <input 
                type="number"
                step={MONTHLY_DUES_AMOUNT}
                placeholder="Enter amount (e.g. 10, 20...)"
                value={customAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={clsx(
                  "w-full bg-slate-50 border-none rounded-xl pl-20 pr-6 py-6 text-xl font-black text-slate-900 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all",
                  customAmount && parseFloat(customAmount) % MONTHLY_DUES_AMOUNT !== 0 && "ring-2 ring-amber-500/50 bg-amber-50/50"
                )}
              />
           </div>
           {customAmount && parseFloat(customAmount) % MONTHLY_DUES_AMOUNT !== 0 && (
             <p className="text-[10px] font-bold text-amber-600 px-2 flex items-center gap-1">
               <AlertCircle className="w-3 h-3" />
               Please enter an even amount (multiples of {MONTHLY_DUES_AMOUNT}) for exact month coverage.
             </p>
           )}
           <p className="text-[10px] font-medium text-slate-400 px-2">
             * This will automatically select your {summary?.totalOutstanding! > 0 ? "oldest outstanding" : "upcoming"} months.
           </p>
        </div>
      </div>

      {/* Monthly List */}
      <div className="space-y-3 px-2">
        {visibleMonths.length ? (
          visibleMonths.map((week) => (
            <div 
              key={week.id} 
              className={clsx(
                "flex items-center justify-between rounded-[1.5rem] border p-4 transition-all",
                week.status === "paid" ? "bg-white border-slate-50" :
                week.status === "advance" ? "bg-blue-50/30 border-blue-100" :
                new Date(week.weekOf) > new Date() ? "bg-slate-50/50 border-dashed border-slate-200" :
                "bg-white border-slate-100 shadow-sm"
              )}
            >
              <div className="flex items-center gap-4">
                 {week.status === "unpaid" && (
                   <button 
                    onClick={() => toggleMonth(week.weekOf)}
                    className={clsx(
                      "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                      selectedMonths.includes(week.weekOf) ? "bg-blue-700 border-blue-700 text-white" : "border-slate-200 bg-white"
                    )}
                   >
                     {selectedMonths.includes(week.weekOf) && <CheckCircle2 className="w-4 h-4" />}
                   </button>
                 )}
                 <div>
                    <p className="font-bold text-slate-900 text-sm">
                      {new Date(week.weekOf).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Month {week.monthNumber ?? week.weekNumber}
                    </p>
                 </div>
              </div>

              <div className="flex items-center gap-3">
                 <span className={clsx(
                   "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider",
                   week.status === "paid" ? "bg-emerald-50 text-emerald-600" :
                   week.status === "advance" ? "bg-blue-100 text-blue-700" :
                   new Date(week.weekOf) > new Date() ? "bg-slate-100 text-slate-400" :
                   "bg-amber-50 text-amber-600"
                 )}>
                   {week.status === "paid" ? "✅ Paid" : 
                    week.status === "advance" ? "🔄 Advance" : 
                    new Date(week.weekOf) > new Date() ? "⌛ Future" : 
                    "❌ Overdue"}
                 </span>
                 {week.status === "unpaid" && !selectedMonths.includes(week.weekOf) && (
                   <button 
                      onClick={() => toggleMonth(week.weekOf)}
                      className={clsx(
                        "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        new Date(week.weekOf) > new Date() ? "bg-white border border-slate-200 text-slate-400" : "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                      )}
                    >
                      {new Date(week.weekOf) > new Date() ? "Advance" : "Pay"}
                    </button>
                 )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
               <Calendar className="w-8 h-8" />
            </div>
            <p className="text-slate-400 font-medium">No dues records yet. Your contributions will appear here each month 🙏</p>
          </div>
        )}

        {sortedMonths.length > visibleMonths.length && (
          <button
            onClick={() => setSelectedMonths(sortedMonths.map(w => w.weekOf).slice(0, visibleMonths.length + 5))}
            className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
          >
            + Show More Months
          </button>
        )}

        {isAllPaid && sortedMonths.length > 0 && (
           <div className="p-8 text-center bg-emerald-50 rounded-[2rem] border border-emerald-100 mt-4 animate-in zoom-in-95">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
              <p className="text-emerald-900 font-black">Nothing to pay for {selectedYear} — well done! 🎉</p>
           </div>
        )}
      </div>

      {/* Summary Strip */}
      <div className="px-2 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[1.5rem] p-6 border border-slate-100 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Paid this year</p>
           <p className="text-2xl font-black text-slate-900 tracking-tight">GHS {formatMoney(yearSummary?.totalPaid || 0)}</p>
        </div>
        <div className="bg-white rounded-[1.5rem] p-6 border border-slate-100 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding</p>
           <p className={clsx(
             "text-2xl font-black tracking-tight",
             (yearSummary?.totalOutstanding || 0) === 0 ? "text-emerald-600" : "text-amber-600"
           )}>
             GHS {formatMoney(yearSummary?.totalOutstanding || 0)}
           </p>
        </div>
      </div>

      {/* Download Button */}
      <div className="px-2">
         <button 
           disabled={isDownloading || sortedMonths.length === 0}
           onClick={handleDownload}
           className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl border-2 border-slate-900 text-slate-900 font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 hover:text-white transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
         >
           {isDownloading ? (
             <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
           ) : <Download className="w-4 h-4" />}
           Download Statement →
         </button>
      </div>

      {/* Sticky Action Bar */}
      <AnimatePresence>
        {selectedMonths.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-6 right-6 z-50"
          >
            <div className="mx-auto max-w-lg bg-slate-900 rounded-3xl p-6 shadow-2xl shadow-blue-900/30 flex flex-col sm:flex-row items-center justify-between gap-6 border border-white/10 backdrop-blur-xl">
               <div className="text-white">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-0.5">Selection Details</p>
                  <p className="text-xl font-black tracking-tight">
                    {selectedMonths.length} {selectedMonths.length === 1 ? 'month' : 'months'} — GHS {formatMoney(totalSelected)}
                  </p>
               </div>
               <button 
                 onClick={handlePayment}
                 className="w-full sm:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                 <Zap className="w-4 h-4 fill-current" />
                 Pay with MoMo
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
