/**
 * Hero → About scroll-driven transition + About right-column reveal.
 * Pin uses position:fixed (requires body overflow-x:visible — see hero-transition.css).
 */
(function () {
  'use strict';

  var scrollRoot = document.getElementById('hero-scroll');
  var pinEl = scrollRoot && scrollRoot.querySelector('.hero-scroll__pin');
  var reducedMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ticking = false;

  function setProgress(value) {
    if (reducedMotion) {
      document.documentElement.style.setProperty('--hero-progress', '0');
      return;
    }
    document.documentElement.style.setProperty('--hero-progress', String(value));
  }

  function updateHeroPin() {
    if (!scrollRoot || !pinEl) return;

    var rect = scrollRoot.getBoundingClientRect();
    var trackHeight = scrollRoot.offsetHeight;
    var pinHeight = pinEl.offsetHeight;
    var scrollRange = Math.max(0, trackHeight - pinHeight);
    var scrolled = Math.max(0, -rect.top);

    pinEl.classList.remove('is-hero-pinned', 'is-hero-pinned-end');

    if (rect.top >= 0) {
      return;
    }

    if (scrollRange === 0 || scrolled >= scrollRange) {
      pinEl.classList.add('is-hero-pinned-end');
      return;
    }

    pinEl.classList.add('is-hero-pinned');
  }

  function updateHeroProgress() {
    if (!scrollRoot) {
      setProgress(0);
      updateHeroPin();
      return;
    }

    var rect = scrollRoot.getBoundingClientRect();
    var scrollable = scrollRoot.offsetHeight - window.innerHeight;

    if (scrollable <= 0) {
      setProgress(0);
    } else {
      var raw = -rect.top / scrollable;
      setProgress(Math.min(1, Math.max(0, raw)));
    }

    updateHeroPin();
  }

  function onScrollOrResize() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () {
        updateHeroProgress();
        ticking = false;
      });
    }
  }

  function initHeroScroll() {
    if (!scrollRoot || !pinEl) return;

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    window.addEventListener('orientationchange', onScrollOrResize, { passive: true });
    updateHeroProgress();
  }

  function initAboutReveal() {
    if (reducedMotion) {
      document.querySelectorAll('.about-reveal').forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    var items = document.querySelectorAll('.about-reveal');
    if (!items.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );

    items.forEach(function (el, i) {
      if (!el.style.getPropertyValue('--reveal-delay')) {
        el.style.setProperty('--reveal-delay', i * 0.08 + 's');
      }
      observer.observe(el);
    });
  }

  function init() {
    initHeroScroll();
    initAboutReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
