"""Find ffmpeg: $FFMPEG, then PATH, then common local installs. Shared by the kit's scripts."""
import glob, os, shutil, sys

# Windows consoles default to cp1252: never crash on printing a non-ASCII character
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def ffmpeg():
    cands = [os.environ.get("FFMPEG"), shutil.which("ffmpeg")]
    cands += glob.glob(os.path.expanduser("~/.local/node/lib/node_modules/ffmpeg-static/ffmpeg"))
    for depth in ("*", "*/*", "*/*/*"):
        cands += glob.glob(os.path.expanduser(f"~/{depth}/node_modules/ffmpeg-static/ffmpeg"))
    cands += glob.glob("/usr/local/lib/node_modules/ffmpeg-static/ffmpeg") + glob.glob("/opt/homebrew/bin/ffmpeg")
    if os.name == "nt":  # Windows: npm global ffmpeg-static, winget/choco/scoop installs
        cands += glob.glob(os.path.expandvars(r"%APPDATA%\npm\node_modules\ffmpeg-static\ffmpeg.exe"))
        cands += glob.glob(os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Packages\*ffmpeg*\*\bin\ffmpeg.exe"))
        cands += glob.glob(r"C:\ProgramData\chocolatey\bin\ffmpeg.exe") + glob.glob(os.path.expanduser(r"~\scoop\shims\ffmpeg.exe"))
    for c in cands:
        if c and os.path.exists(c):
            return c
    sys.exit("ffmpeg not found. Install it (https://ffmpeg.org, or `npm i -g ffmpeg-static`) or set FFMPEG=/path/to/ffmpeg")


if __name__ == "__main__":
    print(ffmpeg())
