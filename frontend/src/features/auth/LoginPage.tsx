import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Smartphone, 
  ChevronRight, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  Fingerprint,
  Users,
  Calendar,
  CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { OtpInput } from "../../components/OtpInput";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";
import clsx from "clsx";

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { requestOtp, verifyOtp, devLogin } = useAuth();
  const toast = useToast();
  const initialPhone = new URLSearchParams(location.search).get("phone") ?? "";
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">(initialPhone ? "verify" : "request");
  const [submitting, setSubmitting] = useState(false);
  const normalizedPhoneNumber = phoneNumber.trim();

  async function handleRequestOtp() {
    if (!normalizedPhoneNumber) return;
    setSubmitting(true);
    try {
      const responseMessage = await requestOtp(normalizedPhoneNumber);
      setStep("verify");
      toast.info({
        title: "OTP Sent!",
        description: responseMessage
      });
    } catch (error) {
      toast.error({
        title: "Request Failed",
        description: error instanceof Error ? error.message : "Check your connection."
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(nextOtpCode = otpCode) {
    if (submitting || nextOtpCode.length !== 6) return;
    setSubmitting(true);
    try {
      await verifyOtp(normalizedPhoneNumber, nextOtpCode);
      toast.success({
        title: "Welcome Back!",
        description: "Your session is ready."
      });
      navigate("/");
    } catch (error) {
      toast.error({
        title: "Verify Failed",
        description: error instanceof Error ? error.message : "Incorrect code."
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDevLogin() {
    if (!normalizedPhoneNumber) return;
    setSubmitting(true);
    try {
      await devLogin(normalizedPhoneNumber);
      toast.success({
        title: "Developer Mode",
        description: "Bypass successful."
      });
      navigate("/");
    } catch (error) {
      toast.error({
        title: "Bypass Failed",
        description: error instanceof Error ? error.message : "Unable to login."
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 md:p-10 animate-in fade-in duration-1000 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-50 rounded-full blur-[100px] opacity-60"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-red-50 rounded-full blur-[100px] opacity-40"></div>

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Left Side: Branding & Info */}
        <div className="hidden lg:flex flex-col justify-center space-y-12 pr-12">
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/10">
                 <div className="w-5 h-5 rounded-full border-4 border-white"></div>
              </div>
              <span className="text-3xl font-black tracking-tighter text-slate-900">PresbyYouth</span>
           </div>

           <div className="space-y-6">
              <h1 className="text-6xl font-black text-slate-900 leading-[1.05] tracking-tight">
                One App.<br/>
                Entire Fellowship.
              </h1>
              <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-md">
                Managing attendance, dues, and membership has never been this cute and simple.
              </p>
           </div>

           <div className="grid grid-cols-2 gap-6">
              <LoginInfoItem icon={Calendar} label="Live Attendance" />
              <LoginInfoItem icon={CreditCard} label="Dues Tracking" />
              <LoginInfoItem icon={Users} label="Member Directory" />
              <LoginInfoItem icon={Smartphone} label="Mobile First" />
           </div>
        </div>

        {/* Right Side: Login Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-10 md:p-16 shadow-lg shadow-blue-900/10 border border-slate-50 w-full"
        >
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
             <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/5">
                <div className="w-3 h-3 rounded-full border-2 border-white"></div>
             </div>
             <span className="text-xl font-black tracking-tighter text-slate-900">PresbyYouth</span>
          </div>

          <AnimatePresence mode="wait">
            {step === "request" ? (
              <motion.div 
                key="request"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="space-y-10"
              >
                <div className="text-center space-y-4">
                   <div className="w-20 h-20 rounded-[2.25rem] bg-slate-50 text-blue-700 flex items-center justify-center mx-auto transition-transform hover:scale-110">
                      <Smartphone className="w-10 h-10" />
                   </div>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back!</h2>
                   <p className="text-slate-500 text-sm font-medium">Enter your phone number to get started.</p>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input 
                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 shadow-sm" 
                        value={phoneNumber} 
                        onChange={(event) => setPhoneNumber(event.target.value)} 
                        placeholder="+233..." 
                      />
                   </div>

                   <div className="space-y-4">
                      <button 
                        className="w-full bg-blue-700 hover:bg-blue-800 text-white py-5 rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95"
                        disabled={submitting || !normalizedPhoneNumber} 
                        onClick={() => void handleRequestOtp()}
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Login Code"}
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      {import.meta.env.DEV && (
                        <button 
                          className="w-full bg-white border-2 border-slate-100 hover:bg-slate-50 text-slate-400 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all active:scale-95 flex items-center justify-center gap-2"
                          disabled={submitting || !normalizedPhoneNumber} 
                          onClick={() => void handleDevLogin()}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Developer Bypass
                        </button>
                      )}
                   </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="verify"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="space-y-10"
              >
                <div className="text-center space-y-4">
                   <div className="w-20 h-20 rounded-[2.25rem] bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
                      <Fingerprint className="w-10 h-10" />
                   </div>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">Verify Identity</h2>
                   <p className="text-slate-500 text-sm font-medium">We sent a 6-digit code to {phoneNumber}.</p>
                </div>

                <div className="space-y-8">
                   <div className="flex justify-center">
                      <OtpInput
                        length={6}
                        value={otpCode}
                        onChange={setOtpCode}
                        onComplete={(nextOtpCode) => {
                          void handleVerifyOtp(nextOtpCode);
                        }}
                        disabled={submitting}
                        autoFocus
                      />
                   </div>

                   <div className="space-y-4">
                      <button 
                        className="w-full bg-blue-700 hover:bg-blue-800 text-white py-5 rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95"
                        disabled={submitting || otpCode.length !== 6} 
                        onClick={() => void handleVerifyOtp()}
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Continue"}
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-2 gap-3">
                         <button 
                           className="bg-slate-50 hover:bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all"
                           onClick={() => void handleRequestOtp()}
                         >
                           Resend Code
                         </button>
                         <button 
                           className="bg-slate-50 hover:bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all"
                           onClick={() => { setStep("request"); setOtpCode(""); }}
                         >
                           Change Number
                         </button>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function LoginInfoItem({ icon: Icon, label }: any) {
  return (
    <div className="flex items-center gap-3 group">
       <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center transition-all group-hover:scale-110">
          <Icon className="w-5 h-5" />
       </div>
       <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}
