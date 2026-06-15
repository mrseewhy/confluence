// Supabase Edge Function — Send Collaborator Invite
// Called from ShareModal after a collaborator is inserted.
// Sends a notification email to the invitee via Resend.
//
// Required env vars:
//   RESEND_API_KEY   — API key from https://resend.com/api-keys
//   SITE_URL         — the base URL of the app (used to construct share links)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface InvitePayload {
  inviter_name: string;
  inviter_email: string;
  invitee_email: string;
  item_type: "folder" | "note";
  item_title: string;
  item_slug: string;
  access_level: "viewer" | "editor";
  owner_username: string;
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

  if (!checkMemoryRateLimit(clientIp)) {
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
    const payload: InvitePayload = await req.json();

    const {
      inviter_name,
      inviter_email,
      invitee_email,
      item_type,
      item_title,
      item_slug,
      access_level,
      owner_username,
    } = payload;

    // Validate required fields
    if (!invitee_email || !item_title || !owner_username) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: invitee_email, item_title, owner_username" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate email format (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(invitee_email)) {
      return new Response(
        JSON.stringify({ error: "Invalid invitee email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build the share link
    const itemPath = item_type === "folder" ? "folder" : "n";
    const shareUrl = `${siteUrl}/${owner_username}/${itemPath}/${item_slug}`;

    const roleLabel = access_level === "editor" ? "can edit" : "can view";
    const itemLabel = item_type === "folder" ? "folder" : "note";

    // Send email via Resend API directly (no SDK needed in Edge Functions)
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Confluence <${fromEmail}>`,
        reply_to: inviter_email,
        to: [invitee_email],
        subject: `${inviter_name} invited you to collaborate on "${item_title}"`,
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
                          ${inviter_name} shared a private ${itemLabel} with you
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
                            ${item_title}
                          </p>
                        </div>
                        <a href="${shareUrl}" style="display:block;text-align:center;padding:12px 24px;border-radius:10px;background:#0d7f66;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:24px;">
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
