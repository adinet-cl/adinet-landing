import { getCollection, type CollectionEntry } from "astro:content";
import {
  SITE_LOCALES,
  resolveDocsLocale,
  getCanonicalSlug,
  getDocHref as getSharedDocHref,
  getPrevNext,
  buildDocsNavigation,
  type DocsLocale,
  type NavItem,
  type NavGroup,
} from "./docsShared";

export type AutorixDocEntry = CollectionEntry<"autorixDocs">;
export type DocsSectionKey =
  | "overview"
  | "engines"
  | "control-plane"
  | "sdks"
  | "operations"
  | "reference";

export { SITE_LOCALES, resolveDocsLocale, getCanonicalSlug, getPrevNext };
export type { DocsLocale, NavItem, NavGroup };

export const SECTION_ORDER: DocsSectionKey[] = [
  "overview",
  "engines",
  "control-plane",
  "sdks",
  "operations",
  "reference",
];

export const SECTION_LABELS: Record<DocsLocale, Record<DocsSectionKey, string>> =
  {
    en: {
      overview: "Overview & Architecture",
      engines: "Zero-Trust IAM Engines",
      "control-plane": "Control Plane & Console",
      sdks: "Client SDKs, CLI & IaC",
      operations: "Operations & Production",
      reference: "Architecture & Community",
    },
    es: {
      overview: "Visión General y Arquitectura",
      engines: "Motores IAM Zero-Trust",
      "control-plane": "Plano de Control y Consola",
      sdks: "SDKs Oficiales, CLI e IaC",
      operations: "Operaciones y Producción",
      reference: "Arquitectura y Comunidad",
    },
  };

export function getDocHref(siteLang: string, canonicalSlug: string): string {
  return getSharedDocHref(siteLang, "autorix", canonicalSlug);
}

export async function getAutorixDocsForLocale(siteLang: string) {
  const docsLocale = resolveDocsLocale(siteLang);
  const allEntries = await getCollection("autorixDocs", ({ id }) =>
    id.startsWith(`${docsLocale}/`)
  );

  const nav = buildDocsNavigation(
    allEntries,
    SECTION_ORDER,
    SECTION_LABELS[docsLocale],
    siteLang,
    "autorix"
  );

  return {
    docsLocale,
    ...nav,
  };
}
