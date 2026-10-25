export const SITE_URL = "https://grindresume.lovable.app";

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
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: o.title },
      { name: "twitter:description", content: o.description },
      ...(o.noindex ? [{ name: "robots", content: "noindex" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
