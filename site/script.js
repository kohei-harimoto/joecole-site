let tracks = [];
let isPlaying = false;
let Apoint = null;
let Bpoint = null;
let loopEnabled = false;

const tracksContainer = document.getElementById("tracks-container");
const playPauseBtn = document.getElementById("play-pause");
const stopBtn = document.getElementById("stop");
const rewindBtn = document.getElementById("rewind");
const forwardBtn = document.getElementById("forward");
const seekBar = document.getElementById("seek-bar");
const currentTimeLabel = document.getElementById("current-time");
const durationLabel = document.getElementById("duration");

const setABtn = document.getElementById("setA");
const setBBtn = document.getElementById("setB");
const loopBtn = document.getElementById("loop");

/* -------------------------
   mp3 読み込み（tracks.json）
------------------------- */
fetch("tracks.json")
  .then(res => res.json())
  .then(data => {
    data.forEach((file, index) => {
      const audio = new Audio(file);
      audio.preload = "auto";
      tracks.push({ audio, index, file });

      createTrackCard(index, file);
    });

    // duration が揃うまで待つ
    setTimeout(() => {
      if (tracks[0]) {
        durationLabel.textContent = formatTime(tracks[0].audio.duration);
        seekBar.max = tracks[0].audio.duration;
      }
    }, 500);
  });

/* -------------------------
   トラックカード生成
------------------------- */
function createTrackCard(index, file) {
  const card = document.createElement("div");
  card.className = "track-card";

  const title = document.createElement("div");
  title.className = "track-title";
  title.textContent = file;

  const faderWrapper = document.createElement("div");
  faderWrapper.className = "fader-wrapper";

  const fader = document.createElement("input");
  fader.type = "range";
  fader.min = 0;
  fader.max = 1;
  fader.step = 0.01;
  fader.value = 1;

  fader.addEventListener("input", () => {
    tracks[index].audio.volume = fader.value;
  });

  faderWrapper.appendChild(fader);

  const btnRow = document.createElement("div");
  btnRow.className = "btn-row";

  const muteBtn = document.createElement("button");
  muteBtn.textContent = "MUTE";
  muteBtn.className = "mute";

  muteBtn.addEventListener("click", () => {
    muteBtn.classList.toggle("active");
    tracks[index].audio.muted = muteBtn.classList.contains("active");
  });

  const soloBtn = document.createElement("button");
  soloBtn.textContent = "SOLO";
  soloBtn.className = "solo";

  soloBtn.addEventListener("click", () => {
    soloBtn.classList.toggle("active");

    if (soloBtn.classList.contains("active")) {
      tracks.forEach((t, i) => {
        t.audio.muted = i !== index;
      });
    } else {
      tracks.forEach(t => (t.audio.muted = false));
    }
  });

  btnRow.appendChild(muteBtn);
  btnRow.appendChild(soloBtn);

  card.appendChild(title);
  card.appendChild(faderWrapper);
  card.appendChild(btnRow);

  tracksContainer.appendChild(card);
}

/* -------------------------
   再生・一時停止
------------------------- */
playPauseBtn.addEventListener("click", () => {
  if (!isPlaying) {
    tracks.forEach(t => t.audio.play());
    playPauseBtn.textContent = "⏸";
    isPlaying = true;
  } else {
    tracks.forEach(t => t.audio.pause());
    playPauseBtn.textContent = "▶︎";
    isPlaying = false;
  }
});

/* -------------------------
   停止
------------------------- */
stopBtn.addEventListener("click", () => {
  tracks.forEach(t => {
    t.audio.pause();
    t.audio.currentTime = 0;
  });
  playPauseBtn.textContent = "▶︎";
  isPlaying = false;
});

/* -------------------------
   10秒巻き戻し / 先送り
------------------------- */
rewindBtn.addEventListener("click", () => {
  tracks.forEach(t => {
    t.audio.currentTime = Math.max(0, t.audio.currentTime - 10);
  });
});

forwardBtn.addEventListener("click", () => {
  tracks.forEach(t => {
    t.audio.currentTime = Math.min(t.audio.duration, t.audio.currentTime + 10);
  });
});

/* -------------------------
   A / B / Loop
------------------------- */
setABtn.addEventListener("click", () => {
  Apoint = tracks[0].audio.currentTime;
});

setBBtn.addEventListener("click", () => {
  Bpoint = tracks[0].audio.currentTime;
});

loopBtn.addEventListener("click", () => {
  loopEnabled = !loopEnabled;
  loopBtn.classList.toggle("loop-active");
});

/* -------------------------
   シークバー同期
------------------------- */
setInterval(() => {
  if (tracks.length === 0) return;

  const t = tracks[0].audio;
  seekBar.value = t.currentTime;
  currentTimeLabel.textContent = formatTime(t.currentTime);

  if (loopEnabled && Apoint !== null && Bpoint !== null) {
    if (t.currentTime >= Bpoint) {
      tracks.forEach(a => (a.audio.currentTime = Apoint));
    }
  }
}, 200);

seekBar.addEventListener("input", () => {
  tracks.forEach(t => (t.audio.currentTime = seekBar.value));
});

/* -------------------------
   時間フォーマット
------------------------- */
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
