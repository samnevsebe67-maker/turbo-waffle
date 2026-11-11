/* KINETIA — Industry Solutions: shared behaviour
   Depends on: gsap + ScrollTrigger (loaded before this file), degrades without them. */
(function () {
  'use strict';

  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- header ---------- */
  var hd = $('#hd');
  if (hd) addEventListener('scroll', function () { hd.classList.toggle('sc', scrollY > 20); }, { passive: true });

  /* ---------- mobile menu ---------- */
  var mn = $('#mn'), bg = $('#bg');
  if (mn && bg) {
    var toggle = function (open) {
      mn.classList.toggle('open', open);
      bg.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    bg.addEventListener('click', function () { toggle(!mn.classList.contains('open')); });
    $$('a', mn).forEach(function (a) { a.addEventListener('click', function () { toggle(false); }); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
  }

  /* ---------- faq accordion ---------- */
  $$('.fq-q').forEach(function (btn) {
    var item = btn.closest('.fq'), panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', function () {
      var open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
      if (panel) panel.inert = !open;
    });
  });

  /* ---------- tabs ---------- */
  $$('[role=tablist]').forEach(function (list) {
    var tabs = $$('[role=tab]', list);
    var select = function (i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      if (focus && tabs[i]) tabs[i].focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        select((i + d + tabs.length) % tabs.length, true);
      });
    });
    select(tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; }) || 0);
  });

  /* ---------- canvas helper ---------- */
  window.KViz = function (canvas, draw) {
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var w = 0, h = 0, vis = true, start = performance.now();
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    function frame(now) { if (!w || !h) return; ctx.clearRect(0, 0, w, h); draw(ctx, w, h, (now - start) / 1000); }
    function resize() {
      var r = canvas.getBoundingClientRect();
      if (!r.width) return;
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      frame(start);
    }
    addEventListener('resize', resize, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
    }
    resize();
    if (RM) return;
    (function loop(now) { if (vis) frame(now); requestAnimationFrame(loop); })(start);
  };

  /* ---------- 3D tilt ---------- */
  $$('[data-tilt]').forEach(function (el) {
    if (RM || !matchMedia('(hover:hover)').matches) return;
    var strength = parseFloat(el.getAttribute('data-tilt')) || 5;
    var quick = window.gsap ? gsap.quickTo(el, 'rotationX', { duration: .5, ease: 'power2.out' }) : null;
    var quickY = window.gsap ? gsap.quickTo(el, 'rotationY', { duration: .5, ease: 'power2.out' }) : null;
    el.style.transformStyle = 'preserve-3d';
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var x = (e.clientY - r.top) / r.height - .5, y = (e.clientX - r.left) / r.width - .5;
      if (quick) { quick(-x * strength); quickY(y * strength); }
      else el.style.transform = 'perspective(900px) rotateX(' + (-x * strength) + 'deg) rotateY(' + (y * strength) + 'deg)';
    });
    el.addEventListener('pointerleave', function () {
      if (quick) { quick(0); quickY(0); }
      else el.style.transform = '';
    });
  });

  /* ---------- reveal ---------- */
  var canAnim = !!window.gsap && !RM;
  if (!canAnim) {
    document.documentElement.classList.remove('gsap-ready');
  } else {
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    var items = $$('[data-anim]');
    gsap.set(items, { opacity: 0, y: 22 });
    if (window.ScrollTrigger) {
      ScrollTrigger.batch(items, {
        start: 'top 88%',
        once: true,
        onEnter: function (batch) {
          gsap.to(batch, { opacity: 1, y: 0, duration: .85, stagger: .07, ease: 'power2.out', overwrite: true });
        }
      });
    } else {
      gsap.to(items, { opacity: 1, y: 0, duration: .8, stagger: .05, ease: 'power2.out' });
    }
    /* anything still hidden after a scroll jump gets revealed */
    addEventListener('load', function () { ScrollTrigger && ScrollTrigger.refresh(); });
  }

  /* ---------- lead form ---------- */
  $$('[data-lead-form]').forEach(function (form) {
    var send = $('[type=submit]', form);
    var bad = $('.banner.bad', form);
    var consent = $('input[name=consent]', form);
    var consentWrap = consent && consent.closest('.consent-wrap');
    var consentMsg = consentWrap && $('.msg', consentWrap);
    var sl = $('.sl', form);

    function setConsent(ok) {
      if (!consentWrap) return;
      consentWrap.classList.toggle('err', !ok);
      consentMsg.textContent = ok ? '' : 'Подтвердите согласие с политикой конфиденциальности';
    }
    function setErr(name, m) {
      var w = form.querySelector('[data-f="' + name + '"]');
      if (!w) return;
      w.classList.toggle('err', !!m);
      var msg = $('.msg', w);
      if (msg) msg.textContent = m || '';
    }
    function done() {
      form.classList.add('done');
      form.scrollIntoView({ block: 'center', behavior: RM ? 'auto' : 'smooth' });
    }

    if (consent) consent.addEventListener('change', function () { if (consent.checked) setConsent(true); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (send.disabled) return;
      if (bad) bad.classList.remove('show');

      var fd = new FormData(form);
      var name = (fd.get('name') || '').trim();
      var ct = (fd.get('contact') || '').trim();
      var ok = true;

      if (name.length < 2) { ok = false; setErr('name', 'Укажите имя'); } else setErr('name', '');
      var validContact = /^@?[A-Za-z0-9_]{5,32}$/.test(ct) || /^\+?[\d\s()\-]{7,}$/.test(ct);
      if (ct.length < 5 || !validContact) { ok = false; setErr('contact', 'Укажите Telegram (@username) или номер телефона'); } else setErr('contact', '');

      if (consent) {
        setConsent(consent.checked);
        if (!consent.checked) ok = false;
      }
      if (!ok) {
        var firstErr = form.querySelector('.fld.err input') || consent;
        if (firstErr) firstErr.focus();
        return;
      }

      send.disabled = true;
      if (sl) sl.textContent = 'Отправляем…';

      var industry = fd.get('industry') || document.body.getAttribute('data-industry') || '';
      var body = {
        name: name,
        company: fd.get('company') || '',
        contact: ct,
        site: fd.get('site') || '',
        message: fd.get('message') || '',
        budget: '',
        services: industry ? [industry] : [],
        industry: industry,
        website_hp: fd.get('website_hp') || '',
        consent: consent ? (consent.checked ? 'yes' : 'no') : 'no'
      };

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.ok) throw 0;
          done();
        });
      }).catch(function () {
        if (bad) bad.classList.add('show');
        send.disabled = false;
        if (sl) sl.textContent = 'Отправить заявку';
      });
    });
  });

  /* ---------- year ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
