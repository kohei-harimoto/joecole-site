// ================================
// analyze.html（録音解析画面）
// ================================

// 曲名取得
const params = new URLSearchParams(location.search);
const songName = params.get("song");
document.getElementById("song-title").textContent = `${songName} の解析`;

// UI 要素
const playBtn = document.getElementById("play-btn");
const stopBtn = document.getElementById("stop-btn");
const rewindBtn = document.getElementById("rewind-btn");
const forwardBtn = document.getElementById("forward-btn");

const bpmInput = document.getElementById("bpm-input");
const metroBtn = document.getElementById("metro-btn");

const attackList = document.getElementById("attack-list");
const backBtn = document.getElementById("back-btn");

let audio;              // 再生用 Audio
let audioBuffer;        // 波形解析用
let isPlaying = false;
let metroTimer = null;

// ================================
// IndexedDB から録音データを取得
// ================================
const DB_NAME = "recordDB";
const STORE_NAME = "records";

function loadFromIndexedDB() {
    return new Promise(resolve => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onsuccess = e => {
            const db = e.target.result;
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const getReq = store.get("recordedAudio");

            getReq.onsuccess = () => resolve(getReq.result);
        };
    });
}

// ================================
// Blob → Audio / AudioBuffer に変換
// ================================
async function initAudio(blob) {
    // 再生用
    const url = URL.createObjectURL(blob);
    audio = new Audio(url);

    // 解析用
    const ctx = new AudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
}

// ================================
// 再生 / 一時停止
// ================================
playBtn.onclick = () => {
    if (!isPlaying) {
        audio.play();
        playBtn.textContent = "⏸";
        isPlaying = true;
    } else {
        audio.pause();
        playBtn.textContent = "▶";
        isPlaying = false;
    }
};

// ================================
// 停止
// ================================
stopBtn.onclick = () => {
    audio.pause();
    audio.currentTime = 0;
    playBtn.textContent = "▶";
    isPlaying = false;
};

// ================================
// 巻き戻し / 早送り
// ================================
rewindBtn.onclick = () => {
    audio.currentTime = Math.max(0, audio.currentTime - 10);
};

forwardBtn.onclick = () => {
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
};

// ================================
// メトロノーム
// ================================
function playClick() {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = 1000;
    gain.gain.value = 0.2;

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
}

metroBtn.onclick = () => {
    if (metroTimer) {
        clearInterval(metroTimer);
        metroTimer = null;
        metroBtn.textContent = "メトロノーム ON";
        return;
    }

    const bpm = Number(bpmInput.value);
    const interval = (60 / bpm) * 1000;

    playClick();
    metroTimer = setInterval(playClick, interval);

    metroBtn.textContent = "メトロノーム OFF";
};

// ================================
// 波形描画
// ================================
async function drawWaveform() {
    const canvas = document.getElementById("waveform");
    const ctx2d = canvas.getContext("2d");

    const data = audioBuffer.getChannelData(0);
    const step = Math.floor(data.length / canvas.width);

    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    ctx2d.strokeStyle = "#f5c400";
    ctx2d.beginPath();

    for (let i = 0; i < canvas.width; i++) {
        const v = data[i * step];
        const y = (1 - v) * canvas.height / 2;
        ctx2d.lineTo(i, y);
    }

    ctx2d.stroke();
}

// ================================
// アタック検出（簡易版）
// ================================
function detectAttacks() {
    const data = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    const threshold = 0.25;
    const attacks = [];

    for (let i = 1; i < data.length; i++) {
        if (data[i] > threshold && data[i - 1] <= threshold) {
            attacks.push(i / sampleRate);
        }
    }

    return attacks;
}

// ================================
// 早い / 遅い 判定
// ================================
function analyzeTiming(attacks) {
    const bpm = Number(bpmInput.value);
    const beatInterval = 60 / bpm;

    attackList.innerHTML = "";

    attacks.forEach(t => {
        const nearestBeat = Math.round(t / beatInterval) * beatInterval;
        const diff = Math.round((t - nearestBeat) * 1000);

        const item = document.createElement("div");
        item.className = "attack-item";

        if (Math.abs(diff) <= 5) {
            item.classList.add("good");
        } else if (diff > 0) {
            item.classList.add("fast");
        } else {
            item.classList.add("slow");
        }

        item.textContent = `${t.toFixed(2)}s   ${diff}ms`;
        attackList.appendChild(item);
    });
}

// ================================
// 初期化
// ================================
(async () => {
    const blob = await loadFromIndexedDB();
    if (!blob) {
        alert("録音データが見つかりません");
        return;
    }

    await initAudio(blob);
    await drawWaveform();

    const attacks = detectAttacks();
    analyzeTiming(attacks);
})();

// ================================
// 戻る
// ================================
backBtn.onclick = () => history.back();
