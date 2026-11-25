import type { APIRoute } from "astro";
import {
  SITE_LOCALES,
  SECTION_LABELS,
  getAutorixDocsForLocale,
  getCanonicalSlug,
  getDocHref,
} from "../../../libs/autorixDocs";

export function getStaticPaths() {
  return SITE_LOCALES.map((lang) => ({ params: { lang } }));
}

function extractHeadings(markdown: string): string[] {
  const matches = markdown.match(/^#{2,3}\s+(.+)$/gm) || [];
  return matches.map((line) =>
    line
      .replace(/^#{2,3}\s+/, "")
      .replace(/[`*_~]/g, "")
      .trim()
  );
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[|*_>~#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang || "en-us";
  const { docsLocale, entries } = await getAutorixDocsForLocale(lang);

  const payload = entries.map((entry) => {
    const slug = getCanonicalSlug(entry.id);
    const body = entry.body || "";
    return {
      title: entry.data.title,
      description: entry.data.description,
      section: SECTION_LABELS[docsLocale][entry.data.section],
      href: getDocHref(lang, slug),
      headings: extractHeadings(body),
      excerpt: stripMarkdown(body),
    };
  });

  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};
