import { state } from "./state";

interface SpinRefs {
  canvas: HTMLCanvasElement;
  spinBtn: HTMLButtonElement;
  wheelPointer: HTMLElement;
  muteBtn: HTMLButtonElement;
}

interface SpinRuntimeOptions {
  refs: SpinRefs;
  drawWheel: () => void;
  showResult: () => void;
}

function getAudioCtor(): typeof AudioContext | null {
  return window.AudioContext || ((window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null);
}

function getAudioCtx(): AudioContext | null {
  if (!state.audioCtx) {
    const AudioCtor = getAudioCtor();
    if (!AudioCtor) {
      return null;
    }
    state.audioCtx = new AudioCtor();
  }

  return state.audioCtx;
}

function playTick(velocity: number): void {
  if (state.muted) return;

  const nowMs = performance.now();
  if (nowMs - state.lastTickAt < 45) return;
  state.lastTickAt = nowMs;

  const audioCtx = getAudioCtx();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  const now = audioCtx.currentTime;
  const freq = 300 + Math.min(velocity, 20) * 30;
  const gain = Math.min(0.18, 0.04 + velocity * 0.007);

  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

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
  amp.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.07);
}

function playStopSound(): void {
  if (state.muted) return;

  const audioCtx = getAudioCtx();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  const now = audioCtx.currentTime;
  const notes = [
    { freq: 520, delay: 0, dur: 0.18, gain: 0.13 },
    { freq: 370, delay: 0.16, dur: 0.22, gain: 0.1 },
  ];

  notes.forEach(({ freq, delay, dur, gain: peakGain }) => {
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + delay);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.75, now + delay + dur);

    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 1.8;

    amp.gain.setValueAtTime(0.0001, now + delay);
    amp.gain.linearRampToValueAtTime(peakGain, now + delay + 0.03);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

    osc.connect(filter);
    filter.connect(amp);
    amp.connect(audioCtx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + dur + 0.01);
  });
}

function nudgePointer(wheelPointer: HTMLElement, segmentIndex: number): void {
  if (state.pointerResetTimer !== null) {
    clearTimeout(state.pointerResetTimer);
  }
  const direction = segmentIndex % 2 === 0 ? 1 : -1;
  wheelPointer.style.transform = `translateX(-50%) rotate(${direction * 4}deg)`;
  state.pointerResetTimer = setTimeout(() => {
    wheelPointer.style.transform = "translateX(-50%) rotate(0deg)";
  }, 55);
}

function tickPointer(
  wheelPointer: HTMLElement,
  entriesLength: number,
  currentAngle: number,
  angularVelocity: number,
): void {
  const sliceAngle = (2 * Math.PI) / entriesLength;
  const normalised = ((-currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const withinSlice = normalised % sliceAngle;
  const proximity = Math.min(withinSlice, sliceAngle - withinSlice) / sliceAngle;
  const currentSegment = Math.floor(normalised / sliceAngle);

  if (currentSegment !== state.lastTickSegment) {
    state.lastTickSegment = currentSegment;
    if (angularVelocity > 0.05) playTick(angularVelocity);
    if (proximity < 0.1 && angularVelocity > 0.5) {
      nudgePointer(wheelPointer, currentSegment);
    }
  }
}

function finishSpin(options: SpinRuntimeOptions): void {
  state.spinning = false;
  state.angularVelocity = 0;
  options.refs.spinBtn.disabled = false;
  options.refs.spinBtn.setAttribute("aria-label", "Spin");
  options.refs.canvas.parentElement?.classList.remove("spinning");
}

function tick(options: SpinRuntimeOptions): void {
  if (state.entries.length < 2) {
    finishSpin(options);
    options.drawWheel();
    return;
  }

  state.angularVelocity *= 0.985;
  state.currentAngle += state.angularVelocity * (1 / 60);
  state.currentAngle %= 2 * Math.PI;

  options.drawWheel();
  tickPointer(
    options.refs.wheelPointer,
    state.entries.length,
    state.currentAngle,
    state.angularVelocity,
  );

  if (state.angularVelocity < 0.005) {
    finishSpin(options);
    playStopSound();
    options.showResult();
    return;
  }

  state.animFrameId = requestAnimationFrame(() => tick(options));
}

export function startSpin(options: SpinRuntimeOptions): void {
  if (state.spinning || state.entries.length < 2) return;

  state.spinning = true;
  options.refs.spinBtn.disabled = true;
  options.refs.spinBtn.setAttribute("aria-label", "Spinning");
  options.refs.canvas.parentElement?.classList.add("spinning");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    state.currentAngle = Math.random() * 2 * Math.PI;
    options.drawWheel();
    finishSpin(options);
    options.showResult();
    return;
  }

  state.angularVelocity = 15 + Math.random() * 15;
  state.lastTickSegment = -1;
  tick(options);
}

export function updateMuteButton(muteBtn: HTMLButtonElement): void {
  muteBtn.setAttribute("aria-label", state.muted ? "Unmute sounds" : "Mute sounds");
  muteBtn.title = state.muted ? "Unmute sounds" : "Mute sounds";
  muteBtn.classList.toggle("muted", state.muted);
  const muteLabel = muteBtn.querySelector<HTMLElement>(".mute-label");
  if (muteLabel) muteLabel.textContent = state.muted ? "Sound off" : "Sound on";
}

export function toggleMute(muteBtn: HTMLButtonElement): void {
  state.muted = !state.muted;
  try {
    localStorage.setItem("wheelspin_muted", state.muted ? "1" : "0");
  } catch {}
  updateMuteButton(muteBtn);
}

export function cleanupSpinRuntime(): void {
  if (state.animFrameId) {
    cancelAnimationFrame(state.animFrameId);
    state.animFrameId = null;
  }
  if (state.pointerResetTimer !== null) {
    clearTimeout(state.pointerResetTimer);
    state.pointerResetTimer = null;
  }
  if (state.audioCtx) {
    state.audioCtx.close();
  }
}
