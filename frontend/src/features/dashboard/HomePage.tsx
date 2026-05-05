import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CreditCard, FolderClock, Globe, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { api } from "../../lib/api";
import { calculateProfileCompletion } from "../../lib/display";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";
import { formatMoney } from "../dues/shared-dues-ui";
import { ProgressCard } from "./components/ProgressCard";
import { StatCard } from "./components/StatCard";

const trendMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const trendValues = [48, 36, 61, 31, 54, 68, 45, 58];

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function HomePage() {
  const { member, accessToken } = useAuth();
  const toast = useToast();
  const [startingSession, setStartingSession] = useState(false);

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

  if (!member) {
    return <PublicHero />;
  }

  const history = attendanceHistoryQuery.data?.history ?? [];
  let streak = 0;
  for (const item of history) {
    if (item.status === "present") {
      streak += 1;
      continue;
    }
    break;
  }

  const totalWeeks = memberDuesQuery.data?.summary.totalWeeks ?? 0;
  const paidWeeks = memberDuesQuery.data?.summary.weeksPaid ?? 0;
  const duesProgress = totalWeeks ? Math.round((paidWeeks / totalWeeks) * 100) : 0;

  if (!member.permissions.isAdmin) {
    return (
      <div className="page-stack mx-auto max-w-5xl">
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Welcome back</p>
            <h1 className="mt-3 font-display text-4xl text-slate-900">{member.firstName}</h1>
            <p className="mt-3 max-w-xl text-sm text-slate-600">
              Stay on top of your attendance, view your dues clearly, and keep your profile ready for the youth fellowship.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="button-primary" to="/check-in">
                Check In
              </Link>
              <Link className="button-secondary" to="/my-dues">
                View My Dues
              </Link>
              <Link className="button-secondary" to="/profile">
                Update Profile
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
            <ProgressCard
              title="Dues Progress"
              percentage={duesProgress}
              label="Weeks Covered"
              legend={[
                { label: "Paid", color: "#1e40af" },
                { label: "Pending", color: "#cbd5e1", pattern: true }
              ]}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MemberStatCard title="Attendance streak" value={`${streak} weeks`} subtitle="Keep showing up every Monday." icon={<Activity className="h-5 w-5" />} />
          <MemberStatCard title="Dues settled" value={`${duesProgress}%`} subtitle={`${paidWeeks} of ${totalWeeks} weeks covered.`} icon={<CreditCard className="h-5 w-5" />} />
          <MemberStatCard title="Profile status" value={`${calculateProfileCompletion(member)}%`} subtitle="Finish your details for easier member care." icon={<Users className="h-5 w-5" />} />
        </div>
      </div>
    );
  }

  const activeMembers = membersQuery.data?.members.filter((item) => item.isActive !== false) ?? [];
  const attendanceReport = attendanceReportQuery.data;
  const duesReport = duesReportQuery.data;
  const activeSession = activeSessionQuery.data;
  const collectionsPercent = Math.min(
    100,
    Math.round(((duesReport?.summary.totalReceivedSoFar ?? 0) / Math.max(duesReport?.summary.projectedYearAmount ?? 1, 1)) * 100)
  );

  async function handleStartAttendance() {
    if (!accessToken) return;
    setStartingSession(true);
    try {
      await api.startAttendanceSession(undefined, accessToken);
      toast.success({
        title: "Attendance started",
        description: "A new session is live now."
      });
      await activeSessionQuery.refetch();
    } catch (error) {
      toast.error({
        title: "Could not start attendance",
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setStartingSession(false);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="mt-3 text-xl text-slate-500">Monitoring fellowship growth and engagement.</p>
        </div>

        <div className="flex flex-wrap gap-4">
          {member.permissions.canManageAttendance ? (
            <button
              className="inline-flex min-h-16 items-center justify-center gap-3 rounded-[1.6rem] bg-blue-700 px-10 text-lg font-black uppercase tracking-[0.16em] text-white shadow-md shadow-blue-900/10 transition hover:bg-blue-800"
              disabled={startingSession}
              onClick={() => void handleStartAttendance()}
            >
              <span className="text-2xl leading-none">+</span>
              {startingSession ? "Starting" : "Session"}
            </button>
          ) : null}
          <Link className="inline-flex min-h-16 items-center justify-center rounded-[1.6rem] border border-slate-200 bg-white px-10 text-lg font-black uppercase tracking-[0.16em] text-slate-700 shadow-sm transition hover:bg-slate-50" to="/reports">
            Report
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        <StatCard
          title="Active Members"
          value={activeMembers.length}
          trend={{ value: activeMembers.length, label: "increased" }}
          variant="primary"
        />
        <StatCard
          title="Attendance Rate"
          value={`${Math.round((attendanceReport?.summary.weeklyAttendanceRate ?? 0) * 100)}%`}
          trend={{ value: Math.round((attendanceReport?.summary.monthlyAttendanceRate ?? 0) * 100), label: "upward" }}
        />
        <StatCard
          title="Weekly Dues"
          value={`GHS ${Math.round(duesReport?.summary.totalCollectedThisWeek ?? 0)}`}
          trend={{ value: Math.round(duesReport?.summary.totalCollectedThisMonth ?? 0), label: "growth" }}
        />
        <StatCard
          title="Critical Follow-ups"
          value={attendanceReport?.absentThreePlus.length ?? 0}
          description="Action required"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
        <section className="rounded-[1.75rem] border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.22em] text-slate-400">Attendance Trend</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">Participation Overview</h2>
            </div>
            <div className="inline-flex rounded-[1.6rem] bg-slate-50 p-2 text-2xl font-light uppercase tracking-[0.12em] text-slate-400">
              <span className="rounded-[1.2rem] px-8 py-3">Week</span>
              <span className="rounded-[1.2rem] bg-white px-8 py-3 text-blue-700 shadow-sm">Month</span>
              <span className="rounded-[1.2rem] px-8 py-3">Year</span>
            </div>
          </div>

          <AttendanceTrendChart />
        </section>

        <section className="rounded-[1.75rem] border border-slate-100 bg-white p-8 shadow-sm">
          <p className="text-[12px] font-black uppercase tracking-[0.22em] text-slate-400">Quick Launch</p>

          <div className="mt-8 space-y-8">
            <QuickLaunchItem color="bg-blue-50 text-blue-700" title="Manage Attendance" icon={<Activity className="h-8 w-8" />} />
            <QuickLaunchItem color="bg-emerald-50 text-emerald-700" title="Youth Directory" icon={<Users className="h-8 w-8" />} />
            <QuickLaunchItem color="bg-amber-50 text-amber-700" title="Financial Hub" icon={<CreditCard className="h-8 w-8" />} />
            <QuickLaunchItem color="bg-purple-50 text-purple-700" title="Fellowship Teams" icon={<Globe className="h-8 w-8" />} />
            <QuickLaunchItem color="bg-slate-50 text-slate-600" title="My Account" icon={<FolderClock className="h-8 w-8" />} />
          </div>

          <div className="mt-10 border-t border-slate-100 pt-10">
            <div className="rounded-[1.6rem] bg-slate-900 px-8 py-9 text-white shadow-lg shadow-slate-900/10">
              <p className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-600">Active Session</p>
              <p className="mt-8 text-6xl font-black tracking-tight">
                {activeSession?.session ? formatCountdown(activeSession.secondsRemaining) : "02:44:12"}
              </p>
              <Link className="mt-8 inline-flex items-center gap-4 text-2xl font-bold text-white/95" to="/attendance">
                Join Session
                <span aria-hidden="true">›</span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_0.9fr]">
        <section className="rounded-[1.75rem] border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-black uppercase tracking-[0.22em] text-slate-400">Team Rankings</p>
            <span className="text-slate-200">◎</span>
          </div>

          <div className="mt-8 space-y-8">
            {(attendanceReport?.leaderboard ?? []).slice(0, 4).map((team, index) => (
              <div key={team.teamId} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 text-2xl font-black text-slate-300">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <span className="text-2xl font-black text-slate-900">{team.teamName}</span>
                </div>
                <span className="rounded-2xl bg-blue-50 px-4 py-2 text-xl font-black text-blue-700">
                  {team.score} pts
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-black uppercase tracking-[0.22em] text-slate-400">Collections</p>
            <span className="text-slate-200">↗</span>
          </div>

          <div className="mt-8">
            <ProgressCard
              title=""
              percentage={Number.isFinite(collectionsPercent) ? collectionsPercent : 0}
              label="Yearly Target"
              legend={[
                { label: "Received", color: "#1e40af" },
                { label: "Target", color: "#e5e7eb" }
              ]}
            />
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-100 bg-white p-8 shadow-sm">
          <p className="text-[12px] font-black uppercase tracking-[0.22em] text-slate-400">Live Summary</p>
          <div className="mt-8 grid gap-4">
            <MiniInfo title="Attendance" value={`${attendanceReport?.summary.totalSessions ?? 0} sessions`} />
            <MiniInfo title="This Week" value={`GHS ${formatMoney(duesReport?.summary.totalCollectedThisWeek ?? 0)}`} />
            <MiniInfo title="Profile" value={`${calculateProfileCompletion(member)}% complete`} />
          </div>
        </section>
      </div>
    </div>
  );
}

function AttendanceTrendChart() {
  const width = 820;
  const height = 360;
  const leftPad = 16;
  const rightPad = 16;
  const topPad = 24;
  const bottomPad = 54;
  const chartWidth = width - leftPad - rightPad;
  const chartHeight = height - topPad - bottomPad;
  const max = Math.max(...trendValues);
  const min = Math.min(...trendValues);
  const range = Math.max(max - min, 1);

  const points = trendValues.map((value, index) => {
    const x = leftPad + (chartWidth / (trendValues.length - 1)) * index;
    const y = topPad + (1 - (value - min) / range) * chartHeight;
    return { x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - bottomPad} L ${points[0].x} ${height - bottomPad} Z`;

  return (
    <div className="mt-8">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[22rem] w-full">
        <path d={areaPath} fill="rgba(37, 72, 198, 0.16)" />
        <path d={linePath} fill="none" stroke="#2648c6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={trendMonths[index]}>
            <circle cx={point.x} cy={point.y} r="8" fill="white" stroke="#2648c6" strokeWidth="4" />
            <text x={point.x} y={height - 10} textAnchor="middle" className="fill-slate-400 text-[14px] font-black uppercase tracking-[0.2em]">
              {trendMonths[index]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function QuickLaunchItem({
  title,
  icon,
  color
}: {
  title: string;
  icon: ReactNode;
  color: string;
}) {
  return (
    <div className="flex items-center gap-6">
      <div className={`grid h-20 w-20 place-items-center rounded-[1.8rem] ${color}`}>{icon}</div>
      <div>
        <p className="text-[2rem] font-black tracking-tight text-slate-900">{title}</p>
        <p className="text-[1.05rem] font-black uppercase tracking-[0.18em] text-slate-300">Explore Control</p>
      </div>
    </div>
  );
}

function MiniInfo({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-5 py-5">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-3 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function MemberStatCard({
  title,
  value,
  subtitle,
  icon
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[1.2rem] border bg-white px-5 py-5 shadow-sm" style={{ borderColor: "var(--color-border)" }}>
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-700">{icon}</div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function PublicHero() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <span className="badge bg-blue-50 text-blue-700">Church Youth Management System</span>
          <div className="space-y-4">
            <h1 className="font-display text-5xl text-slate-900 sm:text-6xl">
              Keep fellowship records simple, warm, and always within reach.
            </h1>
            <p className="max-w-2xl text-lg text-slate-600">
              Manage attendance, follow membership growth, and handle dues in one calm mobile-first experience.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="button-primary" to="/login">
              Sign In
            </Link>
            <Link className="button-secondary" to="/directory">
              Browse Directory
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <HeroCard title="Attendance" value="Live sessions" description="Check-in stays fast with rotating codes and manual backup." />
          <HeroCard title="Member care" value="Real visibility" description="Track profiles, teams, and follow-up needs clearly." />
          <HeroCard title="Dues ledger" value="Weekly records" description="Members and finance leaders can both see what is covered." />
          <HeroCard title="PWA ready" value="Mobile first" description="Works smoothly on phones for meetings, outreach, and admin tasks." />
        </div>
      </div>
    </div>
  );
}

function HeroCard({
  title,
  value,
  description
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.25rem] border bg-white p-6 shadow-sm" style={{ borderColor: "var(--color-border)" }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{title}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-3 text-sm text-slate-500">{description}</p>
    </div>
  );
}
