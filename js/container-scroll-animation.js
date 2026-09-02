/**
 * Container loading — scroll-driven canvas frame sequence (frame_000 → frame_012).
 * Desktop: 01_DESKTOP_FRAMES | Mobile: 02_MOBILE_FRAMES
 */
(function () {
  'use strict';

  var FRAME_COUNT = 13;
  var DESKTOP_BASE = 'Container_Animation/01_DESKTOP_FRAMES/';
  var MOBILE_BASE = 'Container_Animation/02_MOBILE_FRAMES/';
  var MOBILE_MQ = window.matchMedia('(max-width: 768px)');
  var REDUCED =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var section = document.getElementById('container-animation');
  var sticky = section && section.querySelector('.container-scroll__sticky');
  var canvas = section && section.querySelector('.container-scroll__canvas');

  if (!section || !sticky || !canvas) return;

  var ctx = canvas.getContext('2d', { alpha: false });
  var frames = new Array(FRAME_COUNT);
  var activeBase = '';
  var loadToken = 0;
  var ticking = false;
  var canvasW = 0;
  var canvasH = 0;

  function padFrame(index) {
    return 'frame_' + String(index).padStart(3, '0') + '.avif';
  }

  function getBasePath() {
    return MOBILE_MQ.matches ? MOBILE_BASE : DESKTOP_BASE;
  }

  function loadImage(base, index) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.decoding = 'async';

      img.onload = function () {
        var done = function () {
          resolve({ index: index, img: img });
        };
        if (img.decode) {
          img.decode().then(done).catch(done);
        } else {
          done();
        }
      };

      img.onerror = function () {
        resolve({ index: index, img: null });
      };

      img.src = base + padFrame(index);
    });
  }

  function loadFrames() {
    var base = getBasePath();
    if (base === activeBase && frames.every(Boolean)) {
      return Promise.resolve();
    }

    var token = ++loadToken;
    activeBase = base;
    frames = new Array(FRAME_COUNT);
    section.classList.remove('is-ready');
    section.classList.add('is-loading');

    var jobs = [];
    for (var i = 0; i < FRAME_COUNT; i++) {
      jobs.push(loadImage(base, i));
    }

    return Promise.all(jobs).then(function (results) {
      if (token !== loadToken) return;

      results.forEach(function (entry) {
        if (entry && entry.img) {
          frames[entry.index] = entry.img;
        }
      });

      var loaded = frames.filter(Boolean).length;
      if (loaded === 0) {
        section.classList.remove('is-loading');
        return;
      }

      section.classList.remove('is-loading');
      section.classList.add('is-ready');
      render(true);
    });
  }

  function getScrollY() {
    return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  function getProgress() {
    if (REDUCED) return 0;

    var scrollY = getScrollY();
    var start = section.offsetTop;
    var end = start + section.offsetHeight - window.innerHeight;

    if (end <= start) return 0;

    return Math.min(1, Math.max(0, (scrollY - start) / (end - start)));
  }

  function updatePin() {
    if (REDUCED) return;

    var scrollY = getScrollY();
    var start = section.offsetTop;
    var trackHeight = section.offsetHeight;
    var pinHeight = sticky.offsetHeight;
    var pinEnd = start + trackHeight - pinHeight;

    sticky.classList.remove('is-container-pinned', 'is-container-pinned-end');

    if (scrollY <= start) return;

    if (pinEnd <= start || scrollY >= pinEnd) {
      sticky.classList.add('is-container-pinned-end');
      return;
    }

    sticky.classList.add('is-container-pinned');
  }

  function fitRect(img, width, height) {
    var imgRatio = img.naturalWidth / img.naturalHeight;
    var viewRatio = width / height;
    var drawW;
    var drawH;
    var drawX;
    var drawY;

    if (imgRatio > viewRatio) {
      drawW = width;
      drawH = width / imgRatio;
      drawX = 0;
      drawY = (height - drawH) * 0.5;
    } else {
      drawH = height;
      drawW = height * imgRatio;
      drawX = (width - drawW) * 0.5;
      drawY = 0;
    }

    return { x: drawX, y: drawY, w: drawW, h: drawH };
  }

  function resizeCanvas(width, height) {
    if (width === canvasW && height === canvasH) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasW = width;
    canvasH = height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawFrame(img, alpha) {
    if (!img || !img.naturalWidth) return;

    var rect = fitRect(img, canvasW, canvasH);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }

  function render(force) {
    var readyFrames = frames.filter(Boolean);
    if (!readyFrames.length) return;

    var width = sticky.clientWidth;
    var height = sticky.clientHeight;
    if (!width || !height) return;

    resizeCanvas(width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    var progress = getProgress();
    var exact = progress * (FRAME_COUNT - 1);
    var indexA = Math.floor(exact);
    var indexB = Math.min(FRAME_COUNT - 1, indexA + 1);
    var blend = exact - indexA;

    var frameA = frames[indexA] || frames[indexB];
    var frameB = frames[indexB] || frames[indexA];

    if (!frameA) return;

    if (indexA === indexB || blend < 0.001 || !frameB) {
      drawFrame(frameA, 1);
      return;
    }

    drawFrame(frameA, 1 - blend);
    drawFrame(frameB, blend);
  }

  function update() {
    updatePin();
    render(false);
  }

  function onScrollOrResize() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    }
  }

  function init() {
    loadFrames();

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    if (MOBILE_MQ.addEventListener) {
      MOBILE_MQ.addEventListener('change', function () {
        loadFrames().then(update);
      });
    } else if (MOBILE_MQ.addListener) {
      MOBILE_MQ.addListener(function () {
        loadFrames().then(update);
      });
    }

    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
