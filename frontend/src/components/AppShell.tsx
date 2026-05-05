import { Link, NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";

export function AppShell() {
  const { member, logout } = useAuth();
  const toast = useToast();
  const navItems = buildNavItems(Boolean(member?.permissions.canManageFinance));

  async function handleLogout() {
    await logout();
    toast.info({
      title: "Signed out",
      description: "You have been logged out of your youth account."
    });
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-slate-900">
      <header className="sticky top-0 z-20 bg-[rgba(247,246,242,0.96)] px-4 py-4 backdrop-blur">
        <motion.div
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-[1.1rem] border bg-white/96 px-4 py-3 shadow-[var(--shadow-soft)] md:grid md:grid-cols-[auto_1fr_auto] md:px-6"
          style={{ borderColor: "rgba(94,82,184,0.08)" }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex min-w-0 items-center gap-4">
            <Link
              to="/"
              className="flex min-w-0 items-center gap-3 rounded-lg px-1 py-1 transition"
            >
              <div
                className="grid h-11 w-11 flex-none place-items-center rounded-lg text-sm font-bold tracking-[0.12em] text-white shadow-sm"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                PY
              </div>
              <div className="min-w-0">
                <span className="block truncate font-display text-lg font-semibold text-[var(--color-primary)]">
                  Presby Youth
                </span>
                <span className="block truncate text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Church Youth Management
                </span>
              </div>
            </Link>
          </div>

          {member ? (
            <nav className="hidden items-center justify-center gap-7 md:flex">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className="group relative inline-flex items-center gap-2 py-2 text-sm font-medium text-slate-600 transition hover:text-[var(--color-primary)]">
                  {({ isActive }) => (
                    <>
                      <span className={clsx("hidden xl:inline-flex transition", isActive ? "text-[var(--color-primary)]" : "text-slate-400 group-hover:text-[var(--color-primary)]")}>
                        {item.icon}
                      </span>
                      <span className={clsx("transition", isActive && "text-[var(--color-primary)]")}>{item.label}</span>
                      <span
                        className={clsx(
                          "absolute inset-x-0 -bottom-1 h-[2px] rounded-full transition",
                          isActive ? "bg-[var(--color-primary)] opacity-100" : "bg-[var(--color-primary)] opacity-0 group-hover:opacity-60"
                        )}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          ) : (
            <div className="hidden md:block" />
          )}

          <div className="flex flex-none items-center gap-3 justify-self-end">
            {member ? (
              <>
                <div className="hidden items-center gap-3 rounded-full border bg-white px-2 py-2 lg:flex" style={{ borderColor: "rgba(94,82,184,0.08)" }}>
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[rgba(94,82,184,0.1)] text-sm font-semibold text-[var(--color-primary)]">
                    {member.firstName.slice(0, 1)}
                    {member.lastName.slice(0, 1)}
                  </div>
                  <div className="pr-2 text-left leading-tight">
                    <p className="text-sm font-semibold text-slate-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      {member.role.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <button
                  className="inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[rgba(187,63,74,0.22)] hover:text-[var(--color-red)]"
                  style={{ borderColor: "rgba(94,82,184,0.08)" }}
                  onClick={() => void handleLogout()}
                >
                  Log out
                </button>
              </>
            ) : (
              <Link
                className="inline-flex min-h-11 items-center rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm"
                style={{ backgroundColor: "var(--color-primary)" }}
                to="/login"
              >
                Member Login
              </Link>
            )}
          </div>
        </motion.div>
      </header>

      <main className="app-shell-main mx-auto mt-4 max-w-6xl px-4 py-6 pb-24 md:mt-6 md:pb-6">
        <Outlet />
      </main>

      {member ? (
        <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 md:hidden">
          <div
            className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-2 rounded-[1.45rem] border bg-white/98 px-3 py-2 shadow-[0_18px_40px_rgba(57,65,104,0.16)] backdrop-blur"
            style={{ borderColor: "rgba(94,82,184,0.1)" }}
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    "flex min-h-[4.1rem] flex-1 flex-col items-center justify-center gap-1 rounded-[1rem] px-2 text-center transition",
                    isActive ? "bg-[rgba(94,82,184,0.08)] text-[var(--color-primary)]" : "text-slate-500"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={clsx(
                        "inline-flex h-9 w-9 items-center justify-center rounded-full transition",
                        isActive ? "bg-white text-[var(--color-primary)] shadow-[0_10px_20px_rgba(57,65,104,0.12)]" : "bg-transparent"
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="text-[11px] font-semibold tracking-[0.01em]">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function NavIcon({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-4 w-4 items-center justify-center">{children}</span>;
}

function HomeIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M4 10.5 12 4l8 6.5" />
        <path d="M6.5 9.5V20h11V9.5" />
      </svg>
    </NavIcon>
  );
}

function DirectoryIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M4.5 7.5h15" />
        <path d="M4.5 12h15" />
        <path d="M4.5 16.5h9" />
      </svg>
    </NavIcon>
  );
}

function CheckInIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <rect x="4.5" y="4.5" width="15" height="15" rx="4" />
        <path d="m8.5 12 2.2 2.2 4.8-4.8" />
      </svg>
    </NavIcon>
  );
}

function DuesIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M12 4.5v15" />
        <path d="M16 8.2c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.5 2.6 4 3c2.5.4 4 1.3 4 3s-1.8 3-4 3-4-1.3-4-3" />
      </svg>
    </NavIcon>
  );
}

function ProfileIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M12 12a3.75 3.75 0 1 0 0-7.5A3.75 3.75 0 0 0 12 12Z" />
        <path d="M5 19.5c1.8-2.7 4.2-4 7-4s5.2 1.3 7 4" />
      </svg>
    </NavIcon>
  );
}

function buildNavItems(canManageFinance: boolean) {
  const items = [
    { to: "/", label: "Home", icon: <HomeIcon /> },
    { to: "/directory", label: "Directory", icon: <DirectoryIcon /> },
    { to: "/check-in", label: "Check In", icon: <CheckInIcon /> },
    { to: "/my-dues", label: "My Dues", icon: <DuesIcon /> }
  ];

  if (canManageFinance) {
    items.push({ to: "/manage-dues", label: "Manage", icon: <ManageDuesIcon /> });
  }

  items.push({ to: "/profile", label: "Profile", icon: <ProfileIcon /> });

  return items;
}

function ManageDuesIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M4.5 6.5h15" />
        <path d="M4.5 12h15" />
        <path d="M4.5 17.5h10" />
        <circle cx="17.5" cy="17.5" r="2" />
      </svg>
    </NavIcon>
  );
}
