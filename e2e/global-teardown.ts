/**
 * Global teardown: remove data the e2e suite creates.
 *
 * The specs deliberately create real notes, folders and comments against the
 * local database. Left behind, that data accumulates and makes later runs
 * flaky (duplicate titles trip strict-mode locators, and lists grow until
 * assertions time out). Cleaning up here keeps runs repeatable.
 *
 * Only touches clearly-marked test data, never seed content.
 */

import { execFileSync } from 'node:child_process'

const CLEANUP_SQL = `
  delete from public.note_comments where body like 'E2E comment%';
  delete from public.notes
   where title like 'E2E %'
      or title like 'End-to-End Test Note%'
      or title like 'Collaboration Editor Test%'
      or slug like 'e2e-%'
      or slug like 'collab-edit-%';
  delete from public.folders
   where title like 'E2E %'
      or slug like 'e2e-%';
`

export default function globalTeardown() {
  try {
    execFileSync(
      'psql',
      ['-h', '127.0.0.1', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', CLEANUP_SQL],
      { env: { ...process.env, PGPASSWORD: 'postgres' }, stdio: 'pipe' },
    )
  } catch {
    // The local stack may not be running (e.g. tests against a deployed URL).
    // Cleanup is best-effort and must never fail the run.
  }
}
