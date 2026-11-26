import type { APIRoute } from "astro";
import { buildSearchIndex } from "../../../libs/docsShared";
import {
  SITE_LOCALES,
  SECTION_LABELS,
  getIndigoDocsForLocale,
} from "../../../libs/indigoDocs";

export function getStaticPaths() {
  return SITE_LOCALES.map((lang) => ({ params: { lang } }));
}

export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang || "en-us";
  const { docsLocale, entries } = await getIndigoDocsForLocale(lang);
  const payload = buildSearchIndex(
    entries,
    SECTION_LABELS[docsLocale],
    lang,
    "indigodb"
  );

  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};
