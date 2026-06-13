import { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { useAuth } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import type { Profile } from "@/types";

// ── Nav config ────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const userNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: IC.overview },
  { label: "Folders", href: "/dashboard/folders", icon: IC.folder },
  { label: "Subfolders", href: "/dashboard/subfolders", icon: IC.subfolder },
  { label: "Notes", href: "/dashboard/notes", icon: IC.notes },
  { label: "Collaborators", href: "/dashboard/collaborators", icon: IC.users },
  { label: "Activity Log", href: "/dashboard/activity", icon: IC.bell },
  { label: "Collaborations", href: "/dashboard/collaborations", icon: IC.share },
];

const adminNav: NavItem[] = [
  { label: "Overview", href: "/admin/dashboard", icon: IC.overview },
  { label: "Users", href: "/admin/dashboard/users", icon: IC.users },
  { label: "Folders", href: "/admin/dashboard/folders", icon: IC.folder },
  { label: "Subfolders", href: "/admin/dashboard/subfolders", icon: IC.subfolder },
  { label: "Notes", href: "/admin/dashboard/notes", icon: IC.notes },
  { label: "Activity Log", href: "/admin/dashboard/activity", icon: IC.bell },
];

// ── DashboardLayout ───────────────────────────────────────────

interface DashboardLayoutProps {
  children: ReactNode;
  user: Profile;
  variant?: "user" | "admin";
  defaultCollapsed?: boolean;
}

interface SidebarInnerProps {
  collapsed: boolean;
  isActive: (href: string) => boolean;
  nav: NavItem[];
  onToggleCollapsed: () => void;
  pathname: string;
  user: Profile;
  variant: "user" | "admin";
  collaboratorCount: number | null;
  collaborationCount: number | null;
}

