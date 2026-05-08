import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Calendar, 
  Church, 
  ChevronRight,
  Filter
} from "lucide-react";
import { Link } from "react-router-dom";
import { api, type Announcement } from "../../lib/api";
import { useAuth } from "../../providers/AuthContext";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

export function AnnouncementsPage() {
  const { accessToken } = useAuth();
  const [filter, setFilter] = useState<string>("All");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const announcementsQuery = useQuery({
    queryKey: ["announcements-all", filter],
    queryFn: () => api.getAnnouncements(filter === "All" ? undefined : filter.toLowerCase(), accessToken),
    enabled: Boolean(accessToken)
  });

  const announcements = announcementsQuery.data?.announcements ?? [];

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 px-2">
        <Link to="/" className="grid h-10 w-10 place-items-center rounded-full bg-white border border-slate-100 text-slate-400 hover:text-slate-900 shadow-sm transition-all">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Announcements</h1>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-2 pb-2">
        {["All", "Event", "Notice", "Vacancy", "Program"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all",
              filter === f 
                ? "bg-[#1a56db] text-white shadow-md shadow-blue-900/20" 
                : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-4 px-2">
        {announcementsQuery.isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 animate-pulse rounded-[2rem] bg-slate-50" />)}
          </div>
        ) : announcements.length ? (
          announcements.map((announcement) => (
            <motion.button
              layoutId={announcement.id}
              key={announcement.id}
              onClick={() => setSelectedAnnouncement(announcement)}
              className="w-full text-left group flex flex-col gap-4 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[var(--shadow-soft)] transition-all hover:border-blue-100 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className={clsx(
                  "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                  announcement.category === "event" ? "bg-blue-50 text-blue-700" :
                  announcement.category === "notice" ? "bg-amber-50 text-amber-700" :
                  announcement.category === "vacancy" ? "bg-purple-50 text-purple-700" :
                  "bg-emerald-50 text-emerald-700"
                )}>
                  {announcement.category}
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  {new Date(announcement.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 group-hover:text-[#1a56db] transition-colors leading-tight">
                  {announcement.title}
                </h3>
                <p className="text-sm text-slate-500 font-medium line-clamp-2">
                  {announcement.body}
                </p>
              </div>

              {(announcement.event_date || announcement.venue) && (
                <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-50 mt-2">
                  {announcement.event_date && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(announcement.event_date).toLocaleDateString()}
                    </div>
                  )}
                  {announcement.venue && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <Church className="h-3.5 w-3.5" />
                      {announcement.venue}
                    </div>
                  )}
                </div>
              )}
            </motion.button>
          ))
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <Filter className="h-8 w-8 text-slate-200" />
            </div>
            <p className="text-slate-400 font-medium">No announcements found in this category.</p>
          </div>
        )}
      </div>

      {/* Detail Overlay */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 sm:items-center"
            onClick={() => setSelectedAnnouncement(null)}
          >
            <motion.div
              layoutId={selectedAnnouncement.id}
              className="w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                   <span className={clsx(
                    "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                    selectedAnnouncement.category === "event" ? "bg-blue-50 text-blue-700" :
                    selectedAnnouncement.category === "notice" ? "bg-amber-50 text-amber-700" :
                    selectedAnnouncement.category === "vacancy" ? "bg-purple-50 text-purple-700" :
                    "bg-emerald-50 text-emerald-700"
                  )}>
                    {selectedAnnouncement.category}
                  </span>
                  <button onClick={() => setSelectedAnnouncement(null)} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors">
                    <ChevronRight className="h-6 w-6 rotate-90" />
                  </button>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 leading-tight">{selectedAnnouncement.title}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                       {selectedAnnouncement.postedBy.profile_photo_url ? (
                         <img src={selectedAnnouncement.postedBy.profile_photo_url} alt="" />
                       ) : (
                         <span className="text-[8px]">{selectedAnnouncement.postedBy.first_name[0]}</span>
                       )}
                    </div>
                    By {selectedAnnouncement.postedBy.first_name} {selectedAnnouncement.postedBy.last_name} • {new Date(selectedAnnouncement.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="max-h-[40vh] overflow-y-auto text-sm leading-relaxed text-slate-600 font-medium whitespace-pre-wrap">
                  {selectedAnnouncement.body}
                </div>

                {(selectedAnnouncement.event_date || selectedAnnouncement.venue) && (
                  <div className="rounded-[1.5rem] bg-slate-50 p-6 space-y-4">
                    {selectedAnnouncement.event_date && (
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-600">
                           <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time</p>
                          <p className="text-sm font-bold text-slate-900">
                            {new Date(selectedAnnouncement.event_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            {selectedAnnouncement.event_time ? ` @ ${selectedAnnouncement.event_time}` : ""}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedAnnouncement.venue && (
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600">
                           <Church className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Venue</p>
                          <p className="text-sm font-bold text-slate-900">{selectedAnnouncement.venue}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button 
                  onClick={() => setSelectedAnnouncement(null)}
                  className="w-full rounded-2xl bg-slate-900 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                >
                  Close Detail
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
