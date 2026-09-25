import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/applications", label: "Applications" },
  { to: "/history", label: "Search history" },
  { to: "/insights", label: "Insights" },
  { to: "/settings", label: "Settings" },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <header>
      <aside className="w-56 shrink-0 border-r border-accent bg-surface flex flex-col h-screen sticky top-0">
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-highlight" aria-hidden="true" />
            <span className="font-display font-semibold text-[15px] tracking-tight text-ink">
              Job Hunter
            </span>
          </div>
        </div>
        <nav aria-label="Main navigation" className="flex-1 px-3 space-y-0.5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm transition-colors focus-visible:ring-2 focus-visible:ring-highlight ${
                  isActive
                    ? "bg-accent/60 text-ink font-medium"
                    : "text-highlight/75 hover:bg-accent/30 hover:text-ink"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <nav aria-label="Legal" className="px-5 pb-2 flex flex-col gap-1">
          <NavLink to="/privacy" className="text-xs text-highlight/55 hover:text-highlight/85 focus-visible:ring-2 focus-visible:ring-highlight rounded w-fit">
            Privacy Policy
          </NavLink>
          <NavLink to="/terms" className="text-xs text-highlight/55 hover:text-highlight/85 focus-visible:ring-2 focus-visible:ring-highlight rounded w-fit">
            Terms &amp; Conditions
          </NavLink>
          <NavLink to="/cookies" className="text-xs text-highlight/55 hover:text-highlight/85 focus-visible:ring-2 focus-visible:ring-highlight rounded w-fit">
            Cookie Policy
          </NavLink>
        </nav>
        <div className="px-5 py-4 border-t border-accent">
          <p className="text-xs text-highlight/55 mb-3">
            Runs locally · your data stays on this machine
          </p>
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out of Job Hunter"
            className="text-xs font-medium text-highlight/75 hover:text-ink border border-accent rounded px-2.5 py-1.5 hover:bg-accent/30 transition-colors focus-visible:ring-2 focus-visible:ring-highlight"
          >
            Sign out
          </button>
        </div>
      </aside>
    </header>
  );
}