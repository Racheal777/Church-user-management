import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  Users, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Target,
  FolderClock,
  CreditCard,
  ChevronRight,
  Calendar,
  Bell,
  Briefcase,
  Church,
  Heart
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { api, type Announcement, type Member } from "../../lib/api";
import { calculateProfileCompletion } from "../../lib/display";
import { useAuth } from "../../providers/AuthContext";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

// --- Constants & Helpers ---

const VERSES = [
  { text: "For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.", ref: "Jeremiah 29:11" },
  { text: "And we know that for those who love God all things work together for good, for those who are called according to his purpose.", ref: "Romans 8:28" },
  { text: "I can do all things through him who strengthens me.", ref: "Philippians 4:13" },
  { text: "Trust in the Lord with all your heart, and do not lean on your own understanding.", ref: "Proverbs 3:5" },
  { text: "But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.", ref: "Isaiah 40:31" },
  { text: "Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.", ref: "Isaiah 41:10" },
  { text: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  { text: "Be strong and courageous. Do not fear or be in dread of them, for it is the Lord your God who goes with you. He will not leave you or forsake you.", ref: "Deuteronomy 31:6" },
  { text: "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me.", ref: "Psalm 23:4" },
  { text: "God is our refuge and strength, a very present help in trouble.", ref: "Psalm 46:1" },
  { text: "Rejoice in the Lord always; again I will say, rejoice.", ref: "Philippians 4:4" },
  { text: "The Lord your God is in your midst, a mighty one who will save; he will rejoice over you with gladness; he will quiet you by his love; he will exult over you with loud singing.", ref: "Zephaniah 3:17" },
  { text: "Peace I leave with you; my peace I give to you. Not as the world gives do I give to you. Let not your hearts be troubled, neither let them be afraid.", ref: "John 14:27" },
  { text: "Come to me, all who labor and are heavy laden, and I will give you rest.", ref: "Matthew 11:28" },
  { text: "But seek first the kingdom of God and his righteousness, and all these things will be added to you.", ref: "Matthew 6:33" },
  { text: "Therefore do not be anxious about tomorrow, for tomorrow will be anxious for itself. Sufficient for the day is its own trouble.", ref: "Matthew 6:34" },
  { text: "Let all that you do be done in love.", ref: "1 Corinthians 16:14" },
  { text: "Blessed is the man who remains steadfast under trial, for when he has stood the test he will receive the crown of life, which God has promised to those who love him.", ref: "James 1:12" },
  { text: "If any of you lacks wisdom, let him ask God, who gives generously to all without reproach, and it will be given him.", ref: "James 1:5" },
  { text: "Every good gift and every perfect gift is from above, coming down from the Father of lights, with whom there is no variation or shadow due to change.", ref: "James 1:17" },
  { text: "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control; against such things there is no law.", ref: "Galatians 5:22-23" },
  { text: "And let us not grow weary of doing good, for in due season we will reap, if we do not give up.", ref: "Galatians 6:9" },
  { text: "Let no one despise you for your youth, but set the believers an example in speech, in conduct, in love, in faith, in purity.", ref: "1 Timothy 4:12" },
  { text: "For God gave us a spirit not of fear but of power and love and self-control.", ref: "2 Timothy 1:7" },
  { text: "Your word is a lamp to my feet and a light to my path.", ref: "Psalm 119:105" },
  { text: "The name of the Lord is a strong tower; the righteous man runs into it and is safe.", ref: "Proverbs 18:10" },
  { text: "As iron sharpens iron, so one person sharpens another.", ref: "Proverbs 27:17" },
  { text: "He has told you, O man, what is good; and what does the Lord require of you but to do justice, and to love kindness, and to walk humbly with your God?", ref: "Micah 6:8" },
  { text: "Behold, I stand at the door and knock. If anyone hears my voice and opens the door, I will come in to him and eat with him, and he with me.", ref: "Revelation 3:20" },
  { text: "He will wipe away every tear from their eyes, and death shall be no more, neither shall there be mourning, nor crying, nor pain anymore, for the former things have passed away.", ref: "Revelation 21:4" },
  { text: "Give thanks to the Lord, for he is good, for his steadfast love endures forever.", ref: "Psalm 136:1" },
  { text: "Create in me a clean heart, O God, and renew a right spirit within me.", ref: "Psalm 51:10" },
  { text: "O taste and see that the Lord is good! Blessed is the man who takes refuge in him!", ref: "Psalm 34:8" },
  { text: "The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning; great is your faithfulness.", ref: "Lamentations 3:22-23" },
  { text: "Wait for the Lord; be strong, and let your heart take courage; wait for the Lord!", ref: "Psalm 27:14" },
  { text: "Make a joyful noise to the Lord, all the earth! Serve the Lord with gladness! Come into his presence with singing!", ref: "Psalm 100:1-2" },
  { text: "Cast all your anxiety on him because he cares for you.", ref: "1 Peter 5:7" },
  { text: "Keep your heart with all vigilance, for from it flow the springs of life.", ref: "Proverbs 4:23" },
  { text: "A joyful heart is good medicine, but a crushed spirit dries up the bones.", ref: "Proverbs 17:22" },
  { text: "But grow in the grace and knowledge of our Lord and Savior Jesus Christ. To him be the glory both now and to the day of eternity. Amen.", ref: "2 Peter 3:18" },
  { text: "I have stored up your word in my heart, that I might not sin against you.", ref: "Psalm 119:11" },
  { text: "Commit your work to the Lord, and your plans will be established.", ref: "Proverbs 16:3" },
  { text: "Gracious words are like a honeycomb, sweetness to the soul and health to the body.", ref: "Proverbs 16:24" },
  { text: "The Lord is near to the brokenhearted and saves the crushed in spirit.", ref: "Psalm 34:18" },
  { text: "Delight yourself in the Lord, and he will give you the desires of your heart.", ref: "Psalm 37:4" },
  { text: "In all your ways acknowledge him, and he will make straight your paths.", ref: "Proverbs 3:6" },
  { text: "Greater love has no one than this, that someone lay down his life for his friends.", ref: "John 15:13" },
  { text: "And above all these put on love, which binds everything together in perfect harmony.", ref: "Colossians 3:14" },
  { text: "Whatever you do, work heartily, as for the Lord and not for men.", ref: "Colossians 3:23" },
  { text: "So whether you eat or drink, or whatever you do, do all to the glory of God.", ref: "1 Corinthians 10:31" },
  { text: "Finally, brothers, whatever is true, whatever is honorable, whatever is just, whatever is pure, whatever is lovely, whatever is commendable, if there is any excellence, if there is anything worthy of praise, think about these things.", ref: "Philippians 4:8" },
  { text: "The grace of the Lord Jesus Christ and the love of God and the fellowship of the Holy Spirit be with you all.", ref: "2 Corinthians 13:14" }
];

function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function isBirthday(dobString: string | null | undefined) {
  if (!dobString) return false;
  const dob = new Date(dobString);
  const now = new Date();
  return dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate();
}

// --- Main Component ---

export function MemberDashboard() {
  const { member, accessToken } = useAuth();
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [announcementFilter, setAnnouncementFilter] = useState<string>("All");

  const activeSessionQuery = useQuery({
    queryKey: ["active-session"],
    queryFn: () => api.getActiveAttendanceSession(accessToken!),
    enabled: Boolean(accessToken),
    refetchInterval: 30000
  });

  const attendanceHistoryQuery = useQuery({
    queryKey: ["attendance-history", member?.id],
    queryFn: () => api.getAttendanceHistory(member!.id, accessToken!),
    enabled: Boolean(member && accessToken)
  });

  const memberDuesQuery = useQuery({
    queryKey: ["dues", member?.id],
    queryFn: () => api.getDues(accessToken!),
    enabled: Boolean(member && accessToken)
  });

  const birthdaysQuery = useQuery({
    queryKey: ["birthdays-this-week"],
    queryFn: () => api.getBirthdaysThisWeek(accessToken!),
    enabled: Boolean(accessToken)
  });

  const announcementsQuery = useQuery({
    queryKey: ["announcements", announcementFilter],
    queryFn: () => api.getAnnouncements(announcementFilter === "All" ? undefined : announcementFilter.toLowerCase(), accessToken),
    enabled: Boolean(accessToken)
  });

  useEffect(() => {
    if (member && isBirthday(member.dateOfBirth)) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#1a56db", "#ef4444", "#ffffff"]
      });
    }
  }, [member]);

  if (!member) return null;

  const history = attendanceHistoryQuery.data?.history ?? [];
  let streak = 0;
  for (const item of history) {
    if (item.status === "present") streak += 1;
    else break;
  }

  const totalWeeks = memberDuesQuery.data?.summary.totalWeeks ?? 0;
  const paidWeeks = memberDuesQuery.data?.summary.weeksPaid ?? 0;
  const duesProgress = totalWeeks ? Math.round((paidWeeks / totalWeeks) * 100) : 0;
  
  const isMonday = new Date().getDay() === 1;
  const activeSession = activeSessionQuery.data;

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. Greeting Section */}
      <section className={clsx(
        "relative overflow-hidden rounded-[2rem] border bg-white p-6 shadow-[var(--shadow-soft)] transition-all",
        isBirthday(member.dateOfBirth) ? "border-amber-200 shadow-[0_0_30px_rgba(251,191,36,0.15)]" : "border-slate-100"
      )}>
        {isBirthday(member.dateOfBirth) && (
          <div className="absolute -right-4 -top-4 text-4xl opacity-20 rotate-12">🎂</div>
        )}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              {isBirthday(member.dateOfBirth) ? `Happy Birthday, ${member.firstName}! 🎂` : `Shalom, ${member.firstName} 👋`}
            </h1>
            <div className="flex -space-x-2">
              <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-[rgba(26,86,219,0.1)] text-sm font-bold text-[#1a56db]">
                {member.firstName[0]}{member.lastName[0]}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {member.team && (
              <span 
                className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
                style={{ backgroundColor: member.team.color }}
              >
                {member.team.name}
              </span>
            )}
            <span className={clsx(
              "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm",
              member.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
            )}>
              {member.isActive ? "Verified Member" : "Pending Verification"}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Bible Verse Card */}
      <BibleVerseCard />

      {/* 3. Attendance Block */}
      <section>
        {isMonday ? (
          activeSession?.isActive ? (
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="group relative overflow-hidden rounded-[2rem] bg-[#1a56db] p-8 text-white shadow-xl shadow-blue-900/20"
            >
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-3xl transition-transform group-hover:scale-125" />
              <div className="relative z-10 space-y-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">It's meeting time!</h2>
                  <p className="text-blue-100 font-medium text-sm">Session is live — check in now</p>
                </div>
                <Link 
                  to="/check-in" 
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-4 text-sm font-black uppercase tracking-widest text-[#1a56db] transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
                >
                  <Zap className="h-5 w-5 fill-current" />
                  CHECK IN NOW
                </Link>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Meeting day 📅</h2>
                  <p className="text-xs text-slate-500 font-medium">Session hasn't started yet. Check back soon.</p>
                </div>
              </div>
            </div>
          )
        ) : (
          <Link to="/attendance-history" className="block group">
            <div className="flex items-center justify-between rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[var(--shadow-soft)] transition-all hover:border-blue-100 hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
                  <Zap className="h-6 w-6 fill-current" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">🔥 {streak} weeks in a row</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Last seen: {history[0]?.date ? new Date(history[0].date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : "Not yet check in"}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        )}
      </section>

      {/* 4. Announcements Feed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Announcements</h2>
          <Link to="/announcements" className="text-xs font-bold text-[#1a56db] flex items-center gap-1">
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto px-1 pb-2">
          {["All", "Event", "Notice", "Vacancy", "Program"].map((filter) => (
            <button
              key={filter}
              onClick={() => setAnnouncementFilter(filter)}
              className={clsx(
                "whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all",
                announcementFilter === filter 
                  ? "bg-[#1a56db] text-white shadow-md shadow-blue-900/20" 
                  : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"
              )}
            >
              {filter === "Event" ? "📅 " : filter === "Notice" ? "📢 " : filter === "Vacancy" ? "💼 " : filter === "Program" ? "🙏 " : ""}
              {filter === "All" ? "All" : filter}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {announcementsQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-[1.5rem] bg-slate-50" />)}
            </div>
          ) : announcementsQuery.data?.announcements.length ? (
            announcementsQuery.data.announcements.slice(0, 3).map((announcement) => (
              <button
                key={announcement.id}
                onClick={() => setSelectedAnnouncement(announcement)}
                className="w-full text-left group flex flex-col gap-3 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-[var(--shadow-soft)] transition-all hover:border-blue-100 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className={clsx(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    announcement.category === "event" ? "bg-blue-50 text-blue-700" :
                    announcement.category === "notice" ? "bg-amber-50 text-amber-700" :
                    announcement.category === "vacancy" ? "bg-purple-50 text-purple-700" :
                    "bg-emerald-50 text-emerald-700"
                  )}>
                    {announcement.category === "event" ? "📅 Event" :
                     announcement.category === "notice" ? "📢 Notice" :
                     announcement.category === "vacancy" ? "💼 Vacancy" :
                     "🙏 Program"}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 group-hover:text-[#1a56db] transition-colors">{announcement.title}</h3>
                {announcement.event_date && (
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {new Date(announcement.event_date).toLocaleDateString()}
                  </p>
                )}
              </button>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <p className="text-sm font-medium text-slate-400">Nothing posted yet. Check back after Sunday service 🙏</p>
            </div>
          )}
        </div>
      </section>

      {/* 5. Upcoming Birthdays Section */}
      {birthdaysQuery.data?.members.length ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Birthdays This Week 🎂</h2>
            <Link to="/birthdays" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">View All</Link>
          </div>
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-1 pb-4">
            {birthdaysQuery.data.members.map((m) => (
              <div key={m.id} className="flex flex-none flex-col items-center gap-2">
                <div className="relative">
                  <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white shadow-md">
                    {m.profilePhotoUrl ? (
                      <img src={m.profilePhotoUrl} alt={m.firstName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-blue-50 text-lg font-bold text-[#1a56db]">
                        {m.firstName[0]}{m.lastName[0]}
                      </div>
                    )}
                  </div>
                  {isBirthday(m.dateOfBirth) && (
                    <div className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-white shadow-sm">
                      <span className="text-xs">🎂</span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-900">{m.firstName}</p>
                  <p className="text-[10px] font-medium text-slate-400">
                    {new Date(m.dateOfBirth!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 6. Compact Stats Strip */}
      <section className="grid grid-cols-2 gap-4">
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Week Streak</span>
              <Activity className="h-3 w-3 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">{streak}</span>
              <span className="text-[10px] font-bold text-slate-500">weeks</span>
            </div>
            <p className={clsx(
              "text-[10px] font-bold uppercase tracking-wider mt-1",
              streak >= 3 ? "text-orange-500" : "text-slate-400"
            )}>
              {streak >= 3 ? "🔥 You're on fire!" : "Keep showing up!"}
            </p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dues Progress</span>
              <Target className="h-3 w-3 text-blue-500" />
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div 
                className="h-full bg-[#1a56db] transition-all duration-1000" 
                style={{ width: `${duesProgress}%` }} 
              />
            </div>
            <p className="mt-2 text-[10px] font-bold text-slate-900">
              {paidWeeks} / {totalWeeks} <span className="text-slate-400">weeks settled</span>
            </p>
          </div>
        </div>
      </section>

      {/* 7. Sticky Bottom Nav logic is in AppShell.tsx, but I'll add the pulsing check-in here for dashboard context if needed */}

      {/* Announcement Detail Modal */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 sm:items-center"
            onClick={() => setSelectedAnnouncement(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                   <span className={clsx(
                    "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                    selectedAnnouncement.category === "event" ? "bg-blue-50 text-blue-700" :
                    selectedAnnouncement.category === "notice" ? "bg-amber-50 text-amber-700" :
                    selectedAnnouncement.category === "vacancy" ? "bg-purple-50 text-purple-700" :
                    "bg-emerald-50 text-emerald-700"
                  )}>
                    {selectedAnnouncement.category === "event" ? "📅 Event" :
                     selectedAnnouncement.category === "notice" ? "📢 Notice" :
                     selectedAnnouncement.category === "vacancy" ? "💼 Vacancy" :
                     "🙏 Program"}
                  </span>
                  <button onClick={() => setSelectedAnnouncement(null)} className="text-slate-400 hover:text-slate-600">
                    <ChevronRight className="h-6 w-6 rotate-90" />
                  </button>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">{selectedAnnouncement.title}</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Posted on {new Date(selectedAnnouncement.created_at).toLocaleDateString()} by {selectedAnnouncement.postedBy.first_name}
                  </p>
                </div>

                <div className="prose prose-slate max-h-[40vh] overflow-y-auto text-sm leading-relaxed text-slate-600">
                  {selectedAnnouncement.body}
                </div>

                {(selectedAnnouncement.event_date || selectedAnnouncement.venue) && (
                  <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
                    {selectedAnnouncement.event_date && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date & Time</p>
                          <p className="text-xs font-bold text-slate-900">
                            {new Date(selectedAnnouncement.event_date).toLocaleDateString()} {selectedAnnouncement.event_time ? `@ ${selectedAnnouncement.event_time}` : ""}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedAnnouncement.venue && (
                      <div className="flex items-center gap-3">
                        <Church className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Venue</p>
                          <p className="text-xs font-bold text-slate-900">{selectedAnnouncement.venue}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button 
                  onClick={() => setSelectedAnnouncement(null)}
                  className="w-full rounded-2xl bg-slate-900 py-4 text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-lg"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---

function BibleVerseCard() {
  const weekNumber = useMemo(() => getISOWeek(new Date()), []);
  const verseIndex = (weekNumber - 1) % VERSES.length;
  const verse = VERSES[verseIndex];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative overflow-hidden rounded-[1.5rem] border border-slate-100 bg-gradient-to-br from-white to-blue-50/30 p-5 shadow-[var(--shadow-soft)]"
    >
      <div className="absolute -left-2 -top-2 text-2xl opacity-5">📖</div>
      <div className="relative z-10 flex flex-col gap-3">
        <p className="italic text-sm font-medium text-slate-600 leading-relaxed">
          "{verse.text}"
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">— {verse.ref}</span>
          <Heart className="h-3 w-3 text-red-300" />
        </div>
      </div>
    </motion.div>
  );
}
