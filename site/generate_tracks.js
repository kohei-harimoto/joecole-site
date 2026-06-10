// generate_tracks.js
// --------------------------------------
// tracks フォルダを読み取り、tracks.json を自動生成する
// --------------------------------------

const fs = require("fs");
const path = require("path");

const tracksDir = path.join(__dirname, "tracks");
const outputFile = path.join(tracksDir, "tracks.json");

let result = { songs: {} };

// tracks/ 内のフォルダを取得
const songFolders = fs.readdirSync(tracksDir).filter(name => {
  return fs.statSync(path.join(tracksDir, name)).isDirectory();
});

// 各フォルダ内の mp3 を取得
songFolders.forEach(folder => {
  const folderPath = path.join(tracksDir, folder);

  const mp3Files = fs.readdirSync(folderPath).filter(file => file.endsWith(".mp3"));

  // mp3 があるフォルダだけ tracks.json に追加
  if (mp3Files.length > 0) {
    result.songs[folder] = mp3Files;
  }
});

// tracks.json に書き込み
fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), "utf8");

console.log("tracks.json を自動生成しました！");
