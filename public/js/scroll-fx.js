// Scroll effects driven in JS so they behave the same in Safari, Firefox and Chrome
// (no CSS scroll-timeline). Mirrors the design reference:
//   .bx-reveal / .bx-zoom          → .is-in once they enter the viewport
//   .bx-parallax / .bx-kb / .bx-ink → --v : 0..1 progress of the element through the viewport
//   .bx-pin / .bx3-pin             → --p : 0..1 progress through the pinned (sticky) section

const clamp01 = (n) => Math.min(1, Math.max(0, n));

/** 0..1 progress through a tall section whose child is position:sticky. */
export function pinProgress(el, vh = window.innerHeight || 800) {
  const r = el.getBoundingClientRect();
  const span = Math.max(1, r.height - vh);
  return clamp01(-r.top / span);
}

export function initScrollFx(root = document) {
  const all = (sel) => Array.from(root.querySelectorAll(sel));

  // --- reveal on enter
  const reveals = all('.bx-reveal, .bx-zoom');
  let io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  // --- scroll-linked custom properties
  const views = all('.bx-parallax, .bx-kb, .bx-ink');
  const pins = all('.bx-pin, .bx3-pin');

  // Only measure elements that are near the viewport.
  const near = new Set();
  let nio = null;
  if ('IntersectionObserver' in window) {
    nio = new IntersectionObserver((entries) => {
      for (const e of entries) e.isIntersecting ? near.add(e.target) : near.delete(e.target);
      schedule();
    }, { rootMargin: '100px 0px 100px 0px' });
    [...views, ...pins].forEach((el) => nio.observe(el));
  } else {
    [...views, ...pins].forEach((el) => near.add(el));
  }

  let raf = 0;
  const update = () => {
    raf = 0;
    const vh = window.innerHeight || 800;
    for (const el of views) {
      if (!near.has(el)) continue;
      const r = el.getBoundingClientRect();
      const v = clamp01((vh - r.top) / (vh + r.height));
      el.style.setProperty('--v', v.toFixed(4));
    }
    for (const el of pins) {
      if (!near.has(el)) continue;
      el.style.setProperty('--p', pinProgress(el, vh).toFixed(4));
    }
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  // Late layout shifts (fonts, images) change element positions without a scroll.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  window.addEventListener('load', schedule);
  update();

  return () => {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    cancelAnimationFrame(raf);
    if (io) io.disconnect();
    if (nio) nio.disconnect();
  };
}
