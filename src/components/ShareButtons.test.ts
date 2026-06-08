import { describe, it, expect } from "vitest";
import { PLATFORMS } from "./ShareButtons";

describe("ShareButtons platforms", () => {
  it("exports all 7 platforms", () => {
    expect(PLATFORMS).toHaveLength(7);
    const ids = PLATFORMS.map((p) => p.id);
    expect(ids).toContain("twitter");
    expect(ids).toContain("facebook");
    expect(ids).toContain("linkedin");
    expect(ids).toContain("whatsapp");
    expect(ids).toContain("telegram");
    expect(ids).toContain("instagram");
    expect(ids).toContain("tiktok");
  });

  it("each platform has required fields", () => {
    for (const platform of PLATFORMS) {
      expect(platform.id).toBeTruthy();
      expect(platform.label).toBeTruthy();
      expect(platform.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(platform.icon).toBeTruthy();
      expect(typeof platform.getUrl).toBe("function");
    }
  });

  it("each platform icon is a valid SVG path", () => {
    for (const platform of PLATFORMS) {
      // SVG paths should contain letters, numbers, and path commands
      expect(platform.icon.length).toBeGreaterThan(20);
      // Should contain common SVG path commands
      expect(platform.icon).toMatch(/[MmLlCcZz]/);
    }
  });

  describe("URL generation", () => {
    const testUrl = "https://example.com/note/my-test-note";
    const testTitle = "My Test Note";

    it("twitter generates a tweet intent URL with title + URL", () => {
      const tw = PLATFORMS.find((p) => p.id === "twitter")!;
      const url = tw.getUrl(testUrl, testTitle, "");
      expect(url).toContain("https://twitter.com/intent/tweet");
      // Twitter builds text as "title — url"
      expect(url).toContain(encodeURIComponent(`${testTitle} — ${testUrl}`));
    });

    it("facebook generates a share URL with just the URL", () => {
      const fb = PLATFORMS.find((p) => p.id === "facebook")!;
      const url = fb.getUrl(testUrl, testTitle, "");
      expect(url).toContain("https://www.facebook.com/sharer/sharer.php");
      expect(url).toContain(encodeURIComponent(testUrl));
    });

    it("linkedin generates a share-offsite URL", () => {
      const li = PLATFORMS.find((p) => p.id === "linkedin")!;
      const url = li.getUrl(testUrl, testTitle, "");
      expect(url).toContain("https://www.linkedin.com/sharing/share-offsite");
      expect(url).toContain(encodeURIComponent(testUrl));
    });

    it("whatsapp generates a wa.me URL with title + URL", () => {
      const wa = PLATFORMS.find((p) => p.id === "whatsapp")!;
      const url = wa.getUrl(testUrl, testTitle, "");
      expect(url).toContain("https://wa.me/");
      // WhatsApp builds text as "title — url"
      expect(url).toContain(encodeURIComponent(`${testTitle} — ${testUrl}`));
    });

    it("telegram generates a t.me URL with both URL and text", () => {
      const tg = PLATFORMS.find((p) => p.id === "telegram")!;
      const url = tg.getUrl(testUrl, testTitle, "");
      expect(url).toContain("https://t.me/share/url");
      expect(url).toContain(encodeURIComponent(testUrl));
      // Telegram builds text as "title — url"
      expect(url).toContain(encodeURIComponent(`${testTitle} — ${testUrl}`));
    });

    it("instagram returns null (no web share API)", () => {
      const ig = PLATFORMS.find((p) => p.id === "instagram")!;
      expect(ig.getUrl(testUrl, testTitle, "")).toBeNull();
    });

    it("tiktok returns null (no web share API)", () => {
      const tk = PLATFORMS.find((p) => p.id === "tiktok")!;
      expect(tk.getUrl(testUrl, testTitle, "")).toBeNull();
    });
  });

  describe("URL encoding safety", () => {
    it("encodes special characters in URL and title", () => {
      const weirdUrl = "https://example.com/note/hello & goodbye?q=special!";
      const weirdTitle = "Hello & Goodbye: A <test> \"note\"";

      const tw = PLATFORMS.find((p) => p.id === "twitter")!;
      const url = tw.getUrl(weirdUrl, weirdTitle, "");

      // Should not contain raw special characters
      expect(url).not.toContain(" ");
      expect(url).not.toContain('"');
      expect(url).not.toContain("<");
      expect(url).not.toContain(">");

      // Should contain the encoded title+url
      expect(url).toContain(encodeURIComponent(`${weirdTitle} — ${weirdUrl}`));
    });
  });
});
