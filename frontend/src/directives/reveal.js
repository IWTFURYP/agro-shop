// v-reveal — блок м'яко з'являється, коли доходить до нього прокрутка.
// v-reveal="100" — затримка появи в мілісекундах (для каскаду карток).
let observer = null;

function getObserver() {
  if (observer || typeof IntersectionObserver === 'undefined') return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  return observer;
}

export const reveal = {
  mounted(el, binding) {
    const io = getObserver();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!io || reduced) return;
    el.classList.add('reveal');
    if (binding.value) el.style.transitionDelay = `${binding.value}ms`;
    io.observe(el);
  },
  unmounted(el) {
    observer?.unobserve(el);
  },
};
