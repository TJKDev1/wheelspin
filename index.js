/* =========================================================
   WheelSpin — Application Logic
   Canvas wheel, spin physics, sharing via URL params
   ---------------------------------------------------------
   Table of Contents
     1. DOM Refs ..................... L24
     2. State ........................ L41
     3. Theme ........................ L48
     4. Initialise ................... L70
     5. Canvas Setup ................. L99
     6. Draw Wheel ................... L113
     7. Entries Management ........... L218
     8. Share State .................. L284
     9. Spin Physics ................. L308
    10. Result Overlay ............... L378
    11. URL Sync & Sharing ........... L400
    12. Event Bindings ............... L552
    13. Helpers ...................... L627
   ========================================================= */

(function () {
  "use strict";

  // ---- DOM refs ----
  const canvas = document.getElementById("wheel-canvas");
  const ctx = canvas.getContext("2d");
  const entryInput = document.getElementById("entry-input");
  const addBtn = document.getElementById("add-entry-btn");
  const clearAllBtn = document.getElementById("clear-all-btn");
  const entriesList = document.getElementById("entries-list");
  const spinBtn = document.getElementById("spin-btn");
  const shareBtn = document.getElementById("share-btn");
  const resultOverlay = document.getElementById("result-overlay");
  const resultText = document.getElementById("result-text");
  const resultSpinAgain = document.getElementById("result-spin-again");
  const resultShareBtn = document.getElementById("result-share-btn");
  const shareToast = document.getElementById("share-toast");
  const srStatus = document.getElementById("sr-status");
  const srAlert = document.getElementById("sr-alert");
  const wheelPointer = document.querySelector(".wheel-pointer");
  const wheelChoicesList = document.getElementById("wheel-choices-list");
  const spinStatus = document.getElementById("spin-status");
  const entryError = document.getElementById("entry-error");
  const undoToast = document.getElementById("undo-toast");
  const undoToastText = document.getElementById("undo-toast-text");
  const undoBtn = document.getElementById("undo-btn");
  const restoreBanner = document.getElementById("restore-banner");
  const restoreBtn = document.getElementById("restore-btn");
  const dismissRestoreBtn = document.getElementById("dismiss-restore-btn");
  const muteBtn = document.getElementById("mute-btn");
  const resultCloseBtn = document.getElementById("result-close-btn");
  const entriesPanel = document.querySelector(".entries-panel");

  // ---- State ----
  let entries = [];
  let spinning = false;
  let currentAngle = 0; // radians
  let angularVelocity = 0;
  let animFrameId = null;

  // ---- Audio ----
  let audioCtx = null;
  let lastTickSegment = -1;
  let lastTickAt = 0;
  let muted = localStorage.getItem("wheelspin_muted") === "1";
  let pointerResetTimer = null;
  let shareOverflow = false;
  let restoreFocusOnResultClose = true;

  function getAudioCtx() {
    if (!audioCtx)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playTick(velocity) {
    if (muted) return;
    const nowMs = performance.now();
    if (nowMs - lastTickAt < 45) return;
    lastTickAt = nowMs;

    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    // Pitch rises with speed: 300 Hz slow → 900 Hz fast
    const freq = 300 + Math.min(velocity, 20) * 30;
    // Volume scales with speed
    const gain = Math.min(0.18, 0.04 + velocity * 0.007);

    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.04);

    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 2;

    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc.connect(filter);
    filter.connect(amp);
    amp.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  function playStopSound() {
    if (muted) return;
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    // Two descending tones — same triangle/bandpass character as the tick
    // but slower and softer, signalling "settled"
    const notes = [
      { freq: 520, delay: 0, dur: 0.18, gain: 0.13 },
      { freq: 370, delay: 0.16, dur: 0.22, gain: 0.1 },
    ];

    notes.forEach(({ freq, delay, dur, gain: peakGain }) => {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(
        freq * 0.75,
        now + delay + dur,
      );

      filter.type = "bandpass";
      filter.frequency.value = freq;
      filter.Q.value = 1.8;

      amp.gain.setValueAtTime(0.0001, now + delay);
      amp.gain.linearRampToValueAtTime(peakGain, now + delay + 0.03);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

      osc.connect(filter);
      filter.connect(amp);
      amp.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + dur + 0.01);
    });
  }

  // ---- localStorage ----
  const STORAGE_KEY = "wheelspin_entries";
  let savedEntries = null; // entries from localStorage (if any)
  let restoreTimer = null; // auto-dismiss timer for restore banner

  // ---- Offscreen canvas for pre-rendered wheel segments ----
  let offscreen = null;
  let offscreenCtx = null;
  let offscreenSize = 0;
  let offscreenEntriesHash = "";

  function createOffscreenCanvas(size) {
    offscreen = document.createElement("canvas");
    offscreen.width = size * DPR;
    offscreen.height = size * DPR;
    offscreenCtx = offscreen.getContext("2d");
    offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
    offscreenCtx.scale(DPR, DPR);
    offscreenSize = size;
  }

  // Hash to detect when entries changed (invalidates offscreen cache)
  function entriesHash() {
    return entries.length + "|" + entries.join("\x00");
  }

  // ---- Theme-aware colors read from CSS tokens ----
  let wheelTheme = {};

  function refreshWheelTheme() {
    const s = getComputedStyle(document.documentElement);
    const hcm = window.matchMedia("(forced-colors: active)").matches;

    const segColors = [];
    for (let i = 1; i <= 12; i++) {
      segColors.push(s.getPropertyValue("--wheel-seg-" + i).trim());
    }

    if (hcm) {
      // High Contrast Mode: Use system colors for clarity
      // Alternating Canvas and ButtonFace for segments
      const hcmColors = ["Canvas", "ButtonFace"];
      wheelTheme = {
        segColors: Array.from({ length: 12 }, (_, i) => hcmColors[i % 2]),
        segText: "CanvasText",
        segTextDark: "CanvasText",
        segBorder: "CanvasText",
        centerFill: "Canvas",
        centerStroke: "CanvasText",
        ringStroke: "CanvasText",
        emptyFill: "Canvas",
        emptyStroke: "CanvasText",
        emptyText: "CanvasText",
        fontDisplay:
          s.getPropertyValue("--font-display").trim() ||
          "'Sora', system-ui, sans-serif",
        fontBody:
          s.getPropertyValue("--font-body").trim() ||
          "'Figtree', system-ui, sans-serif",
      };
    } else {
      wheelTheme = {
        segColors,
        segText: s.getPropertyValue("--wheel-seg-text").trim(),
        segTextDark: s.getPropertyValue("--wheel-seg-text-dark").trim(),
        segBorder: s.getPropertyValue("--wheel-seg-border").trim(),
        centerFill: s.getPropertyValue("--wheel-center-fill").trim(),
        centerStroke: s.getPropertyValue("--wheel-center-stroke").trim(),
        ringStroke: s.getPropertyValue("--wheel-ring-stroke").trim(),
        emptyFill: s.getPropertyValue("--wheel-empty-fill").trim(),
        emptyStroke: s.getPropertyValue("--wheel-empty-stroke").trim(),
        emptyText: s.getPropertyValue("--wheel-empty-text").trim(),
        fontDisplay:
          s.getPropertyValue("--font-display").trim() ||
          "'Sora', system-ui, sans-serif",
        fontBody:
          s.getPropertyValue("--font-body").trim() ||
          "'Figtree', system-ui, sans-serif",
      };
    }
  }

  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // Determine if a segment color is "light" (needs dark text)
  // Handles both percentage form oklch(70% ...) and unitless form oklch(0.70 ...)
  function segmentNeedsDarkText(color) {
    // Percentage form: oklch(70% C H) — threshold 70
    const pctMatch = color.match(/oklch\(\s*(\d+(?:\.\d+)?)%/);
    if (pctMatch) return parseFloat(pctMatch[1]) >= 70;
    // Unitless form: oklch(0.70 C H) — threshold 0.70
    const unitMatch = color.match(/oklch\(\s*(0?\.\d+|\d+(?:\.\d+)?)\s/);
    if (unitMatch) return parseFloat(unitMatch[1]) >= 0.7;
    return false;
  }

  // ---- Initialise ----

  function init() {
    setupCanvas();
    refreshWheelTheme();
    loadFromURL();

    // Check localStorage for saved entries
    savedEntries = loadFromStorage();

    // If URL has entries, use those (shared link takes priority)
    // If no URL entries but localStorage has entries, show restore banner
    if (entries.length === 0 && savedEntries && savedEntries.length >= 2) {
      showRestoreBanner();
    }

    // No defaults — the empty wheel teaches the interface

    renderEntries();
    requestDraw();
    bindEvents();
  }

  // ---- Canvas setup ----

  function setupCanvas() {
    const container = canvas.parentElement;
    const size = container.clientWidth;
    // Guard against 0-size container (can happen on very fast initial load)
    if (size === 0) {
      requestAnimationFrame(setupCanvas);
      return;
    }
    canvas.width = size * DPR;
    canvas.height = size * DPR;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(DPR, DPR);
  }

  // ---- Draw the wheel ----

  let drawPending = false;
  function requestDraw() {
    if (drawPending || spinning) return;
    drawPending = true;
    requestAnimationFrame(() => {
      drawPending = false;
      drawWheel();
    });
  }

  // Pre-render segments + text to offscreen canvas (cached)
  function renderWheelToOffscreen(size) {
    if (
      !offscreen ||
      offscreenSize !== size ||
      offscreenEntriesHash !== entriesHash()
    ) {
      createOffscreenCanvas(size);
      offscreenEntriesHash = entriesHash();
    }

    const cx = size / 2;
    const cy = size / 2;
    const radius = cx - 6;
    const sliceAngle = (2 * Math.PI) / entries.length;

    offscreenCtx.clearRect(0, 0, size, size);

    entries.forEach((entry, i) => {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      // Segment
      offscreenCtx.beginPath();
      offscreenCtx.moveTo(cx, cy);
      offscreenCtx.arc(cx, cy, radius, startAngle, endAngle);
      offscreenCtx.closePath();
      offscreenCtx.fillStyle =
        wheelTheme.segColors[i % wheelTheme.segColors.length];
      offscreenCtx.fill();

      // Segment border
      offscreenCtx.beginPath();
      offscreenCtx.moveTo(cx, cy);
      offscreenCtx.arc(cx, cy, radius, startAngle, endAngle);
      offscreenCtx.closePath();
      offscreenCtx.strokeStyle = wheelTheme.segBorder;
      offscreenCtx.lineWidth = 2;
      offscreenCtx.stroke();

      // Text
      offscreenCtx.save();
      offscreenCtx.translate(cx, cy);
      const textAngle = startAngle + sliceAngle / 2;
      // Normalize so text is never upside-down (keep rotation in [-π/2, π/2])
      const normalizedAngle =
        ((textAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const isFlipped =
        normalizedAngle > Math.PI / 2 && normalizedAngle < (3 * Math.PI) / 2;
      offscreenCtx.rotate(isFlipped ? textAngle + Math.PI : textAngle);

      const segColor = wheelTheme.segColors[i % wheelTheme.segColors.length];
      offscreenCtx.fillStyle = segmentNeedsDarkText(segColor)
        ? wheelTheme.segTextDark
        : wheelTheme.segText;
      offscreenCtx.font = `600 ${getTextSize(entries.length, size)}px ${wheelTheme.fontDisplay}`;
      offscreenCtx.textAlign = isFlipped ? "left" : "right";
      offscreenCtx.textBaseline = "middle";

      const maxTextWidth = radius * 0.62;
      const text = truncateText(offscreenCtx, entry, maxTextWidth);
      offscreenCtx.fillText(text, isFlipped ? -(radius - 18) : radius - 18, 0);
      offscreenCtx.restore();
    });
  }

  function drawWheel() {
    const size = canvas.width / DPR;
    const cx = size / 2;
    const cy = size / 2;
    const radius = cx - 6;

    ctx.clearRect(0, 0, size, size);

    if (entries.length === 0) {
      drawEmptyWheel(cx, cy, radius);
      return;
    }

    if (spinning && offscreen) {
      // Fast path: draw pre-rendered wheel rotated
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(currentAngle);
      ctx.drawImage(offscreen, -cx, -cy, size, size);
      ctx.restore();
    } else {
      // Normal path: draw everything directly
      if (!spinning) {
        // Cache to offscreen for next spin
        renderWheelToOffscreen(size);
      }
      const sliceAngle = (2 * Math.PI) / entries.length;

      entries.forEach((entry, i) => {
        const startAngle = currentAngle + i * sliceAngle;
        const endAngle = startAngle + sliceAngle;

        // Segment
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = wheelTheme.segColors[i % wheelTheme.segColors.length];
        ctx.fill();

        // Segment border
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.strokeStyle = wheelTheme.segBorder;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Text
        ctx.save();
        ctx.translate(cx, cy);
        const textAngle = startAngle + sliceAngle / 2;
        const normalizedAngle =
          ((textAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const isFlipped =
          normalizedAngle > Math.PI / 2 && normalizedAngle < (3 * Math.PI) / 2;
        ctx.rotate(isFlipped ? textAngle + Math.PI : textAngle);

        const segColor = wheelTheme.segColors[i % wheelTheme.segColors.length];
        ctx.fillStyle = segmentNeedsDarkText(segColor)
          ? wheelTheme.segTextDark
          : wheelTheme.segText;
        ctx.font = `600 ${getTextSize(entries.length, size)}px ${wheelTheme.fontDisplay}`;
        ctx.textAlign = isFlipped ? "left" : "right";
        ctx.textBaseline = "middle";

        const maxTextWidth = radius * 0.62;
        const text = truncateText(ctx, entry, maxTextWidth);
        ctx.fillText(text, isFlipped ? -(radius - 18) : radius - 18, 0);
        ctx.restore();
      });
    }

    // Center circle (always drawn on top)
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.12, 0, 2 * Math.PI);
    ctx.fillStyle = wheelTheme.centerFill;
    ctx.fill();
    ctx.strokeStyle = wheelTheme.centerStroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Outer ring (always drawn on top)
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = wheelTheme.ringStroke;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function drawEmptyWheel(cx, cy, radius) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = wheelTheme.emptyFill;
    ctx.fill();
    ctx.strokeStyle = wheelTheme.emptyStroke;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw subtle decorative rings
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.65, 0, 2 * Math.PI);
    ctx.strokeStyle = wheelTheme.emptyStroke;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.35, 0, 2 * Math.PI);
    ctx.strokeStyle = wheelTheme.emptyStroke;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = wheelTheme.emptyText;
    ctx.font = `500 16px ${wheelTheme.fontBody}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Add choices to spin!", cx, cy - 8);

    ctx.font = `400 13px ${wheelTheme.fontBody}`;
    ctx.fillStyle = wheelTheme.emptyText;
    ctx.globalAlpha = 0.7;
    ctx.fillText("Type a choice and press Enter", cx, cy + 16);
    ctx.globalAlpha = 1;
  }

  function getTextSize(count, canvasSize) {
    const base = canvasSize / 28;
    if (count <= 4) return Math.min(base, 24);
    if (count <= 6) return Math.min(base * 0.85, 20);
    if (count <= 10) return Math.min(base * 0.7, 17);
    return Math.min(base * 0.55, 14);
  }

  function truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    // Try word-level truncation first
    const words = text.split(/\s+/);
    if (words.length > 1) {
      let truncated = "";
      for (const word of words) {
        const test = truncated ? truncated + " " + word : word;
        if (ctx.measureText(test + "\u2026").width <= maxWidth) {
          truncated = test;
        } else {
          break;
        }
      }
      if (truncated) return truncated + "\u2026";
    }
    // Fall back to character-level truncation
    let t = text;
    while (t.length > 1 && ctx.measureText(t + "\u2026").width > maxWidth) {
      t = t.slice(0, -1);
    }
    // Guard: if even a single char is too wide (e.g., wide emoji/CJK), return just the first char
    return (t || text.charAt(0)) + "\u2026";
  }

  // ---- Shake input without forced reflow ----
  function shakeInput() {
    entryInput.classList.remove("shake");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        entryInput.classList.add("shake");
      });
    });
    entryInput.addEventListener(
      "animationend",
      () => {
        entryInput.classList.remove("shake");
      },
      { once: true },
    );
  }

  // ---- Entries management ----

  function addEntry(label) {
    const trimmed = label.trim();
    if (!trimmed) {
      shakeInput();
      showEntryError("Enter a choice before adding it.");
      return false;
    }
    // Check for duplicate (case-insensitive)
    if (entries.some((e) => e.toLowerCase() === trimmed.toLowerCase())) {
      shakeInput();
      showEntryError("That choice is already on the wheel.");
      return false;
    }
    if (entries.length >= 30) {
      shakeInput();
      showEntryError("You have reached the 30-choice limit.");
      const indicator = document.querySelector(".entries-limit");
      if (indicator) indicator.classList.add("visible");
      return false;
    }

    if (undoEntries) hideUndoToast();

    entries.push(trimmed);
    hideEntryError();
    saveToStorage();
    syncURL();
    return true;
  }

  function removeEntry(index) {
    if (undoEntries) hideUndoToast();

    entries.splice(index, 1);
    saveToStorage();
    syncURL();
    renderEntries(index);
    requestDraw();
  }

  function clearEntries() {
    if (entries.length === 0) return;

    const shouldClear = window.confirm(
      `Clear all ${entries.length} choice${entries.length === 1 ? "" : "s"}? You can still undo this.`,
    );
    if (!shouldClear) return;

    // Save entries for undo before clearing
    const previousEntries = entries.slice();
    entries = [];
    saveToStorage();
    syncURL();
    renderEntries();
    requestDraw();
    showUndoToast("All entries cleared", previousEntries);
  }

  function renderEntries(focusIndex) {
    // Invalidate offscreen cache when entries change
    offscreenEntriesHash = "";
    offscreen = null;
    offscreenCtx = null;
    offscreenSize = 0;

    entriesList.innerHTML = "";
    entries.forEach((entry, i) => {
      const li = document.createElement("li");
      li.className = "entry-item";
      li.style.setProperty("--i", i);

      const segColor = wheelTheme.segColors[i % wheelTheme.segColors.length];
      li.style.setProperty("--entry-color", segColor);

      const dot = document.createElement("span");
      dot.className = "entry-color-dot";
      dot.style.background = segColor;

      const label = document.createElement("span");
      label.className = "entry-label";
      label.textContent = entry;
      label.title = entry;

      const removeBtn = document.createElement("button");
      removeBtn.className = "entry-remove";
      removeBtn.setAttribute("aria-label", "Remove " + entry);
      removeBtn.dataset.index = i;
      removeBtn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

      li.append(dot, label, removeBtn);
      entriesList.appendChild(li);
    });

    // Restore focus after entry removal
    if (focusIndex !== undefined) {
      const nextItem =
        entriesList.children[Math.min(focusIndex, entries.length - 1)];
      if (nextItem) {
        const btn = nextItem.querySelector(".entry-remove");
        if (btn) btn.focus();
      } else {
        entryInput.focus();
      }
    }

    updateShareState();
    updateLimitIndicator();
    updateWheelDescription();
  }

  function updateWheelDescription() {
    const desc =
      entries.length > 0
        ? "Wheel with " + entries.length + " choices"
        : "Empty wheel. Add choices to spin.";
    canvas.setAttribute("aria-label", desc);

    // Update accessible choices list for screen readers
    wheelChoicesList.innerHTML = "";
    entries.forEach((entry, i) => {
      const li = document.createElement("li");
      li.textContent = entry;
      wheelChoicesList.appendChild(li);
    });
  }

  // ---- Share state ----

  function updateShareState() {
    const hasEntries = entries.length > 0;
    const canShare = entries.length >= 2 && !shareOverflow;
    const shareTitle = shareOverflow
      ? "Too many choices to share in one link"
      : canShare
        ? "Share wheel"
        : "Add at least 2 choices to share";

    entriesPanel.classList.toggle("has-entries", hasEntries);
    entriesPanel.classList.toggle("can-share", canShare);

    clearAllBtn.hidden = !hasEntries;
    shareBtn.hidden = !canShare;
    shareBtn.disabled = !canShare;
    shareBtn.title = shareTitle;
    resultShareBtn.disabled = !canShare;
    resultShareBtn.title = shareTitle;

    spinBtn.disabled = entries.length < 2;

    if (entries.length < 2) {
      spinStatus.textContent =
        "Add at least 2 choices to enable Spin and Share.";
    } else if (shareOverflow) {
      spinStatus.textContent =
        "Spin is ready. Share is off until you remove a few choices.";
    } else {
      spinStatus.textContent =
        "Spin is ready. Press Space or select Spin. Share link is ready.";
    }
  }

  function updateLimitIndicator() {
    let indicator = entriesPanel.querySelector(".entries-limit");
    if (!indicator) {
      indicator = document.createElement("p");
      indicator.className = "entries-limit";
      indicator.setAttribute("aria-live", "polite");
      entriesPanel.appendChild(indicator);
    }
    indicator.textContent = `${entries.length} / 30`;
    // Only show when approaching limit
    indicator.classList.toggle("visible", entries.length >= 20);
  }

  // ---- Spin physics ----

  function startSpin() {
    if (spinning || entries.length < 2) return;

    spinning = true;
    spinBtn.disabled = true;
    spinBtn.setAttribute("aria-label", "Spinning");
    canvas.parentElement.classList.add("spinning");

    // Respect reduced-motion preference: skip animation, jump to result
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      currentAngle = Math.random() * 2 * Math.PI;
      drawWheel();
      spinning = false;
      spinBtn.disabled = false;
      spinBtn.setAttribute("aria-label", "Spin");
      canvas.parentElement.classList.remove("spinning");
      showResult();
      return;
    }

    // Random initial velocity between 15 and 30 rad/s
    angularVelocity = 15 + Math.random() * 15;
    lastTickSegment = -1;

    tick();
  }

  function tick() {
    // Guard: entries could be cleared mid-spin
    if (entries.length < 2) {
      spinning = false;
      spinBtn.disabled = false;
      spinBtn.setAttribute("aria-label", "Spin");
      angularVelocity = 0;
      canvas.parentElement.classList.remove("spinning");
      drawWheel();
      return;
    }

    // Friction: decelerate naturally
    const friction = 0.985;
    angularVelocity *= friction;
    currentAngle += angularVelocity * (1 / 60);

    // Keep angle in [0, 2π]
    currentAngle = currentAngle % (2 * Math.PI);

    drawWheel();

    // Pointer wobble at tick boundaries
    tickPointer();

    if (angularVelocity < 0.005) {
      // Stopped
      spinning = false;
      spinBtn.disabled = false;
      spinBtn.setAttribute("aria-label", "Spin");
      angularVelocity = 0;
      canvas.parentElement.classList.remove("spinning");

      playStopSound();
      showResult();
      return;
    }

    animFrameId = requestAnimationFrame(tick);
  }

  function tickPointer() {
    if (!wheelPointer) return;

    const sliceAngle = (2 * Math.PI) / entries.length;
    // How close are we to a slice boundary?
    const normalised =
      ((-currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const withinSlice = normalised % sliceAngle;
    const proximity =
      Math.min(withinSlice, sliceAngle - withinSlice) / sliceAngle;

    // Detect which segment the pointer is currently in
    const currentSegment = Math.floor(normalised / sliceAngle);

    // Play tick sound and a single pointer wobble per segment crossing
    if (currentSegment !== lastTickSegment) {
      lastTickSegment = currentSegment;
      if (angularVelocity > 0.05) playTick(angularVelocity);
      if (proximity < 0.1 && angularVelocity > 0.5) {
        nudgePointer(currentSegment);
      }
    }
  }

  function nudgePointer(segmentIndex) {
    clearTimeout(pointerResetTimer);
    const direction = segmentIndex % 2 === 0 ? 1 : -1;
    wheelPointer.style.transform = `translateX(-50%) rotate(${direction * 4}deg)`;
    pointerResetTimer = setTimeout(() => {
      wheelPointer.style.transform = "translateX(-50%) rotate(0deg)";
    }, 55);
  }

  function getWinnerIndex() {
    const sliceAngle = (2 * Math.PI) / entries.length;
    // Pointer sits at "top" = 3π/2 in standard canvas coords (12 o'clock)
    // The wheel is rotated by currentAngle, so the actual angle under the pointer is:
    const pointerAngle = ((3 * Math.PI) / 2 - currentAngle) % (2 * Math.PI);
    const normalised =
      ((pointerAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const index = Math.floor(normalised / sliceAngle) % entries.length;
    return index;
  }

  // ---- Result overlay ----

  function showResult() {
    const winnerIdx = getWinnerIndex();
    const winner = entries[winnerIdx] || entries[0];

    resultText.textContent = winner;
    restoreFocusOnResultClose = true;
    resultOverlay.showModal();

    // Announce to screen readers (clear first so repeated results re-trigger)
    srAlert.textContent = "";
    requestAnimationFrame(() => {
      srAlert.textContent = "The wheel chose: " + winner;
    });
  }

  function closeResult(options) {
    const shouldRestoreFocus = !options || options.restoreFocus !== false;
    restoreFocusOnResultClose = shouldRestoreFocus;
    if (resultOverlay.open) {
      resultOverlay.close();
    } else if (shouldRestoreFocus) {
      spinBtn.focus();
      restoreFocusOnResultClose = true;
    }
  }

  function handleResultOverlayClose() {
    if (restoreFocusOnResultClose) {
      spinBtn.focus();
    }
    restoreFocusOnResultClose = true;
  }

  // ---- URL sync & Sharing ----

  function syncURL() {
    const previousShareOverflow = shareOverflow;

    if (entries.length === 0) {
      shareOverflow = false;
      try {
        history.replaceState(null, "", window.location.pathname);
      } catch {
        // replaceState can fail in sandboxed iframes or file:// protocol
      }
      updatePageMeta();
      return;
    }

    const payload = entries.map((e) => encodeURIComponent(e)).join("|");
    const url = window.location.pathname + "?w=" + payload;

    // Browser URL length limit is ~2000 chars; disable sharing instead of mutating entries.
    if (url.length > 2000) {
      shareOverflow = true;
      try {
        history.replaceState(null, "", window.location.pathname);
      } catch {
        // replaceState can fail in sandboxed iframes or file:// protocol
      }
    } else {
      shareOverflow = false;
      try {
        history.replaceState(null, "", "?w=" + payload);
      } catch {
        // replaceState can fail in sandboxed iframes or file:// protocol
      }
    }

    if (shareOverflow && !previousShareOverflow) {
      announceStatus("Share disabled. Too many choices for one link.");
    }

    updatePageMeta();
  }

  function buildShareURL() {
    if (shareOverflow || entries.length < 2) return null;
    const shareURL = new URL(window.location.href);
    shareURL.search =
      "?w=" + entries.map((e) => encodeURIComponent(e)).join("|");
    return shareURL.toString();
  }

  function loadFromURL() {
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      // Malformed URL — start fresh
      return;
    }
    const w = params.get("w");
    if (!w) return;

    // Try pipe-separated first (current format)
    if (w.includes("|") || !w.includes("=")) {
      const decoded = w
        .split("|")
        .map((s) => {
          try {
            return decodeURIComponent(s);
          } catch {
            return s;
          }
        })
        .filter(Boolean);
      if (decoded.length > 0) {
        entries = decoded.slice(0, 30);
      }
    }

    // Fallback: base64 (legacy format)
    if (entries.length === 0) {
      try {
        const decoded = decodeURIComponent(escape(atob(w)));
        entries = decoded.split("\n").filter(Boolean).slice(0, 30);
      } catch {
        // Last resort: treat as single entry
        entries = w.split("|").filter(Boolean).slice(0, 30);
      }
    }

    // If we ended up with fewer than 2 entries from a shared link,
    // the link may be corrupted — silently fall back to empty
    if (entries.length < 2) {
      entries = [];
      return;
    }

    if (entries.length > 0) {
      updatePageMeta();
    }
  }

  function updatePageMeta() {
    const defaultTitle = "Spin the Wheel Online | WheelSpin Random Picker";
    const defaultDescription =
      "Spin the wheel online with a fast, shareable random picker. Create a custom decision wheel for teams, games, giveaways, lunches, chores, and more.";
    const hasEntries = entries.length > 0;
    const preview = hasEntries ? entries.slice(0, 3).join(", ") : "";
    const suffix = hasEntries
      ? entries.length > 3
        ? `, and ${entries.length - 3} more`
        : ""
      : "";
    const title = hasEntries
      ? `Spin the Wheel: ${preview}${suffix} | WheelSpin`
      : defaultTitle;
    const description = hasEntries
      ? `Spin the wheel between ${preview}${suffix}. Create your own random picker and share it with one link.`
      : defaultDescription;

    document.title = title;

    const descriptionMeta = document.querySelector('meta[name="description"]');
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    const robotsMeta = document.querySelector('meta[name="robots"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDesc = document.querySelector(
      'meta[name="twitter:description"]',
    );
    const canonicalUrl = "https://wheelspin.cc/";
    const shareUrl = buildShareURL() || canonicalUrl;

    if (descriptionMeta) descriptionMeta.setAttribute("content", description);
    if (canonicalLink) canonicalLink.setAttribute("href", canonicalUrl);
    if (robotsMeta) {
      robotsMeta.setAttribute(
        "content",
        hasEntries
          ? "noindex,follow,max-image-preview:large"
          : "index,follow,max-image-preview:large",
      );
    }
    if (ogTitle) ogTitle.setAttribute("content", title);
    if (ogDesc) ogDesc.setAttribute("content", description);
    if (ogUrl) ogUrl.setAttribute("content", hasEntries ? shareUrl : canonicalUrl);
    if (twitterTitle) twitterTitle.setAttribute("content", title);
    if (twitterDesc) twitterDesc.setAttribute("content", description);
  }

  async function shareWheel(triggerBtn) {
    if (entries.length < 2) return;
    if (shareOverflow) {
      announceAlert(
        "Too many choices to share in one link. Remove a few choices and try again.",
      );
      return;
    }

    const btn = triggerBtn || shareBtn;
    const url = buildShareURL();
    if (!url) return;
    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    // Native share only on mobile — desktop users just want the link copied
    if (isMobile && navigator.share) {
      try {
        await navigator.share({ title: "WheelSpin", url });
        return;
      } catch (err) {
        // User cancelled or error — fall through to clipboard
        if (err.name === "AbortError") return; // User cancelled, don't fall through
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        // Clipboard API can hang on non-HTTPS or intermittent connections
        // Wrap in a timeout to prevent indefinite hangs
        const writePromise = navigator.clipboard.writeText(url);
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Clipboard timeout")), 3000),
        );
        await Promise.race([writePromise, timeout]);
        showCopiedState(btn);
        showToast();
      } else {
        // Clipboard API unavailable (non-HTTPS, old browsers)
        showFallbackInput(url);
      }
    } catch {
      showFallbackInput(url);
    }
  }

  function showCopiedState(btn) {
    if (btn.classList.contains("copied")) return;

    btn.classList.add("copied");
    const label = btn.querySelector(".share-label");
    const originalLabel = label ? label.textContent : "";
    if (label) label.textContent = "Copied!";

    setTimeout(() => {
      btn.classList.remove("copied");
      if (label) label.textContent = originalLabel;
    }, 2000);
  }

  function showFallbackInput(url) {
    // Remove any existing fallback
    const existing = document.querySelector(".share-fallback");
    if (existing) existing.remove();

    const wrapper = document.createElement("div");
    wrapper.className = "share-fallback";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "share-fallback-input";
    input.setAttribute("aria-label", "Share link");
    input.value = url;
    input.readOnly = true;
    wrapper.appendChild(input);

    // Insert after share button in header
    shareBtn.insertAdjacentElement("afterend", wrapper);

    // Select text for easy copy
    input.focus();
    input.select();

    // Auto-dismiss
    const dismiss = () => {
      wrapper.remove();
    };
    input.addEventListener("blur", () => setTimeout(dismiss, 200));
    setTimeout(dismiss, 8000);
  }

  function showToast() {
    shareToast.hidden = false;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        shareToast.classList.add("visible");
      }),
    );

    announceStatus("Link copied to clipboard");

    setTimeout(() => {
      shareToast.classList.remove("visible");
      setTimeout(() => {
        shareToast.hidden = true;
      }, 300);
    }, 2200);
  }

  // ---- Event bindings ----

  function bindEvents() {
    // Add entry
    addBtn.addEventListener("click", () => {
      const added = addEntry(entryInput.value);
      if (added) {
        entryInput.value = "";
      }
      entryInput.focus();
      renderEntries();
      requestDraw();
    });

    entryInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const added = addEntry(entryInput.value);
        if (added) {
          entryInput.value = "";
        }
        renderEntries();
        requestDraw();
      }
    });

    entryInput.addEventListener("input", () => {
      if (!entryError.hidden) {
        hideEntryError();
      }
    });

    // Remove entry (delegated)
    entriesList.addEventListener("click", (e) => {
      const btn = e.target.closest(".entry-remove");
      if (!btn) return;
      const idx = parseInt(btn.dataset.index, 10);
      removeEntry(idx);
    });

    // Clear all
    clearAllBtn.addEventListener("click", clearEntries);

    // Spin
    spinBtn.addEventListener("click", startSpin);

    // Space bar shortcut: spin from anywhere (unless focus is in a text field or button)
    // Also: Space while result overlay is open closes it and spins again
    document.addEventListener("keydown", (e) => {
      if (e.code !== "Space" && e.key !== " ") return;
      const activeElement = document.activeElement;
      const tag = activeElement?.tagName;
      if (
        !activeElement ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "BUTTON" ||
        tag === "SELECT" ||
        activeElement.isContentEditable ||
        activeElement.closest(
          'a, button, input, textarea, select, [role="button"], [role="link"], [role="menuitem"], [tabindex]:not([tabindex="-1"])',
        )
      ) {
        return;
      }
      if (resultOverlay.open) {
        e.preventDefault();
        closeResult();
        setTimeout(startSpin, 200);
        return;
      }
      e.preventDefault();
      startSpin();
    });

    // Result overlay
    resultCloseBtn.addEventListener("click", closeResult);
    resultSpinAgain.addEventListener("click", () => {
      closeResult({ restoreFocus: false });
      setTimeout(startSpin, 200);
    });

    // Click outside card to close
    resultOverlay.addEventListener("click", (e) => {
      if (e.target === resultOverlay) closeResult();
    });
    resultOverlay.addEventListener("close", handleResultOverlayClose);
    resultOverlay.addEventListener("cancel", () => {
      restoreFocusOnResultClose = true;
    });

    // Share
    shareBtn.addEventListener("click", () => shareWheel(shareBtn));
    resultShareBtn.addEventListener("click", () => shareWheel(resultShareBtn));

    // Undo toast
    undoBtn.addEventListener("click", performUndo);

    // Restore banner
    restoreBtn.addEventListener("click", performRestore);
    dismissRestoreBtn.addEventListener("click", dismissRestoreBanner);

    // Resize — ResizeObserver is more precise than window resize:
    // responds to container size changes, not just viewport changes
    if (window.ResizeObserver) {
      let resizeTimer;
      const ro = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
          }
          setupCanvas();
          offscreenEntriesHash = "";
          offscreen = null;
          offscreenCtx = null;
          offscreenSize = 0;
          requestDraw();
        }, 200);
      });
      ro.observe(canvas.parentElement);
    } else {
      // Fallback for browsers without ResizeObserver
      let resizeTimer;
      window.addEventListener(
        "resize",
        () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            if (animFrameId) {
              cancelAnimationFrame(animFrameId);
              animFrameId = null;
            }
            setupCanvas();
            offscreenEntriesHash = "";
            offscreen = null;
            offscreenCtx = null;
            offscreenSize = 0;
            requestDraw();
          }, 200);
        },
        { passive: true },
      );
    }

    // Redraw canvas on OS theme change or high-contrast mode change
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const hcmQuery = window.matchMedia("(forced-colors: active)");

    const updateThemeAndDraw = () => {
      refreshWheelTheme();
      // Invalidate offscreen cache — colors changed
      offscreenEntriesHash = "";
      offscreen = null;
      offscreenCtx = null;
      offscreenSize = 0;
      requestDraw();
    };

    darkModeQuery.addEventListener("change", updateThemeAndDraw);
    hcmQuery.addEventListener("change", updateThemeAndDraw);

    // Cancel spin animation and close AudioContext on page unload
    window.addEventListener("beforeunload", () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }
      clearTimeout(pointerResetTimer);
      if (audioCtx) {
        audioCtx.close();
      }
    });

    // Mute toggle
    muteBtn.addEventListener("click", () => {
      muted = !muted;
      try {
        localStorage.setItem("wheelspin_muted", muted ? "1" : "0");
      } catch {}
      updateMuteBtn();
    });
  }

  function updateMuteBtn() {
    muteBtn.setAttribute("aria-label", muted ? "Unmute sounds" : "Mute sounds");
    muteBtn.title = muted ? "Unmute sounds" : "Mute sounds";
    muteBtn.classList.toggle("muted", muted);
    const muteLabel = muteBtn.querySelector(".mute-label");
    if (muteLabel) muteLabel.textContent = muted ? "Sound off" : "Sound on";
  }

  // ---- Helpers ----

  // ---- Entry error messages ----
  let errorTimer = null;

  function showEntryError(message) {
    clearTimeout(errorTimer);
    entryError.textContent = message;
    entryError.hidden = false;
    entryInput.setAttribute("aria-invalid", "true");
    announceAlert(message);
  }

  function hideEntryError() {
    clearTimeout(errorTimer);
    entryError.hidden = true;
    entryError.textContent = "";
    entryInput.removeAttribute("aria-invalid");
  }

  // ---- Undo toast ----
  let undoEntries = null;

  function showUndoToast(message, previousEntries) {
    undoEntries = previousEntries;
    undoToastText.textContent = message;
    undoToast.hidden = false;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        undoToast.classList.add("visible");
      }),
    );

    announceStatus(
      message + ". Press Undo to restore. Undo stays until your next edit.",
    );
  }

  function hideUndoToast() {
    undoToast.classList.remove("visible");
    setTimeout(() => {
      undoToast.hidden = true;
      undoEntries = null;
    }, 300);
  }

  function performUndo() {
    if (!undoEntries) return;
    entries = undoEntries.slice();
    saveToStorage();
    syncURL();
    renderEntries();
    requestDraw();
    hideUndoToast();
    announceStatus(
      "Entries restored. " + entries.length + " choices on the wheel.",
    );
  }

  // ---- localStorage persistence ----
  function saveToStorage() {
    try {
      if (entries.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      }
    } catch {
      // localStorage may be unavailable (private browsing, quota exceeded)
      // Silently fail — the app still works without persistence
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return null;
      return parsed.slice(0, 30);
    } catch {
      // Corrupted data or localStorage unavailable
      return null;
    }
  }

  // ---- Restore banner ----
  function showRestoreBanner() {
    restoreBanner.hidden = false;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        restoreBanner.classList.add("visible");
      }),
    );

    announceStatus("Saved wheel found. Restore your last wheel?");

    // Auto-dismiss after 10 seconds
    restoreTimer = setTimeout(dismissRestoreBanner, 10000);
  }

  function dismissRestoreBanner() {
    clearTimeout(restoreTimer);
    restoreBanner.classList.remove("visible");
    setTimeout(() => {
      restoreBanner.hidden = true;
      savedEntries = null; // Don't show again this session
    }, 300);
  }

  function performRestore() {
    if (!savedEntries) return;
    if (undoEntries) hideUndoToast();
    entries = savedEntries.slice();
    saveToStorage();
    syncURL();
    renderEntries();
    requestDraw();
    dismissRestoreBanner();
    announceStatus("Wheel restored with " + entries.length + " choices.");
  }

  function announceStatus(message) {
    srStatus.textContent = "";
    requestAnimationFrame(() => {
      srStatus.textContent = message;
    });
  }

  function announceAlert(message) {
    srAlert.textContent = "";
    requestAnimationFrame(() => {
      srAlert.textContent = message;
    });
  }

  // ---- Go ----
  init();
  updateMuteBtn();
})();
