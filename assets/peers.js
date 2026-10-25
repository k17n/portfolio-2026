// Renders the "What my peers say" cards from peers.json, so the quotes live in one place.
//   <div data-peers="all">   a draggable marquee of each person's best line, linking to their full quote on the company page
//   <div data-peers="zoho">  only the recommendations for that company, in full
(function () {
  var script = document.currentScript;
  if (!script) return;
  var base = new URL('.', script.src);
  var root = new URL('../', base);
  var recoUrl = '';
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ARROW = '<svg data-icon="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
  var ARROW_EXT = '<svg data-icon="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>';
  var ICON = {
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>'
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // The card links to the full quote (marquee) or to the recommendations on LinkedIn (company pages),
  // and the name links to the person's own profile. The card link is a cover behind the name, so no link nests in another.
  function card(p, marquee) {
    var a = el('div', 'card card--peer');
    var cover = el('a', 'card-cover');
    if (marquee) {
      cover.href = new URL('work/' + p.roles[0] + '/', root).href + '#peer-' + p.id;
      cover.draggable = false;
      cover.setAttribute('aria-label', p.name + ', read the full recommendation');
    } else {
      a.id = 'peer-' + p.id;
      cover.href = recoUrl || p.url;
      cover.target = '_blank';
      cover.rel = 'noopener noreferrer';
      cover.setAttribute('aria-label', 'Verify ' + p.name + '’s recommendation on LinkedIn (opens in new tab)');
    }
    a.appendChild(cover);

    var body = el('span', 'card-body');
    body.appendChild(el('span', 'card-k', p.title + ' · ' + p.at));
    var t = el('span', 'card-t');
    var who = el('a', 'peer-name', p.name);
    who.href = p.url;
    who.target = '_blank';
    who.rel = 'noopener noreferrer';
    who.draggable = false;
    who.setAttribute('aria-label', p.name + ' on LinkedIn (opens in new tab)');
    var slot = el('span', 'slot');
    slot.setAttribute('aria-hidden', 'true');
    slot.innerHTML = ARROW_EXT;
    who.appendChild(slot);
    t.appendChild(who);
    body.appendChild(t);

    var d = el('span', 'card-d');
    if (marquee) {
      d.className += ' card-d--hl';
      d.textContent = '“' + (p.highlight || p.quote[0]) + '”';
    } else {
      p.quote.forEach(function (q) { d.appendChild(el('span', null, q)); });
    }
    body.appendChild(d);
    body.appendChild(el('span', 'card-k card-rel', p.relationship));
    a.appendChild(body);

    var av = el('span', 'avatar', p.initials);
    av.setAttribute('aria-hidden', 'true');
    if (p.photo) {
      var img = el('img');
      img.src = new URL('img/peers/' + p.photo, base).href;
      img.alt = '';
      img.width = img.height = 80;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      img.onerror = function () { img.remove(); };
      av.appendChild(img);
    }
    a.appendChild(av);
    return a;
  }

  function stack(list) {
    var box = el('div', 'cards');
    list.forEach(function (p) { box.appendChild(card(p, false)); });
    return box;
  }

  function button(label, icon) {
    var b = el('button', 'marquee-btn');
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.innerHTML = icon;
    return b;
  }

  function marquee(list) {
    var n = list.length;
    var box = el('div', 'marquee-box');
    var wrap = el('div', 'marquee');
    var track = el('div', 'marquee-track');
    wrap.appendChild(track);
    list.forEach(function (p) { track.appendChild(card(p, true)); });

    var ctl = el('div', 'marquee-ctl');
    var prev = button('Previous recommendations', ICON.prev);
    var next = button('Next recommendations', ICON.next);
    var toggle = reduced ? null : button('Pause scrolling', ICON.pause);
    ctl.appendChild(prev);
    if (toggle) ctl.appendChild(toggle);
    ctl.appendChild(next);
    box.appendChild(wrap);
    box.appendChild(ctl);

    if (reduced) {
      // No motion: a plain scrolling row, moved by the arrows.
      wrap.classList.add('marquee--static');
      var jump = function (dir) {
        var w = track.children[0].getBoundingClientRect().width + 8;
        wrap.scrollBy({ left: dir * w, behavior: 'auto' });
      };
      prev.onclick = function () { jump(-1); };
      next.onclick = function () { jump(1); };
      return box;
    }

    // A second copy of the cards makes the loop seamless.
    list.forEach(function (p) {
      var c = card(p, true);
      c.setAttribute('data-clone', '');
      c.setAttribute('aria-hidden', 'true');
      c.querySelectorAll('a').forEach(function (l) { l.tabIndex = -1; });
      track.appendChild(c);
    });

    var SPEED = 26;            // px per second
    var x = 0, vel = 0, last = 0;
    var hover = false, focus = false, held = false, userPaused = false, visible = false, raf = 0;
    var tween = null;

    var half = function () { return track.children[n].offsetLeft; };
    var step = function () { return track.children[1].offsetLeft - track.children[0].offsetLeft; };
    var paint = function () {
      var h = half();
      if (h > 0) x = ((x % h) - h) % h;
      track.style.transform = 'translate3d(' + x + 'px,0,0)';
    };
    var glide = function (to) {
      vel = 0;
      tween = { from: x, to: to, t0: performance.now(), dur: 460 };
    };

    var frame = function (t) {
      raf = 0;
      if (!visible) return;
      var dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      if (tween) {
        var k = Math.min(1, (t - tween.t0) / tween.dur);
        x = tween.from + (tween.to - tween.from) * (1 - Math.pow(1 - k, 3));
        if (k >= 1) tween = null;
      } else if (!held) {
        x += vel * dt;
        vel *= Math.pow(0.002, dt);
        if (Math.abs(vel) < 2) vel = 0;
        if (!hover && !focus && !userPaused) x -= SPEED * dt;
      }
      paint();
      raf = requestAnimationFrame(frame);
    };
    var start = function () {
      if (raf || !visible) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[es.length - 1].isIntersecting;
        if (visible) start();
      }).observe(box);
    } else {
      visible = true;
      start();
    }

    prev.onclick = function () { glide((tween ? tween.to : x) + step()); };
    next.onclick = function () { glide((tween ? tween.to : x) - step()); };
    toggle.onclick = function () {
      userPaused = !userPaused;
      toggle.innerHTML = userPaused ? ICON.play : ICON.pause;
      toggle.setAttribute('aria-label', userPaused ? 'Resume scrolling' : 'Pause scrolling');
    };

    wrap.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
    wrap.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hover = false; });
    wrap.addEventListener('focusin', function (e) {
      focus = true;
      var c = e.target.closest && e.target.closest('.card');
      if (!c || c.hasAttribute('data-clone')) return;
      var left = c.offsetLeft + x, right = left + c.offsetWidth;
      if (left < 16 || right > wrap.clientWidth - 16) glide(x - (left - 16));
    });
    wrap.addEventListener('focusout', function () { focus = false; });
    // The browser scrolls an overflow:hidden box to reveal a focused child; the track moves by transform instead.
    wrap.addEventListener('scroll', function () { wrap.scrollLeft = 0; });

    // Drag to move; a drag never counts as a click on the card under the pointer.
    var down = null, dragged = false;
    wrap.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      down = { id: e.pointerId, x: e.clientX, y: e.clientY, px: e.clientX, pt: e.timeStamp, ox: x };
      dragged = false;
    });
    wrap.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== down.id) return;
      if (!dragged) {
        if (Math.abs(e.clientX - down.x) < 6) return;
        if (e.pointerType !== 'mouse' && Math.abs(e.clientY - down.y) > Math.abs(e.clientX - down.x)) { down = null; return; }
        dragged = true;
        held = true;
        tween = null;
        vel = 0;
        wrap.classList.add('is-dragging');
        wrap.setPointerCapture(e.pointerId);
      }
      var dt = (e.timeStamp - down.pt) / 1000;
      if (dt > 0) vel = vel * 0.6 + ((e.clientX - down.px) / dt) * 0.4;
      down.px = e.clientX;
      down.pt = e.timeStamp;
      x = down.ox + (e.clientX - down.x);
      paint();
    });
    var release = function (e) {
      if (!down || e.pointerId !== down.id) return;
      down = null;
      held = false;
      wrap.classList.remove('is-dragging');
      if (e.type === 'pointercancel') vel = 0;
    };
    wrap.addEventListener('pointerup', release);
    wrap.addEventListener('pointercancel', release);
    wrap.addEventListener('click', function (e) {
      if (!dragged) return;
      dragged = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    return box;
  }

  function drop(host) {
    (host.closest('.sec') || host).remove();
  }

  function render(data) {
    recoUrl = data.linkedin || '';
    document.querySelectorAll('[data-peers]').forEach(function (host) {
      var key = host.getAttribute('data-peers');
      var list = data.peers.filter(function (p) {
        return key === 'all' || p.roles.indexOf(key) > -1;
      });
      if (!list.length) return drop(host);
      host.appendChild(key === 'all' ? marquee(list) : stack(list));
    });
    var hit = location.hash && document.getElementById(location.hash.slice(1));
    if (hit) hit.scrollIntoView();
  }

  fetch(new URL('peers.json', base))
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(render)
    .catch(function () {
      document.querySelectorAll('[data-peers]').forEach(drop);
    });
})();
