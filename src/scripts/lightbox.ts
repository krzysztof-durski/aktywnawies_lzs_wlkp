const lightbox = document.getElementById("lightbox");
const thumbs = Array.from(document.querySelectorAll<HTMLAnchorElement>(".gallery-thumb"));
if (lightbox && thumbs.length > 0) {
  const img = lightbox.querySelector<HTMLImageElement>(".lightbox-img")!;
  const caption = lightbox.querySelector<HTMLElement>(".lightbox-caption")!;
  let currentIndex = 0;

  function show(index: number) {
    currentIndex = (index + thumbs.length) % thumbs.length;
    const thumb = thumbs[currentIndex];
    img.src = thumb.href;
    img.alt = thumb.dataset.caption ?? "";
    caption.textContent = thumb.dataset.caption ?? "";
  }

  function open(index: number) {
    show(index);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function close() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
  }

  thumbs.forEach((thumb, i) => {
    thumb.addEventListener("click", (e) => {
      e.preventDefault();
      open(i);
    });
  });

  lightbox.querySelector(".lightbox-close")?.addEventListener("click", close);
  lightbox.querySelector(".lightbox-prev")?.addEventListener("click", () => show(currentIndex - 1));
  lightbox.querySelector(".lightbox-next")?.addEventListener("click", () => show(currentIndex + 1));

  // Click on the dark backdrop (outside the figure/buttons) also closes.
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(currentIndex - 1);
    if (e.key === "ArrowRight") show(currentIndex + 1);
  });
}
