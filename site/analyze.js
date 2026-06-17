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
const attackList = document.getElementById("attack-list");
const backBtn = document.getElementById("back-btn");

// AudioContext（全ての基準時間）
const ctx = new AudioContext();
let sourceNode = null;
let audioBuffer = null;

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
// Blob → AudioBuffer
// ================================
async function initAudio(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
}

// ================================
// 録音再生（AudioContext）
// ================================
function playRecording(startTime) {
    if (sourceNode) {
        sourceNode.stop();
        sourceNode.disconnect();
    }

    sourceNode = ctx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(ctx.destination);
    sourceNode.start(startTime);
}

// ================================
// メトロノーム（常時 ON）
// ================================
function scheduleMetronome(startTime) {
    const bpm = Number(bpmInput.value);
    const interval = 60 / bpm;

    let nextTime = startTime;

    function tick() {
        if (!isPlaying) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 1000;
        gain.gain.value = 0.25;

        osc.connect(gain).connect(ctx.destination);
        osc.start(nextTime);
        osc.stop(nextTime + 0.05);

        nextTime += interval;
        metroTimer = setTimeout(tick, interval * 1000);
    }

    tick();
}

// ================================
// 再生ボタン（録音＋メトロノーム同期）
// ================================
playBtn.onclick = () => {
    const icon = document.getElementById("play-icon");

    if (!isPlaying) {
        const startTime = ctx.currentTime + 0.05;

        playRecording(startTime);
        scheduleMetronome(startTime);

        icon.innerHTML = `
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        `;
        icon.setAttribute("fill", "#000");

        isPlaying = true;

    } else {
        stopAll();

        icon.innerHTML = `
          <polygon points="6,4 20,12 6,20"></polygon>
        `;
        icon.setAttribute("fill", "#000");

        isPlaying = false;
    }
};

// ================================
// 停止
// ================================
function stopAll() {
    if (sourceNode) {
        sourceNode.stop();
        sourceNode.disconnect();
        sourceNode = null;
    }

    if (metroTimer) {
        clearTimeout(metroTimer);
        metroTimer = null;
    }
}

stopBtn.onclick = stopAll;

// ================================
// 巻き戻し / 早送り（AudioContext 再生では不可）
// → 解析画面では無効化 or 将来実装
// ================================
rewindBtn.onclick = () => alert("巻き戻しは AudioContext 再生では未対応です");
forwardBtn.onclick = () => alert("早送りは AudioContext 再生では未対応です");

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
// 高精度アタック検出
// ================================
function detectAttacks() {
    const data = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    const frameSize = 1024;
    const hopSize = 512;
    const energy = [];

    for (let i = 0; i < data.length - frameSize; i += hopSize) {
        let sum = 0;
        for (let j = 0; j < frameSize; j++) {
            const v = data[i + j];
            sum += v * v;
        }
        energy.push(sum);
    }

    const diff = [];
    for (let i = 1; i < energy.length; i++) {
        diff.push(energy[i] - energy[i - 1]);
    }

    const smooth = [];
    const smoothSize = 4;
    for (let i = 0; i < diff.length; i++) {
        let s = 0;
        for (let j = 0; j < smoothSize; j++) {
            s += diff[Math.max(0, i - j)];
        }
        smooth.push(s / smoothSize);
    }

    const threshold = average(smooth) * 2.5;
    const attacks = [];

    for (let i = 1; i < smooth.length - 1; i++) {
        if (smooth[i] > threshold &&
            smooth[i] > smooth[i - 1] &&
            smooth[i] > smooth[i + 1]) {

            const time = (i * hopSize) / sampleRate;
            attacks.push(time);
        }
    }

    return attacks;
}

function average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
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
