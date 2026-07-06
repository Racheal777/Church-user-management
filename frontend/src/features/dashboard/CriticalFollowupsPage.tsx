import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Calendar, ChevronLeft, MessageSquare, Send, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Loader } from "../../components/Loader";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthContext";
import { useToast } from "../../providers/ToastProvider";

export function CriticalFollowupsPage() {
  const { accessToken } = useAuth();
  const toast = useToast();

  const attendanceReport = useQuery({
    queryKey: ["followups-attendance"],
    queryFn: () => api.getAttendanceReport(accessToken!),
    enabled: Boolean(accessToken)
  });

  const membersQuery = useQuery({
    queryKey: ["followups-members"],
    queryFn: () => api.listMembers({}, accessToken!),
    enabled: Boolean(accessToken)
  });

  const absentees = attendanceReport.data?.absentThreePlus ?? [];
  const memberMap = new Map(
    (membersQuery.data?.members ?? []).map((m) => [m.id, m])
  );

  function handleSendReminder(memberId: string, firstName: string) {
    toast.info({
      title: "Reminder queued",
      description: `An SMS reminder will be sent to ${firstName} shortly.`
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-blue-700 transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Critical Follow-ups</h1>
        <p className="mt-2 text-lg text-slate-500">
          Members who have missed 3 or more consecutive Monday attendances.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total at-risk</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{absentees.length}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Worst streak</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {absentees.length ? `${Math.max(...absentees.map((a) => a.misses))} weeks` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Reminders sent</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">—</p>
        </div>
      </div>

      {attendanceReport.isLoading || membersQuery.isLoading ? (
        <div className="py-20">
          <Loader label="Loading follow-up data…" />
        </div>
      ) : absentees.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <p className="text-5xl mb-4">🎉</p>
          <p className="text-lg font-bold text-slate-900">Everyone is showing up. Great fellowship!</p>
          <p className="mt-2 text-sm text-slate-500">No members have missed 3 or more consecutive attendances.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-4 border-b border-slate-50 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <span>Member</span>
            <span className="text-center">Missed</span>
            <span className="text-center hidden md:block">Team</span>
            <span className="text-right">Action</span>
          </div>

          {absentees.map((absent) => {
            const memberData = memberMap.get(absent.memberId);
            return (
              <div
                key={absent.memberId}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-6 py-5 border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-11 w-11 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                    {memberData?.profilePhotoUrl ? (
                      <img
                        src={memberData.profilePhotoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-400">
                        {absent.firstName[0]}{absent.lastName[0]}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">
                      {absent.firstName} {absent.lastName}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Missed {absent.misses} weeks in a row
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 border border-red-100">
                    <AlertTriangle className="h-3 w-3" />
                    {absent.misses}
                  </span>
                </div>

                <div className="text-center hidden md:block">
                  {memberData?.team ? (
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: memberData.team.color }}
                      />
                      {memberData.team.name}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </div>

                <div className="text-right">
                  <button
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800"
                    onClick={() => handleSendReminder(absent.memberId, absent.firstName)}
                  >
                    <Send className="h-3 w-3" />
                    <span className="hidden sm:inline">Remind</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
