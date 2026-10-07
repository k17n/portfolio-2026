// Local time in Chennai
(function () {
  var el = document.querySelector('[data-clock]');
  if (!el) return;
  var fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  function tick() { el.textContent = fmt.format(new Date()) + ' Chennai'; }
  tick();
  setInterval(tick, 1000);
})();

// Copy-to-clipboard links
document.querySelectorAll('[data-copy]').forEach(function (btn) {
  var status = document.querySelector('[data-status]');
  var timer;
  btn.addEventListener('click', function () {
    var text = btn.getAttribute('data-copy');
    var done = function () {
      btn.setAttribute('data-done', '');
      if (status) status.textContent = 'Email address copied';
      clearTimeout(timer);
      timer = setTimeout(function () {
        btn.removeAttribute('data-done');
        if (status) status.textContent = '';
      }, 1600);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(done, function () { location.href = 'mailto:' + text; });
    } else {
      location.href = 'mailto:' + text;
    }
  });
});

// Esc goes up one level from inner pages
(function () {
  var home = document.body.getAttribute('data-home');
  if (!home) return;
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    location.href = home;
  });
})();

// Retire the entrance animation for good once it has played, so later style
// changes can never restart it. Hovering a peek link cuts it short, since a
// half-faded paragraph would make its card see-through.
(function () {
  var items = document.querySelectorAll('[data-fade]');
  function finish(el) { el.classList.add('faded'); }
  items.forEach(function (el) {
    el.addEventListener('animationend', function (e) {
      if (e.target === el && e.animationName === 'fade-in') finish(el);
    });
  });
  function finishAll() {
    items.forEach(finish);
    document.removeEventListener('pointerover', onOver);
    document.removeEventListener('focusin', onOver);
  }
  function onOver(e) {
    if (e.target.closest && e.target.closest('.pk')) finishAll();
  }
  document.addEventListener('pointerover', onOver);
  document.addEventListener('focusin', onOver);
})();

// Keep peek cards inside the viewport
(function () {
  function place(pk) {
    var card = pk.querySelector('.peek');
    if (!card) return;
    card.style.setProperty('--nudge', '0px');
    var r = card.getBoundingClientRect();
    var over = r.right - (document.documentElement.clientWidth - 16);
    var under = 16 - r.left;
    if (over > 0) card.style.setProperty('--nudge', -over + 'px');
    else if (under > 0) card.style.setProperty('--nudge', under + 'px');
  }
  document.querySelectorAll('.pk').forEach(function (pk) {
    pk.addEventListener('pointerenter', function () { place(pk); });
    pk.addEventListener('focusin', function () { place(pk); });
  });
})();

// Click a figure to see it large
(function () {
  var zooms = document.querySelectorAll('.zoom');
  if (!zooms.length || !window.HTMLDialogElement) return;
  var dlg = document.createElement('dialog');
  dlg.className = 'lb';
  dlg.innerHTML = '<img alt=""><p></p>';
  document.body.appendChild(dlg);
  var img = dlg.querySelector('img');
  var cap = dlg.querySelector('p');
  zooms.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = btn.querySelector('img');
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      cap.textContent = btn.getAttribute('data-caption') || '';
      cap.hidden = !cap.textContent;
      dlg.showModal();
    });
  });
  dlg.addEventListener('click', function () { dlg.close(); });
})();

