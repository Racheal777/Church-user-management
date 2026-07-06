import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Plus, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  ChevronLeft, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MapPin,
  ChevronRight,
  ChevronLeft as ChevronLeftIcon,
  X,
  Users,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { Loader } from "../../components/Loader";
import { api, type Member, type Role } from "../../lib/api";
import { useAuth } from "../../providers/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import clsx from "clsx";
import { StatCard } from "../dashboard/components/StatCard";

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
  teamId: ""
};

const ITEMS_PER_PAGE = 8;

export function MembersPage() {
  const { accessToken } = useAuth();
  const toast = useToast();
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);

  const membersQuery = useQuery({
    queryKey: ["members-admin-list", searchTerm, teamFilter, statusFilter],
    queryFn: () => api.listMembers({
      search: searchTerm || undefined,
      teamId: teamFilter || undefined,
      activeStatus: statusFilter
    }, accessToken!),
    enabled: Boolean(accessToken)
  });
  
  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: () => api.listTeams()
  });

  useEffect(() => {
    if (!editingMember) {
      setForm(blankForm);
      return;
    }

    setForm({
      firstName: editingMember.firstName,
      lastName: editingMember.lastName,
      phoneNumber: editingMember.phoneNumber ?? "",
      email: editingMember.email ?? "",
      whatsappNumber: editingMember.whatsappNumber ?? "",
      location: editingMember.location ?? "",
      notes: editingMember.notes ?? "",
      dateOfBirth: editingMember.dateOfBirth?.slice(0, 10) ?? "",
      role: editingMember.role,
      teamId: editingMember.team?.id ?? ""
    });
    setIsDrawerOpen(true);
  }, [editingMember]);

  async function saveMember() {
    if (!accessToken) return;
    try {
      if (editingMember) {
        await api.updateMember(
          editingMember.id,
          {
            ...form,
            teamId: form.teamId || null,
            email: form.email || null,
            whatsappNumber: form.whatsappNumber || null,
            location: form.location || null,
            notes: form.notes || null,
            dateOfBirth: form.dateOfBirth || null
          },
          accessToken
        );
      } else {
        await api.createMember(
          {
            ...form,
            teamId: form.teamId || null,
            email: form.email || null,
            whatsappNumber: form.whatsappNumber || null,
            location: form.location || null,
            notes: form.notes || null,
            dateOfBirth: form.dateOfBirth || null
          },
          accessToken
        );
      }
      toast.success({
        title: "Success",
        description: editingMember ? "Member profile updated." : "New member registered."
      });
      closeDrawer();
      await membersQuery.refetch();
    } catch (error) {
      toast.error({
        title: "Error",
        description: error instanceof Error ? error.message : "Action failed."
      });
    }
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
    setEditingMember(null);
    setForm(blankForm);
  }

  async function deactivateMember(memberId: string) {
    if (!accessToken) return;
    try {
      await api.deactivateMember(memberId, accessToken);
      toast.info({
        title: "Deactivated",
        description: "Member status updated."
      });
      await membersQuery.refetch();
    } catch (error) {
      toast.error({
        title: "Error",
        description: error instanceof Error ? error.message : "Action failed."
      });
    }
  }

  const filteredMembers = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data?.members]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / ITEMS_PER_PAGE));
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const stats = useMemo(() => {
    const members = membersQuery.data?.members || [];
    return {
      total: members.length,
      active: members.filter(m => m.isActive !== false).length,
      admins: members.filter(m => m.role !== 'member').length,
    };
  }, [membersQuery.data?.members]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-blue-700 transition-colors mb-2 text-xs font-bold uppercase tracking-widest">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Members Register</h1>
          <p className="text-slate-500 text-sm font-medium">Manage youth fellowship members and leadership roles.</p>
        </div>
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-md shadow-blue-900/5 text-sm uppercase tracking-widest active:scale-95 self-start md:self-center"
        >
          <Plus className="w-5 h-5" />
          Add New Member
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 group hover:border-blue-100 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 group-hover:scale-110 transition-transform">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Members</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 group hover:border-blue-100 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active</p>
            <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 group hover:border-blue-100 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Leadership</p>
            <p className="text-2xl font-bold text-slate-900">{stats.admins}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Table Controls */}
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6 bg-white">
          <div className="relative w-full md:w-96">
            <Search className="w-5 h-5 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2" />
            <input 
              className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" 
              placeholder="Search by name, phone or email..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <select
              value={teamFilter}
              onChange={(event) => {
                setTeamFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-500 outline-none focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="">All teams</option>
              {teamsQuery.data?.teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as "all" | "active" | "inactive");
                setCurrentPage(1);
              }}
              className="bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-500 outline-none focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="all">All status</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Showing {paginatedMembers.length} of {filteredMembers.length}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Member Information</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {membersQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="p-20"><Loader label="Loading members..." /></td>
                </tr>
              )}
              {paginatedMembers.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-800 font-bold text-base border-2 border-white shadow-sm transition-transform group-hover:scale-105">
                        {item.profilePhotoUrl ? (
                          <img src={item.profilePhotoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          `${item.firstName[0]}${item.lastName[0]}`
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">{item.firstName} {item.lastName}</h4>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                           <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {item.phoneNumber}</span>
                           <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {item.email || 'N/A'}</span>
                        </div>
                        {item.location && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <MapPin className="w-3 h-3" /> {item.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={clsx(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                      item.role === 'member' ? "bg-slate-50 text-slate-500 border-slate-100" : "bg-blue-50 text-blue-700 border-blue-100"
                    )}>
                      {item.role !== 'member' && <ShieldCheck className="w-3 h-3" />}
                      {item.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    {item.team ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.team.color }} />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{item.team.name}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <span className={clsx(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                      item.isActive !== false ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-100"
                    )}>
                      <div className={clsx("w-1.5 h-1.5 rounded-full", item.isActive !== false ? "bg-emerald-600" : "bg-slate-400")} />
                      {item.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingMember(item)}
                        className="w-9 h-9 rounded-xl bg-white border border-slate-100 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-700 hover:border-blue-100 transition-all shadow-sm active:scale-90"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => void deactivateMember(item.id)}
                        className="w-9 h-9 rounded-xl bg-white border border-slate-100 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-8 py-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/10">
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-blue-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-blue-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
               {Array.from({ length: totalPages }).map((_, i) => (
                 <button
                   key={i}
                   onClick={() => setCurrentPage(i + 1)}
                   className={clsx(
                     "w-10 h-10 rounded-xl text-xs font-black transition-all",
                     currentPage === i + 1 ? "bg-blue-700 text-white shadow-lg shadow-blue-900/10" : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-100"
                   )}
                 >
                   {i + 1}
                 </button>
               ))}
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}
      </div>

      {/* Side Drawer for Add/Edit */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
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
                    {editingMember ? <Edit3 className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{editingMember ? "Edit Member" : "New Member"}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Leadership Register</p>
                  </div>
                </div>
                <button 
                  onClick={closeDrawer}
                  className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-8 flex-1">
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-700"></span>
                    Identity
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                      <input className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700" placeholder="John" value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                      <input className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700" placeholder="Doe" value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Birth Date</label>
                    <input className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700" type="date" value={form.dateOfBirth} onChange={(event) => setForm((current) => ({ ...current, dateOfBirth: event.target.value }))} />
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-700"></span>
                    Communication
                  </h4>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                    <input className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700" placeholder="+233..." value={form.phoneNumber} onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email (Optional)</label>
                    <input className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700" placeholder="email@example.com" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp (Optional)</label>
                    <input className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700" placeholder="+233..." value={form.whatsappNumber} onChange={(event) => setForm((current) => ({ ...current, whatsappNumber: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
                    <input className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700" placeholder="Area or residence" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-700"></span>
                    Fellowship Status
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                      <select className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700 appearance-none" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as Role }))}>
                        <option value="member">Member</option>
                        <option value="team_lead">Team Lead</option>
                        <option value="secretary">Secretary</option>
                        <option value="financial_secretary">Financial Secretary</option>
                        <option value="vice_president">Vice President</option>
                        <option value="president">President</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign Team</label>
                      <select className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700 appearance-none" value={form.teamId} onChange={(event) => setForm((current) => ({ ...current, teamId: event.target.value }))}>
                        <option value="">No team assigned</option>
                        {teamsQuery.data?.teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes</label>
                    <textarea
                      className="min-h-28 w-full resize-none bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700"
                      placeholder="Pastoral care notes, follow-up context, or admin reminders"
                      value={form.notes}
                      onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-10 mt-auto border-t border-slate-50 flex gap-4">
                <button 
                  onClick={closeDrawer}
                  className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => void saveMember()}
                  className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all shadow-md shadow-blue-900/5 flex items-center justify-center gap-2"
                >
                  {editingMember ? "Update Record" : "Create Record"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
