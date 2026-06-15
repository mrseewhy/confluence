import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initSentry } from './lib/sentry'
import App from './App'

// ── Error monitoring — no-op if VITE_SENTRY_DSN is not set ────
initSentry()

// ── Startup environment variable validation ───────────────────
// Fail early with a clear message instead of silent runtime errors.

const REQUIRED_ENV_VARS: Record<string, string> = {
  VITE_SUPABASE_URL: 'Supabase project URL (e.g. https://xxx.supabase.co)',
  VITE_SUPABASE_ANON_KEY: 'Supabase anon/public key',
}

const missing: string[] = []

for (const [key, description] of Object.entries(REQUIRED_ENV_VARS)) {
  if (!import.meta.env[key]) {
    missing.push(`  • ${key} — ${description}`)
  }
}

if (missing.length > 0) {
  const message = [
    '❌ Missing required environment variables:',
    '',
    ...missing,
    '',
    'Create a .env.local file in the project root with:',
    '',
    '  VITE_SUPABASE_URL=https://your-project.supabase.co',
    '  VITE_SUPABASE_ANON_KEY=your-anon-key',
    '',
    'See .env.example for all available variables.',
  ].join('\n')

  // Render the error directly to the DOM
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="
        max-width: 560px;
        margin: 80px auto;
        padding: 32px 40px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #fff;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      ">
        <div style="font-size: 32px; margin-bottom: 16px;">⚠️</div>
        <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 8px; color: #1d1d1f;">
          Configuration Error
        </h1>
        <p style="font-size: 14px; color: #86868b; line-height: 1.6; white-space: pre-wrap; margin: 0;">
          ${message.replace(/\n/g, '<br>')}
        </p>
      </div>
    `
  }
  throw new Error(message)
}

// ── Render app ────────────────────────────────────────────────

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
