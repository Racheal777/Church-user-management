import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, 
  ChevronLeft, 
  Calendar as CalendarIcon, 
  Search, 
  Download, 
  Filter, 
  ArrowRight,
  TrendingUp,
  Users,
  CreditCard,
  Activity,
  ShieldCheck,
  Clock,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { Loader } from "../../components/Loader";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import { formatMoney } from "../dues/shared-dues-ui";
import clsx from "clsx";

type ReportType = "members" | "funds" | "attendance" | "audit";

export function ReportsPage() {
  const { accessToken } = useAuth();
  const [activeReport, setActiveReport] = useState<ReportType>("funds");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const membersQuery = useQuery({
    queryKey: ["report-members"],
    queryFn: () => api.listMembers({}, accessToken!),
    enabled: activeReport === "members"
  });

  const duesReportQuery = useQuery({
    queryKey: ["report-dues"],
    queryFn: () => api.getDuesReport(accessToken!),
    enabled: activeReport === "funds"
  });

  const attendanceReportQuery = useQuery({
    queryKey: ["report-attendance"],
    queryFn: () => api.getAttendanceReport(accessToken!),
    enabled: activeReport === "attendance"
  });

  const auditLogsQuery = useQuery({
    queryKey: ["report-audit"],
    queryFn: () => api.getAuditLogs(accessToken!),
    enabled: activeReport === "audit"
  });

  const reportOptions = [
    { id: "funds", label: "Financial Report", icon: CreditCard, color: "text-blue-700", bg: "bg-blue-50" },
    { id: "members", label: "Member Directory", icon: Users, color: "text-emerald-700", bg: "bg-emerald-50" },
    { id: "attendance", label: "Attendance Analysis", icon: Activity, color: "text-purple-700", bg: "bg-purple-50" },
    { id: "audit", label: "Audit Trails", icon: ShieldCheck, color: "text-amber-700", bg: "bg-amber-50" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Report Center</h1>
          <p className="text-slate-500 text-sm font-medium">Generate, filter, and export fellowship data.</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-md shadow-slate-900/10 text-xs uppercase tracking-widest active:scale-95">
          <Download className="w-4 h-4" />
          Export Current View
        </button>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
         {reportOptions.map((opt) => (
           <button 
             key={opt.id}
             onClick={() => setActiveReport(opt.id as ReportType)}
             className={clsx(
               "flex items-center gap-4 px-8 py-6 rounded-xl transition-all min-w-[240px] border active:scale-95",
               activeReport === opt.id 
                 ? "bg-white border-blue-100 shadow-md shadow-blue-900/5 ring-2 ring-blue-500/10" 
                 : "bg-slate-50/50 border-transparent text-slate-400 hover:bg-white hover:border-slate-100"
             )}
           >
              <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform", activeReport === opt.id ? opt.bg + " " + opt.color : "bg-slate-100 text-slate-300")}>
                 <opt.icon className="w-6 h-6" />
              </div>
              <div className="text-left">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Source</p>
                 <h3 className={clsx("text-sm font-bold tracking-tight", activeReport === opt.id ? "text-slate-900" : "text-slate-400")}>{opt.label}</h3>
              </div>
           </button>
         ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
         <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="relative flex-1 w-full">
               <Search className="w-4 h-4 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
               <input 
                 className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" 
                 placeholder={`Filter ${activeReport} report...`} 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex items-center gap-4 w-full lg:w-auto">
               <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-xl border border-slate-50">
                  <CalendarIcon className="w-4 h-4 text-slate-300" />
                  <input type="date" className="bg-transparent border-none text-[10px] font-bold text-slate-600 focus:ring-0 p-0" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                  <span className="text-slate-300">→</span>
                  <input type="date" className="bg-transparent border-none text-[10px] font-bold text-slate-600 focus:ring-0 p-0" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
               </div>
               <button className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-blue-700 transition-all border border-slate-50">
                  <Filter className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>

      {/* Report Content Display */}
      <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 min-h-[400px]">
         <AnimatePresence mode="wait">
            <motion.div 
              key={activeReport}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
               {activeReport === "funds" && duesReportQuery.data && (
                 <FinancialReportView data={duesReportQuery.data} />
               )}
               {activeReport === "members" && membersQuery.data && (
                 <MembersReportView members={membersQuery.data.members} />
               )}
               {activeReport === "attendance" && attendanceReportQuery.data && (
                 <AttendanceReportView data={attendanceReportQuery.data} />
               )}
               {activeReport === "audit" && auditLogsQuery.data && (
                 <AuditLogsView logs={auditLogsQuery.data.logs} />
               )}
               {(membersQuery.isLoading || duesReportQuery.isLoading || attendanceReportQuery.isLoading || auditLogsQuery.isLoading) && (
                 <div className="py-32 flex justify-center">
                    <Loader label={`Generating ${activeReport} report...`} />
                 </div>
               )}
            </motion.div>
         </AnimatePresence>
      </div>
    </div>
  );
}

function FinancialReportView({ data }: { data: any }) {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ReportStat value={`GHS ${formatMoney(data.summary.totalReceivedSoFar)}`} label="Gross Revenue" sub="Total inception" />
          <ReportStat value={`GHS ${formatMoney(data.summary.totalCollectedThisMonth)}`} label="Monthly Inflow" sub="Current period" />
          <ReportStat value={`${Math.round((data.summary.totalReceivedSoFar / data.summary.projectedYearAmount) * 100)}%`} label="Target Progress" sub="Annual goal" />
          <ReportStat value={`GHS ${formatMoney(data.summary.totalCollectedThisWeek)}`} label="Weekly Inflow" sub="Last 7 days" />
       </div>
       <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="bg-slate-50/50">
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction</th>
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Member</th>
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {data.paymentLog.slice(0, 10).map((log: any) => (
                   <tr key={log.id} className="group hover:bg-slate-50/50 transition-all">
                      <td className="px-8 py-5">
                         <div className="text-xs font-bold text-slate-900">{new Date(log.weekOf).toLocaleDateString()}</div>
                         <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dues Settlement</div>
                      </td>
                      <td className="px-8 py-5">
                         <div className="text-sm font-bold text-slate-700">{log.memberName}</div>
                      </td>
                      <td className="px-8 py-5">
                         <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-lg uppercase">{log.method || 'Cash'}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <div className="text-sm font-black text-slate-900">GHS {formatMoney(log.amount)}</div>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}

function MembersReportView({ members }: { members: any[] }) {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ReportStat value={members.length} label="Total Members" sub="All time register" />
          <ReportStat value={members.filter(m => m.isActive).length} label="Active Status" sub="Current engagement" />
          <ReportStat value={members.filter(m => m.team).length} label="Team Distribution" sub="Assigned to units" />
       </div>
       <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="bg-slate-50/50">
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Member</th>
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team</th>
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Joined</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {members.map((m) => (
                   <tr key={m.id} className="group hover:bg-slate-50/50 transition-all">
                      <td className="px-8 py-5">
                         <div className="text-sm font-bold text-slate-900">{m.firstName} {m.lastName}</div>
                         <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{m.phoneNumber || 'No Phone'}</div>
                      </td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-600 capitalize">{m.role.replace('_', ' ')}</td>
                      <td className="px-8 py-5">
                         {m.team ? (
                           <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.team.color }} />
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{m.team.name}</span>
                           </div>
                         ) : '---'}
                      </td>
                      <td className="px-8 py-5 text-right text-xs font-bold text-slate-400">{m.dateJoined ? new Date(m.dateJoined).toLocaleDateString() : '---'}</td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}

function AttendanceReportView({ data }: { data: any }) {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ReportStat value={`${Math.round(data.summary.weeklyAttendanceRate * 100)}%`} label="Weekly Engagement" sub="Rolling average" />
          <ReportStat value={data.summary.totalSessions} label="Total Sessions" sub="Sessions logged" />
          <ReportStat value={data.absentThreePlus.length} label="Arrears Alerts" sub="3+ consecutive misses" />
       </div>
       <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-50/50 p-8 rounded-2xl border border-slate-50">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Team Leaderboard</h4>
             <div className="space-y-4">
                {data.leaderboard.map((team: any, i: number) => (
                   <div key={team.teamId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black text-slate-300">0{i+1}</span>
                         <span className="text-xs font-bold text-slate-900">{team.teamName}</span>
                      </div>
                      <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-1 rounded-lg">{team.score} PTS</span>
                   </div>
                ))}
             </div>
          </div>
          <div className="bg-red-50/10 p-8 rounded-2xl border border-red-50">
             <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-6">Critical Absences</h4>
             <div className="space-y-4">
                {data.absentThreePlus.map((member: any) => (
                   <div key={member.memberId} className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-900">{member.firstName} {member.lastName}</span>
                      <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-1 rounded-lg">{member.misses} MISSES</span>
                   </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
}

function AuditLogsView({ logs }: { logs: any[] }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="bg-slate-50/50">
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actor</th>
                   <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Entity</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                   <tr key={log.id} className="group hover:bg-slate-50/50 transition-all">
                      <td className="px-8 py-5">
                         <div className="text-xs font-bold text-slate-900">{new Date(log.createdAt).toLocaleTimeString()}</div>
                         <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(log.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-8 py-5">
                         <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-lg uppercase">{log.action.replace('_', ' ')}</span>
                      </td>
                      <td className="px-8 py-5">
                         <div className="text-sm font-bold text-slate-700">{log.actor.firstName} {log.actor.lastName}</div>
                         <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{log.actor.role.replace('_', ' ')}</div>
                      </td>
                      <td className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         {log.entityType} <span className="text-slate-200">#</span>{log.entityId.slice(0, 6)}
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}

function ReportStat({ value, label, sub }: any) {
  return (
    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-50 group hover:bg-white hover:shadow-md hover:shadow-blue-900/5 transition-all">
       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
       <p className="text-xl font-black text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">{value}</p>
       <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-2">{sub}</p>
    </div>
  );
}
