// ================================
// DAW Player Script (完全版)
// ================================

// 要素取得
const audio = document.getElementById("audio");
const trackList = document.getElementById("track-list");
const playPauseBtn = document.getElementById("play-pause");
const seekBar = document.getElementById("seekBar");
const timeLabel = document.getElementById("time");

// tracks.json を読み込む
fetch("tracks.json")
    .then(res => res.json())
    .then(data => {
        data.forEach(track => {
            const div = document.createElement("div");
            div.className = "track-item";
            div.textContent = track.name;

            div.addEventListener("click", () => {
                audio.src = track.file;
                audio.play();
                playPauseBtn.textContent = "⏸️"; // 再生開始時にアイコン更新
            });

            trackList.appendChild(div);
        });
    });

// ================================
// Play / Pause トグル
// ================================
playPauseBtn.addEventListener("click", () => {
    if (audio.paused) {
        audio.play();
        playPauseBtn.textContent = "⏸️";
    } else {
        audio.pause();
        playPauseBtn.textContent = "▶️";
    }
});

// ================================
// 再生時間の更新
// ================================
audio.addEventListener("loadedmetadata", () => {
    seekBar.max = audio.duration;
    updateTimeLabel();
});

audio.addEventListener("timeupdate", () => {
    seekBar.value = audio.currentTime;
    updateTimeLabel();
});

// ================================
// シークバー操作
// ================================
seekBar.addEventListener("input", () => {
    audio.currentTime = seekBar.value;
});

// ================================
// 時間表示フォーマット
// ================================
function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function updateTimeLabel() {
    const cur = formatTime(audio.currentTime || 0);
    const dur = formatTime(audio.duration || 0);
    timeLabel.textContent = `${cur} / ${dur}`;
}
