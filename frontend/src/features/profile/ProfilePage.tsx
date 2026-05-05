import { useState } from "react";
import { Camera, ChevronLeft, Save, Sparkles, User, ShieldCheck, Mail, Phone, Heart, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";
import clsx from "clsx";

async function uploadToCloudinary(file: File, signature: Awaited<ReturnType<typeof api.getUploadSignature>>) {
  if (!signature.cloudName || !signature.apiKey || !signature.signature) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Unable to preview selected image."));
      reader.readAsDataURL(file);
    });
  }

  const data = new FormData();
  data.set("file", file);
  data.set("api_key", signature.apiKey);
  data.set("timestamp", String(signature.timestamp));
  data.set("signature", signature.signature);
  data.set("public_id", signature.publicId);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
    method: "POST",
    body: data
  });

  if (!response.ok) {
    throw new Error("Cloudinary upload failed.");
  }

  const payload = (await response.json()) as { secure_url: string };
  return payload.secure_url;
}

export function ProfilePage() {
  const { member, accessToken, refreshSession } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState(member?.email ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(member?.whatsappNumber ?? "");
  const [maritalStatus, setMaritalStatus] = useState(member?.maritalStatus ?? "single");
  const [dateOfBirth, setDateOfBirth] = useState(member?.dateOfBirth?.slice(0, 10) ?? "");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(member?.profilePhotoUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleFileUpload(file: File) {
    if (!accessToken) return;
    try {
      const signature = await api.getUploadSignature(accessToken);
      const uploadedUrl = await uploadToCloudinary(file, signature);
      setProfilePhotoUrl(uploadedUrl);
      toast.info({
        title: "Photo Ready",
        description: "Hit save to keep this new look!"
      });
    } catch (error) {
      toast.error({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Try again."
      });
    }
  }

  async function saveProfile() {
    if (!member || !accessToken) return;
    setIsSaving(true);
    try {
      await api.updateMember(
        member.id,
        {
          email: email || null,
          whatsappNumber: whatsappNumber || null,
          maritalStatus,
          dateOfBirth: dateOfBirth || null,
          profilePhotoUrl: profilePhotoUrl || null
        },
        accessToken
      );
      toast.success({
        title: "Profile Saved!",
        description: "Your details are up to date."
      });
      await refreshSession();
    } catch (error) {
      toast.error({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Check your data."
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-blue-700 transition-colors mb-2 text-xs font-bold uppercase tracking-widest">
            <ChevronLeft className="w-4 h-4" />
            Back Home
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Account Settings</h1>
          <p className="text-slate-500 text-sm font-medium">Manage your personal profile and digital identity.</p>
        </div>
        <button 
          onClick={() => void saveProfile()} 
          disabled={isSaving}
          className="bg-blue-700 hover:bg-blue-800 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-md shadow-blue-900/5 flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest text-[10px]"
        >
          {isSaving ? "Saving..." : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Identity Card */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-50 rounded-full blur-2xl opacity-50 group-hover:scale-150 transition-transform duration-1000"></div>
            
            <div className="relative mb-10 group/photo">
              <div className="w-40 h-40 rounded-2xl overflow-hidden bg-blue-50 flex items-center justify-center text-4xl font-black text-blue-800 border-4 border-white shadow-lg transition-all group-hover/photo:scale-[1.02]">
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  `${member?.firstName?.[0] ?? ""}${member?.lastName?.[0] ?? ""}`
                )}
              </div>
              <label className="absolute bottom-1 right-1 w-12 h-12 bg-blue-700 text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-md hover:scale-110 active:scale-95 transition-all border-4 border-white group-hover/photo:shadow-blue-700/5">
                <Camera className="w-5 h-5" />
                <input className="hidden" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && void handleFileUpload(event.target.files[0])} />
              </label>
            </div>
            
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">{member?.firstName} {member?.lastName}</h2>
            <div className="flex items-center gap-2 text-blue-700 font-black text-[10px] uppercase tracking-[0.25em] bg-blue-50 px-4 py-1.5 rounded-xl border border-blue-100 mb-10">
               <ShieldCheck className="w-3.5 h-3.5" />
               {member?.role.replace('_', ' ')}
            </div>
            
            <div className="w-full pt-10 border-t border-slate-50 grid grid-cols-2 gap-4">
              <div className="text-left">
                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Status</p>
                 <p className="text-xs font-bold text-slate-900">Active Member</p>
              </div>
              <div className="text-right">
                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Joined</p>
                 <p className="text-xs font-bold text-slate-900">May 2024</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Detailed Settings */}
        <div className="lg:col-span-8 space-y-8">
           <div className="bg-white rounded-2xl p-10 md:p-12 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-12">
                 <Sparkles className="w-5 h-5 text-blue-700" />
                 <h3 className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Personal Data</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                 <ProfileField icon={Mail} label="Email Address" value={email} onChange={setEmail} type="email" placeholder="name@example.com" />
                 <ProfileField icon={Phone} label="WhatsApp" value={whatsappNumber} onChange={setWhatsappNumber} type="text" placeholder="+233..." />
                 <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                       <Heart className="w-3 h-3" /> Marital Status
                    </div>
                    <select 
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700 appearance-none cursor-pointer"
                      value={maritalStatus ?? "single"} 
                      onChange={(event) => setMaritalStatus(event.target.value as any)}
                    >
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="widowed">Widowed</option>
                    </select>
                 </div>
                 <ProfileField icon={Calendar} label="Birth Date" value={dateOfBirth} onChange={setDateOfBirth} type="date" />
              </div>
           </div>

           <div className="bg-slate-900 rounded-2xl p-10 text-white relative overflow-hidden group">
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-600 rounded-full blur-[120px] opacity-20"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                 <div className="text-center md:text-left space-y-2">
                    <h4 className="text-2xl font-black tracking-tight">Security Check</h4>
                    <p className="text-blue-100/10 text-xs font-bold leading-relaxed uppercase tracking-widest">Two-factor authentication is active via OTP login.</p>
                 </div>
                 <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 backdrop-blur-xl">
                    <ShieldCheck className="w-8 h-8 text-white" />
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function ProfileField({ icon: Icon, label, value, onChange, type, placeholder }: any) {
  return (
    <div className="space-y-4">
       <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
          <Icon className="w-3 h-3" /> {label}
       </div>
       <input 
         type={type}
         className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 shadow-sm"
         placeholder={placeholder} 
         value={value} 
         onChange={(event) => onChange(event.target.value)} 
       />
    </div>
  );
}
