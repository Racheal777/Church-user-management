import { useState } from "react";
import confetti from "canvas-confetti";
import { 
  CheckCircle2, 
  ChevronLeft, 
  Clock, 
  HelpCircle, 
  Key, 
  Loader2, 
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { OtpInput } from "../../components/OtpInput";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import clsx from "clsx";

export function CheckInPage() {
  const { accessToken, member } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleCheckIn(nextCode = code) {
    if (!accessToken || submitting || nextCode.length !== 4) return;
    setSubmitting(true);
    try {
      const result = await api.checkIn(nextCode, accessToken);
      if (result.status === "checked_in") {
        setIsSuccess(true);
        confetti({ 
          particleCount: 150, 
          spread: 80, 
          origin: { y: 0.6 },
          colors: ['#1e40af', '#3b82f6', '#ef4444', '#ffffff']
        });
        toast.success({
          title: "Attendance Recorded!",
          description: "Great to have you with us today!"
        });
        // Auto navigate back after 3 seconds
        setTimeout(() => navigate('/'), 3000);
      } else {
        toast.info({
          title: "Status Check",
          description: result.message
        });
        navigate('/');
      }
    } catch (error) {
      const description = error instanceof Error ? error.message : "Unable to check in.";
      toast.error({
        title: "Check-in failed",
        description
      });
      setCode("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Mini Header */}
      <div className="flex items-center justify-between">
        <Link to="/" className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-700 transition-all active:scale-90">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2 text-blue-700 font-black text-[10px] uppercase tracking-[0.2em] bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
          <Sparkles className="w-3.5 h-3.5" />
          Live Attendance
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div 
            key="input"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="bg-white rounded-2xl p-10 md:p-16 shadow-md shadow-blue-900/5 border border-slate-50 text-center relative overflow-hidden"
          >
            {/* Decorative Elements */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-50 rounded-full blur-3xl opacity-30"></div>

            <div className="relative z-10 space-y-10">
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-xl bg-blue-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-900/10">
                  <Key className="w-10 h-10" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Enter Room Code</h1>
                <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
                  Type the 4-digit code shown on the screen to confirm your attendance.
                </p>
              </div>

              <div className="space-y-8">
                <div className="flex justify-center">
                  <OtpInput
                    length={4}
                    value={code}
                    onChange={setCode}
                    onComplete={(nextCode) => {
                      void handleCheckIn(nextCode);
                    }}
                    disabled={submitting}
                    autoFocus
                  />
                </div>
                
                <div className="flex flex-col items-center gap-6">
                  <button 
                    className={clsx(
                      "w-full max-w-xs py-5 rounded-xl font-black uppercase tracking-[0.2em] transition-all text-xs flex items-center justify-center gap-2",
                      submitting || code.length !== 4 
                        ? "bg-slate-100 text-slate-300 pointer-events-none" 
                        : "bg-blue-700 text-white shadow-lg shadow-blue-900/10 hover:bg-blue-800 active:scale-95"
                    )}
                    onClick={() => void handleCheckIn()}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Verify & Check In
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    <Clock className="w-3.5 h-3.5" />
                    Code refreshes every 30 seconds
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-500 rounded-2xl p-16 text-white text-center shadow-lg shadow-emerald-900/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
            <div className="relative z-10 space-y-8">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                className="w-24 h-24 rounded-2xl bg-white text-emerald-600 flex items-center justify-center mx-auto shadow-md"
              >
                <CheckCircle2 className="w-12 h-12" />
              </motion.div>
              <div className="space-y-4">
                <h1 className="text-5xl font-black tracking-tighter">You&apos;re In!</h1>
                <p className="text-emerald-50 text-lg font-bold">Attendance recorded successfully.</p>
              </div>
              <div className="pt-4">
                <Link to="/" className="inline-flex items-center gap-2 bg-emerald-600/50 hover:bg-emerald-600 transition-all px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-white/10">
                  Return Home
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Section */}
      <div className="bg-slate-50 rounded-2xl p-8 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm shrink-0">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">Need help checking in?</h4>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            If you don&apos;t see a code or it&apos;s not working, please reach out to the attendance leader for a manual check-in.
          </p>
        </div>
      </div>
    </div>
  );
}
