import { NavLink } from "react-router-dom";

// Shared classes for every nav link. Active state is applied per-link below.
const linkBaseClasses =
  "rounded-xl px-4 py-2 text-sm font-medium transition";

/**
 * NavLink accepts a className function that receives { isActive }.
 * We use it to highlight the link matching the current route.
 */
function navLinkClasses({ isActive }) {
  return `${linkBaseClasses} ${
    isActive
      ? "text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;
}

export default function NavBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

        {/* Brand — also links home */}
        <NavLink
          to="/"
          className="flex items-center gap-2"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            R
          </span>

          <span className="text-base font-semibold tracking-tight text-slate-900">
            ResearchBot
          </span>
        </NavLink>

        {/* Navigation links */}
        <nav className="flex items-center gap-1">
          {/*
            `end` makes this link active ONLY on the exact "/" path,
            so it does not stay highlighted while on /reports.
          */}
          <NavLink
            to="/"
            end
            className={navLinkClasses}
          >
            New Research
          </NavLink>

          {/*
            Active on /reports AND /reports/:id, so "History" stays
            highlighted while viewing an individual report.
          */}
          <NavLink
            to="/reports"
            className={navLinkClasses}
          >
            History
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
