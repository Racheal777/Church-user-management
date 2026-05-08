import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Globe, 
  Plus, 
  Search, 
  Users, 
  Edit3, 
  Trash2, 
  X, 
  ChevronRight, 
  Palette,
  LayoutGrid,
  Activity,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { Loader } from "../../components/Loader";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import clsx from "clsx";

export function TeamsPage() {
  const { accessToken } = useAuth();
  const toast = useToast();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#1e40af");
  const [searchTerm, setSearchTerm] = useState("");

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: () => api.listTeams()
  });

  const filteredTeams = teamsQuery.data?.teams.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  async function handleSaveTeam() {
    if (!accessToken) return;
    try {
      if (editingTeam) {
        await api.updateTeam(editingTeam.id, { name, color }, accessToken);
        toast.success({ title: "Updated!", description: "Team details saved." });
      } else {
        await api.createTeam({ name, color }, accessToken);
        toast.success({ title: "Created!", description: "New team is active." });
      }
      setName("");
      setColor("#1e40af");
      setEditingTeam(null);
      setIsDrawerOpen(false);
      await teamsQuery.refetch();
    } catch (error) {
      toast.error({ title: "Failed", description: "Action could not be completed." });
    }
  }

  function openCreate() {
    setEditingTeam(null);
    setName("");
    setColor("#1e40af");
    setIsDrawerOpen(true);
  }

  function openEdit(team: any) {
    setEditingTeam(team);
    setName(team.name);
    setColor(team.color);
    setIsDrawerOpen(true);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Fellowship Teams</h1>
          <p className="text-slate-500 text-sm font-medium">Organize and manage youth fellowship groups.</p>
        </div>
        <button 
          onClick={openCreate}
          className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-md shadow-blue-900/5 text-xs uppercase tracking-widest active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Create New Team
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <TeamStatCard icon={Globe} label="Total Teams" value={teamsQuery.data?.teams.length ?? 0} color="bg-blue-50 text-blue-700" />
         <TeamStatCard icon={Users} label="Members Assigned" value={teamsQuery.data?.teams.reduce((acc, t) => acc + t.memberCount, 0) ?? 0} color="bg-emerald-50 text-emerald-700" />
         <TeamStatCard icon={Activity} label="Most Active" value={teamsQuery.data?.teams.sort((a, b) => b.memberCount - a.memberCount)[0]?.name ?? 'None'} color="bg-amber-50 text-amber-700" />
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100">
         <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
            <h3 className="font-bold text-xs uppercase tracking-[0.25em] text-slate-400">Manage Units</h3>
            <div className="relative w-full md:w-80">
               <Search className="w-4 h-4 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
               <input 
                 className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" 
                 placeholder="Search teams..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
         </div>

         {teamsQuery.isLoading ? (
           <div className="py-20 flex flex-col items-center justify-center">
              <Loader label="Synchronizing teams..." />
           </div>
         ) : (
           <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTeams.map((team) => (
                <TeamCard key={team.id} team={team} onEdit={() => openEdit(team)} />
              ))}
              <button 
                onClick={openCreate}
                className="aspect-square rounded-xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-4 text-slate-300 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50/10 transition-all group"
              >
                 <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-[0.25em]">Add Unit</span>
              </button>
           </div>
         )}
      </div>

      {/* Create/Edit Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-[60] shadow-lg flex flex-col p-10 overflow-y-auto no-scrollbar"
            >
               <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700">
                        <Palette className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{editingTeam ? 'Edit Team' : 'New Team'}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configuration</p>
                     </div>
                  </div>
                  <button onClick={() => setIsDrawerOpen(false)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all">
                     <X className="w-5 h-5" />
                  </button>
               </div>

               <div className="space-y-8 flex-1">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Team Identity Name</label>
                     <input 
                       className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-900"
                       placeholder="e.g. Welfare Unit"
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                     />
                  </div>

                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Theme Color</label>
                     <div className="flex items-center gap-4">
                        <input 
                          type="color"
                          className="w-14 h-14 rounded-2xl border-none p-1 cursor-pointer bg-slate-50 shadow-sm"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                        />
                        <div className="flex-1 px-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                           {color}
                        </div>
                     </div>
                  </div>

                  <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg shadow-blue-900/10">
                     <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[60px] opacity-40" style={{ backgroundColor: color }}></div>
                     <p className="text-[10px] font-black text-blue-100/10 uppercase tracking-widest mb-4">Preview Badge</p>
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: color }}>
                           <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                           <h4 className="text-xl font-bold tracking-tight">{name || 'New Unit'}</h4>
                           <p className="text-[9px] font-black uppercase tracking-widest text-blue-100/60">0 Members</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="pt-10 mt-auto border-t border-slate-50 flex gap-4">
                  <button onClick={() => setIsDrawerOpen(false)} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all">Cancel</button>
                  <button 
                    onClick={handleSaveTeam}
                    className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all shadow-md shadow-blue-900/5 flex items-center justify-center gap-2"
                    disabled={!name}
                  >
                    {editingTeam ? 'Save Changes' : 'Create Team'}
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

function TeamStatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4 group hover:border-blue-100 transition-all">
       <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", color)}>
          <Icon className="w-6 h-6" />
       </div>
       <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-xl font-black text-slate-900 tracking-tight">{value}</p>
       </div>
    </div>
  );
}

function TeamCard({ team, onEdit }: any) {
  return (
    <div className="aspect-square bg-white rounded-xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between group hover:border-blue-100 hover:shadow-md hover:shadow-blue-900/5 transition-all relative overflow-hidden">
       <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-[40px] opacity-10 group-hover:opacity-30 transition-opacity" style={{ backgroundColor: team.color }}></div>
       
       <div className="flex justify-between items-start">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform" style={{ backgroundColor: team.color }}>
             <Globe className="w-6 h-6 text-white" />
          </div>
          <button 
            onClick={onEdit}
            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-blue-50 hover:text-blue-700 transition-all opacity-0 group-hover:opacity-100"
          >
             <Edit3 className="w-4 h-4" />
          </button>
       </div>

       <div>
          <h4 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">{team.name}</h4>
          <div className="flex items-center gap-2 mt-2">
             <Users className="w-3.5 h-3.5 text-slate-300" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{team.memberCount} Members</span>
          </div>
       </div>

       <div className="absolute bottom-6 right-8 text-slate-100 group-hover:text-slate-200 transition-colors">
          <ChevronRight className="w-6 h-6" />
       </div>
    </div>
  );
}
