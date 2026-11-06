// Free local AI voiceover (Kokoro-82M, Apache-2.0) — one WAV per line so lines can be placed on beats.
// Setup once:  npm i kokoro-js   (in this folder or any parent)
// Usage:       node tts.mjs <voice> <outdir> "line one" "line two" ...
// Voices:      am_fenrir (punchy male, good for ads), am_michael (deep male), af_heart / af_nova (female), bm_george (British male)
import { KokoroTTS } from "kokoro-js";
const [voice = "am_fenrir", outdir = ".", ...lines] = process.argv.slice(2);
const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "fp32", device: "cpu" });
for (let i = 0; i < lines.length; i++) {
  const audio = await tts.generate(lines[i], { voice, speed: 1.0 });
  const f = `${outdir}/line_${String(i + 1).padStart(2, "0")}.wav`;
  await audio.save(f);
  console.log(f);
}
