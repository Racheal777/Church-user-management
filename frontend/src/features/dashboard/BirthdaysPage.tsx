import { useQuery } from "@tanstack/react-query";
import { 
  ChevronLeft, 
  Cake, 
  Gift, 
  Calendar as CalendarIcon,
  PartyPopper,
  Search
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../providers/AuthContext";
import { api } from "../../lib/api";
import { motion } from "framer-motion";
import { useState } from "react";
import clsx from "clsx";

export function BirthdaysPage() {
  const { accessToken } = useAuth();
  const [search, setSearch] = useState("");

  const birthdaysQuery = useQuery({
    queryKey: ["birthdays-all"],
    queryFn: () => api.getBirthdaysThisWeek(accessToken!, 30),
    enabled: Boolean(accessToken)
  });

  const filteredBirthdays = (birthdaysQuery.data?.members || []).filter(m => 
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-2">
           <div>
              <Link to="/" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-blue-700 transition-colors mb-2 text-[10px] font-black uppercase tracking-widest">
                <ChevronLeft className="w-3 h-3" />
                Back to Dashboard
              </Link>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                Upcoming Birthdays 🎂
              </h1>
              <p className="text-slate-500 text-sm font-medium">Fellowship celebrations for the next 30 days</p>
           </div>
           <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm border border-amber-100">
              <PartyPopper className="w-6 h-6" />
           </div>
        </div>

        {/* Search Bar */}
        <div className="relative px-2">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
           <input 
             type="text"
             placeholder="Search birthday celebrants..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="w-full bg-white border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/5 outline-none shadow-sm transition-all"
           />
        </div>
      </div>

      {/* Birthday List */}
      <div className="grid gap-4 px-2">
        {birthdaysQuery.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-3xl animate-pulse border border-slate-50" />
          ))
        ) : filteredBirthdays.length > 0 ? (
          filteredBirthdays.map((m, index) => (
            <motion.div 
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group bg-white rounded-[2rem] border border-slate-100 p-4 sm:p-6 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all flex items-center gap-4 sm:gap-6 relative overflow-hidden"
            >
               {/* Team color accent */}
               <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: m.team?.color || '#cbd5e1' }} />
               
               {/* Photo */}
               <div className="relative flex-none">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-md border-4 border-white">
                    {m.profilePhotoUrl ? (
                      <img src={m.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-50 text-xl font-black text-slate-300">
                        {m.firstName[0]}{m.lastName[0]}
                      </div>
                    )}
                  </div>
                  {isToday(m.dateOfBirth) && (
                    <div className="absolute -right-2 -top-2 w-8 h-8 bg-amber-400 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                      <Cake className="w-4 h-4" />
                    </div>
                  )}
               </div>

               {/* Info */}
               <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    {m.team?.name || "No Team"}
                  </p>
                  <h3 className="text-lg font-black text-slate-900 truncate tracking-tight">{m.firstName} {m.lastName}</h3>
                  <div className="flex items-center gap-3 mt-1">
                     <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                        <CalendarIcon className="w-3 h-3" />
                        {formatBirthday(m.dateOfBirth)}
                     </div>
                     {isToday(m.dateOfBirth) && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Celebration Today! ✨</span>
                     )}
                  </div>
               </div>

               {/* Right Action */}
               <div className="flex-none hidden sm:block">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <Gift className="w-5 h-5" />
                  </div>
               </div>
            </motion.div>
          ))
        ) : (
          <div className="py-20 text-center space-y-4">
             <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto text-slate-200">
                <Cake className="w-10 h-10" />
             </div>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No birthdays found matching your search</p>
          </div>
        )}
      </div>
    </div>
  );
}

function isToday(dobString?: string | null) {
  if (!dobString) return false;
  const dob = new Date(dobString);
  const now = new Date();
  return dob.getDate() === now.getDate() && dob.getMonth() === now.getMonth();
}

function formatBirthday(dobString?: string | null) {
  if (!dobString) return "N/A";
  const dob = new Date(dobString);
  return dob.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}
