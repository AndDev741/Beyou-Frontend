
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)");

  /* Sections start hidden only when we are confident we can animate them back
     in. Opened in a background tab, frames never run, so the reveal is skipped
     and every section renders as plain content. */
  var canAnimate = !reduce.matches && document.visibilityState === "visible";
  if (canAnimate) root.classList.add("js-reveal");

  /* ---- language ------------------------------------------------------
     One language per URL, declared on the document. Everything that used to be
     switched at runtime is now decided at build time; this only tells the canvas
     and the date formatter which one they are on. */
  var lang = (root.lang || "en").toLowerCase().indexOf("pt") === 0 ? "pt" : "en";

  /* ---- get started ----------------------------------------------------
     The href is the real destination, so no-script, middle-click and
     modifier-click all keep working. Only a plain left click on a touch or
     narrow device is diverted to the platform list. */
  var wantsNative = matchMedia("(max-width: 899px), (pointer: coarse)");

  document.querySelectorAll("[data-cta='start']").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!wantsNative.matches) return;
      var target = document.getElementById("download");
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({
        behavior: reduce.matches ? "auto" : "smooth",
        block: "start"
      });
    });
  });

  /* ---- theme --------------------------------------------------------- */
  var themeBtn = document.getElementById("theme");
  themeBtn.addEventListener("click", function () {
    var dark = root.dataset.theme
      ? root.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    redrawRadar();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { redrawRadar(); });

  /* ---- sticky nav hairline ------------------------------------------- */
  var nav = document.getElementById("nav");
  var sentinel = document.createElement("div");
  sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px";
  document.body.prepend(sentinel);
  new IntersectionObserver(function (e) {
    nav.classList.toggle("is-stuck", !e[0].isIntersecting);
  }).observe(sentinel);

  /* ---- hero check-in: the product's core loop, live ------------------- */
  var rows = Array.prototype.slice.call(document.querySelectorAll(".row"));
  var dayRing = document.getElementById("dayring");
  var dayCount = document.getElementById("daycount");
  var xpTotal = document.getElementById("xptotal");
  var replay = document.getElementById("replay");
  var RING = 163.36;
  var shown = 0;
  var tween = null;
  var settle = null;

  function countTo(target) {
    if (tween) cancelAnimationFrame(tween);
    if (settle) clearTimeout(settle);
    if (reduce.matches) { shown = target; xpTotal.textContent = target; return; }
    /* The frame loop is the nicety; this guarantees the final number lands
       even when frames are throttled (background tab, reduced power mode). */
    settle = setTimeout(function () {
      shown = target;
      xpTotal.textContent = target;
    }, 500);
    var from = shown, t0 = performance.now();
    (function step(now) {
      var k = Math.min((now - t0) / 420, 1);
      var eased = 1 - Math.pow(1 - k, 3);
      shown = Math.round(from + (target - from) * eased);
      xpTotal.textContent = shown;
      if (k < 1) tween = requestAnimationFrame(step);
    })(t0);
  }

  var userTookOver = false;
  var slot = document.getElementById("slot");
  var rowNew = document.getElementById("rownew");
  var strip = document.getElementById("strip");
  var agText = document.getElementById("agtext");
  var askText = document.getElementById("asktext");
  var dateEl = document.getElementById("today");

  /* The third row only counts once the assistant has actually created it, so
     the card reads 0 / 2 before and 0 / 3 after. */
  function present() {
    return slot.classList.contains("filled") ? rows : rows.slice(0, rows.length - 1);
  }

  function sync(justChecked) {
    var pool = present();
    var done = pool.filter(function (r) { return r.getAttribute("aria-pressed") === "true"; });
    var xp = done.reduce(function (a, r) { return a + Number(r.dataset.xp); }, 0);
    dayRing.style.strokeDashoffset = RING - (RING * done.length) / pool.length;
    dayCount.textContent = done.length + " / " + pool.length;
    countTo(xp);
    var full = done.length === pool.length && done.length > 0;
    /* Only offered once the card belongs to the reader; during the demo the
       button would blink in and out on every cycle. */
    replay.classList.toggle("on", full && userTookOver);
  }

  function floatXp(row) {
    var chip = document.createElement("span");
    chip.className = "xpfloat";
    chip.textContent = "+" + row.dataset.xp + " XP";
    row.appendChild(chip);
    if (reduce.matches) setTimeout(function () { chip.remove(); }, 900);
    else chip.addEventListener("animationend", function () { chip.remove(); });
  }

  /* One path for both the demo and a real tap, so they can never disagree. */
  function setRow(row, checked, withFloat) {
    if ((row.getAttribute("aria-pressed") === "true") === checked) return;
    row.setAttribute("aria-pressed", String(checked));
    if (checked && withFloat) floatXp(row);
    sync(checked);
  }

  function clearRows() {
    rows.forEach(function (r) { r.setAttribute("aria-pressed", "false"); });
    sync(false);
  }

  /* ---- the assistant half of the demo ---------------------------------- */
  var PROMPT = {
    pt: "Crie um hábito de corrida matinal",
    en: "Create a morning running habit"
  };
  var STATUS = {
    read:  { pt: "lendo suas categorias", en: "reading your categories" },
    done:  { pt: "Corrida leve adicionada", en: "Easy run added" }
  };
  var STRIP_LABEL = {
    pt: "Demonstração: o assistente cria o hábito Corrida leve e o encaixa na terceira vaga da manhã.",
    en: "Demonstration: the assistant creates the habit Easy run and fits it into the third morning slot."
  };
  var statusKey = "";
  var typed = 0;
  var promptDone = false;

  function setStatus(key) {
    statusKey = key;
    agText.textContent = key ? STATUS[key][lang] : "";
  }

  function paintPrompt() {
    askText.textContent = PROMPT[lang].slice(0, typed);
  }

  function relabelStrip() {
    strip.setAttribute("aria-label", STRIP_LABEL[lang]);
    setStatus(statusKey);
    /* The two prompts differ in length, so a raw character count carried over
       from the other language would clip the sentence. */
    typed = promptDone ? PROMPT[lang].length : Math.min(typed, PROMPT[lang].length);
    paintPrompt();
    stampDate();
  }

  function stampDate() {
    var d = new Date();
    dateEl.textContent = d.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", {
      weekday: "long", day: "numeric", month: "long"
    });
  }

  function revealNew(flash) {
    slot.classList.add("filled");
    rowNew.removeAttribute("aria-hidden");
    rowNew.removeAttribute("tabindex");
    if (flash && !reduce.matches) {
      rowNew.classList.remove("land");
      void rowNew.offsetWidth;
      rowNew.classList.add("land");
    }
    sync(false);
  }

  function hideNew() {
    slot.classList.remove("filled");
    rowNew.classList.remove("land");
    rowNew.setAttribute("aria-hidden", "true");
    rowNew.setAttribute("tabindex", "-1");
    sync(false);
  }

  function resetAgent() {
    strip.classList.remove("typing", "working", "picked", "settled");
    setStatus("");
    typed = 0;
    promptDone = false;
    paintPrompt();
  }

  /* The day starts with one item already done, so the card looks lived in and
     the XP has somewhere to count up from. */
  function baseDay() {
    rows[0].setAttribute("aria-pressed", "true");
    rows[1].setAttribute("aria-pressed", "false");
    rows[2].setAttribute("aria-pressed", "false");
    sync(false);
  }

  /* When the demo cannot run, the card still has to make sense: the habit is
     already there and the assistant already reported it. */
  function staticState() {
    strip.classList.add("picked", "settled");
    promptDone = true;
    typed = PROMPT[lang].length;
    paintPrompt();
    setStatus("done");
    baseDay();
    revealNew(false);
    setRow(rows[1], true, false);
  }

  /* ---- the demo runs itself until someone takes it over ----------------- */
  var demo = document.getElementById("demo");
  var frame = document.getElementById("frame");
  var autoOn = false;
  var autoTimers = [];
  var inView = false;
  var cyclesLeft = 0;
  /* Plays once and stays. The finished card is the better thing to leave on
     screen than a reset one, and scrolling back to this panel replays it. */
  var MAX_CYCLES = 1;

  function later(fn, ms) { autoTimers.push(setTimeout(fn, ms)); }

  function stopDemo(handOver) {
    autoOn = false;
    autoTimers.forEach(clearTimeout);
    autoTimers = [];
    if (handOver) userTookOver = true;
  }

  function demoAllowed() {
    return !userTookOver && !reduce.matches && document.visibilityState === "visible";
  }

  function typePrompt(done) {
    var text = PROMPT[lang];
    strip.classList.add("typing");
    var step = Math.max(22, Math.round(800 / text.length));
    for (var i = 1; i <= text.length; i++) {
      (function (n) {
        later(function () {
          if (!autoOn) return;
          typed = n;
          paintPrompt();
          if (n === text.length) {
            promptDone = true;
            strip.classList.remove("typing");
            done();
          }
        }, i * step);
      })(i);
    }
  }

  /* The request is typed, then answered, then the routine changes. Cause first,
     consequence second, which is also the reading order of the frame. */
  function cycle() {
    if (!autoOn) return;
    autoTimers = [];

    later(function () {
      if (!autoOn) return;
      typePrompt(function () {
        strip.classList.add("working", "picked");
        setStatus("read");
      });
    }, 700);

    later(function () {
      if (!autoOn) return;
      strip.classList.remove("working");
      strip.classList.add("settled");
      setStatus("done");
      revealNew(true);
    }, 2300);

    later(function () { if (autoOn) setRow(rows[1], true, true); }, 3600);

    later(function () {
      if (!autoOn) return;
      cyclesLeft -= 1;
      if (cyclesLeft <= 0) { autoOn = false; return; }
      resetAgent();
      hideNew();
      baseDay();
      cycle();
    }, 7000);
  }

  function startDemo() {
    if (!inView) return;
    if (userTookOver) return;
    if (!demoAllowed()) { staticState(); return; }
    if (autoOn) return;
    autoOn = true;
    cyclesLeft = MAX_CYCLES;
    resetAgent();
    hideNew();
    baseDay();
    cycle();
  }

  new IntersectionObserver(function (entries) {
    inView = entries[0].isIntersecting;
    if (inView) startDemo();
    else stopDemo(false);
  }, { threshold: 0.3 }).observe(frame);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopDemo(false);
    else startDemo();
  });

  rows.forEach(function (row) {
    row.addEventListener("click", function () {
      stopDemo(true);
      setRow(row, row.getAttribute("aria-pressed") !== "true", true);
    });
  });

  replay.addEventListener("click", function () {
    stopDemo(true);
    clearRows();
    rows[0].focus();
  });

  relabelStrip();
  baseDay();
  if (!demoAllowed()) staticState();

  /* ---- reveal on enter ------------------------------------------------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
      if (e.target.querySelector("#radar")) startRadar();
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".rv").forEach(function (el) { io.observe(el); });

  /* ---- the nav marks the section you are in ---------------------------- */
  /* Which section you are reading is a geometric fact, so it is answered
     geometrically: whichever one covers the line just under the nav. That is
     true of exactly one section at any scroll position, in the snapped deck and
     in ordinary scrolling alike, so there is no tie to break. The observer is
     only the trigger, which is why the callback ignores its entries: crossings
     are precisely when the answer can change, and this keeps the page free of
     scroll listeners. */
  var navAnchors = {};
  document.querySelectorAll(".nav-links a[href^='#']").forEach(function (a) {
    navAnchors[a.getAttribute("href").slice(1)] = a;
  });
  /* Home stands for the opening of the page, so it covers the hero and the
     founder note as well as the anchor it actually points at. */
  if (navAnchors.top) {
    navAnchors.hero = navAnchors.top;
    navAnchors.porque = navAnchors.top;
  }

  var panels = [].slice.call(document.querySelectorAll("main > section"));
  var marked = null;

  /* One dot per panel, each one a real jump rather than an indicator. Built here
     so the rail cannot show up on a page where the script did not run. */
  var rail = document.createElement("nav");
  rail.className = "rail";
  rail.setAttribute("aria-label", "Seções / Sections");
  var dots = panels.map(function (sec) {
    var b = document.createElement("button");
    b.type = "button";
    var t = sec.querySelector("h1, h2");
    b.setAttribute("aria-label", t ? t.textContent.trim().slice(0, 60) : "");
    b.addEventListener("click", function () {
      sec.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    rail.appendChild(b);
    return b;
  });
  document.body.appendChild(rail);

  function markSection() {
    var line = document.querySelector(".nav").getBoundingClientRect().bottom + 1;
    var here = null;
    for (var i = 0; i < panels.length; i++) {
      var r = panels[i].getBoundingClientRect();
      if (r.top <= line && r.bottom > line) { here = panels[i].id; break; }
    }
    /* The hero, the founder note and the areas panel have no anchor of their
       own, so nothing is marked while you are in them. Better a gap than a
       highlight pointing at a section you are not in. */
    /* The rail marks every panel, including the two the nav cannot name. */
    for (var d = 0; d < dots.length; d++) {
      if (panels[d].id === here || (!panels[d].id && here === undefined)) dots[d].setAttribute("aria-current", "true");
      else dots[d].removeAttribute("aria-current");
    }

    var next = navAnchors[here] || null;
    if (next === marked) return;
    if (marked) marked.removeAttribute("aria-current");
    if (next) next.setAttribute("aria-current", "location");
    marked = next;
  }

  if (panels.length) {
    var navIo = new IntersectionObserver(markSection, {
      threshold: [0, 0.02, 0.25, 0.5, 0.75, 0.98, 1]
    });
    panels.forEach(function (p) { navIo.observe(p); });
    addEventListener("resize", markSection, { passive: true });
    markSection();
  }

  /* ---- the agent console you can drive -------------------------------- */
  /* All the timing lives in CSS transition delays, so this only ever swaps a
     class. Picking another request therefore cannot land half of one sequence
     on top of another, and there is no timer to clear. */
  var conBody = document.getElementById("conbody");

  if (conBody) {
    var turns = [].slice.call(conBody.querySelectorAll(".turn"));
    var pbtns = [].slice.call(document.querySelectorAll(".pbtn"));

    /* The body is sized to the tallest request so the panel never jumps when
       you switch. Measured rather than guessed, because the four differ. */
    function sizeBody() {
      /* No need to collapse the box first: a turn's scrollHeight is its own
         content, not a function of its parent's height, and collapsing it made
         the arrival observer measure a box that was briefly not there. */
      var tall = 0;
      turns.forEach(function (t) {
        var was = t.style.display;
        t.style.display = "flex";
        tall = Math.max(tall, t.scrollHeight);
        t.style.display = was;
      });
      var cs = getComputedStyle(conBody);
      var pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      var wanted = Math.ceil(tall + pad);

      /* In the deck a panel cannot grow, so the transcript takes what is left
         after the console's own header and request row. Where that is less than
         the tallest request needs, the oldest line leaves the frame rather than
         the panel outgrowing its snap point. */
      var deck = matchMedia("(min-width: 1000px) and (min-height: 700px)").matches ||
        matchMedia("(max-width: 999px) and (min-height: 700px)").matches;
      if (deck) {
        var sec = conBody.closest("section");
        var scs = getComputedStyle(sec);
        /* Reading the rendered height here would be circular: the panel is tall
           because the transcript is tall. The declared min-height is the target
           the panel is supposed to hold, so measure that instead. */
        var floorH = parseFloat(scs.minHeight);
        var avail = (floorH > 0 ? floorH : innerHeight) -
          parseFloat(scs.paddingTop) - parseFloat(scs.paddingBottom);
        var chrome = 2;
        [".con-top", ".con-ask"].forEach(function (sel) {
          chrome += sec.querySelector(sel).getBoundingClientRect().height;
        });

        /* Beside the argument the console owns the panel's whole height; stacked
           under it on a phone it only gets what the argument leaves. Which of the
           two it is, is a geometric question, so ask it that way rather than
           re-encoding the breakpoint here. */
        var box = sec.querySelector(".console").getBoundingClientRect();
        var wrap = sec.querySelector(".wrap");
        var above = 0;
        [].forEach.call(wrap.children, function (c) {
          if (c.contains(conBody)) return;
          var r = c.getBoundingClientRect();
          if (r.bottom <= box.top + 2) above += r.height + (parseFloat(getComputedStyle(wrap).rowGap) || 0);
        });

        wanted = Math.min(wanted, Math.floor(avail - chrome - above - 12));
      }
      conBody.style.setProperty("--con-h", Math.max(160, wanted) + "px");
    }

    function show(i) {
      turns.forEach(function (t, n) {
        t.classList.remove("is-on");
        /* Reflow between the two class states, otherwise re-picking the request
           already showing would not replay it. */
        if (n === i) void t.offsetWidth;
        if (n === i) t.classList.add("is-on");
      });
      pbtns.forEach(function (b, n) {
        b.setAttribute("aria-pressed", n === i ? "true" : "false");
      });
    }

    root.classList.add("js-agent");
    sizeBody();
    addEventListener("resize", sizeBody, { passive: true });
    /* The faces are inlined but still swap in after first paint, and every
       measurement above is in text. Measure again once they are the real ones. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeBody);

    var picked = false;
    pbtns.forEach(function (b, i) {
      b.addEventListener("click", function () { picked = true; show(i); });
    });

    /* Plays the first request on arrival, but never over a choice already made:
       a click can land while the panel is still scrolling in, and the visitor's
       pick has to win that race. */
    var conPlayed = false;

    function playOnce() {
      if (conPlayed || picked) return;
      conPlayed = true;
      show(0);
    }

    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) playOnce();
    }, { threshold: 0.35 }).observe(conBody);

    /* Someone arriving straight at #assistente has the console on screen before
       the observer has anything to report, so answer that geometrically instead
       of waiting for a tick that is only owed to a change. */
    var cr = conBody.getBoundingClientRect();
    if (cr.top < innerHeight * 0.8 && cr.bottom > innerHeight * 0.2) playOnce();
  }

  /* ---- the structure assembles when its panel arrives ------------------ */
  var struct = document.querySelector(".struct");

  if (struct && canAnimate) {
    root.classList.add("js-stage");
    var STAGE_AT = [180, 700, 1180, 1560];
    var stageTimers = [];

    function clearStages() {
      stageTimers.forEach(clearTimeout);
      stageTimers = [];
      for (var i = 1; i <= 4; i++) struct.classList.remove("st" + i);
    }

    /* Replays every time the panel comes back, since in a deck the assembly is
       the panel's payoff rather than a one-off entrance. */
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        clearStages();
        STAGE_AT.forEach(function (ms, idx) {
          stageTimers.push(setTimeout(function () {
            struct.classList.add("st" + (idx + 1));
          }, ms));
        });
      } else {
        clearStages();
      }
    }, { threshold: 0.4 }).observe(struct);
  }

  /* ---- life balance radar -------------------------------------------- */
  var radarStarted = false;
  var canvas = document.getElementById("radar");
  var ctx = canvas.getContext("2d");
  /* Level plus progress within the level, from the same demo account. */
  var axes = [
    { pt: "Carreira", en: "Career", v: 12.98 },
    { pt: "Família", en: "Family", v: 11.89 },
    { pt: "Integridade", en: "Integrity", v: 10.85 },
    { pt: "Mental", en: "Mental", v: 10.84 },
    { pt: "Saúde Física", en: "Physical Health", sPt: "Saúde", sEn: "Health", v: 9.95 },
    { pt: "Estudos", en: "Studies", v: 5.00 },
    { pt: "Finanças", en: "Finances", v: 2.50 }
  ];
  var MAX = 13;
  var grow = 0;
  var raf = null;

  function css(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }

  /* An axis label only has to name the area, and a long one steals radius
     from every other axis, so the long ones carry a short form for the web.
     The full names stay in the canvas description. */
  function axisLabel(ax) { return ax[lang === "pt" ? "sPt" : "sEn"] || ax[lang]; }

  function renderRadar() {
    var dpr = Math.min(devicePixelRatio || 1, 2);
    var box = canvas.getBoundingClientRect();
    var size = Math.max(box.width || 340, 240);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    var cx = size / 2, cy = size / 2;
    var accent = css("--accent");
    var border = css("--border");
    var label = css("--text-3");
    var n = axes.length;

    /* The axis labels sit outside the web, so the web's radius is whatever is
       left after the widest label. Measure instead of guessing: "Physical
       Health" is far wider than "Mental". */
    var fontPx = Math.max(11, Math.round(size * 0.034));
    ctx.font = "500 " + fontPx + "px 'Geist', system-ui, sans-serif";
    var maxLabel = 0;
    var widestCos = 0;
    for (var w = 0; w < n; w++) {
      maxLabel = Math.max(maxLabel, ctx.measureText(axisLabel(axes[w])).width);
      /* How far sideways the outermost label reaches depends on the polygon:
         a hexagon's widest sit at 30 degrees off horizontal, a heptagon's
         almost exactly on it. Derive it rather than hardcode one shape. */
      widestCos = Math.max(widestCos, Math.abs(Math.cos((Math.PI * 2 * w) / n - Math.PI / 2)));
    }
    var gap = Math.max(14, size * 0.045);
    var r = Math.min(
      (size / 2 - maxLabel) / Math.max(widestCos, 0.3) - gap,
      size / 2 - gap - fontPx
    );
    r = Math.max(r, size * 0.2);

    function point(i, rad) {
      var a = (Math.PI * 2 * i) / n - Math.PI / 2;
      return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = border;
    for (var g = 1; g <= 3; g++) {
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var p = point(i % n, (r * g) / 3);
        i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]);
      }
      ctx.closePath();
      ctx.stroke();
    }
    for (var j = 0; j < n; j++) {
      var e = point(j, r);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(e[0], e[1]);
      ctx.stroke();
    }

    ctx.beginPath();
    for (var k = 0; k <= n; k++) {
      var idx = k % n;
      var rad = (Math.min(axes[idx].v, MAX) / MAX) * r * grow;
      var q = point(idx, rad);
      k === 0 ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1]);
    }
    ctx.closePath();
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.16;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    for (var m = 0; m < n; m++) {
      var rad2 = (Math.min(axes[m].v, MAX) / MAX) * r * grow;
      var v = point(m, rad2);
      ctx.beginPath();
      ctx.arc(v[0], v[1], 3.2, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    }

    ctx.fillStyle = label;
    ctx.textBaseline = "middle";
    for (var t = 0; t < n; t++) {
      var lp = point(t, r + gap);
      var text = axisLabel(axes[t]);
      var a2 = (Math.PI * 2 * t) / n - Math.PI / 2;
      var cos = Math.cos(a2);
      ctx.textAlign = Math.abs(cos) < 0.25 ? "center" : cos > 0 ? "left" : "right";
      ctx.fillText(text, lp[0], lp[1]);
    }
  }

  /* Draws once when the section arrives: the shape forming is the point. */
  function startRadar() {
    if (radarStarted) return;
    radarStarted = true;
    if (!canAnimate) { grow = 1; renderRadar(); return; }
    /* Same guarantee as the XP counter: the shape must end up drawn even if
       the frame loop never gets scheduled. */
    var done = setTimeout(function () {
      if (raf) cancelAnimationFrame(raf);
      grow = 1;
      renderRadar();
    }, 1000);
    var t0 = performance.now();
    (function step(now) {
      var k = Math.min((now - t0) / 900, 1);
      grow = 1 - Math.pow(1 - k, 3);
      renderRadar();
      if (k < 1) raf = requestAnimationFrame(step);
      else clearTimeout(done);
    })(t0);
  }

  function redrawRadar() { if (radarStarted) renderRadar(); }

  /* Leaving the tab mid-draw must not freeze the shape half-formed. */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && radarStarted) {
      if (raf) cancelAnimationFrame(raf);
      grow = 1;
      renderRadar();
    }
  });

  addEventListener("resize", redrawRadar);

  addEventListener("beforeunload", function () {
    if (raf) cancelAnimationFrame(raf);
    if (tween) cancelAnimationFrame(tween);
  });
})();

