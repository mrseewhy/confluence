import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SeoHead } from "@/components/SeoHead";

export function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <SeoHead title="Terms of Service" />
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
          Terms of Service
        </h1>

        <section style={{ marginBottom: "var(--space-6)", lineHeight: "var(--line-height-loose)" }}>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
            1. Acceptance of Terms
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
            By accessing or using Confluence ("the Service"), you agree to be bound by these Terms of Service.
            If you do not agree, do not use the Service.
          </p>
        </section>

        <section style={{ marginBottom: "var(--space-6)", lineHeight: "var(--line-height-loose)" }}>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
            2. User Accounts
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
            You are responsible for maintaining the confidentiality of your account credentials.
            You must notify us immediately of any unauthorized use of your account.
          </p>
        </section>

        <section style={{ marginBottom: "var(--space-6)", lineHeight: "var(--line-height-loose)" }}>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
            3. Content
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
            You retain ownership of all content you create on the Service. By publishing content,
            you grant us a license to host and display it as part of the Service.
            You represent that your content does not violate any third-party rights.
          </p>
        </section>

        <section style={{ marginBottom: "var(--space-6)", lineHeight: "var(--line-height-loose)" }}>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
            4. Acceptable Use
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
            You agree not to use the Service for any unlawful purpose or in violation of any applicable laws.
            We reserve the right to remove content and terminate accounts that violate these terms.
          </p>
        </section>

        <section style={{ marginBottom: "var(--space-6)", lineHeight: "var(--line-height-loose)" }}>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
            5. Limitation of Liability
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
            The Service is provided "as is" without warranties of any kind. We are not liable for
            any damages arising from your use of the Service.
          </p>
        </section>

        <section style={{ marginBottom: "var(--space-6)", lineHeight: "var(--line-height-loose)" }}>
          <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
            6. Changes
          </h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
            We may update these terms at any time. Continued use of the Service after changes
            constitutes acceptance of the new terms.
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
