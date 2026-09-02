/**
 * Custom cursor — center dot + ring that fills with scroll progress.
 * Reverses when scrolling up. Desktop / fine pointer only.
 */
(function () {
  'use strict';

  var FINE_POINTER = window.matchMedia('(pointer: fine)').matches;
  var COARSE_OR_MOBILE = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  var REDUCED =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!FINE_POINTER || COARSE_OR_MOBILE || REDUCED) return;

  var cursor = document.getElementById('custom-cursor');
  var progressCircle = cursor && cursor.querySelector('.custom-cursor__progress');

  if (!cursor || !progressCircle) return;

  var RADIUS = 19;
  var CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  progressCircle.setAttribute('r', String(RADIUS));
  progressCircle.style.strokeDasharray = String(CIRCUMFERENCE);
  progressCircle.style.strokeDashoffset = String(CIRCUMFERENCE);

  document.body.classList.add('custom-cursor--active');

  var targetX = window.innerWidth * 0.5;
  var targetY = window.innerHeight * 0.5;
  var currentX = targetX;
  var currentY = targetY;
  var targetProgress = 0;
  var currentProgress = 0;
  var visible = false;
  var ticking = false;

  function getScrollProgress() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return 0;
    return Math.max(0, Math.min(1, scrollTop / maxScroll));
  }

  function updateProgressRing(progress) {
    progressCircle.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress));
  }

  function onScroll() {
    targetProgress = getScrollProgress();
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
      });
    }
  }

  function onPointerMove(e) {
    targetX = e.clientX;
    targetY = e.clientY;
    if (!visible) {
      visible = true;
      cursor.classList.add('is-visible');
      cursor.classList.remove('is-hidden');
    }
  }

  function onPointerLeave() {
    visible = false;
    cursor.classList.add('is-hidden');
    cursor.classList.remove('is-visible');
  }

  function animate() {
    currentX += (targetX - currentX) * 0.2;
    currentY += (targetY - currentY) * 0.2;
    currentProgress += (targetProgress - currentProgress) * 0.14;

    cursor.style.left = currentX + 'px';
    cursor.style.top = currentY + 'px';
    updateProgressRing(currentProgress);

    requestAnimationFrame(animate);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('mousemove', onPointerMove, { passive: true });
  document.addEventListener('mouseleave', onPointerLeave);

  targetProgress = getScrollProgress();
  currentProgress = targetProgress;
  updateProgressRing(currentProgress);
  animate();
})();
