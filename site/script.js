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

    // ▼ 録音UI
    const recBtn = document.getElementById("rec-btn");
    const stopRecBtn = document.getElementById("stop-btn");
    const analyzeBtn = document.getElementById("analyze-btn");

    // ▼ MediaRecorder 用
    let mediaRecorder;
    let recordedChunks = [];

    // ================================
    // REC ボタン（録音開始）
    // ================================
    recBtn.onclick = async () => {
        recBtn.classList.add("rec-on");
        stopRecBtn.classList.remove("stop-on");

        analyzeBtn.classList.remove("ready");

        // マイク取得
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.start();
    };

    // ================================
    // STOP ボタン（録音停止）
    // ================================
    stopRecBtn.onclick = () => {
        stopRecBtn.classList.add("stop-on");
        recBtn.classList.remove("rec-on");

        analyzeBtn.classList.add("ready");

        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
    };

    // ================================
    // ANALYZE ボタン（録音データを Base64 にして遷移）
    // ================================
    analyzeBtn.onclick = async () => {
        if (recordedChunks.length === 0) {
            alert("録音データがありません");
            return;
        }

        const blob = new Blob(recordedChunks, { type: "audio/webm" });
        const base64 = await blobToBase64(blob);

        location.href = `analyze.html?song=${encodeURIComponent(songName)}&rec=${encodeURIComponent(base64)}`;
    };

    // Blob → Base64
    function blobToBase64(blob) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(",")[1]);
            reader.readAsDataURL(blob);
        });
    }

    // ================================
    // 再生関連
    // ================================
    let audioElements = [];
    let isSeeking = false;
    let isPlaying = false;

    fetch("tracks/tracks.json")
        .then(res => res.json())
        .then(data => {
            const parts = data.songs[songName];
            parts.forEach(fileName => createTrackCard(fileName));
        });

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

    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    }
}
