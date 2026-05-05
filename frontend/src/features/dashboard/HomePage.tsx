import { useState, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  CreditCard, 
  FolderClock, 
  Globe, 
  Users, 
  Zap, 
  ArrowRight, 
  AlertTriangle,
  Play,
  XCircle,
  Eye,
  CheckCircle2,
  Trophy,
  Target
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../../lib/api";
import { calculateProfileCompletion } from "../../lib/display";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";
import { formatMoney } from "../dues/shared-dues-ui";
import { ProgressCard } from "./components/ProgressCard";
import { StatCard } from "./components/StatCard";
import clsx from "clsx";

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function HomePage() {
  const { member, accessToken } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [startingSession, setStartingSession] = useState(false);

  // Queries
  const attendanceHistoryQuery = useQuery({
    queryKey: ["attendance-history", member?.id],
    queryFn: () => api.getAttendanceHistory(member!.id, accessToken!),
    enabled: Boolean(member && accessToken)
  });

  const memberDuesQuery = useQuery({
    queryKey: ["member-dues", member?.id],
    queryFn: () => api.getMemberDues(member!.id, accessToken!),
    enabled: Boolean(member && accessToken)
  });

  const membersQuery = useQuery({
    queryKey: ["dashboard-members"],
    queryFn: () => api.listMembers({}, accessToken!),
    enabled: Boolean(member?.permissions.isAdmin && accessToken)
  });

  const attendanceReportQuery = useQuery({
    queryKey: ["dashboard-attendance"],
    queryFn: () => api.getAttendanceReport(accessToken!),
    enabled: Boolean(member?.permissions.isAdmin && accessToken)
  });

  const duesReportQuery = useQuery({
    queryKey: ["dashboard-dues"],
    queryFn: () => api.getDuesReport(accessToken!),
    enabled: Boolean(member?.permissions.isAdmin && accessToken)
  });

  const activeSessionQuery = useQuery({
    queryKey: ["dashboard-active-session"],
    queryFn: () => api.getActiveAttendanceSession(accessToken!),
    enabled: Boolean(member?.permissions.isAdmin && accessToken),
    refetchInterval: 10000,
    retry: false
  });

  const teamsQuery = useQuery({
    queryKey: ["dashboard-teams"],
    queryFn: () => api.listTeams(),
    enabled: Boolean(member?.permissions.isAdmin && accessToken)
  });

  if (!member) {
    return <PublicHero />;
  }

  // --- MEMBER VIEW LOGIC ---
  if (!member.permissions.isAdmin) {
    const history = attendanceHistoryQuery.data?.history ?? [];
    let streak = 0;
    for (const item of history) {
      if (item.status === "present") streak += 1;
      else break;
    }

    const totalWeeks = memberDuesQuery.data?.summary.totalWeeks ?? 0;
    const paidWeeks = memberDuesQuery.data?.summary.weeksPaid ?? 0;
    const duesProgress = totalWeeks ? Math.round((paidWeeks / totalWeeks) * 100) : 0;
    const profileComp = calculateProfileCompletion(member);

    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-blue-100 transition-colors duration-500"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2">Member Dashboard</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Peace be with you, {member.firstName}</h1>
            <p className="mt-2 text-slate-500 text-sm max-w-md font-medium leading-relaxed">
              Your spiritual journey matters. Keep up your fellowship, track your stewardship, and stay connected with the youth family.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/check-in" className="inline-flex items-center gap-3 bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/10 hover:bg-blue-800 active:scale-95">
                <Zap className="w-5 h-5" />
                Check In Now
              </Link>
              <Link to="/my-dues" className="inline-flex items-center gap-3 bg-white text-slate-700 border border-slate-100 px-8 py-4 rounded-xl font-bold transition-all hover:bg-slate-50 active:scale-95">
                <CreditCard className="w-5 h-5 text-slate-400" />
                Dues Ledger
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          <MemberCompactCard 
            to="/check-in"
            title="Attendance Streak" 
            value={`${streak} Weeks`} 
            subtitle={streak > 0 ? "You're on fire! 🔥" : "Join us next Monday!"} 
            icon={<Activity className="w-6 h-6" />}
            color="bg-emerald-50 text-emerald-700"
            accent="border-emerald-100"
          />
          <MemberCompactCard 
            to="/my-dues"
            title="Dues Progress" 
            value={`${duesProgress}%`} 
            subtitle={`${paidWeeks} / ${totalWeeks} weeks settled`} 
            icon={<Target className="w-6 h-6" />}
            color="bg-blue-50 text-blue-700"
            accent="border-blue-100"
          />
          <MemberCompactCard 
            to="/profile"
            title="Profile Readiness" 
            value={`${profileComp}%`} 
            subtitle={profileComp < 100 ? "Complete your profile" : "Profile looking great!"} 
            icon={<Users className="w-6 h-6" />}
            color="bg-purple-50 text-purple-700"
            accent="border-purple-100"
          />
        </div>

        {/* Quick Links */}
        <div className="grid gap-6 md:grid-cols-2">
           <Link to="/directory" className="group bg-white rounded-2xl border border-slate-100 p-8 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:border-blue-100">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-700 transition-all">
                    <Users className="w-8 h-8" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900">Youth Directory</h3>
                    <p className="text-sm font-medium text-slate-400">Connect with fellow members</p>
                 </div>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-200 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
           </Link>
           <Link to="/profile" className="group bg-white rounded-2xl border border-slate-100 p-8 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:border-blue-100">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-700 transition-all">
                    <FolderClock className="w-8 h-8" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900">Account Settings</h3>
                    <p className="text-sm font-medium text-slate-400">Update your information</p>
                 </div>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-200 group-hover:text-purple-700 group-hover:translate-x-1 transition-all" />
           </Link>
        </div>
      </div>
    );
  }

  // --- ADMIN VIEW LOGIC ---
  const activeMembersCount = membersQuery.data?.members.filter((item) => item.isActive !== false).length ?? 0;
  const attendanceReport = attendanceReportQuery.data;
  const duesReport = duesReportQuery.data;
  const activeSession = activeSessionQuery.data;
  const teams = teamsQuery.data?.teams ?? [];

  // 4. Collections Card Logic
  const receivedAmount = duesReport?.summary.totalReceivedSoFar ?? 0;
  const yearlyTarget = activeMembersCount * 2 * 52; // GHS 2 x 52 weeks
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

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Admin Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 font-medium text-sm">Real-time fellowship growth and engagement monitoring.</p>
        </div>

        <div className="flex items-center gap-3">
          {member.permissions.canManageAttendance && (
            <button
              onClick={handleStartAttendance}
              disabled={startingSession || !!activeSession?.session}
              className={clsx(
                "inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg",
                activeSession?.session 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" 
                  : "bg-blue-700 text-white shadow-blue-900/10 hover:bg-blue-800 active:scale-95"
              )}
            >
              <Zap className="w-4 h-4" />
              {startingSession ? "Starting..." : "+ Session"}
            </button>
          )}
          <Link to="/reports" className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs bg-white text-slate-700 border border-slate-100 shadow-sm hover:bg-slate-50 active:scale-95">
             Reports
          </Link>
        </div>
      </div>

      {/* KPI Cards (1 & 6) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Members"
          value={activeMembersCount}
          trend={{ direction: 'up', delta: '5', invertColors: false }} // Delta logic should ideally come from API
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
          trend={{ direction: 'up', delta: '2', invertColors: true }} // Red because increase is bad
          onClick={() => navigate("/admin/critical-follow-ups")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main Content Area */}
        <div className="space-y-6">
          {/* Charts (3) */}
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
             {/* Team Rankings (3) */}
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

             {/* Collections Card (4) */}
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

        {/* Sidebar Cards */}
        <div className="space-y-6">
          {/* Live Attendance (2) */}
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

          {/* Quick Launch (5) */}
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

function MemberCompactCard({ to, title, value, subtitle, icon, color, accent }: any) {
  const Content = (
    <div className={clsx(
      "bg-white rounded-2xl border p-6 shadow-sm group transition-all h-full relative overflow-hidden",
      accent || "border-slate-100",
      to && "hover:shadow-md hover:-translate-y-1 cursor-pointer"
    )}>
       <div className="flex items-center justify-between mb-4 relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
          <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110", color)}>
             {icon}
          </div>
       </div>
       <div className="relative z-10">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{subtitle}</p>
       </div>
       
       {to && (
         <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
           <ArrowRight className="w-4 h-4 text-slate-300" />
         </div>
       )}

       {/* Suble background accent for clickables */}
       {to && (
         <div className={clsx("absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity", color)}></div>
       )}
    </div>
  );

  if (to) {
    return <Link to={to} className="block h-full">{Content}</Link>;
  }

  return Content;
}

function PublicHero() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
       <div className="max-w-4xl w-full text-center space-y-8">
          <div className="inline-flex bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
             PresbyYouth Management System
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-tight">
             Keep fellowship simple, warm, and within reach.
          </h1>
          <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">
             Manage attendance, follow membership growth, and handle stewardship in one premium mobile-first experience.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
             <Link to="/login" className="px-10 py-5 bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-900/20 hover:bg-blue-800 transition-all active:scale-95">
                Get Started
             </Link>
             <Link to="/directory" className="px-10 py-5 bg-white text-slate-700 border border-slate-100 rounded-2xl font-black uppercase tracking-widest text-sm shadow-sm hover:bg-slate-50 transition-all active:scale-95">
                Browse Members
             </Link>
          </div>
       </div>
    </div>
  );
}
