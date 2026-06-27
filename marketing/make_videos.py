# -*- coding: utf-8 -*-
"""
Master Splitter — real MP4 video renderer  (Phase 6, actually executed)
=======================================================================
Renders TWO real, playable H.264 MP4 files from the promo/tutorial scripts, as
branded motion-graphics using the REAL demo data (group names, currencies, amounts):
    Static/videos/promo.mp4      (~50s, 9:16)
    Static/videos/tutorial.mp4   (~2:40, 9:16)

Pure-Python: Pillow + numpy for frames, imageio (bundled ffmpeg) for encoding,
python-bidi for Hebrew RTL. No external services, no placeholders.

Run:   python marketing/make_videos.py
"""
import os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from bidi.algorithm import get_display
import imageio

random.seed(7)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(os.path.dirname(HERE), "Static", "videos")
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 1080, 1920
FPS = 24
# Brand palette
BG0, BG1 = (10, 9, 28), (18, 14, 44)
PURPLE = (168, 85, 247)
PURPLE_D = (124, 58, 175)
GREEN = (34, 197, 94)
RED = (239, 68, 68)
YELLOW = (245, 200, 66)
CYAN = (56, 189, 248)
TEXT = (235, 236, 245)
MUTED = (150, 156, 178)
CARD = (26, 24, 54)
CARD2 = (32, 30, 64)

FREG = "C:/Windows/Fonts/arial.ttf"
FBLD = "C:/Windows/Fonts/arialbd.ttf"
FEMO = "C:/Windows/Fonts/seguiemj.ttf"
_fc = {}
def font(sz, bold=True):
    k = (sz, bold)
    if k not in _fc:
        _fc[k] = ImageFont.truetype(FBLD if bold else FREG, sz)
    return _fc[k]

def rtl(s):  # BiDi shaping for Hebrew (and mixed) strings
    return get_display(s)

def text(d, xy, s, sz, color, bold=True, anchor="mm", he=True):
    d.text(xy, rtl(s) if he else s, font=font(sz, bold), fill=color, anchor=anchor)

def emoji(d, xy, ch, sz, anchor="mm"):
    try:
        d.text(xy, ch, font=ImageFont.truetype(FEMO, sz), anchor=anchor, embedded_color=True)
    except Exception:
        pass

def vgrad(top, bot):
    arr = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        t = y / (H - 1)
        arr[y, :] = [int(top[i] + (bot[i] - top[i]) * t) for i in range(3)]
    return Image.fromarray(arr, "RGB")

# pre-rendered starfield (added subtly to backgrounds)
_STAR = Image.new("RGBA", (W, H), (0, 0, 0, 0))
_sd = ImageDraw.Draw(_STAR)
for _ in range(140):
    x, y = random.randint(0, W), random.randint(0, H)
    r = random.choice([1, 1, 2])
    a = random.randint(30, 120)
    _sd.ellipse([x - r, y - r, x + r, y + r], fill=(200, 200, 255, a))

def base_bg(tint=None):
    img = vgrad(BG0, BG1).convert("RGBA")
    img.alpha_composite(_STAR)
    if tint:
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.ellipse([W // 2 - 520, -260, W // 2 + 520, 520], fill=tint + (60,))
        img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(120)))
    return img

def card(d, x, y, w, h, r=34, fill=CARD, outline=(255, 255, 255), ow=2, oalpha=22):
    d.rounded_rectangle([x, y, x + w, y + h], radius=r, fill=fill,
                        outline=outline + (oalpha,) if len(outline) == 3 else outline, width=ow)

def chip(d, cx, cy, label, color):
    w = font(34).getlength(label) + 56
    d.rounded_rectangle([cx - w / 2, cy - 28, cx + w / 2, cy + 28], radius=28, fill=color + (40,),
                        outline=color + (160,), width=2)
    text(d, (cx, cy - 1), label, 34, color, anchor="mm", he=False)

def pill_btn(d, cx, cy, w, label, fill=PURPLE, fg=(255, 255, 255), sz=40):
    d.rounded_rectangle([cx - w / 2, cy - 44, cx + w / 2, cy + 44], radius=44, fill=fill)
    text(d, (cx, cy - 2), label, sz, fg, anchor="mm")

