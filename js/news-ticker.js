/**
 * United Carriers — Vertical news ticker
 */
(function () {
  'use strict';

  const NEWS_ITEMS = [
    'PHOENIX AND UNITED CARRIERS CONTINUE PARTNERSHIP—',
    'UNITED CARRIERS EXPANDS GLOBAL LOGISTICS NETWORK—',
    'NEW ROUTES CONNECTING APAC WITH EUROPE—',
    'SMARTER FREIGHT. STRONGER CONNECTIONS.—',
    'GLOBAL LOGISTICS, ONE ACCOUNTABLE TEAM.—',
  ];

  const DISPLAY_MS = 4200;
  const TRANSITION_MS = 650;

  function init() {
    const track = document.querySelector('.news-ticker__track');
    if (!track) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      track.innerHTML = '<span class="news-ticker__item is-active">' + NEWS_ITEMS[0] + '</span>';
      return;
    }

    let index = 0;
    let animating = false;

    function renderPair() {
      const current = NEWS_ITEMS[index];
      const next = NEWS_ITEMS[(index + 1) % NEWS_ITEMS.length];
      track.innerHTML =
        '<span class="news-ticker__item is-active">' + current + '</span>' +
        '<span class="news-ticker__item is-next">' + next + '</span>';
      track.classList.remove('is-animating');
      track.style.transform = 'translateY(0)';
    }

    function advance() {
      if (animating) return;
      animating = true;

      track.classList.add('is-animating');
      track.style.transform = 'translateY(-100%)';

      setTimeout(function () {
        index = (index + 1) % NEWS_ITEMS.length;
        renderPair();
        animating = false;
      }, TRANSITION_MS);
    }

    renderPair();
    setInterval(advance, DISPLAY_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
