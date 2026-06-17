// ================================
// トップページ（index.html）
// ================================
if (location.pathname.endsWith("index.html") || location.pathname.endsWith("/")) {

    const songList = document.getElementById("song-list");

    fetch("tracks/tracks.json")
        .then(res => res.json())
        .then(data => {
            const songs = Object.keys(data.songs);

            songs.forEach(songName => {
                const item = document.createElement("div");
                item.className = "song-item";
                item.textContent = songName;

                item.onclick = () => {
                    location.href = `player.html?song=${encodeURIComponent(songName)}`;
                };

                songList.appendChild(item);
            });
        });
}



// ================================
// プレイヤーページ（player.html）
// ================================
if (location.pathname.endsWith("player.html")) {

    const params = new URLSearchParams(location.search);
    const songName = params.get("song");

    document.getElementById("song-title").textContent = songName;

    const tracksContainer = document.getElementById("tracks-container");
    const seekBar = document.getElementById("seek-bar");
    const currentTimeLabel = document.getElementById("current-time");
    const durationLabel = document.getElementById("duration");

    const playBtn = document.getElementById("play-all");
    const stopBtn = document.getElementById("stop-all");
    const rewindBtn = document.getElementById("rewind");
    const forwardBtn = document.getElementById("forward");

    const playIcon = document.getElementById("play-icon");

    // ▼ 録音UI（UIだけ・録音処理はまだ）
    const recBtn = document.getElementById("rec-btn");
    const stopRecBtn = document.getElementById("stop-btn");

    recBtn.onclick = () => {
        recBtn.classList.remove("rec-off");
        recBtn.classList.add("rec-on");

        stopRecBtn.classList.remove("stop-on");
        stopRecBtn.classList.add("stop-off");
    };

    stopRecBtn.onclick = () => {
        stopRecBtn.classList.remove("stop-off");
        stopRecBtn.classList.add("stop-on");

        recBtn.classList.remove("rec-on");
        recBtn.classList.add("rec-off");
    };
    // ▲ 録音UI

    let audioElements = [];
    let isSeeking = false;
    let isPlaying = false;

    // ================================
    // tracks.json から mp3 のファイル名を取得
    // ================================
    fetch("tracks/tracks.json")
        .then(res => res.json())
        .then(data => {
            const parts = data.songs[songName];
            parts.forEach(fileName => createTrackCard(fileName));
        });

    // ================================
    // トラックカード生成
    // ================================
    function createTrackCard(fileName) {
        const card = document.createElement("div");
        card.className = "track-card";

        const audio = new Audio(`tracks/${songName}/${fileName}`);
        audio.preload = "metadata";

        audio.addEventListener("loadedmetadata", updateDuration);
        audio.addEventListener("canplay", updateDuration);
        audio.addEventListener("durationchange", updateDuration);

        audio.addEventListener("timeupdate", () => {
            if (!isSeeking && audioElements[0] === audio) {
                seekBar.value = audio.currentTime;

                if (!isNaN(audio.duration) && audio.duration > 0) {
                    const percent = (audio.currentTime / audio.duration) * 100;
                    seekBar.style.setProperty("--value", percent + "%");
                }

                currentTimeLabel.textContent = formatTime(audio.currentTime);
            }
        });

        const title = document.createElement("div");
        title.className = "track-title";
        title.textContent = fileName;

        const volume = document.createElement("input");
        volume.type = "range";
        volume.min = 0;
        volume.max = 1;
        volume.step = 0.01;
        volume.value = 1;
        volume.style.setProperty("--value", "100%");

        volume.oninput = () => {
            audio.volume = volume.value;
            volume.style.setProperty("--value", (volume.value * 100) + "%");
        };

        const btnRow = document.createElement("div");
        btnRow.className = "btn-row";

        const muteBtn = document.createElement("button");
        muteBtn.textContent = "MUTE";
        muteBtn.onclick = () => {
            audio.muted = !audio.muted;
            muteBtn.classList.toggle("active", audio.muted);
        };

        const soloBtn = document.createElement("button");
        soloBtn.textContent = "SOLO";
        soloBtn.onclick = () => {
            const soloMode = !audio.dataset.solo;
            audio.dataset.solo = soloMode ? "1" : "";

            audioElements.forEach(a => {
                a.muted = a !== audio && soloMode;
            });

            soloBtn.classList.toggle("solo-active", soloMode);
        };

        btnRow.appendChild(muteBtn);
        btnRow.appendChild(soloBtn);

        card.appendChild(title);
        card.appendChild(volume);
        card.appendChild(btnRow);

        tracksContainer.appendChild(card);
        audioElements.push(audio);
    }

    // ================================
    // duration 更新
    // ================================
    function updateDuration() {
        let maxDur = 0;

        audioElements.forEach(a => {
            if (!isNaN(a.duration) && a.duration !== Infinity) {
                if (a.duration > maxDur) maxDur = a.duration;
            }
        });

        if (maxDur > 0) {
            seekBar.max = maxDur;
            durationLabel.textContent = formatTime(maxDur);
        }
    }

    // ================================
    // Play / Pause トグル
    // ================================
    playBtn.onclick = () => {
        if (!isPlaying) {
            audioElements.forEach(a => {
                a.currentTime = seekBar.value;
                a.play();
            });

            playIcon.innerHTML = `
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            `;
            playIcon.setAttribute("fill", "#000");

            isPlaying = true;

        } else {
            audioElements.forEach(a => a.pause());

            playIcon.innerHTML = `
              <polygon points="6,4 20,12 6,20"></polygon>
            `;
            playIcon.setAttribute("fill", "#000");

            isPlaying = false;
        }
    };

    // ================================
    // 停止
    // ================================
    stopBtn.onclick = () => {
        audioElements.forEach(a => {
            a.pause();
            a.currentTime = 0;
        });

        seekBar.value = 0;
        seekBar.style.setProperty("--value", "0%");
        currentTimeLabel.textContent = "0:00";

        playIcon.innerHTML = `
          <polygon points="6,4 20,12 6,20"></polygon>
        `;
        playIcon.setAttribute("fill", "#000");

        isPlaying = false;
    };

    // ================================
    // 巻き戻し 10s
    // ================================
    rewindBtn.onclick = () => {
        if (audioElements.length === 0) return;

        const base = audioElements[0];
        const t = Math.max(0, base.currentTime - 10);

        audioElements.forEach(a => a.currentTime = t);

        seekBar.value = t;

        if (!isNaN(base.duration) && base.duration > 0) {
            const percent = (t / base.duration) * 100;
            seekBar.style.setProperty("--value", percent + "%");
        }

        currentTimeLabel.textContent = formatTime(t);
    };

    // ================================
    // 早送り 10s
    // ================================
    forwardBtn.onclick = () => {
        if (audioElements.length === 0) return;

        const base = audioElements[0];
        const t = Math.min(base.duration || 0, base.currentTime + 10);

        audioElements.forEach(a => a.currentTime = t);

        seekBar.value = t;

        if (!isNaN(base.duration) && base.duration > 0) {
            const percent = (t / base.duration) * 100;
            seekBar.style.setProperty("--value", percent + "%");
        }

        currentTimeLabel.textContent = formatTime(t);
    };

    // ================================
    // シークバー操作
    // ================================
    seekBar.addEventListener("input", () => {
        if (audioElements.length === 0) return;

        isSeeking = true;
        const t = Number(seekBar.value);

        audioElements.forEach(a => a.currentTime = t);

        const base = audioElements[0];
        if (!isNaN(base.duration) && base.duration > 0) {
            const percent = (t / base.duration) * 100;
            seekBar.style.setProperty("--value", percent + "%");
        }

        currentTimeLabel.textContent = formatTime(t);
    });

    seekBar.addEventListener("change", () => {
        isSeeking = false;
    });

    // ================================
    // 時間フォーマット
    // ================================
    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    }
}
