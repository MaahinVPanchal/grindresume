import fs from "node:fs";
import { FEATURED } from "../src/lib/companies.ts";
import { companySlug } from "../src/lib/company-slug.ts";

const base = "https://grindresume.lovable.app";
const pages = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/resume", changefreq: "daily", priority: "0.9" },
  { loc: "/yc", changefreq: "daily", priority: "0.8" },
  { loc: "/quiz", changefreq: "weekly", priority: "0.7" },
  { loc: "/focus", changefreq: "monthly", priority: "0.7" },
  { loc: "/chat", changefreq: "weekly", priority: "0.6" },
  { loc: "/saved", changefreq: "weekly", priority: "0.5" },
];

const companyPages = FEATURED.map(([name]) => ({
  loc: `/company/${companySlug(name)}`,
  changefreq: "daily",
  priority: "0.8",
}));

const all = [...pages, ...companyPages];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all
  .map(
    (p) => `  <url>
    <loc>${base}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

fs.writeFileSync("public/sitemap.xml", xml, "utf8");
console.log(`Generated public/sitemap.xml with ${all.length} URLs`);
