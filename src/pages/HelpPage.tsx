import { Link } from "react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SeoHead } from "@/components/SeoHead";

interface Section {
  id: string;
  title: string;
  body: React.ReactNode;
}

const linkStyle: React.CSSProperties = {
  color: "var(--color-accent)",
  textDecoration: "underline",
};

const h2Style: React.CSSProperties = {
  fontSize: "var(--font-size-xl)",
  fontWeight: "var(--font-weight-semibold)",
  marginBottom: "var(--space-3)",
};

const pStyle: React.CSSProperties = {
  color: "var(--color-text-secondary)",
  marginBottom: "var(--space-3)",
  lineHeight: "var(--line-height-loose)",
};

const sections: Section[] = [
  {
    id: "start",
    title: "Creating your first note",
    body: (
      <>
        <p style={pStyle}>
          Sign in, then choose <strong>Notes → New note</strong> from the dashboard.
          Give it a title; the URL slug is generated for you and can be edited.
        </p>
        <p style={pStyle}>
          Notes are saved automatically as you type. The indicator next to the
          title tells you the current state: <em>Saving…</em>, <em>Saved</em>, or
          an explanation if something needs your attention.
        </p>
      </>
    ),
  },
  {
    id: "organise",
    title: "Organising with folders",
    body: (
      <p style={pStyle}>
        Every note lives in a folder. Create folders from{" "}
        <strong>Folders → New folder</strong>, and nest them using subfolders.
        You can drag notes between folders from the Notes list.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "Sharing and collaborating",
    body: (
      <>
        <p style={pStyle}>
          Open a note and choose <strong>Share</strong> to invite someone by email.
          Invitees can be given <strong>viewer</strong> or <strong>editor</strong> access.
          Viewers can read and comment but cannot change the note.
        </p>
        <p style={pStyle}>
          Public notes are readable by anyone with the link and appear on your
          public profile at <code>/your-username</code>. Private notes only appear
          for you and people you have invited.
        </p>
      </>
    ),
  },
  {
    id: "editing-together",
    title: "What happens when two people edit at once",
    body: (
      <>
        <p style={pStyle}>
          If someone else saves while you are editing, Confluence first tries to
          combine both sets of changes. Edits to different parts of the note are
          merged silently and both are kept.
        </p>
        <p style={pStyle}>
          If you both changed the <em>same</em> passage, it will not guess. You will
          see <strong>“Edited elsewhere”</strong> — your text is safe in the editor,
          and you can reload to read their version or save again to replace it.
          Nothing is ever lost without telling you.
        </p>
      </>
    ),
  },
  {
    id: "offline",
    title: "Working offline",
    body: (
      <>
        <p style={pStyle}>
          If your connection drops, edits are kept on your device and the
          indicator shows <strong>“Saved offline — will sync”</strong>. When the
          connection returns, queued changes are sent automatically.
        </p>
        <p style={pStyle}>
          You can keep reading and editing an open note without a connection.
          Getting to the app itself offline works once you have loaded it at
          least once.
        </p>
      </>
    ),
  },
  {
    id: "history",
    title: "Version history and restoring",
    body: (
      <p style={pStyle}>
        Every save keeps a snapshot. Open <strong>Version history</strong> to see
        older revisions, compare one against the current note to see exactly what
        changed, and restore it if you need to undo a lot of work.
      </p>
    ),
  },
  {
    id: "export",
    title: "Exporting your work",
    body: (
      <p style={pStyle}>
        The <strong>Export</strong> menu on any note downloads it as Markdown
        (<code>.md</code>), HTML (<code>.html</code>), or JSON (<code>.json</code>).
        Your writing is never locked in.
      </p>
    ),
  },
  {
    id: "search",
    title: "Finding things",
    body: (
      <p style={pStyle}>
        Press <kbd>⌘</kbd>+<kbd>K</kbd> (or <kbd>Ctrl</kbd>+<kbd>K</kbd>) anywhere in
        the dashboard to search notes, folders, and people at once.
      </p>
    ),
  },
  {
    id: "comments",
    title: "Comments",
    body: (
      <p style={pStyle}>
        Anyone who can read a note can comment on it. Replies are threaded, and
        you can delete your own comments.
      </p>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <p style={pStyle}>
        Change your display name, theme, and password from{" "}
        <strong>Settings</strong>. You can delete your account there too — this
        removes your notes and folders permanently, so export anything you want
        to keep first.
      </p>
    ),
  },
];

export function HelpPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <SeoHead title="Help & Getting Started" description="How to use Confluence: notes, folders, sharing, offline editing, version history and export." />
      <Navbar />
      <main
        style={{
          flex: 1,
          maxWidth: "720px",
          width: "100%",
          margin: "0 auto",
          padding: "var(--space-12) var(--space-6)",
        }}
      >
        <h1
          style={{
            fontSize: "var(--font-size-3xl)",
            fontWeight: "var(--font-weight-bold)",
            marginBottom: "var(--space-3)",
          }}
        >
          Help &amp; Getting Started
        </h1>
        <p style={{ ...pStyle, marginBottom: "var(--space-8)" }}>
          A short guide to how Confluence behaves — including what it does when
          things go wrong.
        </p>

        {/* Contents */}
        <nav
          aria-label="On this page"
          style={{
            marginBottom: "var(--space-8)",
            padding: "var(--space-4)",
            background: "var(--color-bg-subtle)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-2)" }}>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} style={linkStyle}>
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {sections.map((s) => (
          <section
            key={s.id}
            id={s.id}
            style={{ marginBottom: "var(--space-8)", scrollMarginTop: "var(--space-8)" }}
          >
            <h2 style={h2Style}>{s.title}</h2>
            {s.body}
          </section>
        ))}

        <p style={{ ...pStyle, marginTop: "var(--space-8)" }}>
          Still stuck? Start from the <Link to="/" style={linkStyle}>home page</Link> or
          review the <Link to="/terms" style={linkStyle}>terms</Link> and{" "}
          <Link to="/privacy" style={linkStyle}>privacy policy</Link>.
        </p>
      </main>
      <Footer />
    </div>
  );
}