import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import clsx from "clsx";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { 
  Home, 
  Users, 
  Zap, 
  CreditCard, 
  User, 
  Settings,
  LogOut
} from "lucide-react";

import { useAuth } from "../providers/AuthContext";
import { useToast } from "../providers/ToastProvider";
import { api } from "../lib/api";

export function AppShell() {
  const { member, logout, accessToken } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navItems = buildNavItems(Boolean(member?.permissions.canManageFinance));

  const activeSessionQuery = useQuery({
    queryKey: ["active-session-nav"],
    queryFn: () => api.getActiveAttendanceSession(accessToken!),
    enabled: Boolean(accessToken && member),
    refetchInterval: 60000
  });

  const isMonday = new Date().getDay() === 1;
  const isSessionActive = activeSessionQuery.data?.isActive;

  async function handleLogout() {
    await logout();
    toast.info({
      title: "Signed out",
      description: "You have been logged out of your youth account."
    });
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      <header className="sticky top-0 z-20 bg-white/80 px-4 py-4 backdrop-blur-xl border-b border-slate-100">
        <motion.div
          className="mx-auto flex max-w-6xl items-center justify-between gap-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="h-10 w-10 overflow-hidden rounded-xl bg-white shadow-sm border border-slate-100 group-hover:scale-105 transition-transform">
                <img src="/logo.png" alt="YPG" className="h-full w-full object-contain p-1" />
              </div>
              <div className="hidden sm:block">
                <span className="block font-black text-lg text-slate-900 leading-none">YPG</span>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Service All The Way</span>
              </div>
            </Link>
          </div>

          {member && (
            <nav className="hidden items-center gap-1 md:flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
              {navItems.map((item) => (
                <NavLink 
                  key={item.to} 
                  to={item.to} 
                  className={({ isActive }) => clsx(
                    "relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                    isActive 
                      ? "bg-white text-[#1a56db] shadow-sm cursor-default" 
                      : "text-slate-500 hover:text-slate-900 cursor-pointer"
                  )}
                >
                  {item.icon}
                  {item.label}
                  {item.to === "/check-in" && isMonday && isSessionActive && (
                    <span className="absolute -right-1 -top-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3">
            {member ? (
              <div className="flex items-center gap-2">
                <Link to="/profile" className="flex items-center gap-3 rounded-full bg-slate-50 pl-1 pr-4 py-1 border border-slate-100 hover:bg-slate-100 transition-colors">
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-white shadow-sm border border-slate-200">
                    {member.profilePhotoUrl ? (
                      <img src={member.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-[#1a56db]">
                        {member.firstName[0]}{member.lastName[0]}
                      </div>
                    )}
                  </div>
                  <span className="hidden lg:block text-xs font-bold text-slate-700">{member.firstName}</span>
                </Link>
                <button
                  onClick={() => void handleLogout()}
                  className="h-10 w-10 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link
                className="inline-flex h-11 items-center rounded-xl bg-[#1a56db] px-6 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all"
                to="/login"
              >
                Login
              </Link>
            )}
          </div>
        </motion.div>
      </header>

      <main className={clsx(
        "mx-auto max-w-6xl px-4 py-6 pb-32 md:pb-6",
        location.pathname === "/" ? "pt-4" : "pt-8"
      )}>
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      {member && (
        <nav className="fixed inset-x-0 bottom-0 z-30 px-4 pb-6 pt-2 md:hidden">
          <div className="mx-auto flex max-w-md items-center justify-around gap-1 rounded-[2rem] border border-slate-100 bg-white/95 p-2 shadow-2xl backdrop-blur-xl">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => clsx(
                  "relative flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-all flex-1",
                  isActive ? "bg-slate-50 text-[#1a56db]" : "text-slate-400"
                )}
              >
                <div className={clsx(
                  "transition-all duration-300",
                  item.to === "/check-in" && isMonday && isSessionActive && "animate-bounce"
                )}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                
                {item.to === "/check-in" && isMonday && isSessionActive && (
                  <span className="absolute right-4 top-3 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

function buildNavItems(canManageFinance: boolean) {
  const items = [
    { to: "/", label: "Home", icon: <Home className="h-5 w-5" /> },
    { to: "/directory", label: "Directory", icon: <Users className="h-5 w-5" /> },
    { to: "/check-in", label: "Check In", icon: <Zap className="h-5 w-5" /> },
    { to: "/my-dues", label: "Dues", icon: <CreditCard className="h-5 w-5" /> }
  ];

  if (canManageFinance) {
    items.push({ to: "/manage-dues", label: "Admin", icon: <Settings className="h-5 w-5" /> });
    items.push({ to: "/teams", label: "Teams", icon: <Users className="h-5 w-5" /> });
  }

  return items;
}
