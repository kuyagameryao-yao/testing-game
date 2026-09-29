/* ==========================================================
   ProtoType — Desktop Edition
   Listening/typing accuracy game
   ========================================================== */

/* ---------- Sentence banks ---------- */
const SENTENCES = {
    easy: [
        "The cat sat on the mat.",
        "I like to eat pizza.",
        "She walks to school every day.",
        "The sun is bright today.",
        "We watched a movie last night.",
        "He plays soccer on weekends.",
        "The dog ran across the yard.",
        "Please close the door quietly.",
        "My favorite color is blue.",
        "They live near the park."
    ],
    medium: [
        "The quick brown fox jumps over the lazy dog.",
        "Learning to type accurately takes consistent practice.",
        "She carefully organized the files before the meeting.",
        "The weather forecast predicts heavy rain this weekend.",
        "Our flight was delayed because of a mechanical issue.",
        "He whispered the answer so no one else could hear.",
        "The museum exhibit featured artifacts from ancient Egypt.",
        "Remember to save your work before closing the program.",
        "The chef added a pinch of salt to balance the flavor.",
        "Traffic was unusually light on the way to the office."
    ],
    hard: [
        "Despite the overwhelming complexity of the negotiations, both parties reached a tentative agreement.",
        "The archaeologist meticulously catalogued each fragment before it could deteriorate further.",
        "Quantum entanglement remains one of the most counterintuitive phenomena in modern physics.",
        "The committee’s recommendations were ultimately overshadowed by unforeseen budgetary constraints.",
        "Her thesis examined the socioeconomic ramifications of rapid urbanization in coastal regions.",
        "The orchestra’s rendition of the symphony was praised for its nuanced interpretation.",
        "Bureaucratic inefficiencies continued to hinder the rollout of the new infrastructure policy.",
        "The novelist wove together multiple timelines to create a richly layered narrative.",
        "Engineers had to recalibrate the satellite’s trajectory after an unexpected gravitational anomaly.",
        "The debate over renewable energy subsidies exposed deep partisan divisions."
    ]
};

/* ---------- State ---------- */
let currentLevel = "easy";
let currentSentence = "";
let currentAnswer = "";
let hasPlayed = false;
let streak = 0;
let played = 0;
let bestWpm = 0;
let sentenceStartTime = null;
let isSpeaking = false;
let submissionLocked = false;
let isDarkMode = false;



/* ---------- DOM references ---------- */
const diffButtons = document.querySelectorAll(".diff-btn");
const playBtn = document.getElementById("playBtn");
const replayBtn = document.getElementById("replayBtn");
const typing = document.getElementById("typing");
const checkBtn = document.getElementById("checkBtn");
const resultEl = document.getElementById("result");
const streakEl = document.getElementById("streak");
const bestWpmEl = document.getElementById("bestWpm");
const playedEl = document.getElementById("played");
const leaderboardEl = document.getElementById("leaderboard");
const clearBtn = document.getElementById("clearLeaderboard");
const body = document.body;


/* ---------- Helpers ---------- */
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function normalize(str) {
    return str.trim().replace(/\s+/g, " ").toLowerCase();
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function animateTextSwap(el, html) {
    el.classList.add("content-fade");
    setTimeout(() => {
        el.innerHTML = html;
        el.classList.remove("content-fade");
    }, 120);
}

function triggerInputState(isCorrect) {
    typing.classList.remove("success-flash", "error-shake");
    void typing.offsetWidth;
    typing.classList.add(isCorrect ? "success-flash" : "error-shake");
}

function setLocked(locked) {
    submissionLocked = locked;
    checkBtn.disabled = locked;
    playBtn.disabled = locked;
    replayBtn.disabled = locked || replayBtn.disabled;
    diffButtons.forEach(btn => btn.disabled = locked);
    typing.disabled = locked;
}

function getCorrectAnswer() {
    return currentAnswer || currentSentence;
}

function extractExpectedAnswer(sentence) {
    return sentence.trim().replace(/\s+/g, " ").split(" ")[0];
}

/* ---------- Difficulty selection ---------- */
diffButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        if (submissionLocked) return;
        diffButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentLevel = btn.dataset.level;
        resetRound();
    });
});

