# In-app videos

`promo.mp4` and `tutorial.mp4` here play inside the app automatically — no code
changes needed.

| File | Where it plays | Source |
|------|----------------|--------|
| `promo.mp4` | Home screen → **🎬 סרטון התדמית** button (bottom) | `marketing/make_videos.py` |
| `tutorial.mp4` | Profile → **🎓 סרטון הדרכה** | `marketing/make_videos.py` |

If a file is missing, the player shows a friendly "הסרטון יתווסף בקרוב / Video
coming soon" state — nothing breaks.

## Regenerate the videos
These are **real, rendered H.264 MP4s** (1080×1920, 24fps) produced entirely in
Python — Pillow for the branded motion-graphics frames (with the real demo data),
`imageio` (bundled ffmpeg) for encoding, `python-bidi` for Hebrew RTL:
```bash
python marketing/make_videos.py     # re-renders promo.mp4 + tutorial.mp4 here
```
Edit the scenes/captions in `marketing/make_videos.py` and re-run to update them.
To swap in real screen-capture footage instead, replace either file (same name).

## Recommended encoding (mobile-friendly, fast start)
```bash
ffmpeg -i input.mov -vf "scale=1080:-2" -c:v libx264 -profile:v high -crf 23 \
       -preset medium -movflags +faststart -c:a aac -b:a 128k promo.mp4
```
- Vertical 9:16 (1080×1920) matches the in-app player aspect ratio.
- `+faststart` lets it begin playing before fully downloaded.
- Keep each under ~15–25 MB so it streams quickly on mobile data.

## Prefer YouTube/Vimeo instead of self-hosting?
Swap the `<video>` element for an `<iframe>` in:
- `Templates/app.html` → `#video-modal-overlay`
- `Templates/profile.html` → `#tutorial-video-overlay`
and point `openVideoModal()` / `openTutorialVideo()` at the embed URL.
