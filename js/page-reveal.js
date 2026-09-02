/**
 * Page-load text reveal — runs once on initial load.
 * Respects prefers-reduced-motion.
 */
(function () {
  'use strict';

  var REDUCED =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (REDUCED) {
    document.documentElement.classList.add('reveal-reduced');
    return;
  }

  function triggerReveal() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.body.classList.add('is-loaded');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', triggerReveal);
  } else {
    triggerReveal();
  }
})();
