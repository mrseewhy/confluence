import { Helmet } from "react-helmet-async";

interface SeoHeadProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
}

const SITE_NAME = "Confluence";
const DEFAULT_DESCRIPTION = "A collaborative note-taking app with real-time editing, folder organisation, and granular sharing permissions.";
const DEFAULT_IMAGE = "/og-image.png";

export function SeoHead({ title, description, image, url }: SeoHeadProps) {
  const fullTitle = `${title} — ${SITE_NAME}`;
  const desc = description || DEFAULT_DESCRIPTION;
  const img = image || DEFAULT_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      <meta property="og:type" content="website" />
      {url && <meta property="og:url" content={url} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  );
}
