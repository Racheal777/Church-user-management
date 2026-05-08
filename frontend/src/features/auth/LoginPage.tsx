import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Smartphone, 
  ArrowRight, 
  Loader2, 
  Fingerprint,
  Users,
  Calendar,
  CreditCard,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { OtpInput } from "../../components/OtpInput";
import { useAuth } from "../../providers/AuthContext";
import { useToast } from "../../providers/ToastProvider";

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
        
        {/* Left Side: YPG Branding */}
        <div className="hidden lg:flex flex-col justify-center space-y-12 pr-12">
           <div className="space-y-6">
              <div className="w-20 h-20 rounded-[2rem] bg-white flex items-center justify-center shadow-2xl shadow-blue-900/10 p-2 border border-slate-50">
                 <img src="/logo.png" alt="YPG Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="block text-5xl font-black tracking-tighter text-slate-900">YPG</span>
                <span className="block text-sm font-medium text-slate-400 uppercase tracking-[0.2em] mt-1">Service All The Way</span>
                <p className="mt-8 text-lg text-slate-500 font-medium leading-relaxed">
                  Welcome back to the fellowship
                </p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-8">
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
          className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-blue-900/5 border border-slate-100 w-full"
        >
          {/* Mobile Header */}
          <div className="flex lg:hidden flex-col items-center gap-4 mb-12 justify-center">
             <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-2xl shadow-blue-900/10 p-2 border border-slate-50">
                <img src="/logo.png" alt="YPG Logo" className="w-full h-full object-contain" />
             </div>
             <div className="text-center">
                <span className="block text-xl font-black tracking-tighter text-slate-900 leading-none">YPG</span>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Service All The Way</span>
             </div>
          </div>

          <AnimatePresence mode="wait">
            {step === "request" ? (
              <motion.div 
                key="request"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="space-y-12"
              >
                <div className="text-center space-y-4">
                   <h2 className="text-4xl font-black text-slate-900 tracking-tight">Sign In</h2>
                   <p className="text-slate-500 text-sm font-medium leading-relaxed">
                      Enter your phone number and we'll send <br className="hidden sm:block" /> you a login code.
                   </p>
                </div>

                <div className="space-y-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Phone Number</label>
                      <input 
                        className="w-full bg-slate-50 border-none rounded-[1.25rem] px-8 py-6 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-base font-bold text-slate-700 placeholder:text-slate-300 shadow-sm" 
                        value={phoneNumber} 
                        onChange={(event) => setPhoneNumber(event.target.value)} 
                        placeholder="+233..." 
                      />
                   </div>

                   <div className="space-y-6">
                      <button 
                        className="w-full bg-[#1a56db] hover:bg-blue-700 text-white py-6 rounded-[1.25rem] font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95"
                        disabled={submitting || !normalizedPhoneNumber} 
                        onClick={() => void handleRequestOtp()}
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Login Code"}
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      {(import.meta.env.DEV || import.meta.env.VITE_DEV_AUTH_BYPASS_ENABLED === "true") && (
                        <button 
                          className="w-full bg-transparent hover:bg-slate-50 text-slate-300 py-3 rounded-xl font-black uppercase tracking-[0.2em] text-[9px] transition-all active:scale-95 flex items-center justify-center gap-2"
                          disabled={submitting || !normalizedPhoneNumber} 
                          onClick={() => void handleDevLogin()}
                        >
                          <ShieldCheck className="w-3 h-3" />
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
                className="space-y-12"
              >
                <div className="text-center space-y-4">
                   <div className="w-20 h-20 rounded-[2.25rem] bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
                      <Fingerprint className="w-10 h-10" />
                   </div>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">Enter your code</h2>
                   <p className="text-slate-500 text-sm font-medium leading-relaxed">
                      We sent a 6-digit code to {phoneNumber}. <br className="hidden sm:block" /> It expires in 5 minutes.
                   </p>
                </div>

                <div className="space-y-8">
                   <div className="flex justify-center scale-90 sm:scale-100">
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

                   <div className="space-y-6">
                      <button 
                        className="w-full bg-[#1a56db] hover:bg-blue-700 text-white py-6 rounded-[1.25rem] font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95"
                        disabled={submitting || otpCode.length !== 6} 
                        onClick={() => void handleVerifyOtp()}
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Code"}
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <div className="flex flex-col items-center gap-4">
                         <button 
                           className="text-slate-400 hover:text-blue-700 font-black uppercase tracking-widest text-[9px] transition-all"
                           onClick={() => void handleRequestOtp()}
                         >
                           Resend Code
                         </button>
                         <button 
                           className="text-slate-400 hover:text-slate-900 font-black uppercase tracking-widest text-[9px] transition-all"
                           onClick={() => { setStep("request"); setOtpCode(""); }}
                         >
                           ← Back to phone number
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
    <div className="flex items-center gap-4 group">
       <div className="w-10 h-10 rounded-[1rem] bg-slate-50 text-slate-400 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-blue-50 group-hover:text-blue-700">
          <Icon className="w-5 h-5" />
       </div>
       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none group-hover:text-slate-600">{label}</span>
    </div>
  );
}
