import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { requireSupabase } from "@/lib/supabase";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = requireSupabase();
        const { data } = await supabase.rpc("unread_notification_count", { p_user_id: userId });
        if (typeof data === "number") setUnread(data);
      } catch {
        // silently fail
      }
    };
    void load();
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const supabase = requireSupabase();
        const { data } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        setNotifications(data || []);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, userId]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markAllRead = async () => {
    try {
      const supabase = requireSupabase();
      await supabase.rpc("mark_notifications_read", { p_user_id: userId });
      setUnread(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silently fail
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label="Notifications"
        style={{
          position: "relative",
          width: "36px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
          background: "var(--color-bg-base)",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
          fontSize: "var(--font-size-base)",
          transition: "all var(--duration-fast)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-bg-muted)";
          e.currentTarget.style.color = "var(--color-text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-bg-base)";
          e.currentTarget.style.color = "var(--color-text-secondary)";
        }}
      >
        {"\uD83D\uDD14"}
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              minWidth: "18px",
              height: "18px",
              borderRadius: "50%",
              background: "var(--color-danger)",
              color: "var(--color-text-inverted)",
              fontSize: "10px",
              fontWeight: "var(--font-weight-bold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              boxShadow: "0 0 0 2px var(--color-bg-base)",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "360px",
            maxHeight: "480px",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-xl)",
            overflow: "hidden",
            zIndex: "var(--z-overlay)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--space-3) var(--space-4)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <span style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-sm)" }}>
              Notifications
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-accent)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "var(--font-weight-medium)",
                  transition: "color var(--duration-fast)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-accent-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-accent)"; }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ overflow: "auto", flex: 1 }}>
            {loading ? (
              <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
                Loading\u2026
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (n.link) navigate(n.link);
                    setOpen(false);
                  }}
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderBottom: "1px solid var(--color-border)",
                    cursor: n.link ? "pointer" : "default",
                    background: n.read ? "transparent" : "var(--color-accent-subtle)",
                    transition: "background var(--duration-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-bg-muted)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.read ? "transparent" : "var(--color-accent-subtle)";
                  }}
                >
                  <div style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-sm)" }}>
                    {n.title}
                  </div>
                  {n.body && (
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                      {n.body}
                    </div>
                  )}
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
