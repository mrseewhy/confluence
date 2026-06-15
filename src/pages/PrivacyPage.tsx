import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SeoHead } from "@/components/SeoHead";

export function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <SeoHead title="Privacy Policy" />
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
        <h1 style={{ fontSize: "var(--font-size-3xl)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-6)" }}>
          Privacy Policy
        </h1>

        <section style={{ marginBottom: "var(--space-6)", lineHeight: "var(--line-height-loose)" }}>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
            1. Information We Collect
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
            We collect information you provide when creating an account (name, email address) and
            content you create using the Service (notes, folders, blocks). We also collect basic
            usage data such as page views and feature interactions.
          </p>
        </section>

        <section style={{ marginBottom: "var(--space-6)", lineHeight: "var(--line-height-loose)" }}>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
            2. How We Use Your Information
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
            We use your information to provide, maintain, and improve the Service; to send
            collaboration notifications; and to communicate with you about your account.
          </p>
        </section>

        <section style={{ marginBottom: "var(--space-6)", lineHeight: "var(--line-height-loose)" }}>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
            3. Data Sharing
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
            We do not sell your personal data. Content you mark as public is visible to anyone.
            We may share data with service providers (hosting, email delivery) who are bound by
            data processing agreements.
          </p>
        </section>

        <section style={{ marginBottom: "var(--space-6)", lineHeight: "var(--line-height-loose)" }}>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
            4. Data Retention
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
            We retain your data for as long as your account is active. You may request deletion
            of your account at any time, which will remove your data within 30 days.
          </p>
        </section>

        <section style={{ marginBottom: "var(--space-6)", lineHeight: "var(--line-height-loose)" }}>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
            5. Cookies
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
            We use essential cookies for authentication and session management. No third-party
            tracking cookies are used.
          </p>
        </section>

        <section style={{ marginBottom: "var(--space-6)", lineHeight: "var(--line-height-loose)" }}>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
            6. Your Rights
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
            You may access, update, or delete your personal data through your account settings.
            You may contact us to exercise any data protection rights.
          </p>
        </section>

        <section style={{ marginBottom: "var(--space-6)", lineHeight: "var(--line-height-loose)" }}>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
            7. Contact
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
            For privacy-related inquiries, please contact the service administrator.
          </p>
        </section>

        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", marginTop: "var(--space-8)" }}>
          Last updated: June 2026
        </p>
      </main>
      <Footer />
    </div>
  );
}
