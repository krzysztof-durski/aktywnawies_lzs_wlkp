// Preview iframes start hidden and with no `src` set — the PDF only loads once
// the visitor actually asks to see it, instead of every document on the page
// (do-pobrania can list dozens) fetching its whole PDF up front.
document.querySelectorAll<HTMLButtonElement>("[data-preview-toggle]").forEach((button) => {
  const wrap = button.closest("li")?.querySelector<HTMLElement>(".doc-preview-wrap");
  const iframe = wrap?.querySelector<HTMLIFrameElement>("iframe");
  if (!wrap || !iframe) return;

  const openLabel = button.textContent ?? "Podgląd";
  button.addEventListener("click", () => {
    const willOpen = wrap.hidden;
    wrap.hidden = !willOpen;
    button.textContent = willOpen ? "Ukryj podgląd" : openLabel;
    if (willOpen && !iframe.src && iframe.dataset.src) {
      iframe.src = iframe.dataset.src;
    }
  });
});