/* ---------- Speech synthesis ---------- */
function speak(text) {
    return new Promise(resolve => {
        if (!("speechSynthesis" in window)) {
            resolve();
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.lang = "en-US";

        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => /en/i.test(v.lang) && /female|natural|google/i.test(v.name)) || voices.find(v => /en/i.test(v.lang));
        if (voice) utterance.voice = voice;

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        window.speechSynthesis.speak(utterance);
    });
}

function pickSentence() {
    const list = SENTENCES[currentLevel];
    return list[Math.floor(Math.random() * list.length)];
}

function resetRound() {
    hasPlayed = false;
    currentSentence = "";
    currentAnswer = "";
    typing.value = "";
    replayBtn.disabled = true;
    resultEl.classList.add("hidden");
    resultEl.innerHTML = "";
    typing.focus();
}

/* ---------- Play / Replay ---------- */
playBtn.addEventListener("click", () => {
    if (submissionLocked) return;
    currentSentence = pickSentence();
    currentAnswer = extractExpectedAnswer(currentSentence);
    speak(currentSentence);
    hasPlayed = true;
    replayBtn.disabled = false;
    sentenceStartTime = Date.now();
    typing.value = "";
    resultEl.classList.add("hidden");
    typing.focus();
});

replayBtn.addEventListener("click", () => {
    if (currentSentence && !submissionLocked) {
        speak(currentSentence);
        typing.focus();
    }
});

/* ---------- Accuracy calculation ---------- */
function calculateAccuracy(typed, target) {
    const typedWords = typed.trim().split(/\s+/).filter(Boolean);
    const targetWords = target.trim().split(/\s+/).filter(Boolean);
    const len = Math.max(typedWords.length, targetWords.length);
    if (len === 0) return 100;

    let correct = 0;
    for (let i = 0; i < len; i++) {
        if (typedWords[i] && targetWords[i] && typedWords[i].toLowerCase() === targetWords[i].toLowerCase()) {
            correct++;
        }
    }
    return Math.round((correct / len) * 100);
}

/* ---------- Check answer ---------- */
checkBtn.addEventListener("click", checkAnswer);

async function checkAnswer() {
    if (submissionLocked) return;

    if (!hasPlayed || !currentSentence) {
        resultEl.className = "result-card error";
        animateTextSwap(resultEl, `
            <h3>⚠️ Play a sentence first</h3>
            <div class="details">Click "Play Sentence" before checking your answer.</div>
        `);
        resultEl.classList.remove("hidden");
        return;
    }

    setLocked(true);

    const typed = typing.value;
    const expectedAnswer = getCorrectAnswer();
    const elapsedMs = Date.now() - (sentenceStartTime || Date.now());
    const elapsedMinutes = Math.max(elapsedMs / 60000, 0.01);
    const wordCount = currentSentence.trim().split(/\s+/).filter(Boolean).length;
    const wpm = Math.round(wordCount / elapsedMinutes);
    const accuracy = calculateAccuracy(typed, currentSentence);
    const isCorrect = normalize(typed) === normalize(currentSentence);

    played++;
    if (isCorrect) streak++;
    else streak = 0;

    if (wpm > bestWpm && isCorrect) bestWpm = wpm;

    updateStats();
    saveStats();

    resultEl.classList.remove("hidden");

    if (isCorrect) {
        resultEl.className = "result-card success";
        animateTextSwap(resultEl, `
            <h3>✅ Correct!</h3>
            <div class="details">${wpm} WPM • ${accuracy}% accuracy</div>
        `);
        triggerInputState(true);
        addScore({ wpm, accuracy, level: currentLevel, time: (elapsedMs / 1000).toFixed(1) });
        await speak(["Correct!", "Excellent!", "Well done!"][Math.floor(Math.random() * 3)]);
    } else {
        resultEl.className = "result-card error";
        animateTextSwap(resultEl, `
            <h3>❌ Incorrect</h3>
            <div class="details">${accuracy}% accuracy</div>
            <div class="correct-sentence">${escapeHtml(currentSentence)}</div>
        `);
        triggerInputState(false);
        await speak(`Incorrect. The correct answer is ${expectedAnswer}.`);
        await wait(2200);
    }

    hasPlayed = false;
    replayBtn.disabled = true;
    typing.value = "";
    resultEl.classList.add("hidden");
    resetRound();
    setLocked(false);
}

