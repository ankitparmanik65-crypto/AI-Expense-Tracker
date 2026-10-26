import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Avatar from "./Avatar";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const menuRef = useRef(null);

  // Click outside → dono menus close
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    setUserMenuOpen(false);
    setMenuOpen(false);
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { to: "/dashboard", label: "Dashboard", icon: "📊" },
    { to: "/coach", label: "AI Coach", icon: "🧠" },
    { to: "/planning", label: "Financial Plan", icon: "🎯" },
    { to: "/accounts", label: "Accounts", icon: "💳" },
    { to: "/reports", label: "Reports", icon: "📈" },
    { to: "/tax", label: "Tax Savings", icon: "📋" },
    { to: "/chat", label: "AI Chat", icon: "🤖" },
    { to: "/budgets", label: "Budgets", icon: "💰" },
    { to: "/goals", label: "Goals", icon: "🎯" },
    { to: "/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link
          to="/dashboard"
          className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 shrink-0"
        >
          <span className="text-lg sm:text-xl">💰</span>
          <span className="hidden sm:inline">AI Expense Tracker</span>
          <span className="sm:hidden">AI Expense Tracker</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="text-lg p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            title="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {/* Avatar — only user info + logout */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
                setMenuOpen(false);
              }}
              className="p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label="Profile"
            >
              <Avatar name={user?.name} size="md" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                  <Avatar name={user?.name} size="lg" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>

                {/* Logout only */}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>

          {/* ⋯ Menu button + Dropdown with all links */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => {
                setMenuOpen(!menuOpen);
                setUserMenuOpen(false);
              }}
              className="text-2xl p-2 leading-none rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-200"
              aria-label="Menu"
            >
              {menuOpen ? "✕" : "☰"}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-y-auto overscroll-contain custom-scrollbar"
                style={{
                  maxHeight: "calc(100vh - 80px)",
                }}
              >
                {/* User info card */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                  <Avatar name={user?.name} size="lg" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>

                {/* All nav links */}
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-4 py-2.5 text-sm font-medium transition ${
                      isActive(link.to)
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    {link.icon} {link.label}
                  </Link>
                ))}

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition border-t border-gray-100 dark:border-gray-800"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
