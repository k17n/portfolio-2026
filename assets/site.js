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

// Text size: default, or a larger, wider reading mode. The saved choice is applied
// by a snippet in each page's <head> before first paint; this builds the control.
(function () {
  var root = document.documentElement;
  if (!HTMLElement.prototype.hasOwnProperty('popover')) return;
  var KEY = 'karthik-text';
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var anim;

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'a11y-btn';
  btn.setAttribute('popovertarget', 'a11y');
  btn.setAttribute('aria-label', 'Text size');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';

  var panel = document.createElement('div');
  panel.id = 'a11y';
  panel.className = 'a11y';
  panel.setAttribute('popover', '');
  panel.innerHTML =
    '<fieldset><legend>Text size</legend><div class="a11y-opts">' +
    '<label class="a11y-opt"><input type="radio" name="a11y-size" value="default"><span class="a11y-aa" aria-hidden="true">Aa</span>Default</label>' +
    '<label class="a11y-opt"><input type="radio" name="a11y-size" value="large"><span class="a11y-aa" aria-hidden="true">Aa</span>Large</label>' +
    '</div></fieldset><p class="a11y-note">Larger type and spacing in a wider column.</p>';

  document.body.prepend(panel);
  document.body.prepend(btn);

  var radios = panel.querySelectorAll('input');
  radios[root.classList.contains('text-lg') ? 1 : 0].checked = true;

  panel.addEventListener('toggle', function (e) {
    btn.setAttribute('aria-expanded', e.newState === 'open' ? 'true' : 'false');
  });

  // Animate --s and --w from wherever they are now (even mid-switch) to the
  // new size. Animated here rather than with a CSS transition so a saved
  // choice applies instantly on page load.
  panel.addEventListener('change', function (e) {
    var large = e.target.value === 'large';
    var cs = getComputedStyle(root);
    var from = { '--s': cs.getPropertyValue('--s'), '--w': cs.getPropertyValue('--w') };
    if (anim) anim.cancel();
    root.classList.toggle('text-lg', large);
    cs = getComputedStyle(root);
    var to = { '--s': cs.getPropertyValue('--s'), '--w': cs.getPropertyValue('--w') };
    if (!still && root.animate) {
      anim = root.animate([from, to], { duration: 550, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
    try {
      if (large) localStorage.setItem(KEY, 'large');
      else localStorage.removeItem(KEY);
    } catch (err) {}
  });
})();

// Esc goes up one level from inner pages
(function () {
  var home = document.body.getAttribute('data-home');
  if (!home) return;
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    try { if (document.querySelector(':popover-open')) return; } catch (err) {}
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

  // Keep at least half the sticker on the page. Measured from layout (offsetLeft
  // and offsetWidth ignore transforms), so the landing animation can't skew it.
  function clamp() {
    var p = st.offsetParent.getBoundingClientRect();
    var w = st.offsetWidth, h = st.offsetHeight;
    var left = p.left + st.offsetLeft + x;
    var top = p.top + window.scrollY + st.offsetTop + y;
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
      clamp();
      apply();
    }
  } catch (e) {}
  // A position saved on one screen size may be off-screen on another
  window.addEventListener('resize', function () { clamp(); apply(); });

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
      var size = 48 * (parseFloat(cs.getPropertyValue('--s')) || 1);
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
