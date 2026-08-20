document.querySelectorAll<HTMLElement>("[data-partners-hover]").forEach((root) => {
  const groups = new Map<string, HTMLElement[]>();
  root.querySelectorAll<HTMLElement>("[data-key]").forEach((el) => {
    const key = el.dataset.key;
    if (!key) return;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(el);
  });

  for (const els of groups.values()) {
    for (const el of els) {
      el.addEventListener("mouseenter", () => els.forEach((e) => e.classList.add("is-highlighted")));
      el.addEventListener("mouseleave", () => els.forEach((e) => e.classList.remove("is-highlighted")));
    }
  }
});
