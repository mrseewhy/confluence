import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { Button, Badge } from "@/components/ui";
import { requireSupabase } from "@/lib/supabase";

interface TransferUser {
  id: string;
  email: string;
  full_name: string;
  user_type: string;
}

interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (newOwnerId: string, newOwnerName: string, newOwnerEmail: string) => Promise<void>;
  itemTitle: string;
  currentOwnerName: string | null;
}

export function TransferOwnershipModal({
  isOpen,
  onClose,
  onTransfer,
  itemTitle,
  currentOwnerName,
}: TransferOwnershipModalProps) {
  const [users, setUsers] = useState<TransferUser[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const supabase = requireSupabase();
        // Try admin_get_users RPC first (includes emails), fall back to profiles
        const { data: rpcData } = await supabase.rpc("admin_get_users");
        if (rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
          const mapped: TransferUser[] = rpcData.map((u: Record<string, unknown>) => ({
            id: (u.user_id as string) || (u.id as string),
            email: (u.user_email as string) || (u.email as string) || "",
            full_name: (u.user_full_name as string) || (u.full_name as string) || "Unknown",
            user_type: (u.user_type as string) || "user",
          }));
          setUsers(mapped);
        } else {
          // Fallback: profiles without emails (less ideal)
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, user_type");
          const mapped: TransferUser[] = (profiles || []).map((p) => ({
            id: p.id,
            email: "",
            full_name: p.full_name,
            user_type: p.user_type,
          }));
          setUsers(mapped);
        }
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchUsers();
    setSelectedUserId(null);
    setSearch("");
  }, [isOpen]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} width={420}>
      <h3 style={{ marginBottom: "var(--space-2)", fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)" }}>
        Transfer ownership
      </h3>
      <p style={{ marginBottom: "var(--space-4)", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
        Transfer <strong>"{itemTitle}"</strong>
        {currentOwnerName ? <> (currently owned by <strong>{currentOwnerName}</strong>)</> : null}{" "}
        to a different user.
      </p>

      <input
        type="search"
        placeholder="Search users by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
        style={{
          width: "100%",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-primary)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-2) var(--space-3)",
          outline: "none",
          marginBottom: "var(--space-3)",
          boxSizing: "border-box",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--color-accent)";
          e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--color-border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />

      <div
        style={{
          maxHeight: "260px",
          overflowY: "auto",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: "var(--radius-md)",
          marginBottom: "var(--space-4)",
        }}
      >
        {loading ? (
          <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
            Loading users…
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((u) => {
            const isSelected = u.id === selectedUserId;
            return (
              <button
                key={u.id}
                onClick={() => setSelectedUserId(u.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  border: "none",
                  borderBottom: "1px solid var(--color-border-subtle)",
                  background: isSelected ? "var(--color-accent-subtle)" : "transparent",
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--font-size-sm)",
                  transition: "background var(--duration-fast)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "var(--color-bg-muted)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "var(--radius-full)",
                    background: u.user_type === "admin" ? "var(--color-warning)" : "var(--color-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "var(--font-weight-bold)",
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {u.full_name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: "var(--font-weight-medium)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.full_name}
                  </p>
                  {u.email && (
                    <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.email}
                    </p>
                  )}
                </div>
                {u.user_type === "admin" && (
                  <Badge variant="warning" style={{ fontSize: "9px" }}>Admin</Badge>
                )}
                {isSelected && (
                  <span style={{ color: "var(--color-accent)", fontSize: "14px" }}>✓</span>
                )}
              </button>
            );
          })
        ) : (
          <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
            No users found
          </div>
        )}
      </div>

      {selectedUser && (
        <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
          Transferring to <strong>{selectedUser.full_name}</strong> ({selectedUser.email || "no email"})
        </p>
      )}

      <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!selectedUserId || transferring}
          onClick={async () => {
            if (!selectedUserId || !selectedUser) return;
            setTransferring(true);
            try {
              await onTransfer(selectedUserId, selectedUser.full_name, selectedUser.email);
            } finally {
              setTransferring(false);
            }
          }}
        >
          {transferring ? "Transferring…" : "Transfer ownership"}
        </Button>
      </div>
    </Modal>
  );
}
