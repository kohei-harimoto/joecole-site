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
const metroLabel = document.getElementById("metro-label");

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
// 再生 / 一時停止（SVG 切り替え）
// ================================
playBtn.onclick = () => {
    const icon = document.getElementById("play-icon");

    if (!isPlaying) {
        audio.play();
        icon.innerHTML = `
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        `;
        icon.setAttribute("fill", "#000");
        isPlaying = true;

    } else {
        audio.pause();
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
stopBtn.onclick = () => {
    audio.pause();
    audio.currentTime = 0;

    const icon = document.getElementById("play-icon");
    icon.innerHTML = `
      <polygon points="6,4 20,12 6,20"></polygon>
    `;
    icon.setAttribute("fill", "#000");

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
// メトロノーム（文字だけで ON/OFF）
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

metroLabel.onclick = () => {
    if (metroTimer) {
        clearInterval(metroTimer);
        metroTimer = null;

        metroLabel.classList.remove("metro-on");
        metroLabel.classList.add("metro-off");
        return;
    }

    const bpm = Number(bpmInput.value);
    const interval = (60 / bpm) * 1000;

    playClick();
    metroTimer = setInterval(playClick, interval);

    metroLabel.classList.remove("metro-off");
    metroLabel.classList.add("metro-on");
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
// 高精度アタック検出（STFT なし版）
// ================================
function detectAttacks() {
    const data = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    const frameSize = 1024;     // 23ms
    const hopSize = 512;        // 11ms
    const energy = [];

    // ① 短時間エネルギーを計算
    for (let i = 0; i < data.length - frameSize; i += hopSize) {
        let sum = 0;
        for (let j = 0; j < frameSize; j++) {
            const v = data[i + j];
            sum += v * v;
        }
        energy.push(sum);
    }

    // ② エネルギーの変化量（微分）
    const diff = [];
    for (let i = 1; i < energy.length; i++) {
        diff.push(energy[i] - energy[i - 1]);
    }

    // ③ 平滑化（ローパス）
    const smooth = [];
    const smoothSize = 4;
    for (let i = 0; i < diff.length; i++) {
        let s = 0;
        for (let j = 0; j < smoothSize; j++) {
            s += diff[Math.max(0, i - j)];
        }
        smooth.push(s / smoothSize);
    }

    // ④ ピーク検出
    const attacks = [];
    const threshold = average(smooth) * 2.5;  // 自動閾値

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

// 平均値
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
