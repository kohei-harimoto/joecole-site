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

    let audioElements = [];
    let isSeeking = false;

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

        // ---- duration が読めたら UI 更新 ----
        audio.addEventListener("loadedmetadata", () => {
            if (audioElements.length === 0) {
                seekBar.max = audio.duration;
                durationLabel.textContent = formatTime(audio.duration);
            }
        });

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
    // 全体再生
    // ================================
    document.getElementById("play-all").onclick = () => {
        audioElements.forEach(a => {
            a.currentTime = seekBar.value;
            a.play();
        });
    };

    // ================================
    // 全体停止
    // ================================
    document.getElementById("stop-all").onclick = () => {
        audioElements.forEach(a => {
            a.pause();
            a.currentTime = 0;
        });
        seekBar.value = 0;
        currentTimeLabel.textContent = "0:00";
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

    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    }
}
