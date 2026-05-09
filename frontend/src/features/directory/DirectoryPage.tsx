import { useDeferredValue, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronLeft, ShieldCheck, Crown, Star, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { api, type Member } from "../../lib/api";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

// Helper to generate a soft background color from a string
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 70%, 90%)`;
}

const LEADERSHIP_ROLES = ["president", "vice_president", "secretary", "financial_secretary"];

export function DirectoryPage() {
  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState<string | undefined>(undefined);
  const deferredSearch = useDeferredValue(search);

  const teamsQuery = useQuery({ queryKey: ["teams"], queryFn: () => api.listTeams() });
  const directoryQuery = useQuery({
    queryKey: ["directory", deferredSearch, teamId],
    queryFn: () => api.listMembers({ search: deferredSearch || undefined, teamId })
  });

  const members = directoryQuery.data?.members || [];

  // Grouping logic
  const { leaders, teamGroups } = useMemo(() => {
    const isSearching = deferredSearch.length >= 2;
    
    if (isSearching) {
      return { leaders: [], teamGroups: [] };
    }

    const leaders = members.filter(m => LEADERSHIP_ROLES.includes(m.role));
    const nonLeaders = members.filter(m => !LEADERSHIP_ROLES.includes(m.role));
    
    const groups: Record<string, { team: any; members: Member[] }> = {};
    
    // Group by team
    nonLeaders.forEach(m => {
      const tId = m.team?.id || "unassigned";
      if (!groups[tId]) {
        groups[tId] = {
          team: m.team || { name: "Unassigned", color: "#94a3b8" },
          members: []
        };
      }
      groups[tId].members.push(m);
    });

    return { 
      leaders, 
      teamGroups: Object.values(groups).sort((a, b) => a.team.name.localeCompare(b.team.name))
    };
  }, [members, deferredSearch]);

  const isSearching = deferredSearch.length >= 2;

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="px-4 lg:px-0">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-700 transition-colors mb-4 text-[10px] font-black uppercase tracking-[0.2em]">
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Member Directory</h1>
        <p className="text-slate-500 text-sm font-medium">Connect with brothers and sisters in the fellowship.</p>
      </div>

      {/* Search and Filters */}
      <div className="px-4 lg:px-0 sticky top-20 z-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-3 shadow-2xl shadow-blue-900/5 border border-white/50 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-6 py-3 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-xs font-bold text-slate-700 placeholder:text-slate-400" 
              placeholder="Search members by name or team..." 
              value={search} 
              onChange={(event) => setSearch(event.target.value)} 
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button 
              className={clsx(
                "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95",
                !teamId ? "bg-blue-700 text-white shadow-lg shadow-blue-900/10" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
              )} 
              onClick={() => setTeamId(undefined)}
            >
              All Teams
            </button>
            {teamsQuery.data?.teams.map((team) => (
              <button 
                key={team.id} 
                className={clsx(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 active:scale-95",
                  teamId === team.id ? "bg-white border-[1.5px] text-slate-900 shadow-sm" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                )}
                style={teamId === team.id ? { borderColor: team.color } : {}}
                onClick={() => setTeamId(team.id)}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                {team.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isSearching ? (
          /* Search Results View (Flat List) */
          <motion.div 
            key="search"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 px-4 lg:px-0"
          >
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">Search Results ({members.length})</h2>
            </div>
            <div className="space-y-3">
               {members.map(member => (
                 <div key={member.id} className="bg-white rounded-3xl p-4 flex items-center justify-between border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                       <Avatar member={member} size="md" />
                       <div>
                          <h4 className="font-bold text-slate-900">{member.firstName} {member.lastName}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                             <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: member.team?.color || '#94a3b8' }} />
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{member.team?.name || "Unassigned"}</span>
                          </div>
                       </div>
                    </div>
                    {member.role !== "member" && (
                       <span className="rounded-full px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                          {member.role.replace("_", " ")}
                       </span>
                    )}
                 </div>
               ))}
               {members.length === 0 && (
                 <div className="py-20 text-center space-y-4">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No members found for "{deferredSearch}"</p>
                 </div>
               )}
            </div>
          </motion.div>
        ) : (
          /* Grouped View */
          <motion.div 
            key="grouped"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-16"
          >
            {/* Leadership Section */}
            {leaders.length > 0 && (
              <section className="space-y-6">
                <div className="px-4 lg:px-0 flex items-center gap-4">
                   <h2 className="text-sm font-black uppercase tracking-[0.25em] text-amber-600 flex items-center gap-2">
                     <Crown className="w-4 h-4" />
                     Leadership
                   </h2>
                   <div className="h-px flex-1 bg-amber-100" />
                </div>
                <div className="flex overflow-x-auto no-scrollbar gap-6 px-4 lg:px-0 pb-4">
                   {leaders.map(leader => (
                     <div 
                      key={leader.id} 
                      className="shrink-0 w-48 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-3"
                     >
                        <Avatar member={leader} size="md" />
                        <div>
                           <h3 className="text-lg font-black text-slate-900 tracking-tight">{leader.firstName} {leader.lastName}</h3>
                           <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.15em] mt-1">{leader.role.replace("_", " ")}</p>
                        </div>
                     </div>
                   ))}
                </div>
              </section>
            )}

            {/* Team Sections */}
            <div className="space-y-16">
               {teamGroups.map(({ team, members }) => (
                 <section key={team.id} className="space-y-6">
                    <div className="px-4 lg:px-0 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: team.color }} />
                          <div>
                             <h3 className="text-xl font-black text-slate-900 tracking-tight">{team.name}</h3>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{members.length} members</p>
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex overflow-x-auto lg:grid lg:grid-cols-4 xl:grid-cols-6 no-scrollbar gap-4 px-4 lg:px-0 pb-4">
                       {members.map(member => (
                         <div 
                          key={member.id} 
                          className="shrink-0 lg:shrink w-28 lg:w-full bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2"
                          style={{ borderTop: `2px solid ${team.color}` }}
                         >
                            <Avatar member={member} size="md" />
                            <div className="min-w-0 w-full">
                               <h4 className="text-[11px] font-black text-slate-900 truncate px-1">
                                 {member.firstName} {member.lastName}
                               </h4>
                               {member.role !== "member" && (
                                 <p className="text-[8px] font-black text-blue-600 uppercase tracking-tighter mt-0.5">
                                   {member.role.replace("_", " ")}
                                 </p>
                               )}
                            </div>
                         </div>
                       ))}
                    </div>
                 </section>
               ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {directoryQuery.isLoading && (
        <div className="flex flex-col items-center justify-center py-40 space-y-4">
           <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-700 rounded-full animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Directory...</p>
        </div>
      )}
    </div>
  );
}

function Avatar({ member, size, ringColor }: { member: Member, size: 'md' | 'lg', ringColor?: string }) {
  const dimensions = size === 'lg' ? 'w-24 h-24' : 'w-16 h-16';
  const fontSize = size === 'lg' ? 'text-2xl' : 'text-xl';
  const bgColor = stringToColor(`${member.firstName} ${member.lastName}`);

  return (
    <div 
      className={clsx(
        dimensions,
        "rounded-full overflow-hidden flex items-center justify-center font-black shrink-0 border-4 border-white shadow-lg",
        fontSize
      )}
      style={{ backgroundColor: member.profilePhotoUrl ? undefined : bgColor, outline: ringColor ? `1.5px solid ${ringColor}` : undefined }}
    >
      {member.profilePhotoUrl ? (
        <img src={member.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-slate-700 opacity-60">
          {member.firstName[0]}{member.lastName[0]}
        </span>
      )}
    </div>
  );
}
