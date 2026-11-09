// Supabase Edge Function — Send Collaborator Invite
// Called from ShareModal after a collaborator is inserted.
// Sends a notification email to the invitee via Resend.
//
// Required env vars:
//   RESEND_API_KEY   — API key from https://resend.com/api-keys
//   SITE_URL         — the base URL of the app (used to construct share links)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface InvitePayload {
  invitee_email: string;
  item_type: "folder" | "note";
  item_slug: string;
  access_level?: "viewer" | "editor";
}

// Escape a value for safe interpolation into HTML text/attribute contexts.
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Encode a value for safe use inside a URL path segment.
function encodeSegment(value: unknown): string {
  return encodeURIComponent(String(value ?? ""));
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Simple in-memory rate limiter for Edge Functions (per-instance).
// For production with multiple instances, use the DB-backed check_rate_limit RPC instead.
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;       // max 10 invites per window
const RATE_LIMIT_WINDOW = 60_000; // 60-second window

function checkMemoryRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const entry = ipRequestCounts.get(clientIp);
  if (!entry || now > entry.resetAt) {
    ipRequestCounts.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}

// Hash an IP for privacy before storing it in the rate-limit table.
async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`rl:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// DB-backed rate limiting so limits hold across Edge Function instances.
// Falls back to the in-memory limiter if the RPC is unavailable.
async function allowRequest(clientIp: string, endpoint: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return checkMemoryRateLimit(clientIp);
  try {
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_ip_hash: await hashIp(clientIp),
      p_endpoint: endpoint,
      p_max_requests: RATE_LIMIT_MAX,
      p_window_seconds: RATE_LIMIT_WINDOW / 1000,
    });
    if (error) return checkMemoryRateLimit(clientIp);
    return data !== false;
  } catch {
    return checkMemoryRateLimit(clientIp);
  }
}

serve(async (req) => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Rate limiting ──
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";

  if (!(await allowRequest(clientIp, "send-collaborator-invite"))) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      },
    );
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
  const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") ?? "notifications@confluence.app";

  if (!resendApiKey) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    // ── Authentication: require a valid Supabase JWT ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    // Scoped client that acts as the caller (RLS applies).
    const callerClient: SupabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await callerClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: userError?.message ?? "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload: InvitePayload = await req.json();

    const {
      invitee_email,
      item_type,
      item_slug,
    } = payload;

    // Title and owner username are derived server-side to prevent spoofing /
    // HTML injection; inviter identity comes from the verified JWT.
    const inviteeEmail = typeof invitee_email === "string" ? invitee_email.trim().toLowerCase() : "";

    // Validate required fields
    if (!inviteeEmail || !item_type || !item_slug) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: invitee_email, item_type, item_slug" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (item_type !== "folder" && item_type !== "note") {
      return new Response(
        JSON.stringify({ error: "item_type must be 'folder' or 'note'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate email format (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteeEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid invitee email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Authorization: confirm the caller owns / can edit the item ──
    // RLS on these selects returns a row only if the caller has access;
    // we additionally require owner for invites to keep sharing owner-only.
    const { data: inviterProfile } = await callerClient
      .from("profiles")
      .select("full_name, username")
      .eq("id", user.id)
      .maybeSingle();

    let itemTitle = "";
    let ownerUsername = "";
    let ownerId: string | null = null;

    if (item_type === "note") {
      const { data: note } = await callerClient
        .from("notes")
        .select("title, owner_id, profiles:owner_id(username)")
        .eq("slug", item_slug)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!note) {
        return new Response(
          JSON.stringify({ error: "Item not found or you do not have permission to share it" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      itemTitle = note.title ?? "";
      ownerId = note.owner_id;
      // deno-lint-ignore no-explicit-any
      ownerUsername = (note as any).profiles?.username ?? inviterProfile?.username ?? "";
    } else {
      const { data: folder } = await callerClient
        .from("folders")
        .select("name, owner_id, profiles:owner_id(username)")
        .eq("slug", item_slug)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!folder) {
        return new Response(
          JSON.stringify({ error: "Item not found or you do not have permission to share it" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      itemTitle = folder.name ?? "";
      ownerId = folder.owner_id;
      // deno-lint-ignore no-explicit-any
      ownerUsername = (folder as any).profiles?.username ?? inviterProfile?.username ?? "";
    }

    if (!ownerId || !ownerUsername) {
      return new Response(
        JSON.stringify({ error: "Could not resolve item owner" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const inviterName = inviterProfile?.full_name ?? inviterProfile?.username ?? "A Confluence user";
    const inviterEmail = user.email ?? "";

    // Build the share link (path segments encoded to prevent injection)
    const itemPath = item_type === "folder" ? "folder" : "n";
    const shareUrl = `${siteUrl}/${encodeSegment(ownerUsername)}/${itemPath}/${encodeSegment(item_slug)}`;

    const itemLabel = item_type === "folder" ? "folder" : "note";

    // Pre-escaped values for the HTML body
    const safeInviterName = escapeHtml(inviterName);
    const safeItemTitle = escapeHtml(itemTitle);
    const safeShareUrl = escapeHtml(shareUrl);

    // Send email via Resend API directly (no SDK needed in Edge Functions)
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Confluence <${fromEmail}>`,
        reply_to: inviterEmail,
        to: [inviteeEmail],
        subject: `${inviterName} invited you to collaborate on "${itemTitle}"`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#1d1d1f;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                    <tr>
                      <td style="padding:32px 32px 0;text-align:center;">
                        <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#1d1d1f;">
                          You've been invited!
                        </h1>
                        <p style="margin:0 0 24px;font-size:14px;color:#86868b;">
                          ${safeInviterName} shared a private ${itemLabel} with you
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 32px;">
                        <div style="background:#f5f5f7;border-radius:12px;padding:20px;margin-bottom:24px;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#86868b;">
                            ${item_type === "folder" ? "FOLDER" : "NOTE"}
                          </p>
                          <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1d1d1f;">
                            ${safeItemTitle}
                          </p>
                        </div>
                        <a href="${safeShareUrl}" style="display:block;text-align:center;padding:12px 24px;border-radius:10px;background:#0d7f66;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:24px;">
                          Open ${itemLabel}
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:24px 32px 32px;border-top:1px solid #e8e8ed;">
                        <p style="margin:0;font-size:11px;color:#86868b;text-align:center;">
                          Sent via Confluence — a structured note-sharing platform.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend error:", result);
      return new Response(
        JSON.stringify({ error: result.message ?? "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error sending invite:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
