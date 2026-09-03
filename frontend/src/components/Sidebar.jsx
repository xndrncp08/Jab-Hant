import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/applications", label: "Applications" },
  { to: "/history", label: "Search history" },
  { to: "/insights", label: "Insights" },
  { to: "/settings", label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-line bg-surface flex flex-col h-screen sticky top-0">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-signal" />
          <span className="font-display font-semibold text-[15px] tracking-tight">
            Job Hunter
          </span>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-0.5">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `block px-3 py-2 rounded text-sm transition-colors ${
                isActive
                  ? "bg-signal-dim text-signal font-medium"
                  : "text-muted hover:bg-paper hover:text-ink"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 text-xs text-faint border-t border-line">
        Runs locally · your data stays on this machine
      </div>
    </aside>
  );
}
