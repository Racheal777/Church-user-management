import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Edit3,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  X,
  UserPlus,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

import { Loader } from "../../components/Loader";
import { api, type Member, type Role, type AttendanceHistoryItem, type DuesLedgerItem } from "../../lib/api";
import { useAuth } from "../../providers/AuthContext";
import { useToast } from "../../providers/ToastProvider";

const blankForm = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  email: "",
  whatsappNumber: "",
  location: "",
  notes: "",
  dateOfBirth: "",
  role: "member" as Role,
  teamId: "",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const memberQuery = useQuery({
    queryKey: ["member", id],
    queryFn: () => api.getMember(id!, accessToken!),
    enabled: Boolean(id && accessToken),
  });

  const attendanceQuery = useQuery({
    queryKey: ["member-attendance", id],
    queryFn: () => api.getAttendanceHistory(id!, accessToken!),
    enabled: Boolean(id && accessToken),
  });

  const duesQuery = useQuery({
    queryKey: ["member-dues", id],
    queryFn: () => api.getMemberDues(id!, accessToken!),
    enabled: Boolean(id && accessToken),
  });

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: () => api.listTeams(),
  });

  const member = memberQuery.data?.member;

  useEffect(() => {
    if (!member) return;
    setForm({
      firstName: member.firstName,
      lastName: member.lastName,
      phoneNumber: member.phoneNumber ?? "",
      email: member.email ?? "",
      whatsappNumber: member.whatsappNumber ?? "",
      location: member.location ?? "",
      notes: member.notes ?? "",
      dateOfBirth: member.dateOfBirth?.slice(0, 10) ?? "",
      role: member.role,
      teamId: member.team?.id ?? "",
    });
  }, [member]);

  async function saveUpdate() {
    if (!accessToken || !id) return;
    try {
      await api.updateMember(
        id,
        {
          ...form,
          teamId: form.teamId || null,
          email: form.email || null,
          whatsappNumber: form.whatsappNumber || null,
          location: form.location || null,
          notes: form.notes || null,
          dateOfBirth: form.dateOfBirth || null,
        },
        accessToken
      );
      toast.success({ title: "Saved", description: "Member profile updated." });
      setIsEditOpen(false);
      await memberQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["members-admin-list"] });
    } catch (err) {
      toast.error({ title: "Error", description: err instanceof Error ? err.message : "Update failed." });
    }
  }

  async function handleDeactivate() {
    if (!accessToken || !id) return;
    try {
      await api.deactivateMember(id, accessToken);
      toast.info({ title: "Deactivated", description: "Member has been deactivated." });
      await queryClient.invalidateQueries({ queryKey: ["members-admin-list"] });
      navigate("/members");
    } catch (err) {
      toast.error({ title: "Error", description: err instanceof Error ? err.message : "Action failed." });
    }
  }

  if (memberQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader label="Loading member..." />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24">
        <p className="text-slate-400 font-bold">Member not found.</p>
        <Link to="/members" className="text-blue-700 font-bold text-sm mt-4 inline-block">
          ← Back to Members
        </Link>
      </div>
    );
  }

  const initials = `${member.firstName[0]}${member.lastName[0]}`;
  const attendanceHistory: AttendanceHistoryItem[] = attendanceQuery.data?.history ?? [];
  const presentCount = attendanceHistory.filter((h) => h.status === "present").length;
  const attendanceRate =
    attendanceHistory.length > 0 ? Math.round((presentCount / attendanceHistory.length) * 100) : 0;

  const duesLedger: DuesLedgerItem[] = duesQuery.data?.ledger ?? [];
  const duesSummary = duesQuery.data?.summary;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Back nav */}
      <Link
        to="/members"
        className="flex items-center gap-2 text-slate-400 hover:text-blue-700 transition-colors text-xs font-black uppercase tracking-widest"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Members
      </Link>

      {/* Profile header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-800 font-bold text-2xl border-2 border-white shadow-md flex-shrink-0">
          {member.profilePhotoUrl ? (
            <img src={member.profilePhotoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {member.firstName} {member.lastName}
            </h1>
            <span
              className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                member.role === "member"
                  ? "bg-slate-50 text-slate-500 border-slate-100"
                  : "bg-blue-50 text-blue-700 border-blue-100"
              )}
            >
              {member.role !== "member" && <ShieldCheck className="w-3 h-3" />}
              {member.role.replace("_", " ")}
            </span>
            <span
              className={clsx(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                member.isActive !== false ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-100"
              )}
            >
              <div
                className={clsx(
                  "w-1.5 h-1.5 rounded-full",
                  member.isActive !== false ? "bg-emerald-600" : "bg-slate-400"
                )}
              />
              {member.isActive !== false ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
            {member.phoneNumber && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> {member.phoneNumber}
              </span>
            )}
            {member.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> {member.email}
              </span>
            )}
            {member.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> {member.location}
              </span>
            )}
            {member.team && (
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: member.team.color }} />
                {member.team.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-blue-900/10 active:scale-95"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black uppercase tracking-widest transition-all border border-red-100 active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            Deactivate
          </button>
        </div>
      </div>

      {/* Details + stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal details */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-700 inline-block" />
            Personal Details
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <Detail label="Date of Birth" value={formatDate(member.dateOfBirth)} />
            <Detail label="Marital Status" value={member.maritalStatus ?? "—"} />
            <Detail label="Date Joined" value={formatDate(member.dateJoined)} />
            <Detail label="WhatsApp" value={member.whatsappNumber ?? "—"} />
          </div>
          {member.notes && (
            <div className="pt-4 border-t border-slate-50">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Notes</p>
              <p className="text-sm text-slate-600 leading-relaxed">{member.notes}</p>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Attendance Rate</p>
            <p className="text-3xl font-bold text-slate-900">{attendanceRate}%</p>
            <p className="text-[10px] font-bold text-slate-400">
              {presentCount} of {attendanceHistory.length} sessions
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dues Paid</p>
            <p className="text-3xl font-bold text-slate-900">
              GH₵{duesSummary ? duesSummary.totalPaid.toFixed(2) : "—"}
            </p>
            <p className="text-[10px] font-bold text-slate-400">
              {duesSummary ? `GH₵${duesSummary.totalOutstanding.toFixed(2)} outstanding` : "Loading..."}
            </p>
          </div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-700" />
            Attendance History
          </h2>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
            {attendanceHistory.length} sessions
          </span>
        </div>
        {attendanceQuery.isLoading ? (
          <div className="p-12">
            <Loader label="Loading attendance..." />
          </div>
        ) : attendanceHistory.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm font-bold">No attendance records yet.</div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attendanceHistory.slice(0, 20).map((item) => (
                  <tr key={item.sessionId} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-4 text-sm font-bold text-slate-700">{formatDate(item.date)}</td>
                    <td className="px-8 py-4">
                      {item.status === "present" ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <XCircle className="w-3.5 h-3.5" /> Absent
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {item.method ?? "—"}
                    </td>
                    <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {formatTime(item.checkInTime) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dues History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-700" />
            Dues History
          </h2>
          {duesSummary && (
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              {duesSummary.statusMessage}
            </span>
          )}
        </div>
        {duesQuery.isLoading ? (
          <div className="p-12">
            <Loader label="Loading dues..." />
          </div>
        ) : duesLedger.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm font-bold">No dues records yet.</div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paid On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {duesLedger.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-4 text-sm font-bold text-slate-700">
                      {item.monthName ?? formatDate(item.weekOf)}
                    </td>
                    <td className="px-8 py-4 text-sm font-bold text-slate-700">
                      GH₵{item.amount.toFixed(2)}
                    </td>
                    <td className="px-8 py-4">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                          item.status === "paid"
                            ? "text-emerald-600 bg-emerald-50"
                            : item.status === "advance"
                            ? "text-blue-600 bg-blue-50"
                            : "text-slate-400 bg-slate-100"
                        )}
                      >
                        <div
                          className={clsx(
                            "w-1.5 h-1.5 rounded-full",
                            item.status === "paid"
                              ? "bg-emerald-500"
                              : item.status === "advance"
                              ? "bg-blue-500"
                              : "bg-slate-300"
                          )}
                        />
                        {item.status}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {item.method ?? "—"}
                    </td>
                    <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {formatDate(item.paymentDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit drawer */}
      <AnimatePresence>
        {isEditOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditOpen(false)}
              className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-white z-50 shadow-lg flex flex-col p-10 overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700">
                    <Edit3 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Member</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {member.firstName} {member.lastName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-8 flex-1">
                <div className="space-y-6">
                  <SectionLabel>Identity</SectionLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="First Name">
                      <input className={inputCls} placeholder="John" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
                    </Field>
                    <Field label="Last Name">
                      <input className={inputCls} placeholder="Doe" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
                    </Field>
                  </div>
                  <Field label="Date of Birth">
                    <input className={inputCls} type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
                  </Field>
                </div>

                <div className="space-y-6">
                  <SectionLabel>Communication</SectionLabel>
                  <Field label="Phone Number">
                    <input className={inputCls} placeholder="+233..." value={form.phoneNumber} onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} />
                  </Field>
                  <Field label="Email (Optional)">
                    <input className={inputCls} placeholder="email@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </Field>
                  <Field label="WhatsApp (Optional)">
                    <input className={inputCls} placeholder="+233..." value={form.whatsappNumber} onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))} />
                  </Field>
                  <Field label="Location">
                    <input className={inputCls} placeholder="Area or residence" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
                  </Field>
                </div>

                <div className="space-y-6">
                  <SectionLabel>Fellowship Status</SectionLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Role">
                      <select className={inputCls} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
                        <option value="member">Member</option>
                        <option value="team_lead">Team Lead</option>
                        <option value="secretary">Secretary</option>
                        <option value="financial_secretary">Financial Secretary</option>
                        <option value="vice_president">Vice President</option>
                        <option value="president">President</option>
                      </select>
                    </Field>
                    <Field label="Team">
                      <select className={inputCls} value={form.teamId} onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value }))}>
                        <option value="">No team</option>
                        {teamsQuery.data?.teams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Notes">
                    <textarea
                      className={clsx(inputCls, "min-h-28 resize-none")}
                      placeholder="Pastoral notes..."
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </Field>
                </div>
              </div>

              <div className="pt-10 mt-auto border-t border-slate-50 flex gap-4">
                <button onClick={() => setIsEditOpen(false)} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all">
                  Cancel
                </button>
                <button onClick={() => void saveUpdate()} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all shadow-md shadow-blue-900/5 flex items-center justify-center gap-2">
                  Save Changes
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Deactivate confirm modal */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
            >
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 max-w-sm w-full space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Deactivate Member</h3>
                    <p className="text-sm text-slate-400 font-medium">This action can be reversed later.</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  Are you sure you want to deactivate <strong>{member.firstName} {member.lastName}</strong>? They will no longer appear as active in the fellowship.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 rounded-xl bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                    Cancel
                  </button>
                  <button onClick={() => void handleDeactivate()} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest transition-all">
                    Deactivate
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-700 capitalize">{value}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-700 inline-block" />
      {children}
    </h4>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700 appearance-none";
