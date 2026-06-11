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

    let audioElements = [];
    let isSeeking = false;
    let isPlaying = false; // ← Play/Pause 状態管理

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
    // トラックカード生成（音量＋MUTE＋SOLO）
    // ================================
    function createTrackCard(fileName) {
        const card = document.createElement("div");
        card.className = "track-card";

        const audio = new Audio(`tracks/${songName}/${fileName}`);
        audio.preload = "metadata";

        // ---- duration を確実に取得 ----
        audio.addEventListener("loadedmetadata", updateDuration);
        audio.addEventListener("canplay", updateDuration);
        audio.addEventListener("durationchange", updateDuration);

        // ---- 再生中にシークバー更新 ----
        audio.addEventListener("timeupdate", () => {
            if (!isSeeking && audioElements[0] === audio) {
                seekBar.value = audio.currentTime;
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
        volume.oninput = () => audio.volume = volume.value;

        // ---- MUTE / SOLO ----
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
    // 全トラックの duration を見て最大値をセット
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
    // Play / Pause トグル（統合版）
    // ================================
    playBtn.onclick = () => {
        if (!isPlaying) {
            // ---- 再生開始 ----
            audioElements.forEach(a => {
                a.currentTime = seekBar.value;
                a.play();
            });
            playBtn.textContent = "⏸️"; // ← Pause 表示
            isPlaying = true;
        } else {
            // ---- 一時停止 ----
            audioElements.forEach(a => a.pause());
            playBtn.textContent = "▶️"; // ← Play 表示
            isPlaying = false;
        }
    };

    // ================================
    // 全体停止
    // ================================
    stopBtn.onclick = () => {
        audioElements.forEach(a => {
            a.pause();
            a.currentTime = 0;
        });
        seekBar.value = 0;
        currentTimeLabel.textContent = "0:00";
        playBtn.textContent = "▶️";
        isPlaying = false;
    };

    // ================================
    // シークバー操作
    // ================================
    seekBar.addEventListener("input", () => {
        isSeeking = true;
        const t = Number(seekBar.value);
        audioElements.forEach(a => a.currentTime = t);
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
