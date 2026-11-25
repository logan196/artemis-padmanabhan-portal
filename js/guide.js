/* "Ask the data" guide. Offline by default: answers come from guide/qa.json, a fixed set of answers written from the computed results.
   If <meta name="artemis-guide-endpoint"> holds a URL (a server-side proxy such as the bundled Hugging Face Space), questions go there instead.
   No API key is ever present in this page. */
(function () {
"use strict";
var btn = document.getElementById("gbtn"), panel = document.getElementById("gpanel"); if (!btn || !panel) return;
var log = panel.querySelector(".log"), form = panel.querySelector("form"), input = panel.querySelector("input"), sugg = panel.querySelector(".sugg");
var EP = (document.querySelector('meta[name="artemis-guide-endpoint"]') || {}).content || "", QA = null;
function qa() { return QA ? Promise.resolve(QA) : fetch("guide/qa.json").then(function (r) { return r.json(); }).then(function (j) { QA = j; return j; }); }
function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
function add(cls, html) { var d = document.createElement("div"); d.className = "msg " + cls; d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; }
function toks(s) { return s.toLowerCase().replace(/[^a-z0-9+ ]/g, " ").split(/\s+/).filter(function (w) { return w.length > 2; }); }
function offline(q) {
  return qa().then(function (j) {
    var t = toks(q), best = null, bs = 0;
    j.items.forEach(function (it) { var k = toks(it.q + " " + it.keywords.join(" ")), s = 0; t.forEach(function (w) { if (k.indexOf(w) >= 0) s += 1; }); if (s > bs) { bs = s; best = it; } });
    if (!best || bs < 1) return { a: j.fallback, src: "offline guide" };
    return { a: best.a, src: "offline guide, from " + best.src };
  });
}
function ask(q) {
  add("u", "<span>" + esc(q) + "</span>");
  var p = EP ? fetch(EP, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, portal: document.body.dataset.portal }) })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) { return { a: j.answer, src: "live guide (answers only from this portal's results)" }; }).catch(function () { return offline(q); }) : offline(q);
  p.then(function (r) { add("a", esc(r.a) + '<span class="src">' + esc(r.src) + "</span>"); });
}
btn.addEventListener("click", function () { panel.classList.toggle("open"); if (panel.classList.contains("open")) { input.focus(); if (!log.childElementCount) qa().then(function (j) { add("a", esc(j.greeting) + '<span class="src">' + (EP ? "live guide connected" : "offline guide: answers are fixed, written from the computed results") + "</span>"); sugg.innerHTML = ""; j.suggested.forEach(function (s) { var b = document.createElement("button"); b.type = "button"; b.textContent = s; b.onclick = function () { ask(s); }; sugg.appendChild(b); }); }); } });
panel.querySelector(".xbtn").addEventListener("click", function () { panel.classList.remove("open"); });
form.addEventListener("submit", function (e) { e.preventDefault(); var q = input.value.trim(); if (!q) return; input.value = ""; ask(q); });
})();