/* ---------- Stats persistence ---------- */
function updateStats() {
    streakEl.textContent = streak;
    bestWpmEl.textContent = bestWpm;
    playedEl.textContent = played;
}

function saveStats() {
    localStorage.setItem("echo_pc_stats", JSON.stringify({ streak, played, bestWpm }));
}

function loadStats() {
    const raw = localStorage.getItem("echo_pc_stats");
    if (raw) {
        try {
            const data = JSON.parse(raw);
            streak = data.streak || 0;
            played = data.played || 0;
            bestWpm = data.bestWpm || 0;
        } catch (e) {
            streak = 0;
            played = 0;
            bestWpm = 0;
        }
    }
    updateStats();
}

/* ---------- Leaderboard ---------- */
function getLeaderboard() {
    const raw = localStorage.getItem("echo_pc_leaderboard");
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

function addScore({ wpm, accuracy, level, time }) {
    const board = getLeaderboard();
    board.push({
        wpm,
        accuracy,
        level,
        time,
        date: new Date().toLocaleDateString()
    });
    board.sort((a, b) => b.wpm - a.wpm);
    const top = board.slice(0, 10);
    localStorage.setItem("echo_pc_leaderboard", JSON.stringify(top));
    renderLeaderboard();
}

function renderLeaderboard() {
    const board = getLeaderboard();
    if (board.length === 0) {
        leaderboardEl.innerHTML = `<p class="empty">No scores yet. Be the first!</p>`;
        return;
    }
    leaderboardEl.innerHTML = board.map((entry, i) => `
        <div class="leaderboard-item">
            <div class="rank">${i + 1}</div>
            <div class="info">
                <div class="wpm">${entry.wpm} WPM</div>
                <div class="meta">${entry.accuracy}% • ${entry.time}s • ${entry.level} • ${entry.date}</div>
            </div>
        </div>
    `).join("");
}

clearBtn.addEventListener("click", () => {
    if (confirm("Clear the entire leaderboard?")) {
        localStorage.removeItem("echo_pc_leaderboard");
        renderLeaderboard();
    }
});

/* ---------- Keyboard shortcuts ---------- */
document.addEventListener("keydown", (e) => {
    if (submissionLocked) return;
    if (document.activeElement === typing) {
        if (e.key === "Enter") {
            e.preventDefault();
            checkAnswer();
        }
        return;
    }
    if (e.code === "Space") {
        e.preventDefault();
        playBtn.click();
    } else if (e.key.toLowerCase() === "r") {
        if (!replayBtn.disabled) replayBtn.click();
    }
});

/* ---------- Dark Mode Toggle ---------- */
const darkModeToggle = document.createElement('div');
darkModeToggle.classList.add('dark-mode-toggle');
darkModeToggle.innerHTML = '<i></i>';
body.appendChild(darkModeToggle);

darkModeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    body.classList.toggle('dark');
    darkModeToggle.querySelector('i').classList.toggle('fa-moon');
    darkModeToggle.querySelector('i').classList.toggle('fa-sun');
    localStorage.setItem('darkMode', isDarkMode);
});
const savedDarkMode = localStorage.getItem('darkMode');
if (savedDarkMode !== null) {
    isDarkMode = savedDarkMode === 'true';
    body.classList.toggle('dark', isDarkMode);
}

/* ---------- Init ---------- */
loadStats();
renderLeaderboard();
typing.focus();
