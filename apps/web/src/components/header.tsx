"use client";

import { useTheme } from "@/components/theme-provider";
import { Sun, Moon } from "lucide-react";

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid hsl(var(--border-primary))",
        background: "var(--glass-bg)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, hsl(var(--brand-primary)), hsl(var(--brand-primary-dark)))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px hsl(var(--brand-primary) / 0.3)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </div>
          <div>
            <h1
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "hsl(var(--text-primary))",
                lineHeight: 1.2,
              }}
            >
              GrowEasy
            </h1>
            <p
              style={{
                fontSize: "0.7rem",
                fontWeight: 500,
                color: "hsl(var(--text-muted))",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              AI CSV Importer
            </p>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          id="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--radius-md)",
            border: "1px solid hsl(var(--border-primary))",
            background: "hsl(var(--bg-card))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "hsl(var(--text-secondary))",
            transition: "all var(--transition-fast)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "hsl(var(--border-hover))";
            e.currentTarget.style.background = "hsl(var(--bg-secondary))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "hsl(var(--border-primary))";
            e.currentTarget.style.background = "hsl(var(--bg-card))";
          }}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </header>
  );
}
