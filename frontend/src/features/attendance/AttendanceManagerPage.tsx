import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Play, 
  X, 
  CheckCircle2, 
  Phone, 
  Calendar, 
  Clock, 
  Users, 
  Activity,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Zap
} from "lucide-react";

import { Loader } from "../../components/Loader";
import { ApiError, api } from "../../lib/api";
import { useAuth } from "../../providers/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

export function AttendanceManagerPage() {
  const { accessToken } = useAuth();
  const toast = useToast();
  const [meetingDate, setMeetingDate] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  const activeQuery = useQuery({
    queryKey: ["active-attendance"],
    queryFn: () => api.getActiveAttendanceSession(accessToken!),
    enabled: Boolean(accessToken),
    retry: (failureCount, error: any) => {
      // Don't retry on 404, but retry on other errors
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
    // Only poll aggressively if we have an active session
    refetchInterval: (query) => {
      if (query.state.data) return 1000;
      return 10000; // Poll every 10s if no session
    }
  });

  const isMissingSession = activeQuery.error instanceof ApiError && activeQuery.error.status === 404;
  const isCommunicating = activeQuery.isFetching && !activeQuery.data && !activeQuery.error;

  async function startSession() {
    if (!accessToken) return;
    try {
      await api.startAttendanceSession(meetingDate || undefined, accessToken);
      await activeQuery.refetch();
      toast.success({
        title: "Session Started",
        description: "Live check-in is now active."
      });
    } catch (error) {
      toast.error({
        title: "Failed to start",
        description: error instanceof Error ? error.message : "Action failed."
      });
    }
  }

  async function closeSession() {
    if (!accessToken || !activeQuery.data) return;
    try {
      await api.closeAttendanceSession(activeQuery.data.session.id, accessToken);
      await activeQuery.refetch();
      toast.info({
        title: "Session Closed",
        description: "Self check-ins have been disabled."
      });
    } catch (error) {
      toast.error({
        title: "Failed to close",
        description: error instanceof Error ? error.message : "Action failed."
      });
    }
  }

  async function manualCheckIn() {
    if (!accessToken) return;
    try {
      await api.manualCheckIn(manualPhone, accessToken);
      setManualPhone("");
      toast.success({
        title: "Member Marked",
        description: "Manual entry successful."
      });
      await activeQuery.refetch();
    } catch (error) {
      toast.error({
        title: "Entry Failed",
        description: error instanceof Error ? error.message : "Action failed."
      });
    }
  }

  // Calculate progress for the timer (assuming 30s refresh cycle)
  const secondsRemaining = activeQuery.data?.secondsRemaining ?? 0;
  const timerProgress = (secondsRemaining / 30) * 100;

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Attendance Hub</h1>
        <p className="text-slate-500 text-sm font-medium">Coordinate live sessions and monitor member participation.</p>
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        {/* Main Session Control */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 relative overflow-hidden transition-all hover:border-blue-100">
             <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700">
                   <Activity className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-slate-900 tracking-tight">Session Manager</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time Coordination</p>
                </div>
             </div>

             {isMissingSession ? (
                <div className="space-y-8 animate-in fade-in duration-500">
                   <div className="bg-slate-50 p-8 rounded-2xl border border-dashed border-slate-200 text-center space-y-4">
                      <p className="text-sm font-bold text-slate-500">No active session found. Ready to start?</p>
                      <div className="max-w-sm mx-auto space-y-4">
                         <div className="space-y-2 text-left">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Meeting Date</label>
                            <input 
                              type="date" 
                              className="w-full bg-white border-none rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700 shadow-sm"
                              value={meetingDate} 
                              onChange={(event) => setMeetingDate(event.target.value)} 
                            />
                         </div>
                         <button 
                           className="w-full bg-blue-700 hover:bg-blue-800 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all shadow-md shadow-blue-900/5 flex items-center justify-center gap-2"
                           onClick={() => void startSession()}
                         >
                           <Play className="w-4 h-4 fill-current" />
                           Initialize Session
                         </button>
                      </div>
                   </div>
                </div>
             ) : activeQuery.error ? (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                   <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                      <AlertTriangle className="w-8 h-8" />
                   </div>
                   <div className="space-y-1">
                      <p className="text-lg font-bold text-slate-900">Communication Error</p>
                      <p className="text-sm text-slate-500 max-w-xs mx-auto">We couldn't connect to the attendance service. Please check your connection or try again.</p>
                   </div>
                   <button 
                     onClick={() => void activeQuery.refetch()}
                     className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                   >
                     Retry Connection
                   </button>
                </div>
             ) : activeQuery.data ? (
                <div className="space-y-10 animate-in zoom-in-95 duration-500">
                   {/* Bold Display Card */}
                   <div className="bg-slate-900 rounded-2xl p-12 text-center text-white relative overflow-hidden shadow-lg shadow-blue-900/10 group">
                      {/* Background Glows */}
                      <div className={clsx(
                        "absolute -right-20 -top-20 w-80 h-80 bg-blue-600 rounded-full blur-[100px] transition-opacity duration-1000",
                        secondsRemaining < 5 ? "opacity-40 animate-pulse" : "opacity-20"
                      )}></div>
                      
                      <div className="relative z-10">
                         <p className="mb-6 text-[10px] font-black uppercase tracking-[0.4em] text-blue-100/50">Live Check-In Code</p>
                         <AnimatePresence mode="wait">
                           <motion.p 
                             key={activeQuery.data.code}
                             initial={{ y: 20, opacity: 0 }}
                             animate={{ y: 0, opacity: 1 }}
                             className="text-[12rem] font-black tracking-tighter text-white mb-8 font-mono leading-none"
                           >
                             {activeQuery.data.code}
                           </motion.p>
                         </AnimatePresence>
                         
                         {/* Interactive Timer Indicator */}
                         <div className="max-w-xs mx-auto space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-blue-100/10">
                               <span className="flex items-center gap-1.5">
                                  <Clock className="w-3 h-3" />
                                  {secondsRemaining}s remaining
                               </span>
                               <span className="flex items-center gap-1.5">
                                  <RefreshCw className={clsx("w-3 h-3", secondsRemaining < 5 && "animate-spin")} />
                                  Next in {secondsRemaining}s
                               </span>
                            </div>
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                               <motion.div 
                                 initial={false}
                                 animate={{ width: `${timerProgress}%` }}
                                 transition={{ duration: 1, ease: "linear" }}
                                 className={clsx(
                                   "h-full rounded-full transition-colors duration-500",
                                   secondsRemaining < 5 ? "bg-red-500" : "bg-blue-500"
                                 )}
                               />
                            </div>
                            {secondsRemaining < 5 && (
                               <motion.p 
                                 initial={{ opacity: 0 }}
                                 animate={{ opacity: 1 }}
                                 className="text-[10px] font-bold text-red-400 uppercase tracking-widest animate-pulse"
                               >
                                 Code expiring soon...
                               </motion.p>
                            )}
                         </div>
                      </div>
                   </div>
 
                   <div className="grid grid-cols-2 gap-6">
                     <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-lg hover:border-blue-100">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Session Date</p>
                       <div className="flex items-center gap-2 text-slate-900 font-bold">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          {activeQuery.data?.session && new Date(activeQuery.data.session.meetingDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                       </div>
                     </div>
                     <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-lg hover:border-blue-100 relative overflow-hidden">
                       <div className="relative z-10">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Count</p>
                         <div className="flex items-center gap-2 text-slate-900 font-bold">
                            <Users className="w-4 h-4 text-blue-600" />
                            {activeQuery.data?.session?.attendeeCount} Members
                         </div>
                       </div>
                       {/* Mini indicator for new check-in */}
                       <AnimatePresence>
                          {(activeQuery.data?.session?.attendeeCount ?? 0) > 0 && (
                            <motion.div 
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="absolute -right-2 -bottom-2 text-blue-100/10"
                            >
                              <Zap className="w-20 h-20 fill-current" />
                            </motion.div>
                          )}
                       </AnimatePresence>
                     </div>
                   </div>
 
                   <button 
                     className="w-full bg-slate-50 hover:bg-red-50 hover:text-red-600 text-slate-400 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all border border-transparent hover:border-red-100 flex items-center justify-center gap-2"
                     onClick={() => void closeSession()}
                   >
                     <X className="w-4 h-4" />
                     Terminate Live Session
                   </button>
                </div>
             ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                   <Loader label="Synchronizing with server..." />
                </div>
             )}
          </div>
        </div>

        {/* Manual Fallback */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 transition-all hover:border-blue-100">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                   <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-lg font-bold text-slate-900 tracking-tight">Manual Registry</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Help Desk Fallback</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                   <div className="relative">
                      <Phone className="w-4 h-4 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2" />
                      <input 
                        className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700" 
                        placeholder="024 000 0000" 
                        value={manualPhone} 
                        onChange={(event) => setManualPhone(event.target.value)} 
                      />
                   </div>
                </div>
                <button 
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-md shadow-blue-900/5 flex items-center justify-center gap-2 disabled:opacity-30"
                  disabled={!manualPhone || activeQuery.isLoading}
                  onClick={() => void manualCheckIn()}
                >
                  Confirm Presence
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-10 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                 <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                    Manual check-ins are only permitted while a session is active or recently concluded.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
