#!/bin/sh

cd ~site/tracks || exit

echo '{ "songs": {' > tracks.json

first=1
for folder in */; do
  folder=${folder%/}
  if [ $first -eq 0 ]; then
    echo "," >> tracks.json
  fi
  first=0

  echo -n "  \"$folder\": [" >> tracks.json

  firstfile=1
  for file in "$folder"/*.mp3; do
    filename=$(basename "$file")
    if [ $firstfile -eq 0 ]; then
      echo -n ", " >> tracks.json
    fi
    firstfile=0
    echo -n "\"$filename\"" >> tracks.json
  done

  echo -n "]" >> tracks.json
done

echo "}}" >> tracks.json

echo "tracks.json"
