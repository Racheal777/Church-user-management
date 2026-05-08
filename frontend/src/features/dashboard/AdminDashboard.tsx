import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  CreditCard, 
  Globe, 
  Users, 
  Zap, 
  ArrowRight, 
  AlertTriangle,
  Play,
  XCircle,
  Eye,
  Trophy,
  Target,
  Megaphone,
  Plus,
  LayoutDashboard,
  Calendar,
  Church,
  Edit2,
  Trash2,
  MoreVertical
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Announcement } from "../../lib/api";
import { useAuth } from "../../providers/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import { formatMoney } from "../dues/shared-dues-ui";
import { StatCard } from "./components/StatCard";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function AdminDashboard() {
  const { accessToken, member } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"insights" | "announcements">("insights");
  const [startingSession, setStartingSession] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const membersQuery = useQuery({
    queryKey: ["dashboard-members"],
    queryFn: () => api.listMembers({}, accessToken!),
    enabled: Boolean(accessToken)
  });

  const attendanceReportQuery = useQuery({
    queryKey: ["dashboard-attendance"],
    queryFn: () => api.getAttendanceReport(accessToken!),
    enabled: Boolean(accessToken)
  });

  const duesReportQuery = useQuery({
    queryKey: ["dashboard-dues"],
    queryFn: () => api.getDuesReport(accessToken!),
    enabled: Boolean(accessToken)
  });

  const activeSessionQuery = useQuery({
    queryKey: ["dashboard-active-session"],
    queryFn: () => api.getActiveAttendanceSession(accessToken!),
    enabled: Boolean(accessToken),
    refetchInterval: 10000,
    retry: false
  });

  const announcementsQuery = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: () => api.getAnnouncements(undefined, accessToken),
    enabled: Boolean(accessToken)
  });

  const teamsQuery = useQuery({
    queryKey: ["dashboard-teams"],
    queryFn: () => api.listTeams(),
    enabled: Boolean(accessToken)
  });

  const activeMembersCount = membersQuery.data?.members.filter((item) => item.isActive !== false).length ?? 0;
  const attendanceReport = attendanceReportQuery.data;
  const duesReport = duesReportQuery.data;
  const activeSession = activeSessionQuery.data;
  const teams = teamsQuery.data?.teams ?? [];
  const announcements = announcementsQuery.data?.announcements ?? [];

  const receivedAmount = duesReport?.summary.totalReceivedSoFar ?? 0;
  const yearlyTarget = activeMembersCount * 2 * 52; 
  const collectionsPercent = Math.min(100, Math.round((receivedAmount / Math.max(yearlyTarget, 1)) * 100));

  async function handleStartAttendance() {
    if (!accessToken) return;
    setStartingSession(true);
    try {
      await api.startAttendanceSession(undefined, accessToken);
      toast.success({ title: "Attendance started", description: "A new session is live now." });
      await activeSessionQuery.refetch();
    } catch (error) {
      toast.error({ title: "Error", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setStartingSession(false);
    }
  }

  async function handleCloseSession() {
    if (!accessToken || !activeSession?.session) return;
    const confirmClose = window.confirm("Are you sure you want to close this attendance session?");
    if (!confirmClose) return;

    try {
      await api.closeAttendanceSession(activeSession.session.id, accessToken);
      toast.success({ title: "Session closed", description: "Attendance session is now finalized." });
      await activeSessionQuery.refetch();
    } catch (error) {
      toast.error({ title: "Error", description: "Could not close session." });
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    if (!accessToken) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this announcement?");
    if (!confirmDelete) return;

    try {
      await api.deleteAnnouncement(id, accessToken);
      toast.success({ title: "Deleted", description: "Announcement removed successfully." });
      announcementsQuery.refetch();
    } catch (error) {
      toast.error({ title: "Error", description: "Failed to delete announcement." });
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header with Stats Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Admin Command Center</h1>
          <p className="text-slate-500 font-medium text-sm">Real-time fellowship growth and engagement monitoring.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowAnnouncementModal(true)}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 active:scale-95 transition-all"
          >
            <Megaphone className="w-4 h-4" />
            Post Notice
          </button>
          
          {member?.permissions.canManageAttendance && (
            <button
              onClick={handleStartAttendance}
              disabled={startingSession || !!activeSession?.session}
              className={clsx(
                "inline-flex items-center gap-3 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg",
                activeSession?.session 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" 
                  : "bg-blue-700 text-white shadow-blue-900/10 hover:bg-blue-800 active:scale-95"
              )}
            >
              <Zap className="w-4 h-4" />
              {startingSession ? "Starting..." : "+ Session"}
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl w-fit border border-slate-100">
        <button
          onClick={() => setActiveTab("insights")}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === "insights" ? "bg-white text-blue-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <LayoutDashboard className="w-4 h-4" />
          Fellowship Insights
        </button>
        <button
          onClick={() => setActiveTab("announcements")}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === "announcements" ? "bg-white text-blue-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Megaphone className="w-4 h-4" />
          Announcements
          {announcements.length > 0 && (
            <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "insights" ? (
          <motion.div 
            key="insights"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10"
          >
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Active Members"
                value={activeMembersCount}
                trend={{ direction: 'up', delta: '5', invertColors: false }}
                variant="primary"
              />
              <StatCard
                title="Attendance Rate"
                value={`${Math.round((attendanceReport?.summary.weeklyAttendanceRate ?? 0) * 100)}%`}
                trend={{ direction: 'up', delta: '2%', invertColors: false }}
              />
              <StatCard
                title="Weekly Dues"
                value={`GHS ${Math.round(duesReport?.summary.totalCollectedThisWeek ?? 0)}`}
                trend={{ direction: 'down', delta: '12', invertColors: false }}
              />
              <StatCard
                title="Critical Follow-ups"
                value={attendanceReport?.absentThreePlus.length ?? 0}
                trend={{ direction: 'up', delta: '2', invertColors: true }}
                onClick={() => navigate("/admin/critical-follow-ups")}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                <section className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                   <div className="flex items-center justify-between mb-8">
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Participation</p>
                         <h2 className="text-xl font-black text-slate-900">Attendance Trend</h2>
                      </div>
                      <div className="flex bg-slate-50 p-1 rounded-lg">
                         <button className="px-4 py-1.5 text-[10px] font-black uppercase rounded-md text-slate-400">Week</button>
                         <button className="px-4 py-1.5 text-[10px] font-black uppercase rounded-md bg-white text-blue-700 shadow-sm">Month</button>
                      </div>
                   </div>
                   <AttendanceTrendChart />
                </section>

                <div className="grid gap-6 md:grid-cols-2">
                   <section className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                         <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Team Rankings</h3>
                         <Trophy className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="space-y-4">
                         {(attendanceReport?.leaderboard ?? []).slice(0, 5).map((team, i) => (
                            <div key={team.teamId} className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-50 hover:bg-slate-50/30 transition-all">
                               <div className="flex items-center gap-4">
                                  <span className="text-[10px] font-black text-slate-300 w-4">{i + 1}</span>
                                  <div className="flex items-center gap-3 border-l-4 pl-3" style={{ borderLeftColor: team.color || '#cbd5e1' }}>
                                     <span className="text-sm font-bold text-slate-900">{team.teamName}</span>
                                     {team.score === 0 && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                  </div>
                               </div>
                               <span className={clsx("text-xs font-black", team.score === 0 ? "text-red-500" : "text-blue-700")}>
                                  {team.score}%
                               </span>
                            </div>
                         ))}
                      </div>
                   </section>

                   <section className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                         <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Collections</h3>
                         <Target className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 flex flex-col justify-center items-center py-6">
                         <div className="relative w-40 h-20 mb-4 overflow-hidden">
                            <div className="absolute top-0 left-0 w-40 h-40 rounded-full border-[12px] border-slate-100"></div>
                            <div className="absolute top-0 left-0 w-40 h-40 rounded-full border-[12px] border-blue-700 transition-all duration-1000" style={{ clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 ${100 - collectionsPercent}%)` }}></div>
                            <div className="absolute inset-0 bg-white" style={{ clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)' }}></div>
                         </div>
                         <p className="text-2xl font-black text-slate-900 tracking-tight">GHS {formatMoney(receivedAmount)} <span className="text-xs font-medium text-slate-400">received</span></p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">of GHS {formatMoney(yearlyTarget)} yearly target</p>
                      </div>
                      <div className="mt-6 pt-6 border-t border-slate-50 space-y-3">
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">This Week</span>
                            <span className="text-xs font-bold text-slate-900">GHS {formatMoney(duesReport?.summary.totalCollectedThisWeek ?? 0)}</span>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outstanding</span>
                            <span className="text-xs font-bold text-red-600">GHS {formatMoney(Math.max(0, yearlyTarget - receivedAmount))}</span>
                         </div>
                      </div>
                   </section>
                </div>
              </div>

              <div className="space-y-6">
                <section className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-900/10">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                   <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-6 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                         Live Attendance
                      </p>
                      {activeSession?.session ? (
                        <div className="space-y-6">
                          <h2 className="text-4xl font-black tracking-tight">{formatCountdown(activeSession.secondsRemaining)}</h2>
                          <p className="text-xs font-bold text-blue-100/60 uppercase tracking-widest">{activeSession.session.attendeeCount} Members Checked In</p>
                          <div className="flex gap-3">
                             <Link to="/attendance" className="flex-1 inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                                <Eye className="w-4 h-4" />
                                View
                             </Link>
                             <button onClick={handleCloseSession} className="flex-1 inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                                <XCircle className="w-4 h-4" />
                                Close
                             </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <p className="text-sm font-medium text-slate-400 leading-relaxed">No active session. Ready to take attendance for today's fellowship?</p>
                          <button onClick={handleStartAttendance} disabled={startingSession} className="w-full inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/40">
                             <Play className="w-4 h-4" />
                             Start Attendance
                          </button>
                        </div>
                      )}
                   </div>
                </section>

                <section className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                   <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8">Quick Launch</h3>
                   <div className="space-y-6">
                      <QuickLaunchItem 
                        to="/attendance"
                        title="Attendance Hub" 
                        subtitle={activeSession?.session ? `Session active · ${activeSession.session.attendeeCount} in` : "No session today"}
                        icon={<Activity className="w-5 h-5" />} 
                        color="bg-blue-50 text-blue-700" 
                      />
                      <QuickLaunchItem 
                        to="/members"
                        title="Youth Directory" 
                        subtitle={`${activeMembersCount} active members`}
                        icon={<Users className="w-5 h-5" />} 
                        color="bg-emerald-50 text-emerald-700" 
                      />
                      <QuickLaunchItem 
                        to="/manage-dues"
                        title="Financial Hub" 
                        subtitle={`GHS ${Math.round(duesReport?.summary.totalCollectedThisWeek ?? 0)} this week`}
                        icon={<CreditCard className="w-5 h-5" />} 
                        color="bg-amber-50 text-amber-700" 
                      />
                      <QuickLaunchItem 
                        to="/teams"
                        title="Fellowship Teams" 
                        subtitle={`${teams.length} teams active`}
                        icon={<Globe className="w-5 h-5" />} 
                        color="bg-purple-50 text-purple-700" 
                      />
                   </div>
                </section>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="announcements"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-4">
               <div>
                  <h2 className="text-2xl font-black text-slate-900">Fellowship Announcements</h2>
                  <p className="text-slate-500 font-medium text-sm">Review and manage notices sent to members.</p>
               </div>
               <button 
                 onClick={() => setShowAnnouncementModal(true)}
                 className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-blue-700 text-white shadow-lg shadow-blue-900/10 hover:bg-blue-800 transition-all active:scale-95"
               >
                 <Plus className="w-3.5 h-3.5" />
                 Create New
               </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {announcements.length ? announcements.map((a) => (
                <div key={a.id} className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm flex flex-col gap-6 relative overflow-hidden group">
                   <div className="flex items-center justify-between relative z-10">
                      <span className={clsx(
                        "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider",
                        a.category === "event" ? "bg-blue-50 text-blue-700" :
                        a.category === "notice" ? "bg-amber-50 text-amber-700" :
                        a.category === "vacancy" ? "bg-purple-50 text-purple-700" :
                        "bg-emerald-50 text-emerald-700"
                      )}>
                        {a.category}
                      </span>
                      
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                           {new Date(a.created_at).toLocaleDateString()}
                         </span>
                         {(a.posted_by === member?.id || member?.role === "president") && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                 onClick={() => setEditingAnnouncement(a)}
                                 className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-all"
                               >
                                 <Edit2 className="w-3 h-3" />
                               </button>
                               <button 
                                 onClick={() => handleDeleteAnnouncement(a.id)}
                                 className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-red-700 hover:bg-red-50 transition-all"
                               >
                                 <Trash2 className="w-3 h-3" />
                               </button>
                            </div>
                         )}
                      </div>
                   </div>

                   <div className="space-y-2 relative z-10">
                      <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">
                        {a.title}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium line-clamp-3">
                        {a.body}
                      </p>
                   </div>

                   {(a.event_date || a.venue) && (
                      <div className="flex flex-wrap gap-4 pt-6 border-t border-slate-50 mt-auto relative z-10">
                         {a.event_date && (
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                               <Calendar className="w-3.5 h-3.5" />
                               {new Date(a.event_date).toLocaleDateString()}
                            </div>
                         )}
                         {a.venue && (
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                               <Church className="w-3.5 h-3.5" />
                               {a.venue}
                            </div>
                         )}
                      </div>
                   )}
                </div>
              )) : (
                <div className="col-span-full py-20 text-center space-y-6">
                   <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                      <Megaphone className="w-12 h-12" />
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">No Announcements Posted</h3>
                      <p className="text-slate-400 font-medium text-sm">Broadcast notices and events to your fellowship members.</p>
                   </div>
                   <button 
                    onClick={() => setShowAnnouncementModal(true)}
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs bg-slate-900 text-white shadow-lg transition-all active:scale-95"
                   >
                     Post First Notice
                   </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAnnouncementModal && (
          <PostAnnouncementModal 
            onClose={() => {
              setShowAnnouncementModal(false);
              announcementsQuery.refetch();
            }} 
            accessToken={accessToken!} 
          />
        )}
        {editingAnnouncement && (
          <PostAnnouncementModal 
            editingAnnouncement={editingAnnouncement}
            onClose={() => {
              setEditingAnnouncement(null);
              announcementsQuery.refetch();
            }} 
            accessToken={accessToken!} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AttendanceTrendChart() {
  const trendValues = [45, 52, 48, 61, 55, 68, 72, 65];
  const trendMonths = ["S", "M", "T", "W", "T", "F", "S", "S"];
  
  return (
    <div className="flex items-end justify-between gap-2 h-40 mt-8">
       {trendValues.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
             <div className="w-full relative">
                <div 
                  className={clsx(
                    "w-full rounded-full transition-all duration-700 group-hover:scale-y-110 group-hover:opacity-100 origin-bottom",
                    i === trendValues.length - 2 ? "bg-blue-700 shadow-lg shadow-blue-900/20" : "bg-slate-100 opacity-60"
                  )} 
                  style={{ height: `${(v / 80) * 100}%` }}
                >
                  {i === trendValues.length - 2 && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                      {v}%
                    </div>
                  )}
                </div>
             </div>
             <span className="text-[10px] font-black text-slate-300 uppercase">{trendMonths[i]}</span>
          </div>
       ))}
    </div>
  );
}

function QuickLaunchItem({ to, title, subtitle, icon, color }: any) {
  return (
    <Link to={to} className="flex items-center gap-4 group">
       <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-lg", color)}>
          {icon}
       </div>
       <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition-colors truncate">{title}</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{subtitle}</p>
       </div>
       <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

function PostAnnouncementModal({ onClose, accessToken, editingAnnouncement }: { onClose: () => void, accessToken: string, editingAnnouncement?: Announcement | null }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: editingAnnouncement?.title || "",
    body: editingAnnouncement?.body || "",
    category: editingAnnouncement?.category || "notice",
    event_date: editingAnnouncement?.event_date ? new Date(editingAnnouncement.event_date).toISOString().split('T')[0] : "",
    event_time: editingAnnouncement?.event_time || "",
    venue: editingAnnouncement?.venue || ""
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingAnnouncement) {
        await api.updateAnnouncement(editingAnnouncement.id, {
          ...form,
          event_date: form.event_date || null,
          event_time: form.event_time || null,
          venue: form.venue || null
        }, accessToken);
        toast.success({ title: "Success", description: "Announcement updated successfully." });
      } else {
        await api.postAnnouncement({
          ...form,
          event_date: form.event_date || null,
          event_time: form.event_time || null,
          venue: form.venue || null
        }, accessToken);
        toast.success({ title: "Success", description: "Announcement posted successfully." });
      }
      onClose();
    } catch (error) {
      toast.error({ title: "Error", description: error instanceof Error ? error.message : "Failed to save." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              {editingAnnouncement ? "Edit Notice" : "Post New Notice"}
            </h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Title</label>
              <input
                required
                type="text"
                placeholder="Announcement headline"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:border-[#1a56db] focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Message</label>
              <textarea
                required
                rows={4}
                placeholder="What do members need to know?"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:border-[#1a56db] focus:bg-white focus:outline-none transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                  className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-900 focus:border-[#1a56db] focus:bg-white focus:outline-none transition-all appearance-none"
                >
                  <option value="notice">📢 General Notice</option>
                  <option value="event">📅 Church Event</option>
                  <option value="vacancy">💼 Job Vacancy</option>
                  <option value="program">🙏 Spiritual Program</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Event Date (Optional)</label>
                <input
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-900 focus:border-[#1a56db] focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>

            {form.category === "event" || form.category === "program" ? (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 6:00 PM"
                    value={form.event_time}
                    onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                    className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-900 focus:border-[#1a56db] focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Venue</label>
                  <input
                    type="text"
                    placeholder="e.g. Youth Hall"
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-900 focus:border-[#1a56db] focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex gap-4">
             <button
               type="button"
               onClick={onClose}
               className="flex-1 rounded-2xl border-2 border-slate-100 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
             >
               Cancel
             </button>
             <button
               disabled={loading}
               type="submit"
               className="flex-[2] rounded-2xl bg-[#1a56db] py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-900/20 hover:bg-blue-800 active:scale-95 transition-all flex items-center justify-center gap-2"
             >
               {loading ? "Saving..." : (
                 <>
                   {editingAnnouncement ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                   {editingAnnouncement ? "Update Notice" : "Post Announcement"}
                 </>
               )}
             </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
