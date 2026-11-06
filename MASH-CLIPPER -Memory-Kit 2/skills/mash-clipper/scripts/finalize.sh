#!/bin/bash
# finalize.sh preview <rendered.mp4> <out.mp4>
#   -> 720x1280 phone-safe preview (H.264 Main 4.0 + AAC 44.1k stereo, faststart): plays with sound on every phone.
# finalize.sh final <rendered-4k.mp4> <clip RAW 4K.mp4 (audio source)> <out.mp4>
#   -> Premiere-safe 4K (x264, 1 s keyframes, closed GOP) with the clip's ORIGINAL audio copied untouched.
set -e
MODE="$1"
if [ "$MODE" = "preview" ]; then
  ffmpeg -v error -y -i "$2" -vf scale=720:1280:flags=lanczos -c:v libx264 -profile:v main -level 4.0 -pix_fmt yuv420p \
    -crf 21 -preset medium -c:a aac -ar 44100 -ac 2 -b:a 160k -movflags +faststart "$3"
elif [ "$MODE" = "final" ]; then
  mkdir -p "$(dirname "$4")"
  ffmpeg -v error -y -i "$2" -i "$3" -map 0:v:0 -map 1:a:0 -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 16 -preset medium \
    -g 30 -keyint_min 30 -sc_threshold 0 -x264-params open-gop=0 -c:a copy -shortest -movflags +faststart "$4"
else
  echo "usage: finalize.sh preview <in> <out> | final <render> <audio-source> <out>"; exit 1
fi
ffprobe -v error -show_entries stream=codec_name,width,height:format=duration -of csv=p=0 "${@: -1}"
