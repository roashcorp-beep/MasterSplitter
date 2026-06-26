# In-app videos

Drop the rendered videos here and they play inside the app automatically — no code
changes needed.

| File | Where it plays | Source script |
|------|----------------|----------------|
| `promo.mp4` | Home screen → **🎬 סרטון התדמית** button (bottom) | `marketing/promo_script.md` |
| `tutorial.mp4` | Profile → **🎓 סרטון הדרכה** | `marketing/tutorial_script.md` |

Until a file exists, the player shows a friendly "הסרטון יתווסף בקרוב / Video coming
soon" state — nothing breaks.

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
