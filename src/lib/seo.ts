export const SITE_URL = "https://grindresume.lovable.app";
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

/** Page-specific head tags: title, description, canonical, og:* and twitter:* all pointing at the page itself. */
export function pageHead(o: { title: string; description: string; path: string; type?: string; noindex?: boolean }) {
  const url = `${SITE_URL}${o.path === "/" ? "/" : o.path}`;
  return {
    meta: [
      { title: o.title },
      { name: "description", content: o.description },
      { property: "og:title", content: o.title },
      { property: "og:description", content: o.description },
      { property: "og:url", content: url },
      { property: "og:type", content: o.type ?? "website" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: o.title },
      { name: "twitter:description", content: o.description },
      { name: "twitter:image", content: OG_IMAGE },
      ...(o.noindex ? [{ name: "robots", content: "noindex" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
