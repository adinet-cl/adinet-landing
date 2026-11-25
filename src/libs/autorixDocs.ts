import { getCollection, type CollectionEntry } from "astro:content";

export type AutorixDocEntry = CollectionEntry<"autorixDocs">;
export type DocsLocale = "en" | "es";
export type DocsSectionKey =
  | "overview"
  | "engines"
  | "control-plane"
  | "sdks"
  | "operations"
  | "reference";

export const SITE_LOCALES = ["en-us", "es-mx", "es-es"] as const;

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

export function resolveDocsLocale(siteLang: string): DocsLocale {
  return siteLang.startsWith("es") ? "es" : "en";
}

export function getCanonicalSlug(entryId: string): string {
  const withoutLocale = entryId.replace(/^(en|es)\//, "");
  return withoutLocale.replace(/\.md$/, "");
}

export function getDocHref(siteLang: string, canonicalSlug: string): string {
  if (canonicalSlug === "overview") {
    return `/${siteLang}/autorix`;
  }
  return `/${siteLang}/autorix/${canonicalSlug}`;
}

export interface NavItem {
  slug: string;
  title: string;
  navTitle: string;
  description: string;
  section: DocsSectionKey;
  order: number;
  badge?: string;
  href: string;
}

export interface NavGroup {
  key: DocsSectionKey;
  label: string;
  items: NavItem[];
}

export async function getAutorixDocsForLocale(siteLang: string) {
  const docsLocale = resolveDocsLocale(siteLang);
  const allEntries = await getCollection("autorixDocs", ({ id }) =>
    id.startsWith(`${docsLocale}/`)
  );

  const sectionIndex = new Map(SECTION_ORDER.map((s, idx) => [s, idx]));

  const sorted = [...allEntries].sort((a, b) => {
    const sa = sectionIndex.get(a.data.section) ?? 99;
    const sb = sectionIndex.get(b.data.section) ?? 99;
    if (sa !== sb) return sa - sb;
    return a.data.order - b.data.order;
  });

  const navItems: NavItem[] = sorted.map((entry) => {
    const slug = getCanonicalSlug(entry.id);
    return {
      slug,
      title: entry.data.title,
      navTitle: entry.data.navTitle || entry.data.title,
      description: entry.data.description,
      section: entry.data.section,
      order: entry.data.order,
      badge: entry.data.badge,
      href: getDocHref(siteLang, slug),
    };
  });

  const groups: NavGroup[] = SECTION_ORDER.map((key) => ({
    key,
    label: SECTION_LABELS[docsLocale][key],
    items: navItems.filter((item) => item.section === key),
  })).filter((g) => g.items.length > 0);

  return {
    docsLocale,
    entries: sorted,
    navItems,
    groups,
  };
}

export function getPrevNext(navItems: NavItem[], currentSlug: string) {
  const idx = navItems.findIndex((item) => item.slug === currentSlug);
  if (idx === -1) return { prev: undefined, next: undefined };
  return {
    prev: idx > 0 ? navItems[idx - 1] : undefined,
    next: idx < navItems.length - 1 ? navItems[idx + 1] : undefined,
  };
}
