// Nav shape mirrors the reference site (igrzyskakzlzs.pl) and is hardcoded —
// it rarely changes. Document-kind items are admin-editable (uploaded PDFs);
// page-kind items are hardcoded Astro pages under src/pages/informacje/.

export const INFORMACJE_ITEMS = [
  { slug: "regulamin-igrzysk", title: "Regulamin Igrzysk", kind: "page" as const },
  { slug: "program-igrzysk", title: "Program Igrzysk", kind: "page" as const },
  { slug: "organizatorzy", title: "Organizatorzy i Partnerzy", kind: "page" as const },
  { slug: "o-igrzyskach", title: "O Igrzyskach", kind: "page" as const },
];

export function informacjeItem(slug: string) {
  return INFORMACJE_ITEMS.find((item) => item.slug === slug);
}

/** `/galeria/glowny` is the virtual main-gallery page — a real album can never use this slug. */
export const MAIN_GALLERY_SLUG = "glowny";
