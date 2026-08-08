/* ============================================================
   Computer Science High School of Bicolandia — Portal Logic
   1) Grid canvas (slow moving grid + parallax)
   2) Particle/node canvas (glowing particles, connected nodes,
      cursor attraction + scatter, occasional pixel bursts)
   3) Floating code/binary glyph field
   4) Field + button micro-interactions
   5) Fake auth flow -> loading -> redirect placeholder
   ============================================================ */

(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  window.addEventListener("mouseleave", () => { mouse.active = false; });

  /* ---------------------------------------------------------
     1) GRID CANVAS — slow moving grid with parallax on cursor
  --------------------------------------------------------- */
  const gridCanvas = document.getElementById("canvas-grid");
  const gctx = gridCanvas.getContext("2d");
  let gw, gh;

  function resizeGrid() {
    gw = gridCanvas.width = window.innerWidth;
    gh = gridCanvas.height = window.innerHeight;
  }
  resizeGrid();
  window.addEventListener("resize", resizeGrid);

  let gridT = 0;
  function drawGrid() {
    gctx.clearRect(0, 0, gw, gh);
    const spacing = 46;
    const parallaxX = ((mouse.x / gw) - 0.5) * 18;
    const parallaxY = ((mouse.y / gh) - 0.5) * 18;
    const offset = prefersReducedMotion ? 0 : (gridT % spacing);

    gctx.strokeStyle = "rgba(47,168,79,0.07)";
    gctx.lineWidth = 1;

    for (let x = -spacing + offset + parallaxX; x < gw + spacing; x += spacing) {
      gctx.beginPath();
      gctx.moveTo(x, 0);
      gctx.lineTo(x, gh);
      gctx.stroke();
    }
    for (let y = -spacing + offset + parallaxY; y < gh + spacing; y += spacing) {
      gctx.beginPath();
      gctx.moveTo(0, y);
      gctx.lineTo(gw, y);
      gctx.stroke();
    }

    // soft vignette to keep grid subtle
    const vg = gctx.createRadialGradient(gw / 2, gh / 2, 0, gw / 2, gh / 2, Math.max(gw, gh) * 0.7);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    gctx.fillStyle = vg;
    gctx.fillRect(0, 0, gw, gh);

    if (!prefersReducedMotion) gridT += 0.15;
    requestAnimationFrame(drawGrid);
  }
  drawGrid();

  /* ---------------------------------------------------------
     2) PARTICLE / NODE CANVAS
  --------------------------------------------------------- */
  const pCanvas = document.getElementById("canvas-particles");
  const pctx = pCanvas.getContext("2d");
  let pw, ph;

  function resizeParticles() {
    pw = pCanvas.width = window.innerWidth;
    ph = pCanvas.height = window.innerHeight;
  }
  resizeParticles();
  window.addEventListener("resize", resizeParticles);

  const COLORS = ["#2FA84F", "#45D46A", "#F4C740", "#FFE07A"];
  const NODE_COUNT = Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 18000));
  const LINK_DIST = 130;
  const CURSOR_RADIUS = 140;

  class Node {
    constructor() {
      this.reset();
      this.x = Math.random() * pw;
      this.y = Math.random() * ph;
    }
    reset() {
      this.x = Math.random() * pw;
      this.y = Math.random() * ph;
      this.vx = (Math.random() - 0.5) * 0.25;
      this.vy = (Math.random() - 0.5) * 0.25;
      this.r = Math.random() * 1.6 + 0.6;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.pulse = Math.random() * Math.PI * 2;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.pulse += 0.02;

      if (this.x < -20) this.x = pw + 20;
      if (this.x > pw + 20) this.x = -20;
      if (this.y < -20) this.y = ph + 20;
      if (this.y > ph + 20) this.y = -20;

      if (mouse.active) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < CURSOR_RADIUS) {
          const force = (1 - dist / CURSOR_RADIUS);
          // gentle attraction toward cursor, with slight scatter jitter
          this.x -= (dx / dist) * force * 0.6;
          this.y -= (dy / dist) * force * 0.6;
          if (dist < 40) {
            this.x += (Math.random() - 0.5) * force * 3;
            this.y += (Math.random() - 0.5) * force * 3;
          }
        }
      }
    }
    draw() {
      const glow = 0.6 + Math.sin(this.pulse) * 0.4;
      pctx.beginPath();
      pctx.arc(this.x, this.y, this.r + glow, 0, Math.PI * 2);
      pctx.fillStyle = this.color;
      pctx.globalAlpha = 0.55;
      pctx.shadowColor = this.color;
      pctx.shadowBlur = 8;
      pctx.fill();
      pctx.globalAlpha = 1;
      pctx.shadowBlur = 0;
    }
  }

  const nodes = Array.from({ length: NODE_COUNT }, () => new Node());

  // occasional pixel/particle burst
  let bursts = [];
  function spawnBurst(x, y) {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      bursts.push({
        x, y,
        vx: Math.cos(angle) * (Math.random() * 1.6 + 0.6),
        vy: Math.sin(angle) * (Math.random() * 1.6 + 0.6),
        life: 1,
        color: Math.random() > 0.5 ? "#F4C740" : "#45D46A",
        size: Math.random() * 2 + 1,
      });
    }
  }
  setInterval(() => {
    if (prefersReducedMotion) return;
    spawnBurst(Math.random() * pw, Math.random() * ph);
  }, 3200);

  function drawParticles() {
    pctx.clearRect(0, 0, pw, ph);

    // links between close nodes (and to cursor)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK_DIST) {
          pctx.beginPath();
          pctx.moveTo(a.x, a.y);
          pctx.lineTo(b.x, b.y);
          const alpha = (1 - d / LINK_DIST) * 0.18;
          pctx.strokeStyle = `rgba(69,212,106,${alpha})`;
          pctx.lineWidth = 1;
          pctx.stroke();
        }
      }
      // link to cursor for a "reactive node" feel
      if (mouse.active) {
        const d = Math.hypot(nodes[i].x - mouse.x, nodes[i].y - mouse.y);
        if (d < CURSOR_RADIUS) {
          pctx.beginPath();
          pctx.moveTo(nodes[i].x, nodes[i].y);
          pctx.lineTo(mouse.x, mouse.y);
          const alpha = (1 - d / CURSOR_RADIUS) * 0.35;
          pctx.strokeStyle = `rgba(244,199,64,${alpha})`;
          pctx.lineWidth = 1;
          pctx.stroke();
        }
      }
    }

    nodes.forEach((n) => {
      if (!prefersReducedMotion) n.update();
      n.draw();
    });

    // cursor glow
    if (mouse.active) {
      const g = pctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 90);
      g.addColorStop(0, "rgba(244,199,64,0.10)");
      g.addColorStop(1, "rgba(244,199,64,0)");
      pctx.fillStyle = g;
      pctx.beginPath();
      pctx.arc(mouse.x, mouse.y, 90, 0, Math.PI * 2);
      pctx.fill();
    }

    // bursts
    bursts.forEach((b) => {
      b.x += b.vx;
      b.y += b.vy;
      b.life -= 0.02;
      pctx.globalAlpha = Math.max(b.life, 0);
      pctx.fillStyle = b.color;
      pctx.fillRect(b.x, b.y, b.size, b.size);
      pctx.globalAlpha = 1;
    });
    bursts = bursts.filter((b) => b.life > 0);

    requestAnimationFrame(drawParticles);
  }
  drawParticles();

  /* ---------------------------------------------------------
     3) Floating code / binary glyph field (DOM based)
  --------------------------------------------------------- */
  const glyphField = document.getElementById("glyphField");
  const GLYPHS = ["01", "10", "011", "</>", "{ }", "10110", "0101", "if()", "</>", "001", "110101", "</code>"];

  function spawnGlyph() {
    const el = document.createElement("span");
    el.className = "glyph" + (Math.random() > 0.55 ? " gold" : "");
    el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    const left = Math.random() * 100;
    const duration = 14 + Math.random() * 14;
    const size = 11 + Math.random() * 10;
    el.style.left = left + "vw";
    el.style.fontSize = size + "px";
    el.style.animationDuration = duration + "s";
    glyphField.appendChild(el);
    setTimeout(() => el.remove(), duration * 1000 + 500);
  }

  if (!prefersReducedMotion) {
    for (let i = 0; i < 14; i++) {
      setTimeout(spawnGlyph, i * 900);
    }
    setInterval(spawnGlyph, 1500);
  }

  /* ---------------------------------------------------------
     4) Field micro-interactions: magnetic burst + card glow
  --------------------------------------------------------- */
  const card = document.getElementById("portalCard");

  document.querySelectorAll(".field").forEach((field) => {
    field.addEventListener("mouseenter", (e) => triggerFieldBurst(field, e));
    field.addEventListener("focusin", (e) => triggerFieldBurst(field, e));

    field.addEventListener("mousemove", (e) => {
      const rect = field.getBoundingClientRect();
      const bx = ((e.clientX - rect.left) / rect.width) * 100;
      const by = ((e.clientY - rect.top) / rect.height) * 100;
      field.style.setProperty("--bx", bx + "%");
      field.style.setProperty("--by", by + "%");
    });
  });

  function triggerFieldBurst(field) {
    field.classList.remove("burst");
    // force reflow to restart animation
    void field.offsetWidth;
    field.classList.add("burst");
  }

  // subtle card tilt following the cursor (magnetic feel), disabled on touch
  const isTouch = matchMedia("(hover: none)").matches;
  if (!isTouch && !prefersReducedMotion) {
    document.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      const max = 3.5;
      card.style.transform = `rotateX(${(-dy * max).toFixed(2)}deg) rotateY(${(dx * max).toFixed(2)}deg)`;
    });
    document.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
    card.style.transformStyle = "preserve-3d";
    card.style.perspective = "800px";
  }

  /* ---------------------------------------------------------
     5) Button interaction + form submit flow
  --------------------------------------------------------- */
  const startBtn = document.getElementById("startBtn");
  const ripple = document.getElementById("btnRipple");
  const form = document.getElementById("portalForm");

  startBtn.addEventListener("mousemove", (e) => {
    const rect = startBtn.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 100;
    const my = ((e.clientY - rect.top) / rect.height) * 100;
    startBtn.style.setProperty("--mx", mx + "%");
    startBtn.style.setProperty("--my", my + "%");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (startBtn.classList.contains("loading")) return;

    // 1. ripple
    ripple.style.width = ripple.style.height = "10px";
    ripple.style.left = "50%";
    ripple.style.top = "50%";
    ripple.style.transform = "translate(-50%,-50%) scale(0)";
    void ripple.offsetWidth;
    ripple.style.width = ripple.style.height = "400px";
    ripple.classList.remove("animate");
    void ripple.offsetWidth;
    ripple.classList.add("animate");

    // 2/3. brighten + particle explosion at button center
    const rect = startBtn.getBoundingClientRect();
    spawnBurst(rect.left + rect.width / 2 - pCanvas.getBoundingClientRect().left,
                rect.top + rect.height / 2 - pCanvas.getBoundingClientRect().top);

    // 4. loading state
    startBtn.classList.add("loading");

    // 5. proceed (placeholder — wire up to real auth destination)
    setTimeout(() => {
  window.location.href = "game.html";
}, 1800);
// 4. loading state
startBtn.classList.add("loading");

// 5. Go to the game
setTimeout(() => {
  window.location.href = "game.html";
}, 1800);
  });
})();