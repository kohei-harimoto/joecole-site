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

            parts.forEach(fileName => {
                createTrackCard(fileName);
            });
        });

    // ================================
    // トラックカード生成（音量＋MUTE＋SOLO）
    // ================================
    function createTrackCard(fileName) {
        const card = document.createElement("div");
        card.className = "track-card";

        const audio = new Audio(`tracks/${songName}/${fileName}`);
        audio.preload = "metadata";

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
    };

    // ================================
    // シークバー同期
    // ================================
    function syncSeekBar() {
        if (audioElements.length === 0) return;

        const main = audioElements[0];

        if (!isSeeking) {
            seekBar.value = main.currentTime;
            currentTimeLabel.textContent = formatTime(main.currentTime);
        }

        requestAnimationFrame(syncSeekBar);
    }

    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    seekBar.addEventListener("input", () => {
        isSeeking = true;
        const t = Number(seekBar.value);
        audioElements.forEach(a => a.currentTime = t);
    });

    seekBar.addEventListener("change", () => {
        isSeeking = false;
    });

    const durationCheck = setInterval(() => {
        if (audioElements.length > 0 && audioElements[0].duration) {
            seekBar.max = audioElements[0].duration;
            durationLabel.textContent = formatTime(audioElements[0].duration);
            clearInterval(durationCheck);
        }
    }, 500);

    syncSeekBar();
}
