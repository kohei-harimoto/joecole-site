// ================================
// analyze.html
// ================================

// 曲名取得
const params = new URLSearchParams(location.search);
const songName = params.get("song");
document.getElementById("song-title").textContent = `${songName} の解析`;

// Base64 録音データ取得
const base64 = params.get("rec");
if (!base64) {
    alert("録音データがありません");
}

// Base64 → Blob
function base64ToBlob(base64) {
    const bin = atob(base64);
    const len = bin.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) buffer[i] = bin.charCodeAt(i);
    return new Blob([buffer], { type: "audio/webm" });
}

const blob = base64ToBlob(base64);
const audioURL = URL.createObjectURL(blob);
const audio = new Audio(audioURL);

// ================================
// UI 要素
// ================================
const playBtn = document.getElementById("play-btn");
const stopBtn = document.getElementById("stop-btn");
const rewindBtn = document.getElementById("rewind-btn");
const forwardBtn = document.getElementById("forward-btn");

const bpmInput = document.getElementById("bpm-input");
const metroBtn = document.getElementById("metro-btn");

const attackList = document.getElementById("attack-list");
const backBtn = document.getElementById("back-btn");

let isPlaying = false;
let metroTimer = null;

// ================================
// 再生 / 停止
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

    playClick(); // 最初のクリック
    metroTimer = setInterval(playClick, interval);

    metroBtn.textContent = "メトロノーム OFF";
};

// ================================
// アタック検出（簡易版）
// ================================
async function detectAttacks() {
    const ctx = new AudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const data = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    const threshold = 0.25;
    const attacks = [];

    for (let i = 1; i < data.length; i++) {
        if (data[i] > threshold && data[i - 1] <= threshold) {
            const time = i / sampleRate;
            attacks.push(time);
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
        const diff = Math.round((t - nearestBeat) * 1000); // ms

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
// 波形描画
// ================================
async function drawWaveform() {
    const canvas = document.getElementById("waveform");
    const ctx2d = canvas.getContext("2d");

    const ctx = new AudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const data = audioBuffer.getChannelData(0);
    const step = Math.floor(data.length / canvas.width);

    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    ctx2d.strokeStyle = "#f5c400";
    ctx2d.beginPath();

    for (let i = 0; i < canvas.width; i++) {
        const min = data[i * step];
        const y = (1 - min) * canvas.height / 2;
        ctx2d.lineTo(i, y);
    }

    ctx2d.stroke();
}

// ================================
// 初期化
// ================================
(async () => {
    await drawWaveform();

    const attacks = await detectAttacks();
    analyzeTiming(attacks);
})();

// ================================
// 戻る
// ================================
backBtn.onclick = () => history.back();