def phone_top(d, title):
    text(d, (W // 2, 150), title, 56, TEXT, anchor="mm")

def draw_check(d, cx, cy, r, color, filled=True):
    """Drawn checkmark (Arial lacks the ✓ glyph -> renders as tofu)."""
    if filled:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
        stroke = (255, 255, 255)
    else:
        stroke = color
    w = max(3, int(r * 0.20))
    d.line([(cx - r*0.42, cy + r*0.04), (cx - r*0.08, cy + r*0.40),
            (cx + r*0.46, cy - r*0.34)], fill=stroke, width=w, joint="curve")

# ----------------------------------------------------------------- SCENES (return RGBA base 1080x1920)
def s_logo(sub):
    img = base_bg(PURPLE); d = ImageDraw.Draw(img)
    d.rounded_rectangle([W//2-150, 560, W//2+150, 860], radius=64, fill=PURPLE)
    text(d, (W//2, 710), "M\\S", 150, (255, 255, 255), anchor="mm", he=False)
    text(d, (W//2, 980), "MASTER SPLITTER", 78, TEXT, anchor="mm", he=False)
    text(d, (W//2, 1075), sub, 44, PURPLE, anchor="mm", he=False)
    return img

def s_problem():
    img = base_bg(); d = ImageDraw.Draw(img)
    syms = ["₪", "€", "$", "¥", "ALL"]
    pos = [(280, 720), (800, 640), (300, 1180), (820, 1240), (540, 940)]
    for s, (x, y) in zip(syms, pos):
        d.rounded_rectangle([x-95, y-95, x+95, y+95], radius=30, fill=CARD2, outline=PURPLE+(120,), width=3)
        text(d, (x, y), s, 70, PURPLE, anchor="mm", he=False)
    text(d, (W//2, 1470), "מי שילם? מי חייב? באיזה מטבע?", 56, TEXT, anchor="mm")
    return img

def s_home():
    img = base_bg(); d = ImageDraw.Draw(img)
    phone_top(d, rtl("אלבניה 2026"))
    card(d, 70, 300, W-140, 170, fill=CARD)
    text(d, (W-110, 360), "מקבל", 38, MUTED, anchor="rm")
    text(d, (W-110, 420), "₪612", 56, GREEN, anchor="rm")
    text(d, (160, 360), "חייב", 38, MUTED, anchor="lm")
    text(d, (160, 420), "₪0", 56, TEXT, anchor="lm")
    # two stat boxes
    for i, (lbl, val) in enumerate([("ההוצאות שלי", "₪1,180"), ("הוצאות הקבוצה", "₪4,360")]):
        x = 70 + i*((W-140)/2+0); bw = (W-140)/2 - 12
        x = 70 + i*(bw+24)
        card(d, x, 510, bw, 200, fill=CARD2)
        text(d, (x+bw/2, 575), lbl, 36, MUTED)
        text(d, (x+bw/2, 645), val, 58, TEXT)
    # latest expense row
    card(d, 70, 760, W-140, 230, fill=CARD)
    d.ellipse([110, 800, 190, 880], fill=PURPLE_D)
    text(d, (150, 840), "מ", 44, (255,255,255))
    text(d, (W-110, 820), "ארוחת ערב על המים", 42, TEXT, anchor="rm")
    text(d, (W-110, 880), "מורן • אוכל", 34, MUTED, anchor="rm")
    text(d, (W-110, 945), "ALL 12,400", 44, YELLOW, anchor="rm")
    pill_btn(d, W//2, 1120, 560, rtl("דשבורד הוצאות"), fill=PURPLE+(50,), fg=TEXT)
    for i, c in enumerate(["€", "$", "ALL"]):
        chip(d, 230 + i*210, 1260, c, [CYAN, YELLOW, PURPLE][i])
    return img

def s_add():
    img = base_bg(); d = ImageDraw.Draw(img)
    phone_top(d, rtl("הוצאה חדשה"))
    card(d, 70, 300, W-140, 150, fill=CARD2)
    text(d, (W-120, 375), "סכום", 36, MUTED, anchor="rm")
    text(d, (160, 375), "12,400", 64, TEXT, anchor="lm")
    chip(d, W-200, 375, "ALL", PURPLE)
    # shared payment
    card(d, 70, 500, W-140, 430, fill=CARD)
    text(d, (W-120, 560), "תשלום משותף", 44, PURPLE, anchor="rm")
    d.rounded_rectangle([130, 540, 230, 588], radius=24, fill=PURPLE)
    d.ellipse([186, 544, 226, 584], fill=(255,255,255))
    for i, (nm, amt) in enumerate([("מורן", "8,400"), ("נופר", "4,000")]):
        y = 660 + i*120
        d.ellipse([120, y-44, 200, y+36], fill=PURPLE_D)
        text(d, (160, y-4), nm[0], 40, (255,255,255))
        text(d, (W-120, y-4), nm, 42, TEXT, anchor="rm")
        text(d, (W-120, y+50), "שילם ALL "+amt, 34, MUTED, anchor="rm")
    text(d, (W//2, 1030), "כל מטבע · ומי שילם בפועל", 48, TEXT)
    return img

def s_receipt():
    img = base_bg(); d = ImageDraw.Draw(img)
    phone_top(d, rtl("סריקת קבלה"))
    card(d, 230, 320, W-460, 820, r=24, fill=(244, 244, 250))
    text(d, (W//2, 400), "RESTAURANT", 44, (40,40,60), anchor="mm", he=False)
    items = [("Greek salad", "420"), ("Grilled fish", "1,800"), ("Pasta", "1,250"),
             ("House wine", "900"), ("Espresso x4", "560")]
    for i, (nm, pr) in enumerate(items):
        y = 520 + i*110
        text(d, (300, y), nm, 40, (30,30,45), anchor="lm", he=False)
        text(d, (W-300, y), pr, 40, (30,30,45), anchor="rm", he=False)
        if i in (1, 3):
            d.ellipse([W-300-10, y-32, W-300+54, y+32], outline=PURPLE, width=4)
    d.line([300, 1080, W-300, 1080], fill=(180,180,190), width=3)
    text(d, (W//2, 1280), "ה-AI קורא ומחלק לבד", 50, TEXT)
    return img

def s_balances():
    img = base_bg(); d = ImageDraw.Draw(img)
    phone_top(d, rtl("סיכומים"))
    # segmented toggle
    seg = ["לפי מטבע", "מטבע הקבוצה", "המטבע שלי"]
    sx, sy, sw = 70, 270, W-140
    card(d, sx, sy, sw, 90, r=22, fill=CARD2)
    for i, s in enumerate(seg):
        cx = sx + sw*(i+0.5)/3
        if i == 0:
            d.rounded_rectangle([sx+8+i*sw/3, sy+8, sx+8+(i+1)*sw/3-16, sy+82], radius=16, fill=PURPLE)
        text(d, (cx, sy+45), s, 34, (255,255,255) if i==0 else MUTED)
    # debt rows
    rows = [("אבי", "נופר", "€", "100"), ("נופר", "אבי", "$", "25"), ("דניאל", "נופר", "ALL", "3,100")]
    for i, (a, b, cur, amt) in enumerate(rows):
        y = 430 + i*150
        card(d, 70, y, W-140, 120, fill=CARD)
        text(d, (W-120, y+60), a, 42, TEXT, anchor="rm")
        text(d, (W-260, y+60), "←", 42, MUTED, anchor="mm", he=False)
        text(d, (W-340, y+60), b, 42, MUTED, anchor="rm")
        text(d, (200, y+60), cur+" "+amt, 44, YELLOW, anchor="lm", he=False)
    text(d, (W//2, 980), "מאזן אחד · 3 תצוגות", 50, TEXT)
    return img

def s_settle(confetti=False):
    img = base_bg(GREEN if confetti else PURPLE); d = ImageDraw.Draw(img)
    phone_top(d, rtl("סיכומים"))
    card(d, 70, 320, W-140, 120, fill=CARD)
    text(d, (W-120, 380), "אבי", 42, TEXT, anchor="rm")
    text(d, (W-260, 380), "←", 42, MUTED, anchor="mm", he=False)
    text(d, (W-340, 380), "נופר", 42, MUTED, anchor="rm")
    pill_btn(d, 260, 380, 280, rtl("סלק חוב"), fill=GREEN, sz=38)
    # settled divider
    dy = 560
    d.line([90, dy, 430, dy], fill=(255,255,255,40), width=3)
    d.line([W-430, dy, W-90, dy], fill=(255,255,255,40), width=3)
    text(d, (W//2 - 30, dy), "הוצאות מאוזנות", 40, MUTED)
    draw_check(d, W//2 + 150, dy, 22, GREEN)
    card(d, 70, dy+50, W-140, 120, fill=(26, 40, 30))
    text(d, (W-120, dy+110), "ארוחת ערב על המים", 40, TEXT, anchor="rm")
    draw_check(d, 215, dy+110, 28, GREEN)
    if confetti:
        for _ in range(120):
            x, y = random.randint(60, W-60), random.randint(220, 1000)
            c = random.choice([PURPLE, GREEN, YELLOW, CYAN, RED])
            s = random.randint(8, 22)
            d.rectangle([x, y, x+s, y+int(s*0.6)], fill=c+(220,))
        draw_check(d, W//2, 1130, 56, GREEN)
        text(d, (W//2, 1245), "סולק", 72, GREEN)
    else:
        text(d, (W//2, 1180), "סוגרים חשבון בלחיצה", 50, TEXT)
    return img

def s_dashboard():
    img = base_bg(); d = ImageDraw.Draw(img)
    phone_top(d, rtl("דשבורד"))
    cats = [("אוכל", 0.95, YELLOW), ("לינה", 0.78, PURPLE), ("תחבורה", 0.45, CYAN), ("אטרקציות", 0.30, RED)]
    card(d, 70, 300, W-140, 760, fill=CARD)
    text(d, (W-120, 370), "הוצאות לפי קטגוריה", 44, TEXT, anchor="rm")
    for i, (nm, frac, col) in enumerate(cats):
        y = 470 + i*140
        text(d, (W-120, y), nm, 40, TEXT, anchor="rm")
        d.rounded_rectangle([120, y+30, W-120, y+66], radius=18, fill=CARD2)
        d.rounded_rectangle([120, y+30, 120 + (W-240)*frac, y+66], radius=18, fill=col)
    text(d, (W//2, 1180), "התמונה המלאה", 50, TEXT)
    return img

def s_end():
    img = base_bg(PURPLE); d = ImageDraw.Draw(img)
    d.rounded_rectangle([W//2-130, 640, W//2+130, 900], radius=56, fill=PURPLE)
    text(d, (W//2, 770), "M\\S", 130, (255,255,255), anchor="mm", he=False)
    text(d, (W//2, 1010), "MASTER SPLITTER", 72, TEXT, anchor="mm", he=False)
    text(d, (W//2, 1100), "Split smarter.", 50, PURPLE, anchor="mm", he=False)
    for i, b in enumerate(["App Store", "Google Play"]):
        cx = W//2 + (i*2-1)*250
        d.rounded_rectangle([cx-220, 1240, cx+220, 1340], radius=24, fill=CARD2, outline=(255,255,255,40), width=2)
        text(d, (cx, 1290), b, 40, TEXT, anchor="mm", he=False)
    return img

# title/section card for the tutorial
def s_section(num, title_he, sub_he):
    img = base_bg(PURPLE); d = ImageDraw.Draw(img)
    text(d, (W//2, 760), num, 200, PURPLE, anchor="mm", he=False)
    text(d, (W//2, 980), title_he, 70, TEXT)
    text(d, (W//2, 1080), sub_he, 42, MUTED)
    return img

# ----------------------------------------------------------------- compositor
def ken_burns(base_rgba, p, z0=1.02, z1=1.10):
    z = z0 + (z1 - z0) * p
    nw, nh = int(W * z), int(H * z)
    im = base_rgba.resize((nw, nh), Image.LANCZOS)
    x = (nw - W) // 2; y = (nh - H) // 2
    return im.crop((x, y, x + W, y + H)).convert("RGBA")

def with_caption(frame, caption, p, he=True):
    if not caption:
        return frame
    d = ImageDraw.Draw(frame)
    a = int(255 * min(1.0, p / 0.12) * min(1.0, (1 - p) / 0.12 + 0.0 if p > 0.88 else 1.0))
    a = 255 if 0.12 <= p <= 0.88 else int(255 * (p / 0.12 if p < 0.12 else (1 - p) / 0.12))
    bar = Image.new("RGBA", (W, 170), (0, 0, 0, 0)); bd = ImageDraw.Draw(bar)
    bd.rounded_rectangle([60, 20, W-60, 150], radius=30, fill=(12, 10, 30, int(a*0.85)),
                         outline=PURPLE + (int(a*0.6),), width=2)
    bd.text((W//2, 86), rtl(caption) if he else caption, font=font(46), fill=TEXT + (a,), anchor="mm")
    frame.alpha_composite(bar, (0, H - 250))
    return frame

def render(path, scenes, fade=0.4):
    """scenes: list of dict(base=Image, dur=sec, cap=str, z=(z0,z1), he=bool)."""
    writer = imageio.get_writer(path, format="FFMPEG", mode="I", fps=FPS, codec="libx264",
                                macro_block_size=8, quality=8,
                                ffmpeg_params=["-pix_fmt", "yuv420p", "-movflags", "+faststart", "-crf", "20"])
    total = sum(int(s["dur"] * FPS) for s in scenes)
    written = 0
    prev_tail = None
    xfade = int(0.35 * FPS)
    for si, sc in enumerate(scenes):
        n = int(sc["dur"] * FPS)
        z0, z1 = sc.get("z", (1.02, 1.10))
        for i in range(n):
            p = i / max(1, n - 1)
            fr = ken_burns(sc["base"], p, z0, z1)
            fr = with_caption(fr, sc.get("cap"), p, sc.get("he", True))
            # crossfade from previous scene's last frame
            if prev_tail is not None and i < xfade and si > 0:
                a = i / xfade
                fr = Image.blend(prev_tail, fr, a)
            # global fade in / out
            gi = written
            if gi < fade * FPS:
                fr = Image.blend(Image.new("RGBA", (W, H), (0, 0, 0, 255)), fr, gi / (fade * FPS))
            elif gi > total - fade * FPS:
                k = (total - gi) / (fade * FPS)
                fr = Image.blend(Image.new("RGBA", (W, H), (0, 0, 0, 255)), fr, max(0, k))
            writer.append_data(np.asarray(fr.convert("RGB")))
            written += 1
            if i == n - 1:
                prev_tail = fr
    writer.close()
    return written, total


# ----------------------------------------------------------------- PROMO (~50s)
def build_promo():
    scenes = [
        dict(base=s_logo("Split smarter."), dur=4.0, cap="טיול עם חברים. חשבון מסובך.", z=(1.0, 1.06)),
        dict(base=s_problem(),  dur=5.0, cap="מי שילם? מי חייב? באיזה מטבע?"),
        dict(base=s_home(),     dur=6.0, cap="הכל במקום אחד"),
        dict(base=s_add(),      dur=6.5, cap="כל מטבע · כל פיצול · ומי שילם בפועל"),
        dict(base=s_receipt(),  dur=5.0, cap="סורקים קבלה — וה-AI מחלק לבד"),
        dict(base=s_balances(), dur=6.0, cap="מאזן אחד · 3 תצוגות"),
        dict(base=s_settle(True), dur=5.5, cap="סוגרים חשבון בלחיצה אחת"),
        dict(base=s_dashboard(), dur=5.0, cap="ורואים את התמונה המלאה"),
        dict(base=s_end(),      dur=5.0, cap=None, z=(1.0, 1.05)),
    ]
    return render(os.path.join(OUT_DIR, "promo.mp4"), scenes)


# ----------------------------------------------------------------- TUTORIAL (~2:40)
def build_tutorial():
    scenes = [
        dict(base=s_logo("מדריך מלא"), dur=4.0, cap="Master Splitter — מדריך מהיר", z=(1.0, 1.05)),
        dict(base=s_section("1", "יצירת קבוצה", "טיול, דירה, או יציאה"), dur=4.0, cap="שלב 1 — יוצרים קבוצה"),
        dict(base=s_home(), dur=7.0, cap="נותנים שם ומטבע בסיס, ומוסיפים חברים"),
        dict(base=s_section("2", "הוספת הוצאה", "בכל מטבע"), dur=4.0, cap="שלב 2 — מוסיפים הוצאה"),
        dict(base=s_add(), dur=8.0, cap="סכום, מטבע, מי שילם — ותשלום משותף"),
        dict(base=s_section("3", "סריקת קבלה", "חלוקה אוטומטית"), dur=4.0, cap="שלב 3 — סורקים קבלה"),
        dict(base=s_receipt(), dur=7.0, cap="ה-AI קורא את הפריטים, אתם מסמנים מי אכל מה"),
        dict(base=s_section("4", "מאזן", "3 תצוגות"), dur=4.0, cap="שלב 4 — בודקים מאזן"),
        dict(base=s_balances(), dur=8.0, cap="לפי מטבע, מטבע הקבוצה, או המטבע שלך"),
        dict(base=s_section("5", "סילוק חוב", "מלא, חלקי, או חכם"), dur=4.0, cap="שלב 5 — מסלקים"),
        dict(base=s_settle(False), dur=6.0, cap="מסלקים — וההוצאה יורדת מתחת לקו"),
        dict(base=s_settle(True), dur=4.0, cap="הכל סולק"),
        dict(base=s_section("6", "דשבורד", "התמונה המלאה"), dur=4.0, cap="שלב 6 — דשבורד"),
        dict(base=s_dashboard(), dur=7.0, cap="פילוח לפי קטגוריה ולפי חבר"),
        dict(base=s_end(), dur=5.0, cap=None, z=(1.0, 1.05)),
    ]
    return render(os.path.join(OUT_DIR, "tutorial.mp4"), scenes)


if __name__ == "__main__":
    print("Rendering promo.mp4 ...")
    w, t = build_promo();  print(f"  frames={w} (~{w/FPS:.1f}s)")
    print("Rendering tutorial.mp4 ...")
    w, t = build_tutorial(); print(f"  frames={w} (~{w/FPS:.1f}s)")
    print("Done ->", OUT_DIR)