/* ---- product analytics (PostHog) --------------------------------------
   The same Beyou PostHog project the app and docs feed; this site separates
   in insights by $host (beyouweb.com). The official snippet, loading the SDK
   asynchronously from PostHog's EU CDN — this page has no bundler, so
   self-hosting the SDK would mean vendoring and hand-updating it. The key is
   a public ingest identifier (it ships in every visitor's page source by
   design), not a secret.

   No masking and no identify: everything here is public marketing copy, and
   visitors have no accounts. `identified_only` keeps anonymous visits from
   minting billed person profiles. Session recording is not loaded at all.

   Known cost, accepted for now: adblockers and Brave drop these requests, so
   this undercounts. The fix, when the numbers start to matter, is the
   first-party reverse proxy noted in the analytics plan. */
(function () {
  "use strict";

  !function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } } (p = t.createElement("script")).type = "text/javascript", p.crossOrigin = "anonymous", p.async = !0, p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e }, u.people.toString = function () { return u.toString(1) + ".people (stub)" }, o = "init Ee Ts Ms Ee Es Rs capture Ge calculateEventProperties Os register register_once register_for_session unregister unregister_for_session js getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey canRenderSurveyAsync identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty Ds Fs createPersonProfile Ls Ps Vs opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing Cs debug I As getPageViewId captureTraceFeedback captureTraceMetric".split(" "), n = 0; n < o.length; n++)g(u, o[n]); e._i.push([i, s, a]) }, e.__SV = 1) }(document, window.posthog || []);

  window.posthog.init("phc_oy6exnreTLjEVjgLLfrs6kuHQavxMCLyPnSVxrHVsQUn", {
    /* The first-party reverse proxy (Cloudflare Worker → PostHog EU): privacy
       blockers key on *.posthog.com, not on this origin — and it also removes
       the one third-party script load this page had, since /static/array.js
       now comes through the same proxy. ui_host is where the PostHog app
       lives, required whenever api_host is a proxy. */
    api_host: "https://ph.beyouweb.com",
    ui_host: "https://eu.posthog.com",
    defaults: "2025-05-24",
    autocapture: true,
    person_profiles: "identified_only",
    disable_session_recording: true
  });
})();
