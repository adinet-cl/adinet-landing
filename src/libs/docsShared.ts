export type DocsLocale = "en" | "es";

export const SITE_LOCALES = ["en-us", "es-mx", "es-es"] as const;

export interface Heading {
  depth: number;
  slug: string;
  text: string;
}

export interface NavItem<TSection extends string = string> {
  slug: string;
  title: string;
  navTitle: string;
  description: string;
  section: TSection;
  order: number;
  badge?: string;
  href: string;
}

export interface NavGroup<TSection extends string = string> {
  key: TSection;
  label: string;
  items: NavItem<TSection>[];
}

export function resolveDocsLocale(siteLang: string): DocsLocale {
  return siteLang.startsWith("es") ? "es" : "en";
}

export function getCanonicalSlug(entryId: string): string {
  const withoutLocale = entryId.replace(/^(en|es)\//, "");
  return withoutLocale.replace(/\.md$/, "");
}

export function getDocHref(
  siteLang: string,
  basePath: string,
  canonicalSlug: string
): string {
  if (canonicalSlug === "overview") {
    return `/${siteLang}/${basePath}`;
  }
  return `/${siteLang}/${basePath}/${canonicalSlug}`;
}

export function getPrevNext<TSection extends string>(
  navItems: NavItem<TSection>[],
  currentSlug: string
) {
  const idx = navItems.findIndex((item) => item.slug === currentSlug);
  if (idx === -1) return { prev: undefined, next: undefined };
  return {
    prev: idx > 0 ? navItems[idx - 1] : undefined,
    next: idx < navItems.length - 1 ? navItems[idx + 1] : undefined,
  };
}

export interface GenericDocEntry<TSection extends string> {
  id: string;
  body?: string;
  data: {
    title: string;
    navTitle?: string;
    description: string;
    section: TSection;
    order: number;
    badge?: string;
  };
}

export function buildDocsNavigation<
  TSection extends string,
  TEntry extends GenericDocEntry<TSection>
>(
  entries: TEntry[],
  sectionOrder: readonly TSection[],
  sectionLabels: Record<TSection, string>,
  siteLang: string,
  basePath: string
) {
  const sectionIndex = new Map(sectionOrder.map((s, idx) => [s, idx]));

  const sorted = [...entries].sort((a, b) => {
    const sa = sectionIndex.get(a.data.section) ?? 99;
    const sb = sectionIndex.get(b.data.section) ?? 99;
    if (sa !== sb) return sa - sb;
    return a.data.order - b.data.order;
  });

  const navItems: NavItem<TSection>[] = sorted.map((entry) => {
    const slug = getCanonicalSlug(entry.id);
    return {
      slug,
      title: entry.data.title,
      navTitle: entry.data.navTitle || entry.data.title,
      description: entry.data.description,
      section: entry.data.section,
      order: entry.data.order,
      badge: entry.data.badge,
      href: getDocHref(siteLang, basePath, slug),
    };
  });

  const groups: NavGroup<TSection>[] = sectionOrder
    .map((key) => ({
      key,
      label: sectionLabels[key],
      items: navItems.filter((item) => item.section === key),
    }))
    .filter((g) => g.items.length > 0);

  return { entries: sorted, navItems, groups };
}

export function extractHeadings(markdown: string): string[] {
  const matches = markdown.match(/^#{2,3}\s+(.+)$/gm) || [];
  return matches.map((line) =>
    line
      .replace(/^#{2,3}\s+/, "")
      .replace(/[`*_~]/g, "")
      .trim()
  );
}

export function stripMarkdown(markdown: string): string {
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

export function buildSearchIndex<
  TSection extends string,
  TEntry extends GenericDocEntry<TSection>
>(
  entries: TEntry[],
  sectionLabels: Record<TSection, string>,
  siteLang: string,
  basePath: string
) {
  return entries.map((entry) => {
    const slug = getCanonicalSlug(entry.id);
    const body = entry.body || "";
    return {
      title: entry.data.title,
      description: entry.data.description,
      section: sectionLabels[entry.data.section],
      href: getDocHref(siteLang, basePath, slug),
      headings: extractHeadings(body),
      excerpt: stripMarkdown(body),
    };
  });
}
