import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle,
  Calendar,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthContext";
import clsx from "clsx";

export function AttendanceHistoryPage() {
  const { accessToken, member } = useAuth();

  const historyQuery = useQuery({
    queryKey: ["attendance-history", member?.id],
    queryFn: () => api.getAttendanceHistory(member!.id, accessToken!),
    enabled: Boolean(member && accessToken)
  });

  const history = historyQuery.data?.history ?? [];

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 px-2">
        <Link to="/" className="grid h-10 w-10 place-items-center rounded-full bg-white border border-slate-100 text-slate-400 hover:text-slate-900 shadow-sm transition-all">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Attendance History</h1>
      </div>

      <div className="space-y-3 px-2">
        {historyQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-50" />)}
          </div>
        ) : history.length ? (
          history.map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-4">
                <div className={clsx(
                  "grid h-10 w-10 place-items-center rounded-xl",
                  item.status === "present" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                )}>
                  {item.status === "present" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-bold text-slate-900">
                    {new Date(item.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Clock className="h-3 w-3" />
                    {item.status === "present" ? "Present" : "Absent"}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center space-y-4">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <Calendar className="h-8 w-8 text-slate-200" />
             </div>
             <p className="text-slate-400 font-medium">No attendance records yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