function SidebarInner({
  collapsed,
  isActive,
  nav,
  onToggleCollapsed,
  pathname,
  user,
  variant,
  collaboratorCount,
  collaborationCount,
}: SidebarInnerProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo row */}
      <div
        style={{
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "0 var(--space-3)" : "0 var(--space-4)",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <Link
            to="/"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-md)",
              fontWeight: "var(--font-weight-bold)",
              letterSpacing: "var(--letter-spacing-tight)",
              color: "var(--color-text-primary)",
              textDecoration: "none",
            }}
          >
            confluence
          </Link>
        )}
        <button
          onClick={onToggleCollapsed}
          style={{
            width: "28px",
            height: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-base)",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            flexShrink: 0,
            transition: "transform var(--duration-normal) var(--ease-default)",
            transform: collapsed ? "rotate(180deg)" : "none",
          }}
        >
          <Icon d={IC.chevron} size={13} />
        </button>
      </div>

      {/* Role pill */}
      {!collapsed && (
        <div
          style={{
            margin: "var(--space-3) var(--space-3) 0",
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-md)",
            background:
              variant === "admin"
                ? "var(--color-warning-subtle)"
                : "var(--color-accent-subtle)",
            border: `1px solid ${variant === "admin" ? "var(--color-warning)" : "var(--color-accent-muted)"}`,
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <Icon d={variant === "admin" ? IC.shield : IC.overview} size={13} />
          <span
            style={{
              fontSize: "11px",
              fontWeight: "var(--font-weight-semibold)",
              letterSpacing: "0.06em",
              color:
                variant === "admin"
                  ? "var(--color-warning)"
                  : "var(--color-accent)",
              textTransform: "uppercase",
            }}
          >
            {variant === "admin" ? "Admin Dashboard" : "Personal Dashboard"}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: "var(--space-3)",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          overflowY: "auto",
        }}
      >
        {!collapsed && (
          <p
            style={{
              fontSize: "10px",
              fontWeight: "var(--font-weight-semibold)",
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              padding: "var(--space-2) var(--space-3) var(--space-1)",
            }}
          >
            {variant === "admin" ? "Admin" : "Personal"}
          </p>
        )}

        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              title={collapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: collapsed
                  ? "var(--space-3)"
                  : "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-lg)",
                textDecoration: "none",
                fontSize: "var(--font-size-sm)",
                fontWeight: active
                  ? "var(--font-weight-semibold)"
                  : "var(--font-weight-regular)",
                color: active
                  ? "var(--color-accent)"
                  : "var(--color-text-secondary)",
                background: active
                  ? "var(--color-accent-subtle)"
                  : "transparent",
                border: `1px solid ${active ? "var(--color-accent-muted)" : "transparent"}`,
                transition: "all var(--duration-fast) var(--ease-default)",
                justifyContent: collapsed ? "center" : "flex-start",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "var(--color-bg-muted)";
                  e.currentTarget.style.color = "var(--color-text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--color-text-secondary)";
                }
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  color: active ? "var(--color-accent)" : "inherit",
                }}
              >
                <Icon d={item.icon} />
              </span>
              {!collapsed && (
                <span
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    minWidth: 0,
                  }}
                >
                  <span>{item.label}</span>
                  {(item.label === "Collaborators" && collaboratorCount !== null) ||
                      (item.label === "Collaborations" && collaborationCount !== null) ? (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "var(--font-weight-semibold)",
                        color: active
                          ? "var(--color-accent)"
                          : "var(--color-text-muted)",
                        background: active
                          ? "var(--color-accent-subtle)"
                          : "var(--color-bg-muted)",
                        borderRadius: "var(--radius-full)",
                        padding: "1px 7px",
                        minWidth: "18px",
                        textAlign: "center",
                        lineHeight: "18px",
                      }}
                    >
                      {item.label === "Collaborators" ? collaboratorCount : collaborationCount}
                    </span>
                  ) : null}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div
        style={{
          borderTop: "1px solid var(--color-border)",
          padding: "var(--space-3)",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {/* Settings — user only */}
        {variant === "user" &&
          (() => {
            const active = pathname === "/dashboard/settings";
            return (
              <Link
                to="/dashboard/settings"
                title={collapsed ? "Settings" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: collapsed
                    ? "var(--space-3)"
                    : "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-lg)",
                  textDecoration: "none",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: active
                    ? "var(--font-weight-semibold)"
                    : "var(--font-weight-regular)",
                  color: active
                    ? "var(--color-accent)"
                    : "var(--color-text-secondary)",
                  background: active
                    ? "var(--color-accent-subtle)"
                    : "transparent",
                  border: `1px solid ${active ? "var(--color-accent-muted)" : "transparent"}`,
                  justifyContent: collapsed ? "center" : "flex-start",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  transition: "all var(--duration-fast) var(--ease-default)",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "var(--color-bg-muted)";
                    e.currentTarget.style.color = "var(--color-text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--color-text-secondary)";
                  }
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    color: active ? "var(--color-accent)" : "inherit",
                  }}
                >
                  <Icon d={IC.settings} />
                </span>
                {!collapsed && "Settings"}
              </Link>
            );
          })()}

        {/* Back to site - removed, confluence logo in topbar links to / */}

        {/* User row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: collapsed
              ? "var(--space-3)"
              : "var(--space-2) var(--space-3)",
            marginTop: "var(--space-1)",
            borderTop: "1px solid var(--color-border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "var(--radius-full)",
              background: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: "var(--font-weight-bold)",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.full_name}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "10px",
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {user.user_type}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout({
  children,
  user,
  variant = "user",
  defaultCollapsed = false,
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collaboratorCount, setCollaboratorCount] = useState<number | null>(null);
  const [collaborationCount, setCollaborationCount] = useState<number | null>(null);
  const location = useLocation();
  const nav = variant === "admin" ? adminNav : userNav;

  // Fetch collaborator count for the sidebar badge
  useEffect(() => {
    if (variant !== "user") return;
    let mounted = true;
    const fetchCounts = async () => {
      try {
        const supabase = requireSupabase();

        // Count collaborators (items user shared with others)
        const { count: cCount, error: cError } = await supabase
          .from("collaborators")
          .select("*", { count: "exact", head: true })
          .eq("inviter_id", user.id);
        if (mounted && !cError) {
          setCollaboratorCount(cCount);
        }

        // Count collaborations (items shared with user)
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.email) {
          const { count: shareCount, error: shareError } = await supabase
            .from("collaborators")
            .select("*", { count: "exact", head: true })
            .eq("invitee_email", authData.user.email);
          if (mounted && !shareError) {
            setCollaborationCount(shareCount);
          }
        }
      } catch {
        // Silently fail — badges just won't show
      }
    };
    void fetchCounts();
    return () => { mounted = false; };
  }, [variant, user.id]);

  const isActive = (href: string) =>
    href === (variant === "admin" ? "/admin/dashboard" : "/dashboard")
      ? location.pathname === href
      : location.pathname.startsWith(href);

  const breadcrumbLabel = (() => {
    const match = [...userNav, ...adminNav].find(
      (n) =>
        n.href === location.pathname ||
        (n.href !== "/dashboard" &&
          n.href !== "/admin/dashboard" &&
          location.pathname.startsWith(n.href)),
    );
    return match?.label ?? "Overview";
  })();

  const rootHref = variant === "admin" ? "/admin/dashboard" : "/dashboard";

  // ── Topbar ──

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--color-bg-base)",
      }}
    >
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 150,
          }}
        />
      )}

      {/* Sidebar — desktop */}
      <aside
        style={{
          width: collapsed ? "64px" : "220px",
          background: "var(--color-bg-subtle)",
          borderRight: "1px solid var(--color-border)",
          position: "sticky",
          top: 0,
          height: "100vh",
          flexShrink: 0,
          transition: "width var(--duration-normal) var(--ease-default)",
          overflow: "hidden",
          zIndex: 10,
        }}
        className="dash-sidebar"
      >
        <SidebarInner
          collapsed={collapsed}
          isActive={isActive}
          nav={nav}
          onToggleCollapsed={() => setCollapsed((p) => !p)}
          pathname={location.pathname}
          user={user}
          variant={variant}
          collaboratorCount={collaboratorCount}
          collaborationCount={collaborationCount}
        />
      </aside>

      {/* Sidebar — mobile drawer */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "220px",
          background: "var(--color-bg-subtle)",
          borderRight: "1px solid var(--color-border)",
          zIndex: 160,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform var(--duration-normal) var(--ease-default)",
          overflow: "hidden",
        }}
        className="dash-sidebar-mobile"
      >
        <SidebarInner
          collapsed={collapsed}
          isActive={isActive}
          nav={nav}
          onToggleCollapsed={() => setCollapsed((p) => !p)}
          pathname={location.pathname}
          user={user}
          variant={variant}
          collaboratorCount={collaboratorCount}
          collaborationCount={collaborationCount}
        />
      </aside>

      {/* Main area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* Topbar */}
        <header
          style={{
            height: "60px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-bg-base)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 var(--space-6)",
            flexShrink: 0,
            position: "sticky",
            top: 0,
            zIndex: 9,
          }}
        >
          {/* Left: mobile hamburger + breadcrumb */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <button
              onClick={() => setMobileOpen((p) => !p)}
              className="dash-mobile-btn"
              style={{
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                background: "transparent",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
              }}
            >
              <Icon d={IC.menu} />
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              <Link
                to={rootHref}
                style={{
                  color: "var(--color-text-muted)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--color-text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--color-text-muted)")
                }
              >
                {variant === "admin" ? "Admin" : "Dashboard"}
              </Link>
              {breadcrumbLabel !== "Overview" && (
                <>
                  <span style={{ color: "var(--color-border-strong)" }}>/</span>
                  <span
                    style={{
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {breadcrumbLabel}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: theme + user */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <ThemeToggle />

            <div style={{ position: "relative" }}>
              <button
                onClick={() => setUserMenuOpen((p) => !p)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg-elevated)",
                  cursor: "pointer",
                  transition: "border-color var(--duration-fast)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor =
                    "var(--color-border-strong)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "var(--color-border)")
                }
              >
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "var(--radius-full)",
                    background: "var(--color-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: "var(--font-weight-bold)",
                    color: "#fff",
                  }}
                >
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--color-text-primary)",
                    maxWidth: "110px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.full_name}
                </span>
                <Icon d="M6 9l6 6 6-6" size={13} />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 90 }}
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      width: "210px",
                      background: "var(--color-bg-elevated)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-xl)",
                      boxShadow: "var(--shadow-xl)",
                      zIndex: 100,
                      overflow: "hidden",
                      padding: "var(--space-2)",
                    }}
                  >
                    <div
                      style={{
                        padding: "var(--space-3)",
                        borderBottom: "1px solid var(--color-border)",
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "var(--font-size-sm)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {user.full_name}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "10px",
                          color: "var(--color-text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginTop: "2px",
                        }}
                      >
                        {user.user_type}
                      </p>
                    </div>

                    {[
                      // Only show admin/user switch for admin users
                      ...(user.user_type === "admin"
                        ? [{
                            label: variant === "admin" ? "Personal Dashboard" : "Admin Dashboard",
                            href: variant === "admin" ? "/dashboard" : "/admin/dashboard",
                            icon: IC.shield,
                          }]
                        : []),
                      // Settings — only for user variant (no admin settings route exists)
                      ...(variant === "user"
                        ? [{ label: "Settings", href: "/dashboard/settings", icon: IC.settings }]
                        : []),
                      { label: "Public site", href: "/", icon: IC.globe },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setUserMenuOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-3)",
                          padding: "var(--space-2) var(--space-3)",
                          borderRadius: "var(--radius-md)",
                          textDecoration: "none",
                          fontSize: "var(--font-size-sm)",
                          color: "var(--color-text-secondary)",
                          transition: "all var(--duration-fast)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "var(--color-bg-muted)";
                          e.currentTarget.style.color =
                            "var(--color-text-primary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color =
                            "var(--color-text-secondary)";
                        }}
                      >
                        <Icon d={item.icon} size={14} />
                        {item.label}
                      </Link>
                    ))}

                    <div
                      style={{
                        borderTop: "1px solid var(--color-border)",
                        marginTop: "var(--space-2)",
                        paddingTop: "var(--space-2)",
                      }}
                    >
                      <button
                        onClick={async () => {
                          setUserMenuOpen(false);
                          try {
                            await signOut();
                            navigate("/");
                          } catch {
                            window.location.href = "/";
                          }
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-3)",
                          padding: "var(--space-2) var(--space-3)",
                          borderRadius: "var(--radius-md)",
                          fontSize: "var(--font-size-sm)",
                          color: "var(--color-danger)",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          width: "100%",
                          fontFamily: "var(--font-sans)",
                          transition: "all var(--duration-fast)",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "var(--color-danger-subtle)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <Icon d={IC.logout} size={14} />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          style={{
            flex: 1,
            padding: "var(--space-8)",
            maxWidth: "1200px",
            width: "100%",
            margin: "0 auto",
          }}
        >
          {children}
        </main>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 768px) {
          .dash-sidebar { display: none !important; }
          .dash-mobile-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
