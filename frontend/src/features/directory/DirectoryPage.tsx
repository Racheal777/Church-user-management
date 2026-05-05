import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { Loader } from "../../components/Loader";
import { api } from "../../lib/api";
import clsx from "clsx";

export function DirectoryPage() {
  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState<string | undefined>(undefined);
  const deferredSearch = useDeferredValue(search);
  const teamsQuery = useQuery({ queryKey: ["teams"], queryFn: () => api.listTeams() });
  const directoryQuery = useQuery({
    queryKey: ["directory", deferredSearch, teamId],
    queryFn: () => api.listMembers({ search: deferredSearch || undefined, teamId })
  });

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-blue-700 transition-colors mb-4 text-xs font-bold uppercase tracking-widest">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Member Directory</h1>
          <p className="text-slate-500 text-sm font-medium">Connect with brothers and sisters in the fellowship.</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-6 top-1/2 -translate-y-1/2" />
            <input 
              className="w-full bg-slate-50 border-none rounded-2xl pl-16 pr-6 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-400" 
              placeholder="Search members by name..." 
              value={search} 
              onChange={(event) => setSearch(event.target.value)} 
            />
          </div>
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            <button 
              className={clsx(
                "px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap active:scale-95",
                !teamId ? "bg-blue-700 text-white shadow-md shadow-blue-900/10" : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-transparent"
              )} 
              onClick={() => setTeamId(undefined)}
            >
              All Teams
            </button>
            {teamsQuery.data?.teams.map((team) => (
              <button 
                key={team.id} 
                className={clsx(
                  "px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap flex items-center gap-3 active:scale-95 border",
                  teamId === team.id ? "bg-white border-2 text-slate-900 shadow-sm" : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 border-transparent"
                )}
                style={teamId === team.id ? { borderColor: team.color } : {}}
                onClick={() => setTeamId(team.id)}
              >
                <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: team.color }} />
                {team.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Member Grid */}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {directoryQuery.isLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl p-10 shadow-sm border border-slate-50 animate-pulse h-64"></div>
          ))
        ) : null}
        
        {directoryQuery.data?.members.map((member) => (
          <article key={member.id} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:border-blue-200 transition-all hover:shadow-md hover:shadow-blue-900/5 group">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-blue-50 flex items-center justify-center text-2xl font-bold text-blue-800 border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-500 mb-6">
                {member.profilePhotoUrl ? (
                  <img src={member.profilePhotoUrl} alt={`${member.firstName} ${member.lastName}`} className="w-full h-full object-cover" />
                ) : (
                  `${member.firstName[0]}${member.lastName[0]}`
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-800 transition-colors tracking-tight mb-1">
                {member.firstName} {member.lastName}
              </h3>
              <p className="text-[9px] text-blue-600 font-black uppercase tracking-[0.25em] bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 mb-6">{member.role.includes("president") ? member.role.replace("_", " ") : "Youth Member"}</p>
              
              <div className="w-full pt-6 border-t border-slate-50 flex justify-center">
                {member.team ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: member.team.color }} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{member.team.name}</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest italic">Unassigned</span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      
      {!directoryQuery.isLoading && directoryQuery.data?.members.length === 0 && (
        <div className="text-center py-32 bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No records found matching your search.</p>
        </div>
      )}
    </div>
  );
}
