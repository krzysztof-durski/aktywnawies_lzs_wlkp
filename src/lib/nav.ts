// Nav shape mirrors the reference site (igrzyskakzlzs.pl) and is hardcoded —
// it rarely changes. The content behind each link is fully admin-editable.

export const INFORMACJE_ITEMS = [
  { slug: "regulamin-igrzysk", title: "Regulamin Igrzysk", kind: "document" as const },
  { slug: "program-igrzysk", title: "Program Igrzysk", kind: "document" as const },
  { slug: "harmonogram-igrzysk", title: "Harmonogram Igrzysk", kind: "document" as const },
  { slug: "organizatorzy", title: "Organizatorzy", kind: "page" as const },
  { slug: "obiekty-igrzysk", title: "Obiekty Igrzysk", kind: "page" as const },
  { slug: "historia-igrzysk", title: "Historia Igrzysk", kind: "page" as const },
];

export const KONKURENCJE_BLOCKS = [
  { slug: "sportowy", title: "Blok sportowy" },
  { slug: "rekreacyjny", title: "Blok Rekreacyjny" },
  { slug: "integracyjny", title: "Blok integracyjny" },
] as const;

export type BlockSlug = (typeof KONKURENCJE_BLOCKS)[number]["slug"];

export function isBlockSlug(value: string): value is BlockSlug {
  return KONKURENCJE_BLOCKS.some((b) => b.slug === value);
}

export function informacjeItem(slug: string) {
  return INFORMACJE_ITEMS.find((item) => item.slug === slug);
}

/** `/galeria/glowny` is the virtual main-gallery page — a real album can never use this slug. */
export const MAIN_GALLERY_SLUG = "glowny";
