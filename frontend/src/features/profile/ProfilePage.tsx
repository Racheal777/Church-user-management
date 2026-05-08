import { useState, useRef, useEffect } from "react";
import { 
  Camera, 
  Mail, 
  MessageSquare, 
  Heart, 
  Calendar, 
  ShieldCheck, 
  Lock, 
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Activity,
  Phone
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../providers/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import { api } from "../../lib/api";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

export function ProfilePage() {
  const { member, accessToken, refreshMember } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    email: member?.email || "",
    whatsappNumber: member?.whatsappNumber || "",
    maritalStatus: member?.maritalStatus || "single"
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const isDirty = 
      formData.email !== (member?.email || "") ||
      formData.whatsappNumber !== (member?.whatsappNumber || "") ||
      formData.maritalStatus !== (member?.maritalStatus || "single");
    setHasChanges(isDirty);
  }, [formData, member]);

  if (!member) return null;

  async function handleSave() {
    if (!accessToken) return;
    setIsSaving(true);
    try {
      const changedFields: any = {};
      if (formData.email !== (member?.email || "")) changedFields.email = formData.email || null;
      if (formData.whatsappNumber !== (member?.whatsappNumber || "")) changedFields.whatsappNumber = formData.whatsappNumber || null;
      if (formData.maritalStatus !== (member?.maritalStatus || "single")) changedFields.maritalStatus = formData.maritalStatus || null;

      await api.updateMember(member!.id, changedFields, accessToken);
      await refreshMember();
      toast.success({ title: "Profile updated ✅", description: "Your details have been saved successfully." });
      setHasChanges(false);
    } catch (error) {
      toast.error({ title: "Update failed", description: "Something went wrong. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !accessToken) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error({ title: "File too large", description: "Please upload an image smaller than 5MB." });
      return;
    }

    setIsUploading(true);
    try {
      // 1. Get signed upload signature
      const { signature, timestamp, apiKey, cloudName, publicId } = await api.signImageUpload(`members/${member.id}`, accessToken);

      // 2. Upload to Cloudinary
      const cloudinaryData = new FormData();
      cloudinaryData.append("file", file);
      cloudinaryData.append("api_key", apiKey);
      cloudinaryData.append("timestamp", timestamp.toString());
      cloudinaryData.append("signature", signature);
      cloudinaryData.append("public_id", publicId);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: cloudinaryData
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const { secure_url } = await uploadRes.json();

      // 3. Save to backend
      await api.updateProfilePhoto(member.id, secure_url, accessToken);
      await refreshMember();
      toast.success({ title: "Photo updated ✅" });
    } catch (error) {
      toast.error({ title: "Photo upload failed", description: "Please try again." });
    } finally {
      setIsUploading(false);
    }
  }

  const completion = member.profile_completion || { percentage: 0, missing_fields: [] };
  const teamColor = member.team?.color || "#1a56db";

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="px-4 lg:px-0 flex items-center justify-between sticky top-0 z-40 py-4 bg-slate-50/80 backdrop-blur-md">
        <div>
           <Link to="/" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-blue-700 transition-colors mb-1 text-[10px] font-black uppercase tracking-widest">
             <ChevronLeft className="w-3 h-3" />
             Back
           </Link>
           <h1 className="text-2xl font-black text-slate-900 tracking-tight">{member.firstName}'s Profile</h1>
           <p className="text-slate-500 text-xs font-medium">Your identity in the fellowship</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={clsx(
            "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2",
            hasChanges 
              ? "bg-blue-700 text-white shadow-lg shadow-blue-900/20 hover:bg-blue-800" 
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          )}
        >
          {isSaving && <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          Save Changes
        </button>
      </div>

      {/* Hero Card */}
      <div className="px-4 lg:px-0">
         <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-blue-900/5 overflow-hidden relative">
            <div className="h-1.5 w-full" style={{ backgroundColor: teamColor }} />
            
            <div className="p-8 space-y-8">
               <div className="flex flex-col sm:flex-row items-center gap-8">
                  {/* Photo Section */}
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                     <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-slate-100 flex items-center justify-center text-3xl font-black text-slate-400">
                        {isUploading ? (
                          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
                             <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
                          </div>
                        ) : null}
                        
                        {member.profilePhotoUrl ? (
                          <img src={member.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          `${member.firstName[0]}${member.lastName[0]}`
                        )}
                     </div>
                     <div className="absolute bottom-1 right-1 w-10 h-10 bg-blue-700 text-white rounded-full flex items-center justify-center border-4 border-white shadow-lg group-hover:scale-110 transition-transform">
                        <Camera className="w-4 h-4" />
                     </div>
                     <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handlePhotoUpload}
                     />
                  </div>

                  {/* Name & Badges */}
                  <div className="text-center sm:text-left space-y-3">
                     <h2 className="text-3xl font-black text-slate-900 tracking-tight">{member.firstName} {member.lastName}</h2>
                     <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-sm" style={{ backgroundColor: teamColor }}>
                           {member.team?.name || "No Team"}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                           {member.role.replace("_", " ")}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
                           <Calendar className="w-3 h-3" />
                           Since {member.dateJoined ? new Date(member.dateJoined).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Unknown'}
                        </span>
                     </div>
                  </div>
               </div>

               {/* Completion Bar */}
               <div className="space-y-3 pt-4 border-t border-slate-50">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                     <span className="text-slate-400">Profile {completion.percentage}% complete</span>
                     <span className={clsx(completion.percentage === 100 ? "text-emerald-500" : "text-blue-500")}>
                        {completion.percentage === 100 ? "Verified ✅" : "Getting there..."}
                     </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${completion.percentage}%` }}
                        className="h-full bg-blue-700"
                     />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 italic">
                     {completion.percentage === 100 
                       ? "Your profile is complete ✅" 
                       : completion.missing_fields[0] === "profile_photo" ? "Add your profile photo to complete your profile 📸"
                       : completion.missing_fields[0] === "email" ? "Add your email address to secure your account 📧"
                       : completion.missing_fields[0] === "whatsapp_number" ? "Add your WhatsApp number for easy connection 📱"
                       : "Update your marital status to complete your profile ❤️"}
                  </p>
               </div>
            </div>
         </div>
      </div>

      {/* Editable Details */}
      <div className="px-4 lg:px-0">
         <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-blue-900/5 p-8 space-y-8">
            <div className="flex items-center justify-between">
               <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                 <User className="w-4 h-4" />
                 Your Details
               </h3>
               <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">Editable</span>
            </div>

            <div className="grid gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                  <div className="relative">
                     <Mail className="w-4 h-4 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                     <input 
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700"
                        placeholder="yourname@example.com"
                     />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp Number</label>
                  <div className="relative">
                     <MessageSquare className="w-4 h-4 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                     <input 
                        type="tel"
                        value={formData.whatsappNumber}
                        onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700"
                        placeholder="+233 xx xxx xxxx"
                     />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Marital Status</label>
                  <div className="relative">
                     <Heart className="w-4 h-4 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                     <select 
                        value={formData.maritalStatus || "single"}
                        onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as any })}
                        className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700 appearance-none"
                     >
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                     </select>
                  </div>
               </div>
            </div>
            
            {hasChanges && (
               <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-4 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-xs font-bold">You have unsaved changes. Remember to tap Save Changes above.</p>
               </div>
            )}
         </div>
      </div>

      {/* Read-Only Info */}
      <div className="px-4 lg:px-0">
         <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-blue-900/5 p-8 space-y-8">
            <div className="flex items-center justify-between">
               <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4" />
                 Fellowship Info
               </h3>
               <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">
                  <Lock className="w-2.5 h-2.5" />
                  Managed by Admin
               </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
               <InfoTile label="Team" value={member.team?.name || "Unassigned"} dotColor={member.team?.color} />
               <InfoTile label="Date Joined" value={member.dateJoined ? new Date(member.dateJoined).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : "Unknown"} />
               <InfoTile label="Date of Birth" value={member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : "Not provided"} />
               <InfoTile label="Member Status" value={member.isActive ? "Active Member" : "Inactive"} status />
               <InfoTile label="Primary Phone" value={member.phoneNumber || "None"} />
            </div>
         </div>
      </div>

      {/* Security Footer */}
      <div className="px-4 lg:px-0 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 tracking-widest uppercase">
         <Lock className="w-3 h-3" />
         Signed in securely via OTP — no password needed
      </div>
    </div>
  );
}

function InfoTile({ label, value, dotColor, status }: { label: string, value: string, dotColor?: string, status?: boolean }) {
  return (
    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100/50 space-y-1">
       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
       <div className="flex items-center gap-2">
          {dotColor && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />}
          {status && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
          <p className="text-sm font-bold text-slate-700">{value}</p>
       </div>
    </div>
  );
}
