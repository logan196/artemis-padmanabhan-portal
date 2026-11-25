/* Artemis Biolabs premium layer: opening sequence, dataset reveal, count-ups,
   section reveals and button micro-interactions. Vanilla JS, no dependencies.
   Loaded synchronously in <head> so it can observe the portal's real data loads.
   Config: <script type="application/json" id="ap-config"> in the same page. */
(function () {
  "use strict";
  var W = window, D = document, H = D.documentElement;
  var AP = W.ArtemisPremium = W.ArtemisPremium || {};
  var CFG = {};
  try { CFG = JSON.parse(D.getElementById("ap-config").textContent); } catch (e) { CFG = {}; }
  AP.cfg = CFG;
  var Q = new URLSearchParams(location.search);
  var reduced = W.matchMedia && W.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (Q.has("apreduced")) reduced = Q.get("apreduced") !== "0";
  AP.reduced = reduced;
  var KEY = "ap-intro-seen:" + (CFG.lab || "portal");
  var freezeAt = Q.has("apfreeze") ? parseFloat(Q.get("apfreeze")) : null;
  var seen = false;
  try { seen = sessionStorage.getItem(KEY) === "1"; } catch (e) {}
  var play = !Q.has("nointro") && (Q.has("intro") || freezeAt !== null || (!seen && !location.hash));
  /* Skip the intro on screens 820px or narrower, unless ?intro is set. */
  var narrow = (W.innerWidth || 0) <= 820 || (W.matchMedia && W.matchMedia("(max-width: 820px)").matches);
  if (narrow && !Q.has("intro") && freezeAt === null) play = false;
  AP.playing = play;
  if (play) H.classList.add("ap-pending", "ap-lock");
  H.classList.add("ap-js");
  if (reduced) H.classList.add("ap-reduced");

  var nativeRAF = W.requestAnimationFrame.bind(W);

  /* ---------- real loading tracker ---------- */
  var T = AP.track = { items: [], tracking: play, onchange: null };
  function addItem(label, weight) { var it = { label: label, w: weight || 1, done: false }; T.items.push(it); return it; }
  function finish(it) { if (it && !it.done) { it.done = true; if (T.onchange) T.onchange(); } }
  AP.progress = function () {
    var tot = 0, dn = 0;
    T.items.forEach(function (i) { tot += i.w; if (i.done) dn += i.w; });
    return tot ? dn / tot : 0;
  };
  AP.pendingLabel = function () { for (var i = 0; i < T.items.length; i++) if (!T.items[i].done) return T.items[i].label; return null; };
  function labelFor(url) {
    url = String(url);
    if (/vitessce|react/i.test(url)) return "Vitessce explorer";
    if (/qa\.json|guide/.test(url)) return "guide answers";
    if (/\.bin(\?|$)/.test(url)) return CFG.unitWord ? CFG.unitWord + " coordinates" : "coordinates";
    if (/spots\//.test(url)) return "spot coordinates";
    if (/meta\.json|portal\.json|facts\.json/.test(url)) return "analysis results";
    if (/crop_/.test(url)) return "segmentation outlines";
    return "data";
  }
  if (play && W.fetch) {
    var nativeFetch = W.fetch, owner = new WeakMap();
    AP.nativeFetch = nativeFetch.bind(W);
    W.fetch = function (input) {
      var p = nativeFetch.apply(this, arguments);
      if (!T.tracking) return p;
      var it = addItem(labelFor(input && input.url || input), 1);
      setTimeout(function () { finish(it); }, 6000);
      return p.then(function (r) { try { owner.set(r, it); } catch (e) {} if (!r.ok) finish(it); return r; }, function (e) { finish(it); throw e; });
    };
    ["json", "arrayBuffer", "text", "blob"].forEach(function (m) {
      var orig = Response.prototype[m];
      if (!orig) return;
      Response.prototype[m] = function () {
        var it = owner.get(this), pr = orig.apply(this, arguments);
        if (it) pr.then(function () { finish(it); }, function () { finish(it); });
        return pr;
      };
    });
    var fontIt = addItem("typography", 1);
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { finish(fontIt); }); else finish(fontIt);
    var loadIt = addItem("page assets", 1);
    W.addEventListener("load", function () { finish(loadIt); });
    /* Warm the Vitessce explorer bundle (same URLs the explorer imports) so it opens fast later. */
    var CDN = "https://cdn.jsdelivr.net/npm/vitessce@4.1.2/dist/";
    var vitIt = addItem("Vitessce explorer", 1);
    AP.vitessceWarm = "warming";
    AP.nativeFetch(CDN + "index.min.js").then(function (r) { return r.text(); }).then(function (txt) {
      finish(vitIt);
      var m = txt.match(/from\s*"\.\/(index-[\w-]+\.js)"/);
      if (!m) { AP.vitessceWarm = "ready"; return; }
      return AP.nativeFetch(CDN + m[1], { priority: "low" }).then(function (r) { return r.arrayBuffer(); }).then(function () { AP.vitessceWarm = "ready"; if (T.onchange) T.onchange(); });
    }).catch(function () { finish(vitIt); AP.vitessceWarm = "unavailable"; });
  }

  /* ---------- helpers ---------- */
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function eo3(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }
  function eio(x) { x = clamp(x, 0, 1); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function el(tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  AP.util = { clamp: clamp, eo3: eo3, eio: eio };

  /* number formatting that reproduces the original token exactly at the end */
  function parseNum(s) {
    var m = String(s).match(/^(\D*?)(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(.*)$/);
    if (!m || /\d/.test(m[4])) return null;
    var intPart = m[2], dec = m[3] || "";
    return { pre: m[1], val: parseFloat(intPart.replace(/,/g, "") + dec), comma: intPart.indexOf(",") >= 0, dp: dec ? dec.length - 1 : 0, post: m[4], orig: s };
  }
  function fmtNum(p, v) {
    var s = v.toFixed(p.dp);
    if (p.comma) { var parts = s.split("."); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); s = parts.join("."); }
    return p.pre + s + p.post;
  }
  AP.parseNum = parseNum; AP.fmtNum = fmtNum;
  function countUp(node, dur) {
    var p = parseNum(node.textContent.trim());
    if (!p || reduced) return;
    var t0 = performance.now();
    node.classList.add("ap-counting");
    (function step(now) {
      var k = clamp((now - t0) / dur, 0, 1);
      if (k < 1) { node.textContent = fmtNum(p, p.val * eo3(k)); requestAnimationFrame(step); }
      else { node.textContent = p.orig; node.classList.remove("ap-counting"); }
    })(t0);
  }

  /* ---------- dodecahedron that resolves into the Artemis mark ---------- */
  /* Rotation fitted so the orthographic projection of a regular dodecahedron
     reproduces artemis_mark.svg exactly (residual < 1e-5). */
  var R0 = [[0.897616, -0.071912, -0.434873], [-0.223657, -0.924465, -0.308774], [-0.37982, 0.374423, -0.845898]];
  var MARK = [
    ["-0.438,1.634 0.671,1.358 -0.391,1.457 -1.183,0.553 -1.261,0.839", "#c6d3cc"],
    ["0.438,-1.634 -0.671,-1.358 1.261,-0.839 1.721,-0.171 0.391,-1.457", "#f2f4f0"],
    ["0.748,1.071 0.659,-0.072 -0.391,1.457 -0.438,1.634 1.404,1.009", "#e4e9e4"],
    ["-1.404,-1.009 -1.183,0.553 -0.535,-0.392 0.438,-1.634 -0.671,-1.358", "#e4e9e4"],
    ["-0.391,1.457 0.659,-0.072 -0.535,-0.392 -1.721,0.171 -1.183,0.553", "#e4e9e4"],
    ["1.261,-0.839 -0.671,-1.358 -0.535,-0.392 0.748,1.071 0.659,-0.072", "#f2f4f0"]
  ].map(function (f) { return { pts: f[0].split(" ").map(function (p) { return p.split(",").map(Number); }), fill: f[1] }; });
  var DOD = (function () {
    var phi = (1 + Math.sqrt(5)) / 2, b = 1 / phi, V = [], E = [];
    [-1, 1].forEach(function (x) { [-1, 1].forEach(function (y) { [-1, 1].forEach(function (z) { V.push([x, y, z]); }); }); });
    [-1, 1].forEach(function (s) { [-1, 1].forEach(function (t) { V.push([0, s * b, t * phi]); V.push([s * b, t * phi, 0]); V.push([s * phi, 0, t * b]); }); });
    V = V.map(function (v) { return [0, 1, 2].map(function (r) { return R0[r][0] * v[0] + R0[r][1] * v[1] + R0[r][2] * v[2]; }); });
    for (var i = 0; i < 20; i++) for (var j = i + 1; j < 20; j++) {
      var d = Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2]);
      if (Math.abs(d - 2 / phi) < 1e-3) E.push([i, j]);
    }
    /* edges that belong to the visible faces of the mark */
    function idx(p) { for (var k = 0; k < 20; k++) if (Math.abs(V[k][0] - p[0]) < .01 && Math.abs(V[k][1] - p[1]) < .01) return k; return -1; }
    var front = {};
    MARK.forEach(function (f) { for (var k = 0; k < 5; k++) { var a = idx(f.pts[k]), c = idx(f.pts[(k + 1) % 5]); front[Math.min(a, c) + "-" + Math.max(a, c)] = 1; } });
    E.forEach(function (e) { e.front = !!front[e[0] + "-" + e[1]]; });
    return { V: V, E: E };
  })();
  function qmul(a, b) { return [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2], a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]]; }
  function qaxis(ax, an) { var l = Math.hypot(ax[0], ax[1], ax[2]), s = Math.sin(an / 2) / l; return [Math.cos(an / 2), ax[0] * s, ax[1] * s, ax[2] * s]; }
  function qslerpId(q, k) { /* slerp from q to identity by k */
    var w = q[0], sgn = w < 0 ? -1 : 1; q = q.map(function (x) { return x * sgn; }); w = q[0];
    var th = Math.acos(clamp(w, -1, 1)); if (th < 1e-5) return [1, 0, 0, 0];
    var a = Math.sin((1 - k) * th) / Math.sin(th), b = Math.sin(k * th) / Math.sin(th);
    var r = [q[0] * a + b, q[1] * a, q[2] * a, q[3] * a], n = Math.hypot(r[0], r[1], r[2], r[3]);
    return r.map(function (x) { return x / n; });
  }
  function qrot(q, v) {
    var w = q[0], x = q[1], y = q[2], z = q[3];
    var ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
    return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
  }
  /* draw(ctx, cx, cy, radius, q, persp 0..1, fill 0..1, drawOn 0..1)
     The mark is six pentagons whose corners are all dodecahedron vertices, so once the
     solid lands in the fitted orientation the wireframe cross-fades into the exact mark. */
  function drawDodeca(ctx, cx, cy, s, q, persp, fill, drawOn) {
    var P = DOD.V.map(function (v) {
      var r = qrot(q, v), k = 1 + persp * (9 / (9 - r[2]) - 1);
      return [cx + r[0] * s * k, cy + r[1] * s * k, r[2]];
    });
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (fill < 1) DOD.E.forEach(function (e, n) {
      var a = P[e[0]], b = P[e[1]], depth = (a[2] + b[2]) / 2, near = clamp((depth + 1.75) / 3.5, 0, 1);
      var alpha = (0.2 + 0.8 * near) * (1 - fill);
      if (alpha <= 0.01) return;
      var dk = clamp(drawOn * 1.6 - (n / DOD.E.length) * 0.6, 0, 1); if (dk <= 0) return;
      var c1 = [11, 31, 42], c2 = [20, 128, 138], c = [0, 1, 2].map(function (i) { return Math.round(c1[i] + (c2[i] - c1[i]) * near); });
      ctx.strokeStyle = "rgba(" + c.join(",") + "," + alpha.toFixed(3) + ")";
      ctx.lineWidth = Math.max(1, s * (0.022 + 0.022 * near));
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (b[0] - a[0]) * dk, a[1] + (b[1] - a[1]) * dk); ctx.stroke();
      if (dk >= 1) { ctx.fillStyle = "rgba(20,128,138," + (alpha * 0.9).toFixed(3) + ")"; ctx.beginPath(); ctx.arc(a[0], a[1], Math.max(1.2, s * 0.028 * near), 0, 6.283); ctx.fill(); }
    });
    if (fill > 0) {
      ctx.save(); ctx.globalAlpha = fill; ctx.lineWidth = Math.max(1, s * 0.05); ctx.strokeStyle = "#55808a";
      MARK.forEach(function (f) {
        ctx.beginPath(); f.pts.forEach(function (p, i) { var x = cx + p[0] * s, y = cy + p[1] * s; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.closePath(); ctx.fillStyle = f.fill; ctx.fill(); ctx.stroke();
      });
      ctx.restore();
    }
  }
  AP.drawDodeca = drawDodeca; AP.qaxis = qaxis; AP.qmul = qmul;

  /* ---------- opening sequence ---------- */
  function buildIntro() {
    var c = CFG.intro || {};
    var o = el("div", "ap-intro");
    o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "Opening " + (c.title || "portal"));
    var stats = (c.stats || []).map(function (s) { return '<div><b data-ap-count>' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join("");
    o.innerHTML =
      '<div class="ap-i-grid"></div><div class="ap-i-glow"></div>' +
      '<div class="ap-i-stage">' +
        '<div class="ap-i-logo"><canvas></canvas></div>' +
        '<div class="ap-i-load"><div class="ap-i-status" aria-live="polite">' + (c.status || "Loading") + '</div>' +
          '<div class="ap-i-bar"><i></i></div><div class="ap-i-sub"><span class="ap-i-what">Preparing</span><span class="ap-i-pct">0%</span></div></div>' +
        '<div class="ap-i-card">' +
          '<div class="ap-i-kick">' + (c.kicker || "") + '</div>' +
          '<div class="ap-i-title">' + (c.title || "") + '</div>' +
          '<div class="ap-i-meta">' + (c.meta || "") + '</div>' +
          '<div class="ap-i-stats">' + stats + '</div>' +
          '<div class="ap-i-for">' + (c.preparedFor || "") + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="ap-i-brand">ARTEMIS BIOLABS <span>·</span> CONCIERGE SPATIAL BIOINFORMATICS</div>' +
      '<button type="button" class="ap-i-skip">Skip intro <kbd>Esc</kbd></button>';
    return o;
  }

  function runIntro() {
    var o = buildIntro();
    D.body.appendChild(o);
    H.classList.remove("ap-pending");
    D.body.classList.add("ap-intro-on");
    var cv = o.querySelector("canvas"), ctx = cv.getContext("2d"), logo = o.querySelector(".ap-i-logo");
    var load = o.querySelector(".ap-i-load"), card = o.querySelector(".ap-i-card"), bar = o.querySelector(".ap-i-bar i");
    var what = o.querySelector(".ap-i-what"), pct = o.querySelector(".ap-i-pct"), brand = o.querySelector(".ap-i-brand"), skipB = o.querySelector(".ap-i-skip");
    var counts = [].slice.call(o.querySelectorAll("[data-ap-count]")).map(function (n) { return { n: n, p: parseNum(n.textContent) }; });
    var title = o.querySelector(".ap-i-title"), kick = o.querySelector(".ap-i-kick"), meta = o.querySelector(".ap-i-meta"), forE = o.querySelector(".ap-i-for");
    var statEls = [].slice.call(o.querySelectorAll(".ap-i-stats > div"));
    var dpr = Math.min(W.devicePixelRatio || 1, 2), size = 0;
    var liftY = -150;
    function fit() { size = logo.offsetWidth; cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr); var stage = logo.parentNode; liftY = card.offsetTop - 16 - 0.42 * size * 0.42 - stage.offsetHeight / 2; }
    fit(); W.addEventListener("resize", fit);
    var t0 = performance.now(), shown = 0, resolveAt = null, exitAt = null, ended = false, skipping = null;
    var MIN_SPIN = 1.35, MAX_SPIN = 1.85, HOLD = 1.55, EXIT = 0.42;
    if (reduced) { MIN_SPIN = 0.9; MAX_SPIN = 1.6; }
    function done() {
      if (ended) return; ended = true;
      T.tracking = false;
      try { if (freezeAt === null) sessionStorage.setItem(KEY, "1"); } catch (e) {}
      o.remove(); H.classList.remove("ap-lock"); D.body.classList.remove("ap-intro-on");
      revealHero();
      D.removeEventListener("keydown", onKey);
    }
    function skip() { if (!skipping && !ended) skipping = performance.now(); if (reduced) done(); }
    function onKey(e) { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); skip(); } }
    D.addEventListener("keydown", onKey);
    o.addEventListener("click", skip);
    skipB.addEventListener("click", function (e) { e.stopPropagation(); skip(); });
    AP.skipIntro = skip;
    function frame(now) {
      if (ended) return;
      var t = freezeAt !== null ? freezeAt : (now - t0) / 1000;
      var prog = AP.progress();
      shown += (prog - shown) * (reduced ? 1 : 0.18);
      if (freezeAt !== null) { if (t >= MIN_SPIN) resolveAt = MIN_SPIN; }
      else if (resolveAt === null && ((t >= MIN_SPIN && prog >= 0.999) || t >= MAX_SPIN)) resolveAt = t;
      if (resolveAt !== null && exitAt === null) exitAt = resolveAt + HOLD;
      /* fast exit on skip */
      if (skipping) { var ks = (now - skipping) / 260; o.style.opacity = String(1 - eo3(ks)); if (ks >= 1) return done(); }
      var r = resolveAt === null ? 0 : (t - resolveAt);
      var fill = resolveAt === null ? 0 : eio(r / 0.45);
      var move = resolveAt === null ? 0 : eio((r - 0.18) / 0.6);
      var cardK = resolveAt === null ? 0 : eo3((r - 0.32) / 0.55);
      var cnt = resolveAt === null ? 0 : eo3((r - 0.42) / 0.85);
      var ex = exitAt === null ? 0 : eio((t - exitAt) / EXIT);
      if (reduced) { fill = resolveAt === null ? 1 : 1; move = resolveAt === null ? 0 : 1; cardK = resolveAt === null ? 0 : 1; cnt = 1; }
      /* logo */
      var q;
      if (reduced) q = [1, 0, 0, 0];
      else {
        var spin = qmul(qaxis([0.35, 1, 0.18], t * 3.4 + 0.6), qaxis([1, 0.2, 0.1], 0.9 * Math.sin(t * 1.7) + 0.5));
        q = resolveAt === null ? spin : qslerpId(spin, eio(r / 0.62));
      }
      var persp = reduced ? 0 : 1 - (resolveAt === null ? 0 : eio(r / 0.62));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
      var drawOn = reduced ? 1 : eo3(t / 0.7);
      var breathe = reduced ? 1 : (0.86 + 0.14 * eo3(t / 0.9));
      drawDodeca(ctx, size / 2, size / 2, size * 0.235 * breathe, q, persp, fill, drawOn);
      var sc = 1 - 0.58 * move, ty = move * liftY;
      logo.style.transform = "translate3d(0," + ty.toFixed(1) + "px,0) scale(" + sc.toFixed(4) + ")";
      /* loader */
      bar.style.transform = "scaleX(" + shown.toFixed(4) + ")";
      pct.textContent = Math.round(shown * 100) + "%";
      var pend = AP.pendingLabel();
      what.textContent = pend ? "Fetching " + pend : (AP.vitessceWarm === "warming" ? "Data ready · warming Vitessce" : "Data ready");
      load.style.opacity = String(reduced ? (resolveAt === null ? 1 : 0) : (eo3(t / 0.5) * (1 - eo3((r) / 0.35 * (resolveAt === null ? 0 : 1)))));
      load.style.transform = "translate3d(0," + (reduced ? 0 : (1 - eo3(t / 0.5)) * 10 + (resolveAt === null ? 0 : eo3(r / 0.35) * -8)).toFixed(1) + "px,0)";
      /* dataset reveal card */
      card.style.opacity = String(cardK);
      card.style.visibility = cardK > 0 ? "visible" : "hidden";
      card.style.transform = "translate3d(0," + ((1 - cardK) * 22).toFixed(1) + "px,0)";
      [kick, title, meta].forEach(function (e2, i) { var k = reduced ? cardK : eo3((r - 0.32 - i * 0.08) / 0.5); e2.style.opacity = String(k); e2.style.transform = "translate3d(0," + ((1 - k) * 12).toFixed(1) + "px,0)"; });
      statEls.forEach(function (e2, i) { var k = reduced ? cardK : eo3((r - 0.5 - i * 0.07) / 0.45); e2.style.opacity = String(k); e2.style.transform = "translate3d(0," + ((1 - k) * 10).toFixed(1) + "px,0)"; });
      forE.style.opacity = String(reduced ? cardK : eo3((r - 0.85) / 0.45));
      counts.forEach(function (c) { if (c.p) c.n.textContent = cnt >= 1 ? c.p.orig : fmtNum(c.p, c.p.val * cnt); });
      brand.style.opacity = String((reduced ? 1 : eo3(t / 0.8)) * (1 - ex));
      /* exit: lift the paper away to reveal the hero */
      if (ex > 0 && !reduced) {
        o.style.transform = "translate3d(0," + (-ex * 100).toFixed(2) + "vh,0)";
        o.style.borderBottomLeftRadius = o.style.borderBottomRightRadius = (ex * 40).toFixed(0) + "px";
        if (ex > 0.15) revealHero();
      } else if (ex > 0 && reduced) { return done(); }
      if (ex >= 1) return done();
      nativeRAF(frame);
    }
    nativeRAF(frame);
  }

  /* ---------- hero reveal + page polish ---------- */
  var heroDone = false;
  function revealHero() {
    if (heroDone) return; heroDone = true;
    D.body.classList.add("ap-hero-in");
    var heroCounts = D.querySelectorAll(CFG.heroCountSel || ".stats b, .kpi b");
    setTimeout(function () { [].forEach.call(heroCounts, function (n, i) { setTimeout(function () { countUp(n, 1100); }, i * 90); }); }, 250);
  }
  AP.revealHero = revealHero;

  function polish() {
    /* hero stagger targets */
    [].forEach.call(D.querySelectorAll(CFG.heroSel || ""), function (n, i) { n.classList.add("ap-h"); n.style.setProperty("--ap-d", (i * 70) + "ms"); });
    /* section reveals (skip interactive/sticky sections) */
    if (!reduced && "IntersectionObserver" in W) {
      var skipSec = CFG.noRevealSel || "#story,#tour,#explore";
      var targets = [].filter.call(D.querySelectorAll(CFG.revealSel || "main section .wrap > *, section.blk .wrap > *, .ap-scene .ap-wrap > *"), function (n) { return !n.closest(skipSec) && !n.closest("header") && n.getBoundingClientRect().height < 2400; });
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("ap-in"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });
      targets.forEach(function (n) {
        var r = n.getBoundingClientRect();
        if (r.top < W.innerHeight && r.bottom > 0) return; /* already on screen */
        n.classList.add("ap-rv"); io.observe(n);
      });
      /* count-ups for stat blocks outside the hero */
      var cio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { countUp(e.target, 1000); cio.unobserve(e.target); } }); }, { threshold: 0.6 });
      [].forEach.call(D.querySelectorAll(CFG.countSel || ".stat b"), function (n) { cio.observe(n); });
    }
    /* scroll progress hairline */
    var pr = el("div", "ap-progress"); D.body.appendChild(pr);
    var ticking = false;
    function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(function () { ticking = false; var h = D.documentElement.scrollHeight - W.innerHeight; pr.style.transform = "scaleX(" + (h > 0 ? clamp(W.scrollY / h, 0, 1) : 0).toFixed(4) + ")"; }); }
    W.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    /* button micro-interactions: ripple from the press point */
    D.addEventListener("pointerdown", function (e) {
      var b = e.target.closest && e.target.closest(".btn, .ap-mode, .gbtn, button");
      if (!b || reduced || b.closest(".vitessce-container")) return;
      var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, rp = el("span", "ap-ripple");
      rp.style.width = rp.style.height = s + "px"; rp.style.left = (e.clientX - r.left - s / 2) + "px"; rp.style.top = (e.clientY - r.top - s / 2) + "px";
      if (getComputedStyle(b).position === "static") b.style.position = "relative";
      b.classList.add("ap-rippling"); b.appendChild(rp); setTimeout(function () { rp.remove(); }, 650);
    }, { passive: true });
  }

  function start() {
    polish();
    if (play) runIntro(); else { H.classList.remove("ap-lock"); revealHero(); }
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", start); else start();
})();
