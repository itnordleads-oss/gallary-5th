(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phoneQuery = window.matchMedia("(max-width: 980px)");
  let isPhone = phoneQuery.matches;

  const nav = document.querySelector(".nav");
  const menuBtn = document.querySelector(".menu-btn");
  const canvas = document.getElementById("field");
  const story = document.querySelector(".story");
  const connectPanel = document.getElementById("connectPanel");
  const connectForm = document.getElementById("connectForm");
  const relayName = document.getElementById("relayName");
  const connectError = document.getElementById("connectError");
  const connectOk = document.getElementById("connectOk");
  const scenes = [...document.querySelectorAll(".scene")];
  const required = {
    nav, menuBtn, canvas, story, connectPanel, connectForm, relayName, connectError, connectOk,
  };
  const missing = Object.entries(required).filter(([, node]) => !node).map(([name]) => name);
  if (missing.length || scenes.length !== 6) {
    throw new Error(`Site 05 required markup is missing: ${missing.join(", ") || "scenes"}`);
  }

  const setMenu = (open) => {
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("nav-lock", open && isPhone);
  };
  menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  phoneQuery.addEventListener("change", (event) => {
    isPhone = event.matches;
    if (!isPhone) setMenu(false);
  });

  const jump = (fraction) => {
    if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
      throw new Error(`Scroll target ${fraction} is outside 0–1.`);
    }
    const distance = story.offsetHeight - window.innerHeight;
    const y = story.offsetTop + distance * fraction;
    if (window.lenisInstance) window.lenisInstance.scrollTo(y, { force: true });
    else window.scrollTo({ top: y, behavior: prefersReduced || isPhone ? "auto" : "smooth" });
  };

  document.querySelectorAll("[data-at]").forEach((link) => {
    link.addEventListener("click", (event) => {
      setMenu(false);
      if (prefersReduced) return;
      event.preventDefault();
      jump(Number(link.dataset.at));
    });
  });

  const openConnect = () => {
    connectPanel.hidden = false;
    relayName.focus();
  };
  const closeConnect = () => {
    connectPanel.hidden = true;
  };
  document.querySelectorAll("[data-open-connect]").forEach((button) => {
    button.addEventListener("click", openConnect);
  });
  document.querySelectorAll("[data-close-connect]").forEach((button) => {
    button.addEventListener("click", closeConnect);
  });
  connectPanel.addEventListener("click", (event) => {
    if (event.target === connectPanel) closeConnect();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !connectPanel.hidden) closeConnect();
  });

  connectForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = relayName.value.trim();
    if (!name) {
      connectError.hidden = false;
      connectError.textContent = "Relay name is required.";
      connectOk.hidden = true;
      relayName.focus();
      return;
    }
    connectError.hidden = true;
    connectOk.hidden = false;
    connectOk.textContent = `${name} is listed on this page only. Nothing was broadcast.`;
  });

  const bands = {
    hero: [0, 0.18],
    orbit: [0.12, 0.34],
    hops: [0.28, 0.52],
    lotus: [0.46, 0.7],
    cards: [0.64, 0.86],
    iris: [0.8, 1],
  };
  const band = (progress, start, end) => {
    const edge = 0.055;
    if (progress < start || progress > end) return 0;
    const fadeIn = start === 0 ? 1 : Math.min(1, (progress - start) / edge);
    const fadeOut = end === 1 ? 1 : Math.min(1, (end - progress) / edge);
    return Math.min(fadeIn, fadeOut);
  };

  let progress = 0;
  const applyProgress = () => {
    let topScene = null;
    let topAlpha = 0;
    scenes.forEach((scene) => {
      const range = bands[scene.dataset.scene];
      if (!range) throw new Error(`Scene ${scene.dataset.scene} has no scroll band.`);
      const alpha = prefersReduced ? 1 : band(progress, range[0], range[1]);
      scene.style.opacity = String(alpha);
      if (alpha > topAlpha) {
        topAlpha = alpha;
        topScene = scene;
      }
    });
    scenes.forEach((scene) => scene.classList.toggle("is-live", scene === topScene && topAlpha > 0.35));
  };

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Site 05 canvas context is unavailable.");

  const stars = Array.from({ length: isPhone ? 56 : 140 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.4 + 0.3,
    p: Math.random() * Math.PI * 2,
  }));
  const GOLD = Math.PI * (3 - Math.sqrt(5));
  let width = 0;
  let height = 0;
  let time = 0;

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, window.innerWidth < 980 ? 1.5 : 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * ratio));
    canvas.height = Math.max(1, Math.floor(height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const drawSeed = (cx, cy, radius, alpha) => {
    if (alpha <= 0) return;
    context.save();
    context.globalAlpha = alpha;
    const glow = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glow.addColorStop(0, "rgba(255, 214, 120, 0.95)");
    glow.addColorStop(0.18, "rgba(190, 220, 255, 0.35)");
    glow.addColorStop(1, "rgba(120, 160, 255, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();
    const spokes = width < 980 ? 64 : 240;
    for (let i = 0; i < spokes; i += 1) {
      const angle = i * GOLD + time * 0.05;
      const dist = Math.sqrt(i / spokes) * radius;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist * 0.94;
      context.strokeStyle = "rgba(226, 236, 255, 0.22)";
      context.beginPath();
      context.moveTo(cx, cy);
      context.lineTo(x, y);
      context.stroke();
      context.fillStyle = "rgba(255,255,255,0.9)";
      context.beginPath();
      context.arc(x, y, 1.3, 0, Math.PI * 2);
      context.fill();
    }
    context.strokeStyle = "rgba(214, 255, 170, 0.55)";
    context.beginPath();
    context.moveTo(cx, cy + radius * 0.2);
    context.lineTo(width < 980 ? cx : cx + 30, width < 980 ? cy + radius * 1.2 : height * 0.92);
    context.stroke();
    context.restore();
  };

  const drawRings = (cx, cy, radius, alpha) => {
    if (alpha <= 0) return;
    context.save();
    context.globalAlpha = alpha;
    context.translate(cx, cy);
    for (let i = 0; i < 3; i += 1) {
      context.save();
      context.rotate(time * (0.15 + i * 0.05) + i);
      context.scale(1, 0.42 + i * 0.08);
      context.strokeStyle = "rgba(255, 236, 190, 0.75)";
      context.lineWidth = 1.4;
      context.beginPath();
      context.arc(0, 0, radius * (0.45 + i * 0.18), 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
    const core = context.createRadialGradient(0, 0, 0, 0, 0, radius * 0.35);
    core.addColorStop(0, "rgba(255, 244, 210, 1)");
    core.addColorStop(1, "rgba(255, 244, 210, 0)");
    context.fillStyle = core;
    context.beginPath();
    context.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  const drawLotus = (cx, cy, alpha) => {
    if (alpha <= 0) return;
    context.save();
    context.globalAlpha = alpha;
    context.translate(cx, cy);
    context.strokeStyle = "rgba(210, 255, 190, 0.8)";
    const stem = width < 980 ? Math.min(height * 0.16, 120) : height * 0.42;
    context.beginPath();
    context.moveTo(0, 20);
    context.lineTo(0, stem);
    context.stroke();
    for (let ring = 0; ring < 3; ring += 1) {
      const petals = 6 + ring * 2;
      for (let i = 0; i < petals; i += 1) {
        context.save();
        context.rotate((i / petals) * Math.PI * 2 + ring * 0.2);
        context.fillStyle = `rgba(230, 246, 255, ${0.18 + ring * 0.08})`;
        context.beginPath();
        context.ellipse(0, -28 - ring * 16, 14 + ring * 4, 36 + ring * 8, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }
    const heart = context.createRadialGradient(0, 0, 0, 0, 0, 28);
    heart.addColorStop(0, "rgba(255,255,255,1)");
    heart.addColorStop(1, "rgba(180, 220, 255, 0)");
    context.fillStyle = heart;
    context.beginPath();
    context.arc(0, 0, 28, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  const drawIris = (cx, cy, radius, alpha) => {
    if (alpha <= 0) return;
    context.save();
    context.globalAlpha = alpha;
    const disc = context.createRadialGradient(cx, cy, radius * 0.18, cx, cy, radius);
    disc.addColorStop(0, "#050705");
    disc.addColorStop(0.28, "#163226");
    disc.addColorStop(0.62, "#8fd8ae");
    disc.addColorStop(0.84, "#d7ffe8");
    disc.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = disc;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(220, 255, 230, 0.28)";
    const rays = width < 980 ? 36 : 90;
    for (let i = 0; i < rays; i += 1) {
      const angle = (i / rays) * Math.PI * 2 + time * 0.04;
      context.beginPath();
      context.moveTo(cx + Math.cos(angle) * radius * 0.28, cy + Math.sin(angle) * radius * 0.28);
      context.lineTo(cx + Math.cos(angle + 0.18) * radius * 0.9, cy + Math.sin(angle + 0.18) * radius * 0.9);
      context.stroke();
    }
    context.fillStyle = "#050705";
    context.beginPath();
    context.arc(cx, cy, radius * 0.22, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  const frame = () => {
    if (document.hidden) return;
    if (isPhone) {
      const distance = story.offsetHeight - window.innerHeight;
      progress = distance <= 0 ? 0 : Math.min(1, Math.max(0, (window.scrollY - story.offsetTop) / distance));
    }
    time += 0.016;
    const hero = band(progress, 0, 0.22);
    const orbit = band(progress, 0.12, 0.36);
    const hops = band(progress, 0.28, 0.52);
    const lotus = band(progress, 0.46, 0.7);
    const iris = band(progress, 0.78, 1);
    context.clearRect(0, 0, width, height);
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, iris > 0.4 ? "#121612" : "#10182a");
    sky.addColorStop(1, "#05060a");
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    stars.forEach((star) => {
      const flicker = 0.45 + Math.sin(time * 2 + star.p) * 0.35;
      context.globalAlpha = flicker * (1 - iris * 0.45);
      context.fillStyle = "#fff";
      context.beginPath();
      context.arc(star.x * width, (star.y * height + time * 8) % height, star.r, 0, Math.PI * 2);
      context.fill();
    });
    context.globalAlpha = 1;

    const narrow = width < 980;
    const seedX = narrow ? width * 0.72 : width * (0.64 - orbit * 0.14);
    const seedY = narrow ? height * 0.16 : height * 0.48;
    const seedR = Math.min(width, height) * (narrow ? 0.11 : 0.22 + orbit * 0.12);
    drawSeed(seedX, seedY, seedR, Math.max(hero, orbit * 0.85) * (1 - hops));
    drawRings(width * 0.5, height * (narrow ? 0.26 : 0.46), Math.min(width, height) * (narrow ? 0.16 : 0.28), orbit);

    if (hops > 0) {
      context.save();
      context.globalAlpha = hops;
      const streaks = narrow ? 8 : 26;
      for (let i = 0; i < streaks; i += 1) {
        const x = ((i * 97 + time * 40) % width);
        context.strokeStyle = "rgba(255,255,255,0.18)";
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x - 40, height);
        context.stroke();
      }
      const beam = context.createLinearGradient(width / 2, height, width / 2, height * 0.35);
      beam.addColorStop(0, "rgba(255,255,255,0.9)");
      beam.addColorStop(1, "rgba(255,255,255,0)");
      context.strokeStyle = beam;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(width / 2, height);
      context.lineTo(width / 2, height * (0.72 - hops * 0.2));
      context.stroke();
      context.restore();
    }

    drawLotus(width / 2, height * (narrow ? 0.2 : 0.46), lotus);
    drawIris(narrow ? width * 0.78 : width * 0.5, height * (narrow ? 0.2 : 0.5), Math.min(width, height) * (narrow ? 0.13 : 0.28), iris);
    applyProgress();
  };

  if (prefersReduced) {
    applyProgress();
    return;
  }
  if (!window.gsap || !window.ScrollTrigger) {
    throw new Error("Site 05 motion libraries failed to load.");
  }
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (!isPhone && !coarse && window.Lenis) {
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.lenisInstance = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((elapsed) => lenis.raf(elapsed * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  ScrollTrigger.create({
    trigger: story,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      if (isPhone) return;
      progress = self.progress;
      applyProgress();
    },
  });
  window.addEventListener("load", () => ScrollTrigger.refresh());
  window.addEventListener("orientationchange", () => {
    window.setTimeout(() => {
      resize();
      ScrollTrigger.refresh();
    }, 200);
  });
  gsap.ticker.add(frame);
})();
