import { readFile, writeFile } from "node:fs/promises";

const sitemapPath = new URL("../dist/sitemap.xml", import.meta.url);
const today = new Date().toISOString().slice(0, 10);

const sitemap = await readFile(sitemapPath, "utf8");
const nextSitemap = sitemap.replace(
  /<lastmod>[^<]*<\/lastmod>/,
  `<lastmod>${today}</lastmod>`,
);

await writeFile(sitemapPath, nextSitemap);
