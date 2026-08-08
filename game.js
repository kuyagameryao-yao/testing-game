/* =========================================================
   SIGNAL — Audio Typing Trainer
   ========================================================= */
(() => {
  'use strict';

  /* -------------------- Content bank -------------------- */
  const CHALLENGES = [
    { text: "keyboard", weight: 1 },
    { text: "focus", weight: 1 },
    { text: "listen carefully", weight: 1 },
    { text: "practice makes progress", weight: 1 },
    { text: "typing speed", weight: 1 },
    { text: "accuracy matters", weight: 1 },
    { text: "the quick brown fox", weight: 2 },
    { text: "reaction time", weight: 1 },
    { text: "hand eye coordination", weight: 2 },
    { text: "stay calm and type", weight: 2 },
    { text: "research project", weight: 1 },
    { text: "sound and rhythm", weight: 2 },
    { text: "every word counts", weight: 2 },
    { text: "consistent practice builds skill", weight: 3 },
    { text: "the students studied quietly", weight: 3 },
    { text: "curiosity drives learning", weight: 2 },
    { text: "type exactly what you hear", weight: 3 },
    { text: "small steps, steady progress", weight: 3 },
    { text: "listening builds focus", weight: 2 },
    { text: "the class begins at noon", weight: 3 },
  ];

  /* -------------------- State -------------------- */
  const state = {
    screen: 'menu',
    settings: {
      music: 40, sfx: 70, voice: 100,
      animations: true, reducedMotion: false, highContrast: false,
    },
    round: {
      active: false,
      current: null,
      score: 0,
      combo: 0,
      bestCombo: 0,
      correct: 0,
      mistakes: 0,
      charsTyped: 0,
      startTime: 0,
      timeLeft: 60,
      timerId: null,
      audioPlaying: false,
    }
  };

  const ROUND_SECONDS = 60;

  /* -------------------- DOM refs -------------------- */
  const $ = (sel) => document.querySelector(sel);
  const screens = document.querySelectorAll('[data-screen]');

  const el = {
    audioStatus: $('#audioStatus'),
    audioStatusText: $('#audioStatusText'),
    audioDot: $('#audioDot'),
    waveform: $('#waveform'),
    btnReplay: $('#btnReplay'),
    typeForm: $('#typeForm'),
    typeInput: $('#typeInput'),
    typeLabel: $('#typeLabel'),
    charCounter: $('#charCounter'),
    btnSubmit: $('#btnSubmit'),
    feedbackLine: $('#feedbackLine'),
    statScore: $('#statScore'),
    statWpm: $('#statWpm'),
    statAccuracy: $('#statAccuracy'),
    statCombo: $('#statCombo'),
    statTime: $('#statTime'),
    statCorrect: $('#statCorrect'),
    statMistakes: $('#statMistakes'),
    comboCard: $('#comboCard'),
    timerCard: $('#timerCard'),
  };

  /* =========================================================
     Screen navigation
     ========================================================= */
  function showScreen(name) {
    state.screen = name;
    screens.forEach(s => {
      const isTarget = s.id === `screen-${name}`;
      s.classList.toggle('screen--active', isTarget);
    });
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    switch (action) {
      case 'play': startRound(); break;
      case 'how-to-play': showScreen('how'); break;
      case 'settings': showScreen('settings'); break;
      case 'back-to-menu': endRoundCleanup(); showScreen('menu'); break;
      case 'play-again': startRound(); break;
    }
  });

  /* =========================================================
     Audio: synthesized SFX via WebAudio
     ========================================================= */
  let actx = null;
  function getCtx() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    return actx;
  }

  function playTone(freq, duration, type = 'sine', gainScale = 1) {
    if (state.settings.sfx <= 0) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const vol = (state.settings.sfx / 100) * 0.18 * gainScale;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
    } catch (err) { /* audio unavailable — fail silently */ }
  }

  function sfxCorrect() {
    playTone(523.25, 0.12, 'sine', 1);
    setTimeout(() => playTone(783.99, 0.18, 'sine', 0.9), 90);
  }
  function sfxIncorrect() {
    playTone(196, 0.22, 'sawtooth', 0.7);
  }
  function sfxCombo() {
    playTone(987.77, 0.14, 'triangle', 0.6);
  }
  function sfxClick() {
    playTone(660, 0.06, 'square', 0.35);
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('.btn')) sfxClick();
  });

  /* =========================================================
     Audio: speech synthesis dictation
     ========================================================= */
  const synth = window.speechSynthesis;

  function speakChallenge(text, onEnd) {
    if (!synth) { onEnd && onEnd(); return; }
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.92;
    utter.pitch = 1;
    utter.volume = state.settings.voice / 100;

    setAudioState('playing');
    state.round.audioPlaying = true;

    utter.onend = () => {
      state.round.audioPlaying = false;
      setAudioState('ready');
      onEnd && onEnd();
    };
    utter.onerror = () => {
      state.round.audioPlaying = false;
      setAudioState('ready');
      onEnd && onEnd();
    };
    synth.speak(utter);
  }

  function setAudioState(mode) {
    el.audioStatus.classList.remove('is-playing', 'is-ready');
    el.waveform.classList.remove('is-active');
    if (mode === 'playing') {
      el.audioStatus.classList.add('is-playing');
      el.audioStatusText.textContent = '🔊 LISTENING…';
      el.waveform.classList.add('is-active');
    } else if (mode === 'ready') {
      el.audioStatus.classList.add('is-ready');
      el.audioStatusText.textContent = '⌨ TYPE WHAT YOU HEARD';
    } else {
      el.audioStatusText.textContent = 'Get ready…';
    }
  }

  el.btnReplay.addEventListener('click', () => {
    if (!state.round.active || !state.round.current) return;
    speakChallenge(state.round.current.text);
  });

  /* =========================================================
     Round lifecycle
     ========================================================= */
  function startRound() {
    Object.assign(state.round, {
      active: true,
      current: null,
      score: 0,
      combo: 0,
      bestCombo: 0,
      correct: 0,
      mistakes: 0,
      charsTyped: 0,
      startTime: Date.now(),
      timeLeft: ROUND_SECONDS,
    });
    updateHud();
    el.comboCard.classList.remove('combo-hot');
    el.timerCard.classList.remove('timer-low');
    showScreen('game');
    startTimer();
    nextChallenge();
  }

  function startTimer() {
    clearInterval(state.round.timerId);
    state.round.timerId = setInterval(() => {
      state.round.timeLeft = Math.max(0, state.round.timeLeft - 0.1);
      el.statTime.textContent = state.round.timeLeft.toFixed(1);
      if (state.round.timeLeft <= 10) {
        el.timerCard.classList.add('timer-low');
      }
      if (state.round.timeLeft <= 0) {
        finishRound();
      }
    }, 100);
  }

  function pickChallenge() {
    const pool = CHALLENGES;
    const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0);
    let r = Math.random() * totalWeight;
    for (const c of pool) {
      r -= c.weight;
      if (r <= 0) return c;
    }
    return pool[0];
  }

  function nextChallenge() {
    if (!state.round.active) return;
    const challenge = pickChallenge();
    state.round.current = challenge;
    el.typeInput.value = '';
    el.typeInput.disabled = true;
    el.btnSubmit.disabled = true;
    el.charCounter.textContent = '0 characters';
    el.feedbackLine.textContent = '';
    el.feedbackLine.className = 'feedback-line';
    el.typeInput.classList.remove('state-correct', 'state-incorrect');

    speakChallenge(challenge.text, () => {
      if (!state.round.active) return;
      el.typeInput.disabled = false;
      el.btnSubmit.disabled = false;
      el.typeInput.focus();
    });
  }

  function finishRound() {
    state.round.active = false;
    clearInterval(state.round.timerId);
    synth && synth.cancel();
    showResults();
  }

  function endRoundCleanup() {
    state.round.active = false;
    clearInterval(state.round.timerId);
    synth && synth.cancel();
    setAudioState('idle');
  }

  /* =========================================================
     Input handling
     ========================================================= */
  el.typeInput.addEventListener('input', () => {
    const len = el.typeInput.value.length;
    el.charCounter.textContent = `${len} character${len === 1 ? '' : 's'}`;
  });

  el.typeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (el.typeInput.disabled) return;
    submitAnswer();
  });

  function normalize(str) {
    return str.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function submitAnswer() {
    const typed = el.typeInput.value;
    const expected = state.round.current.text;
    const isCorrect = normalize(typed) === normalize(expected);

    state.round.charsTyped += expected.length;
    el.typeInput.disabled = true;
    el.btnSubmit.disabled = true;

    if (isCorrect) {
      handleCorrect();
    } else {
      handleIncorrect(expected);
    }

    setTimeout(() => {
      if (state.round.active) nextChallenge();
    }, 900);
  }

  function handleCorrect() {
    state.round.correct++;
    state.round.combo++;
    state.round.bestCombo = Math.max(state.round.bestCombo, state.round.combo);

    const multiplier = 1 + Math.floor(state.round.combo / 5) * 0.5;
    const points = Math.round(10 * multiplier);
    animateScoreTo(state.round.score + points);
    state.round.score += points;

    el.typeInput.classList.add('state-correct');
    el.feedbackLine.textContent = 'CORRECT!';
    el.feedbackLine.className = 'feedback-line show-correct';

    sfxCorrect();
    if (state.round.combo > 0 && state.round.combo % 5 === 0) sfxCombo();

    firePulse('success');
    burstParticles(el.feedbackLine, 'var(--success)');

    if (state.round.combo >= 5) {
      el.comboCard.classList.add('combo-hot');
    }
    updateHud();
  }

  function handleIncorrect(expected) {
    state.round.mistakes++;
    state.round.combo = 0;
    el.comboCard.classList.remove('combo-hot');

    el.typeInput.classList.add('state-incorrect');
    el.feedbackLine.textContent = `INCORRECT — correct answer: "${expected}"`;
    el.feedbackLine.className = 'feedback-line show-incorrect';

    sfxIncorrect();
    firePulse('error');
    updateHud();
  }

  /* =========================================================
     HUD updates
     ========================================================= */
  function animateScoreTo(target) {
    const start = state.round.score;
    const diff = target - start;
    const duration = 320;
    const startTime = performance.now();
    function step(now) {
      const p = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.statScore.textContent = Math.round(start + diff * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function updateHud() {
    el.statScore.textContent = state.round.score;
    el.statCombo.textContent = `×${state.round.combo}`;
    el.statCorrect.textContent = state.round.correct;
    el.statMistakes.textContent = state.round.mistakes;

    const elapsedMin = Math.max((Date.now() - state.round.startTime) / 60000, 1 / 600);
    const wordsTyped = state.round.charsTyped / 5;
    const wpm = Math.round(wordsTyped / elapsedMin);
    el.statWpm.textContent = Number.isFinite(wpm) ? Math.max(0, wpm) : 0;

    const totalAttempts = state.round.correct + state.round.mistakes;
    const accuracy = totalAttempts === 0 ? 100 : Math.round((state.round.correct / totalAttempts) * 100);
    el.statAccuracy.textContent = `${accuracy}%`;
  }

  /* =========================================================
     Visual effects: screen pulse + particles
     ========================================================= */
  function firePulse(kind) {
    if (!state.settings.animations) return;
    const pulse = document.createElement('div');
    pulse.className = `screen-pulse fire-${kind}`;
    document.body.appendChild(pulse);
    setTimeout(() => pulse.remove(), 550);
  }

  function burstParticles(anchorEl, color) {
    if (!state.settings.animations) return;
    const rect = anchorEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const count = 10;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle-burst';
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 40 + Math.random() * 40;
      p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      p.style.background = color;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 750);
    }
  }

  /* =========================================================
     Results screen
     ========================================================= */
  function showResults() {
    const r = state.round;
    const elapsedMin = Math.max((Date.now() - r.startTime) / 60000, ROUND_SECONDS / 60);
    const wordsTyped = r.charsTyped / 5;
    const wpm = Math.max(0, Math.round(wordsTyped / elapsedMin));
    const totalAttempts = r.correct + r.mistakes;
    const accuracy = totalAttempts === 0 ? 0 : Math.round((r.correct / totalAttempts) * 100);

    $('#finalScore').textContent = r.score;
    $('#resWpm').textContent = wpm;
    $('#resAccuracy').textContent = `${accuracy}%`;
    $('#resCorrect').textContent = r.correct;
    $('#resWrong').textContent = r.mistakes;
    $('#resCombo').textContent = `×${r.bestCombo}`;

    const rating = getRating(wpm, accuracy);
    $('#ratingLetter').textContent = rating.letter;
    $('#ratingLabel').textContent = rating.label;
    const badge = $('#ratingBadge');
    badge.style.background = rating.gradient;

    showScreen('results');
  }

  function getRating(wpm, accuracy) {
    const score = wpm * 0.6 + accuracy * 0.4;
    if (accuracy >= 90 && wpm >= 35) {
      return { letter: 'S', label: 'Excellent', gradient: 'linear-gradient(135deg, #ffc857, #ff9a3c)' };
    }
    if (score >= 55) {
      return { letter: 'A', label: 'Great', gradient: 'linear-gradient(135deg, #7c5cff, #22d3ee)' };
    }
    if (score >= 35) {
      return { letter: 'B', label: 'Good', gradient: 'linear-gradient(135deg, #2fe3ac, #22d3ee)' };
    }
    return { letter: 'C', label: 'Keep Practicing', gradient: 'linear-gradient(135deg, #9aa0b4, #626a82)' };
  }

  /* =========================================================
     Settings
     ========================================================= */
  function bindSlider(id, key) {
    const input = document.getElementById(id);
    const valEl = document.querySelector(`[data-val-for="${id}"]`);
    input.addEventListener('input', () => {
      state.settings[key] = Number(input.value);
      valEl.textContent = `${input.value}%`;
    });
  }
  bindSlider('sldMusic', 'music');
  bindSlider('sldSfx', 'sfx');
  bindSlider('sldVoice', 'voice');

  function bindToggle(id, onChange) {
    const btn = document.getElementById(id);
    btn.addEventListener('click', () => {
      const isOn = btn.dataset.state === 'on';
      const next = !isOn;
      btn.dataset.state = next ? 'on' : 'off';
      btn.setAttribute('aria-checked', String(next));
      onChange(next);
    });
  }
  bindToggle('chkAnim', (on) => {
    state.settings.animations = on;
    document.body.classList.toggle('no-animations', !on);
  });
  bindToggle('chkReduced', (on) => {
    state.settings.reducedMotion = on;
    document.body.classList.toggle('reduced-motion', on);
  });
  bindToggle('chkHighContrast', (on) => {
    state.settings.highContrast = on;
    document.body.classList.toggle('theme-contrast', on);
  });

  /* =========================================================
     Ambient particle canvas (main menu background)
     ========================================================= */
  const canvas = document.getElementById('particleCanvas');
  const ctx2d = canvas.getContext('2d');
  let particles = [];
  let rafId = null;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function initParticles() {
    particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.4,
      vy: -(Math.random() * 0.25 + 0.05),
      vx: (Math.random() - 0.5) * 0.08,
      alpha: Math.random() * 0.5 + 0.15,
      hue: Math.random() > 0.5 ? '124,92,255' : '34,211,238',
    }));
  }
  initParticles();

  function tickParticles() {
    if (!state.settings.animations) {
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      rafId = requestAnimationFrame(tickParticles);
      return;
    }
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.y += p.vy;
      p.x += p.vx;
      if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx2d.fillStyle = `rgba(${p.hue},${p.alpha})`;
      ctx2d.fill();
    }
    rafId = requestAnimationFrame(tickParticles);
  }
  tickParticles();

  /* -------------------- Respect OS reduced motion -------------------- */
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('reduced-motion');
    document.getElementById('chkReduced').dataset.state = 'on';
    document.getElementById('chkReduced').setAttribute('aria-checked', 'true');
    state.settings.reducedMotion = true;
  }

  /* Init */
  showScreen('menu');
})();