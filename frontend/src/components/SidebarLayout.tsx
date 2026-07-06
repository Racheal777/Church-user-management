import {
  Activity,
  Bell,
  CreditCard,
  FileSearch,
  Home,
  type LucideIcon,
  LogOut,
  Menu,
  Search,
  Users,
  X
} from "lucide-react";
import clsx from "clsx";
import { useState, type ComponentType } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../providers/AuthContext";
import "../styles/dashboard.css";

export function SidebarLayout() {
  const { member, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const navGroups = [
    {
      title: "Core Navigation",
      items: [
        { to: "/", label: "Home", icon: Home },
        { to: "/check-in", label: "Check In", icon: ZapIcon },
        { to: "/my-dues", label: "My Dues", icon: WalletIcon },
        { to: "/directory", label: "Directory", icon: DirectoryIcon },
        { to: "/profile", label: "Profile", icon: ProfileIcon }
      ]
    },
    {
      title: "Management",
      items: [
        { to: "/attendance", label: "Attendance", icon: Activity },
        { to: "/members", label: "Members", icon: Users },
        { to: "/manage-dues", label: "Manage Dues", icon: CreditCard },
        { to: "/teams", label: "Teams", icon: Users },
        { to: "/reports", label: "Reports", icon: FileSearch }
      ]
    }
  ];

  const mobileItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/attendance", label: "Attend", icon: Activity },
    { to: "/members", label: "People", icon: Users },
    { to: "/manage-dues", label: "Dues", icon: CreditCard }
  ];

  return (
    <div className="dashboard-shell admin-side">
      <aside className="dashboard-sidebar">
        <Link to="/" className="dashboard-brand">
          <div className="h-12 w-12 overflow-hidden rounded-xl bg-white shadow-sm border border-slate-100">
            <img src="/logo.png" alt="YPG" className="h-full w-full object-contain p-1" />
          </div>
          <div>
            <p className="dashboard-brand-title">YPG</p>
            <p className="dashboard-brand-subtitle">Service All The Way</p>
          </div>
        </Link>

        <nav className="dashboard-nav">
          {navGroups.map((group) => (
            <div key={group.title} className="dashboard-nav-group">
              <p className="dashboard-nav-group-title">{group.title}</p>
              {group.items.map((item) => (
                <SidebarNavLink key={item.to} {...item} />
              ))}
            </div>
          ))}
        </nav>

        <button className="dashboard-signout" onClick={() => void handleLogout()}>
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </aside>

      <header className="dashboard-mobile-bar">
        <Link to="/" className="dashboard-brand">
          <div className="h-12 w-12 overflow-hidden rounded-xl bg-white shadow-sm border border-slate-100">
            <img src="/logo.png" alt="YPG" className="h-full w-full object-contain p-1" />
          </div>
          <div>
            <p className="dashboard-brand-title">YPG</p>
            <p className="dashboard-brand-subtitle">Service All The Way</p>
          </div>
        </Link>
        <button className="dashboard-icon-button" onClick={() => setMenuOpen((current) => !current)}>
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-topbar">
          <div className="dashboard-profile ml-auto">
            <Link to="/announcements" className="dashboard-icon-button">
              <Bell className="h-4 w-4" />
            </Link>
            <Link to="/profile" className="dashboard-profile-avatar">
              {member?.profilePhotoUrl ? (
                <img src={member.profilePhotoUrl} alt={member.firstName} />
              ) : (
                <span>{member?.firstName?.[0] ?? "P"}</span>
              )}
            </Link>
            <div>
              <p className="dashboard-profile-name">
                {member?.firstName} {member?.lastName}
              </p>
              <p className="dashboard-profile-role">{member?.role.replace(/_/g, " ")}</p>
            </div>
          </div>
        </div>

        {menuOpen ? (
          <div className="dashboard-topbar mb-4 flex-col items-stretch lg:hidden">
            {navGroups.flatMap((group) => group.items).map((item) => (
              <SidebarNavLink key={item.to} {...item} onClick={() => setMenuOpen(false)} />
            ))}
            <button className="dashboard-signout m-0" onClick={() => void handleLogout()}>
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        ) : null}

        <Outlet />
      </div>

      <nav className="dashboard-mobile-nav">
        {mobileItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => clsx("dashboard-mobile-link", isActive && "is-active")}>
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function ZapIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={props.className}>
      <path d="M13 2 5.5 13h5l-1.5 9L18.5 11h-5L13 2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WalletIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={props.className}>
      <rect x="3.5" y="6.5" width="17" height="11" rx="2.5" />
      <path d="M15.5 12h5" strokeLinecap="round" />
    </svg>
  );
}

function DirectoryIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={props.className}>
      <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M4 19c.9-2.3 2.4-3.5 4-3.5S11.1 16.7 12 19" strokeLinecap="round" />
      <path d="M17 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path d="M14.8 18c.7-1.8 1.8-2.8 3.2-2.8 1.1 0 2.2.6 3 1.8" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={props.className}>
      <path d="M12 12a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 12 12Z" />
      <path d="M6 19c1.3-2.2 3.3-3.4 6-3.4 2.7 0 4.7 1.2 6 3.4" strokeLinecap="round" />
    </svg>
  );
}

function SidebarNavLink({
  to,
  label,
  icon: Icon,
  onClick
}: {
  to: string;
  label: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => clsx("dashboard-nav-link", isActive && "is-active")}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  );
}
