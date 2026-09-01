/**
 * Navigation link character scramble effect on hover.
 * Preserves accessibility via aria-label / data-text.
 */
(function () {
  'use strict';

  const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
  const FRAME_MS = 28;
  const TOTAL_DURATION = 420;

  class ScrambleLink {
    constructor(el) {
      this.el = el;
      this.original = el.dataset.text || el.textContent.trim();
      this.running = false;
      this.frameId = null;
      this.startTime = 0;

      el.setAttribute('aria-label', this.original);
      el.addEventListener('mouseenter', () => this.start());
      el.addEventListener('focus', () => this.start());
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.el.classList.add('scrambling');
      this.startTime = performance.now();
      this.tick();
    }

    tick() {
      const elapsed = performance.now() - this.startTime;
      const progress = Math.min(elapsed / TOTAL_DURATION, 1);
      const resolvedCount = Math.floor(progress * this.original.length);

      let output = '';
      for (let i = 0; i < this.original.length; i++) {
        if (this.original[i] === ' ') {
          output += ' ';
        } else if (i < resolvedCount) {
          output += this.original[i];
        } else {
          output += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }

      this.el.textContent = output;

      if (progress < 1) {
        this.frameId = setTimeout(() => this.tick(), FRAME_MS);
      } else {
        this.finish();
      }
    }

    finish() {
      clearTimeout(this.frameId);
      this.el.textContent = this.original;
      this.el.classList.remove('scrambling');
      this.running = false;
    }
  }

  function init() {
    document.querySelectorAll('.scramble-link').forEach((link) => {
      new ScrambleLink(link);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
