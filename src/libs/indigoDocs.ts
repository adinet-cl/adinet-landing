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

export type IndigoDocEntry = CollectionEntry<"indigoDocs">;
export type IndigoSectionKey =
  | "overview"
  | "schema"
  | "orm"
  | "migrations"
  | "realtime"
  | "studio"
  | "packages";

export { SITE_LOCALES, resolveDocsLocale, getCanonicalSlug, getPrevNext };
export type { DocsLocale, NavItem, NavGroup };

export const SECTION_ORDER: IndigoSectionKey[] = [
  "overview",
  "schema",
  "orm",
  "migrations",
  "realtime",
  "studio",
  "packages",
];

export const SECTION_LABELS: Record<
  DocsLocale,
  Record<IndigoSectionKey, string>
> = {
  en: {
    overview: "Overview & Getting Started",
    schema: "Schema Language (.indigo)",
    orm: "Type-Safe ORM Client",
    migrations: "Migrations & Introspection",
    realtime: "Realtime, Channels & React",
    studio: "Studio & CLI",
    packages: "npm Packages (@indigodb)",
  },
  es: {
    overview: "Visión General e Inicio",
    schema: "Lenguaje de Esquema (.indigo)",
    orm: "Cliente ORM Tipado",
    migrations: "Migraciones e Introspección",
    realtime: "Tiempo Real, Canales y React",
    studio: "Studio y CLI",
    packages: "Paquetes npm (@indigodb)",
  },
};

export function getIndigoDocHref(
  siteLang: string,
  canonicalSlug: string
): string {
  return getSharedDocHref(siteLang, "indigodb", canonicalSlug);
}

export async function getIndigoDocsForLocale(siteLang: string) {
  const docsLocale = resolveDocsLocale(siteLang);
  const allEntries = await getCollection("indigoDocs", ({ id }) =>
    id.startsWith(`${docsLocale}/`)
  );

  const nav = buildDocsNavigation(
    allEntries,
    SECTION_ORDER,
    SECTION_LABELS[docsLocale],
    siteLang,
    "indigodb"
  );

  return {
    docsLocale,
    ...nav,
  };
}