// Holographic sticker: tilt, peel, drag, throw-swing, stick
(function () {
  var st = document.querySelector('.sticker');
  if (!st) return;
  var body = st.querySelector('.sticker-body');
  var KEY = 'karthik-sticker';
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var x = 0, y = 0;
  var pressed = false, moved = false;
  var startX, startY, originX, originY, lastX, lastT;
  var swing = 0, swingTarget = 0, raf = 0;

  function set(k, v) { st.style.setProperty(k, v); }
  function apply() { set('--x', x + 'px'); set('--y', y + 'px'); }

  // Keep at least half the sticker on the page
  function clamp() {
    var r = st.getBoundingClientRect();
    var w = r.width, h = r.height;
    var left = r.left - parseFloat(st.style.getPropertyValue('--x') || 0) + x;
    var top = r.top + window.scrollY - parseFloat(st.style.getPropertyValue('--y') || 0) + y;
    var maxL = document.documentElement.clientWidth - w / 2;
    var maxT = document.documentElement.scrollHeight - h / 2;
    if (left < -w / 2) x += -w / 2 - left;
    if (left > maxL) x -= left - maxL;
    if (top < 0) y -= top;
    if (top > maxT) y -= top - maxT;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ x: x, y: y })); } catch (e) {}
  }

  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && isFinite(saved.x) && isFinite(saved.y)) {
      x = saved.x; y = saved.y;
      st.classList.add('was-moved');
      apply();
      requestAnimationFrame(function () { clamp(); apply(); });
    }
  } catch (e) {}

  function play(cls) {
    if (still) return;
    body.classList.remove(cls);
    void body.offsetWidth;
    body.classList.add(cls);
  }
  body.addEventListener('animationend', function () { body.classList.remove('is-wiggle', 'is-stuck'); });

  function tilt(e) {
    var r = st.getBoundingClientRect();
    var px = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    var py = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
    set('--px', ((px - 0.5) * 70).toFixed(1) + '%');
    set('--py', ((py - 0.5) * 70).toFixed(1) + '%');
    if (still) return;
    set('--rx', ((0.5 - py) * 22).toFixed(2) + 'deg');
    set('--ry', ((px - 0.5) * 22).toFixed(2) + 'deg');
  }

  function untilt() {
    ['--rx', '--ry', '--px', '--py'].forEach(function (k) { st.style.removeProperty(k); });
  }

  function loop() {
    swingTarget *= 0.86;
    swing += (swingTarget - swing) * 0.2;
    set('--swing', swing.toFixed(2) + 'deg');
    if (pressed || Math.abs(swing) > 0.05) raf = requestAnimationFrame(loop);
    else { set('--swing', '0deg'); raf = 0; }
  }

  st.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    pressed = true; moved = false;
    startX = lastX = e.clientX; startY = e.clientY; lastT = e.timeStamp;
    originX = x; originY = y;
    st.classList.remove('is-homing');
    st.classList.add('is-dragging');
    st.setPointerCapture(e.pointerId);
    if (!raf) raf = requestAnimationFrame(loop);
  });

  st.addEventListener('pointermove', function (e) {
    tilt(e);
    if (!pressed) return;
    var dx = e.clientX - startX, dy = e.clientY - startY;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true;
    x = originX + dx; y = originY + dy;
    clamp(); apply();
    var dt = Math.max(e.timeStamp - lastT, 8);
    if (!still) swingTarget = Math.max(-22, Math.min(22, ((e.clientX - lastX) / dt) * 14));
    lastX = e.clientX; lastT = e.timeStamp;
  });

  function release() {
    if (!pressed) return;
    pressed = false;
    st.classList.remove('is-dragging');
    if (moved) {
      st.classList.add('was-moved');
      save();
      play('is-stuck');
    } else {
      play('is-wiggle');
    }
  }

  st.addEventListener('pointerup', release);
  st.addEventListener('pointercancel', release);
  st.addEventListener('pointerleave', function () { if (!pressed) untilt(); });
  st.addEventListener('lostpointercapture', function () { release(); untilt(); });

  st.addEventListener('dblclick', function () {
    st.classList.add('is-homing');
    x = 0; y = 0; apply();
    try { localStorage.removeItem(KEY); } catch (e) {}
    setTimeout(function () { st.classList.remove('is-homing'); }, 700);
  });

  st.addEventListener('keydown', function (e) {
    var step = e.shiftKey ? 48 : 12;
    var keys = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (keys[e.key]) {
      e.preventDefault();
      x += keys[e.key][0]; y += keys[e.key][1];
      clamp(); apply(); save();
      st.classList.add('was-moved');
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      play('is-wiggle');
    } else if (e.key === 'Home') {
      e.preventDefault();
      st.dispatchEvent(new MouseEvent('dblclick'));
    }
  });
})();

// Tools: dock-style magnification. Tiles really grow (max 1.2x, neighbours about 1.1x),
// so the row reflows and pushes them aside. Distances use each tile's resting slot,
// so the growing row never feeds back into the measurement.
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var MAX = 0.2, REACH = 112;
  document.querySelectorAll('.tool-grid').forEach(function (grid) {
    var tools = grid.querySelectorAll('.tool');
    grid.addEventListener('pointermove', function (e) {
      grid.classList.add('is-docking');
      var cs = getComputedStyle(grid);
      var size = parseFloat(cs.getPropertyValue('--t')) || 48;
      var gap = parseFloat(cs.columnGap) || 8;
      var x = e.clientX - grid.getBoundingClientRect().left;
      tools.forEach(function (t, i) {
        var d = Math.abs(x - (i * (size + gap) + size / 2));
        t.style.setProperty('--m', (1 + Math.max(0, 1 - d / REACH) * MAX).toFixed(3));
      });
    });
    grid.addEventListener('pointerleave', function () {
      grid.classList.remove('is-docking');
      tools.forEach(function (t) { t.style.removeProperty('--m'); });
    });
  });
})();
