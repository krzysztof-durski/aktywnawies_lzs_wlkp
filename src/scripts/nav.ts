const toggle = document.querySelector<HTMLButtonElement>(".nav-toggle");
const nav = document.getElementById("site-nav");
toggle?.addEventListener("click", () => {
  const isOpen = nav?.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
});

// Informacje/Konkurencje open on hover only (pure CSS, see global.css) — the
// trigger isn't a link and does nothing on click. On touch devices there is
// no hover at all, so this same click still needs to open the dropdown there;
// matchMedia keeps it from doing anything on devices that do support hover.
if (window.matchMedia("(hover: none)").matches) {
  document.querySelectorAll<HTMLButtonElement>(".nav-dropdown__trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const parent = trigger.closest(".nav-dropdown");
      const isOpen = parent?.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", String(Boolean(isOpen)));
    });
  });

  // Same story one level down: the Konkurencje section headers (e.g.
  // "Ludowe Gry Sportowe") are buttons, not links — nothing to navigate
  // to — so touch needs its own tap-to-open toggle for their flyouts too.
  document.querySelectorAll<HTMLButtonElement>(".flyout-trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      trigger.closest(".dropdown-item")?.classList.toggle("is-open");
    });
  });
}
