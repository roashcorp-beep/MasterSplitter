# -*- coding: utf-8 -*-
"""
Master Splitter — promo + tutorial video renderer (English, device-framed).
============================================================================
Renders two real H.264 MP4s as polished motion-graphics: each app screen is drawn
app-accurately and composited inside an iPhone device frame on a branded backdrop,
with gentle motion and clean English captions. Pure Python (Pillow + imageio/ffmpeg).

    Static/videos/promo.mp4      (~45s, 9:16)
    Static/videos/tutorial.mp4   (~95s, 9:16)

Run:  python marketing/make_videos.py
"""
import os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio

random.seed(11)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "Static", "videos")
os.makedirs(OUT, exist_ok=True)

W, H, FPS = 1080, 1920, 30

# Brand
BG0, BG1 = (8, 7, 24), (20, 15, 46)
PUR, PURD, PURL = (168, 85, 247), (124, 58, 175), (196, 140, 255)
GRN, RED, YEL, CYAN = (46, 204, 113), (239, 83, 80), (245, 197, 66), (56, 189, 248)
TEXT, MUTE, FAINT = (240, 241, 248), (150, 156, 180), (104, 110, 136)
CARD, CARD2, LINE = (28, 26, 56), (36, 33, 70), (255, 255, 255)

SUI = "C:/Windows/Fonts/segoeui.ttf"
SUIB = "C:/Windows/Fonts/segoeuib.ttf"
SUISB = "C:/Windows/Fonts/seguisb.ttf"
EMO = "C:/Windows/Fonts/seguiemj.ttf"
_fc = {}
def font(sz, w="b"):
    key = (sz, w)
    if key not in _fc:
        path = {"b": SUIB, "sb": SUISB, "r": SUI}[w]
        _fc[key] = ImageFont.truetype(path, sz)
    return _fc[key]

def text(d, xy, s, sz, color, w="b", anchor="lm"):
    d.text(xy, s, font=font(sz, w), fill=color, anchor=anchor)

def emoji(d, xy, ch, sz, anchor="mm"):
    try:
        d.text(xy, ch, font=ImageFont.truetype(EMO, sz), anchor=anchor, embedded_color=True)
    except Exception:
        pass

def rrect(d, box, r, **kw):
    d.rounded_rectangle(box, radius=r, **kw)

# ---------------- backdrop ----------------
def _vgrad(top, bot):
    a = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        t = y / (H - 1)
        a[y, :] = [int(top[i] + (bot[i] - top[i]) * t) for i in range(3)]
    return Image.fromarray(a, "RGB")

_PARTICLES = Image.new("RGBA", (W, H), (0, 0, 0, 0))
_pd = ImageDraw.Draw(_PARTICLES)
for _ in range(70):
    x, y = random.randint(0, W), random.randint(0, H)
    r = random.choice([1, 1, 2, 3])
    _pd.ellipse([x - r, y - r, x + r, y + r], fill=(180, 170, 240, random.randint(18, 70)))

def backdrop(glow=PUR):
    img = _vgrad(BG0, BG1).convert("RGBA")
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    gd.ellipse([W // 2 - 620, -360, W // 2 + 620, 620], fill=glow + (70,))
    gd.ellipse([W // 2 - 300, H - 520, W // 2 + 300, H + 200], fill=PURD + (45,))
    img.alpha_composite(g.filter(ImageFilter.GaussianBlur(150)))
    img.alpha_composite(_PARTICLES)
    return img

# ---------------- device frame ----------------
PW, PH = 736, 1512
PX, PY = (W - PW) // 2, (H - PH) // 2 + 20
BEZEL = 16
SX, SY = PX + BEZEL, PY + BEZEL
SW, SH = PW - 2 * BEZEL, PH - 2 * BEZEL   # app screen size

def phone(app_img, glow=PUR):
    """Composite an app-screen image (SW x SH) into the device frame on the backdrop."""
    base = backdrop(glow)
    # soft drop shadow
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([PX, PY + 26, PX + PW, PY + PH + 26], radius=96, fill=(0, 0, 0, 150))
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(46)))
    # phone body
    body = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(body)
    bd.rounded_rectangle([PX, PY, PX + PW, PY + PH], radius=96, fill=(12, 12, 24, 255),
                         outline=(70, 66, 104, 255), width=3)
    base.alpha_composite(body)
    # screen (rounded-masked app image)
    scr = app_img.convert("RGBA").resize((SW, SH))
    mask = Image.new("L", (SW, SH), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, SW, SH], radius=78, fill=255)
    base.paste(scr, (SX, SY), mask)
    # dynamic island + status bar
    isl = ImageDraw.Draw(base)
    rrect(isl, [W // 2 - 58, SY + 20, W // 2 + 58, SY + 56], 18, fill=(0, 0, 0, 255))
    text(isl, (SX + 34, SY + 40), "9:41", 26, TEXT, "sb", "lm")
    isl.ellipse([SX + SW - 60, SY + 31, SX + SW - 46, SY + 45], fill=TEXT)
    rrect(isl, [SX + SW - 38, SY + 30, SX + SW - 30, SY + 46], 3, fill=GRN)
    return base

def screen_canvas(bg=(14, 13, 34)):
    """Blank app-screen image with the app's dark background."""
    img = Image.new("RGBA", (SW, SH), bg + (255,))
    g = Image.new("RGBA", (SW, SH), (0, 0, 0, 0))
    ImageDraw.Draw(g).ellipse([-120, -200, SW + 120, 360], fill=PURD + (60,))
    img.alpha_composite(g.filter(ImageFilter.GaussianBlur(90)))
    return img

# in-screen helpers (coords are screen-local)
def card(d, x, y, w, h, r=26, fill=CARD, border=True):
    rrect(d, [x, y, x + w, y + h], r, fill=fill,
          outline=(255, 255, 255, 26) if border else None, width=2 if border else 0)

def avatar(d, cx, cy, r, ch, col=PURD):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    text(d, (cx, cy), ch, int(r * 1.1), (255, 255, 255), "b", "mm")

def chip(d, cx, cy, label, col):
    w = font(26, "sb").getlength(label) + 36
    rrect(d, [cx - w / 2, cy - 22, cx + w / 2, cy + 22], 22, fill=col + (46,), outline=col + (160,), width=2)
    text(d, (cx, cy), label, 26, col, "sb", "mm")

def check(d, cx, cy, r, col=GRN):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    d.line([(cx - r * .42, cy + r * .04), (cx - r * .08, cy + r * .40), (cx + r * .46, cy - r * .34)],
           fill=(255, 255, 255), width=max(3, int(r * .2)), joint="curve")

def topbar(d, title, emo=None):
    text(d, (SW // 2, 130), title, 40, TEXT, "b", "mm")
    if emo:
        emoji(d, (SW // 2 - font(40).getlength(title) // 2 - 34, 130), emo, 40)
    # hamburger
    for i in range(3):
        d.rounded_rectangle([46, 116 + i * 11, 84, 120 + i * 11], radius=2, fill=MUTE)

def bottomnav(d, active=0):
    y = SH - 78
    rrect(d, [0, SH - 116, SW, SH], 0, fill=(18, 17, 40, 255))
    d.line([0, SH - 116, SW, SH - 116], fill=(255, 255, 255, 16), width=2)
    icons = ["🏠", "📊", "", "⚖️", "👤"]
    n = len(icons)
    for i, ic in enumerate(icons):
        cx = int(SW * (i + .5) / n)
        if i == 2:
            d.ellipse([cx - 34, y - 34, cx + 34, y + 34], fill=PUR)
            text(d, (cx, y - 2), "+", 48, (255, 255, 255), "b", "mm")
        else:
            emoji(d, (cx, y), ic, 38)

# ================= APP SCREENS (English) =================
def scr_home():
    img = screen_canvas(); d = ImageDraw.Draw(img)
    topbar(d, "Bali Trip 2026", "🌴")
    # owed/owing summary
    card(d, 40, 188, SW - 80, 150)
    text(d, (SW - 70, 232), "You're owed", 28, MUTE, "sb", "rm")
    text(d, (SW - 70, 286), "$600", 52, GRN, "b", "rm")
    text(d, (70, 232), "You owe", 28, MUTE, "sb", "lm")
    text(d, (70, 286), "$0", 52, TEXT, "b", "lm")
    # two stats
    for i, (lbl, val) in enumerate([("Your spend", "$1,180"), ("Group spend", "$4,360")]):
        bw = (SW - 80 - 20) / 2
        x = 40 + i * (bw + 20)
        card(d, x, 360, bw, 150, fill=CARD2)
        text(d, (x + bw / 2, 404), lbl, 26, MUTE, "sb", "mm")
        text(d, (x + bw / 2, 456), val, 42, TEXT, "b", "mm")
    # latest expense
    text(d, (SW - 70, 566), "Latest expense", 26, MUTE, "sb", "rm")
    card(d, 40, 600, SW - 80, 168)
    avatar(d, 104, 684, 42, "A")
    text(d, (SW - 70, 654), "Beach dinner", 36, TEXT, "b", "rm")
    text(d, (SW - 70, 702), "Alex · Food", 26, MUTE, "sb", "rm")
    text(d, (SW - 70, 744), "$700", 34, YEL, "b", "rm")
    # stats button
    rrect(d, [40, 812, SW - 40, 894], 26, fill=PUR + (38,), outline=PUR + (150,), width=2)
    text(d, (SW // 2, 853), "View statistics", 34, TEXT, "b", "mm")
    bottomnav(d, 0)
    return img

def scr_add():
    img = screen_canvas(); d = ImageDraw.Draw(img)
    topbar(d, "New expense")
    text(d, (SW - 70, 210), "Amount", 26, MUTE, "sb", "rm")
    card(d, 40, 236, SW - 80, 120, fill=CARD2)
    text(d, (76, 296), "$700", 56, TEXT, "b", "lm")
    chip(d, SW - 130, 296, "USD", PUR)
    text(d, (SW - 70, 410), "Who paid?", 26, MUTE, "sb", "rm")
    for i, (nm, sel) in enumerate([("Alex", True), ("Maya", False), ("Sam", False), ("You", False)]):
        col = i % 2; row = i // 2
        bw = (SW - 80 - 18) / 2
        x = 40 + col * (bw + 18); y = 444 + row * 96
        rrect(d, [x, y, x + bw, y + 78], 20, fill=CARD2,
              outline=PUR + (255,) if sel else (255, 255, 255, 26), width=3 if sel else 2)
        avatar(d, x + 44, y + 39, 26, nm[0])
        text(d, (x + 84, y + 39), nm, 30, TEXT, "sb", "lm")
    text(d, (SW - 70, 660), "Split between", 26, MUTE, "sb", "rm")
    for i, nm in enumerate(["Alex", "Maya", "Sam", "You"]):
        bw = (SW - 80 - 18) / 2
        x = 40 + (i % 2) * (bw + 18); y = 694 + (i // 2) * 90
        rrect(d, [x, y, x + bw, y + 72], 20, fill=(24, 44, 30, 255), outline=GRN + (150,), width=2)
        check(d, x + 40, y + 36, 18)
        text(d, (x + 76, y + 36), nm, 28, TEXT, "sb", "lm")
    rrect(d, [40, SH - 224, SW - 40, SH - 150], 24, fill=PUR)
    text(d, (SW // 2, SH - 187), "Add expense", 34, (255, 255, 255), "b", "mm")
    return img

def scr_scan():
    img = screen_canvas(); d = ImageDraw.Draw(img)
    topbar(d, "Scan receipt")
    card(d, 150, 220, SW - 300, 880, r=20, fill=(246, 246, 251))
    text(d, (SW // 2, 300), "BEACH BAR", 40, (34, 34, 52), "b", "mm")
    text(d, (SW // 2, 344), "Bali · Table 7", 24, (120, 120, 140), "sb", "mm")
    items = [("Grilled snapper", "210"), ("Nasi goreng", "95"), ("Mango sticky rice", "70"),
             ("Cocktails x4", "180"), ("Sparkling water", "45"), ("Service 10%", "100")]
    for i, (nm, pr) in enumerate(items):
        y = 430 + i * 92
        text(d, (220, y), nm, 30, (40, 40, 58), "sb", "lm")
        text(d, (SW - 220, y), pr, 30, (40, 40, 58), "b", "rm")
        if i in (0, 3):
            d.rounded_rectangle([SW - 220 - 64, y - 26, SW - 156, y + 26], radius=12, outline=PUR, width=4)
    d.line([220, 1000, SW - 220, 1000], fill=(200, 200, 210), width=3)
    text(d, (SW // 2, 1044), "$700", 44, (34, 34, 52), "b", "mm")
    # AI badge
    rrect(d, [SW // 2 - 150, 1150, SW // 2 + 150, 1224], 24, fill=PUR + (40,), outline=PUR + (170,), width=2)
    text(d, (SW // 2, 1187), "✨ AI splits it", 32, PURL, "b", "mm")
    bottomnav(d)
    return img

def scr_balances():
    img = screen_canvas(); d = ImageDraw.Draw(img)
    topbar(d, "Balances")
    tabs = ["By currency", "Group", "Mine"]
    card(d, 40, 188, SW - 80, 80, r=20, fill=CARD2)
    seg = (SW - 96) / 3
    for i, t in enumerate(tabs):
        cx = 48 + seg * (i + .5)
        if i == 0:
            rrect(d, [48 + i * seg, 196, 48 + (i + 1) * seg - 8, 260], 16, fill=PUR)
        text(d, (cx, 228), t, 28, (255, 255, 255) if i == 0 else MUTE, "sb", "mm")
    rows = [("Alex", "you", "$", "100"), ("Maya", "you", "€", "80"), ("you", "Sam", "$", "45")]
    for i, (a, b, cur, amt) in enumerate(rows):
        y = 300 + i * 132
        card(d, 40, y, SW - 80, 108)
        avatar(d, 96, y + 54, 32, a[0].upper())
        text(d, (150, y + 54), f"{a}", 30, TEXT, "sb", "lm")
        text(d, (SW // 2, y + 54), "→", 30, MUTE, "b", "mm")
        text(d, (SW // 2 + 70, y + 54), b, 28, MUTE, "sb", "lm")
        text(d, (SW - 70, y + 54), f"{cur}{amt}", 36, GRN if b == "you" else YEL, "b", "rm")
    text(d, (SW // 2, 760), "One balance · three views", 30, MUTE, "sb", "mm")
    bottomnav(d, 3)
    return img

def scr_settle(confetti=True):
    img = screen_canvas(); d = ImageDraw.Draw(img)
    topbar(d, "Balances")
    card(d, 40, 200, SW - 80, 108)
    avatar(d, 96, 254, 32, "A")
    text(d, (150, 254), "Alex → you", 30, TEXT, "sb", "lm")
    rrect(d, [SW - 226, 224, SW - 40, 284], 30, fill=GRN)
    text(d, ((SW - 226 + SW - 40) / 2, 254), "Settle up", 28, (255, 255, 255), "b", "mm")
    if confetti:
        for _ in range(150):
            x, y = random.randint(40, SW - 40), random.randint(360, 1080)
            c = random.choice([PUR, GRN, YEL, CYAN, RED]); s = random.randint(8, 22)
            d.rectangle([x, y, x + s, y + int(s * .6)], fill=c + (235,))
        check(d, SW // 2, 740, 70)
        text(d, (SW // 2, 880), "Settled!", 60, GRN, "b", "mm")
    else:
        d.line([90, 420, SW - 90, 420], fill=(255, 255, 255, 30), width=2)
        text(d, (SW // 2, 420), "Settled expenses", 28, MUTE, "sb", "mm")
        card(d, 40, 470, SW - 80, 100, fill=(24, 40, 30))
        check(d, 96, 520, 26)
        text(d, (150, 520), "Beach dinner", 30, TEXT, "sb", "lm")
        text(d, (SW // 2, 760), "One tap to settle", 30, MUTE, "sb", "mm")
    bottomnav(d, 3)
    return img

def scr_stats():
    img = screen_canvas(); d = ImageDraw.Draw(img)
    topbar(d, "Statistics")
    # insights
    ins = [("🏆", "Top category", "Food · 48%"), ("🔝", "Biggest expense", "Beach dinner · $700")]
    for i, (e, lbl, val) in enumerate(ins):
        y = 196 + i * 100
        card(d, 40, y, SW - 80, 84)
        emoji(d, (92, y + 42), e, 38)
        text(d, (146, y + 30), lbl, 24, MUTE, "sb", "lm")
        text(d, (146, y + 58), val, 28, TEXT, "b", "lm")
    # donut
    cx, cy, R = SW // 2, 560, 120
    segs = [(.48, YEL), (.27, PUR), (.15, CYAN), (.10, RED)]
    start = -90
    for frac, col in segs:
        end = start + frac * 360
        d.arc([cx - R, cy - R, cx + R, cy + R], start, end, fill=col, width=46)
        start = end
    text(d, (cx, cy - 14), "$4,360", 44, TEXT, "b", "mm")
    text(d, (cx, cy + 30), "Total", 26, MUTE, "sb", "mm")
    # category bars
    cats = [("Food", .48, YEL), ("Lodging", .27, PUR), ("Transport", .15, CYAN), ("Fun", .10, RED)]
    for i, (nm, f, col) in enumerate(cats):
        y = 760 + i * 96
        text(d, (SW - 70, y), nm, 28, TEXT, "sb", "rm")
        rrect(d, [70, y + 22, SW - 70, y + 54], 16, fill=CARD2)
        rrect(d, [70, y + 22, 70 + (SW - 140) * f, y + 54], 16, fill=col)
    bottomnav(d, 1)
    return img

# ================= scene assembly =================
def title_card(sub):
    img = backdrop(PUR); d = ImageDraw.Draw(img)
    rrect(d, [W // 2 - 130, 700, W // 2 + 130, 960], 58, fill=PUR)
    text(d, (W // 2, 830), "M\\S", 120, (255, 255, 255), "b", "mm")
    text(d, (W // 2, 1070), "MASTER SPLITTER", 72, TEXT, "b", "mm")
    text(d, (W // 2, 1156), sub, 40, PURL, "sb", "mm")
    return img

def end_card():
    img = backdrop(PUR); d = ImageDraw.Draw(img)
    rrect(d, [W // 2 - 120, 660, W // 2 + 120, 900], 54, fill=PUR)
    text(d, (W // 2, 780), "M\\S", 110, (255, 255, 255), "b", "mm")
    text(d, (W // 2, 1000), "Split smarter.", 64, TEXT, "b", "mm")
    text(d, (W // 2, 1078), "Any currency · any group", 34, MUTE, "sb", "mm")
    for i, b in enumerate(["App Store", "Google Play"]):
        cx = W // 2 + (i * 2 - 1) * 250
        rrect(d, [cx - 220, 1210, cx + 220, 1310], 24, fill=CARD2 + (255,), outline=(255, 255, 255, 40), width=2)
        text(d, (cx, 1260), b, 38, TEXT, "b", "mm")
    return img

def problem_card():
    img = backdrop(); d = ImageDraw.Draw(img)
    syms = [("$", 300, 720), ("€", 780, 660), ("£", 320, 1180), ("¥", 800, 1240), ("Rp", 540, 950)]
    for s, x, y in syms:
        rrect(d, [x - 92, y - 92, x + 92, y + 92], 28, fill=CARD2 + (255,), outline=PUR + (120,), width=3)
        text(d, (x, y), s, 64, PUR, "b", "mm")
    text(d, (W // 2, 1480), "Who paid? Who owes? Which currency?", 46, TEXT, "b", "mm")
    return img

def kb(base, p, z0=1.0, z1=1.05, floaty=14):
    z = z0 + (z1 - z0) * p
    nw, nh = int(W * z), int(H * z)
    im = base.resize((nw, nh), Image.LANCZOS)
    x = (nw - W) // 2
    y = (nh - H) // 2 + int(math.sin(p * math.pi) * floaty)
    return im.crop((x, y, x + W, y + H)).convert("RGBA")

def caption(frame, cap, p):
    if not cap:
        return frame
    a = 255 if 0.1 <= p <= 0.9 else int(255 * (p / 0.1 if p < 0.1 else (1 - p) / 0.1))
    bar = Image.new("RGBA", (W, 180), (0, 0, 0, 0)); bd = ImageDraw.Draw(bar)
    tw = font(48).getlength(cap)
    bw = min(W - 80, tw + 90)
    bd.rounded_rectangle([(W - bw) / 2, 30, (W + bw) / 2, 156], 34,
                         fill=(10, 9, 26, int(a * .82)), outline=PUR + (int(a * .55),), width=2)
    bd.text((W // 2, 93), cap, font=font(48), fill=TEXT + (a,), anchor="mm")
    frame.alpha_composite(bar, (0, H - 250))
    return frame

def render(path, scenes, fade=0.5):
    wr = imageio.get_writer(path, format="FFMPEG", mode="I", fps=FPS, codec="libx264",
                            macro_block_size=8, quality=9,
                            ffmpeg_params=["-pix_fmt", "yuv420p", "-movflags", "+faststart", "-crf", "19"])
    total = sum(int(s["dur"] * FPS) for s in scenes)
    written, prev = 0, None
    xf = int(0.4 * FPS)
    for si, sc in enumerate(scenes):
        n = int(sc["dur"] * FPS)
        z0, z1 = sc.get("z", (1.0, 1.05))
        for i in range(n):
            p = i / max(1, n - 1)
            fr = kb(sc["base"], p, z0, z1, sc.get("float", 14))
            fr = caption(fr, sc.get("cap"), p)
            if prev is not None and i < xf and si > 0:
                fr = Image.blend(prev, fr, i / xf)
            g = written
            if g < fade * FPS:
                fr = Image.blend(Image.new("RGBA", (W, H), (0, 0, 0, 255)), fr, g / (fade * FPS))
            elif g > total - fade * FPS:
                fr = Image.blend(Image.new("RGBA", (W, H), (0, 0, 0, 255)), fr, max(0, (total - g) / (fade * FPS)))
            wr.append_data(np.asarray(fr.convert("RGB")))
            written += 1
            if i == n - 1:
                prev = fr
    wr.close()
    return written


def build_promo():
    home, add, scan, bal, settle, stats = scr_home(), scr_add(), scr_scan(), scr_balances(), scr_settle(True), scr_stats()
    S = [
        dict(base=title_card("Split smarter."), dur=3.5, cap="Trips with friends. Messy bills.", z=(1.0, 1.05), float=8),
        dict(base=problem_card(), dur=4.0, cap="Who paid? Who owes? Which currency?", float=10),
        dict(base=phone(home), dur=5.0, cap="Everything in one place"),
        dict(base=phone(add), dur=5.5, cap="Add an expense — in any currency"),
        dict(base=phone(scan), dur=4.5, cap="Scan a receipt — AI splits it for you"),
        dict(base=phone(bal), dur=5.0, cap="One balance, three views — no conversion"),
        dict(base=phone(settle, glow=GRN), dur=4.5, cap="Settle up in one tap"),
        dict(base=phone(stats), dur=4.5, cap="See the full picture"),
        dict(base=end_card(), dur=4.0, cap=None, z=(1.0, 1.04), float=6),
    ]
    return render(os.path.join(OUT, "promo.mp4"), S)


def section(num, title, sub):
    img = backdrop(PUR); d = ImageDraw.Draw(img)
    text(d, (W // 2, 760), num, 200, PUR, "b", "mm")
    text(d, (W // 2, 980), title, 66, TEXT, "b", "mm")
    text(d, (W // 2, 1066), sub, 38, MUTE, "sb", "mm")
    return img

def build_tutorial():
    home, add, scan, bal, stats = scr_home(), scr_add(), scr_scan(), scr_balances(), scr_stats()
    settle_a, settle_b = scr_settle(False), scr_settle(True)
    S = [
        dict(base=title_card("Quick start guide"), dur=3.5, cap="Master Splitter — how it works", z=(1.0, 1.04), float=8),
        dict(base=section("1", "Create a group", "A trip, a flat, a night out"), dur=3.5, cap="Step 1 — create a group", float=8),
        dict(base=phone(home), dur=7.0, cap="Name it, pick a base currency, add friends"),
        dict(base=section("2", "Add an expense", "In any currency"), dur=3.5, cap="Step 2 — add an expense", float=8),
        dict(base=phone(add), dur=7.5, cap="Amount, currency, who paid, and the split"),
        dict(base=section("3", "Scan a receipt", "AI does the math"), dur=3.5, cap="Step 3 — scan a receipt", float=8),
        dict(base=phone(scan), dur=6.5, cap="AI reads the items — tap who had what"),
        dict(base=section("4", "Check balances", "Three views"), dur=3.5, cap="Step 4 — check balances", float=8),
        dict(base=phone(bal), dur=7.0, cap="By currency, by group, or in your currency"),
        dict(base=section("5", "Settle up", "Full, partial, or smart"), dur=3.5, cap="Step 5 — settle up", float=8),
        dict(base=phone(settle_a), dur=5.0, cap="Settle and the expense drops below the line"),
        dict(base=phone(settle_b, glow=GRN), dur=3.5, cap="Done!"),
        dict(base=section("6", "Statistics", "The full picture"), dur=3.5, cap="Step 6 — statistics", float=8),
        dict(base=phone(stats), dur=7.0, cap="Categories, insights, and per-member balances"),
        dict(base=end_card(), dur=4.0, cap=None, z=(1.0, 1.04), float=6),
    ]
    return render(os.path.join(OUT, "tutorial.mp4"), S)


if __name__ == "__main__":
    print("Rendering promo.mp4 ...")
    print("  frames:", build_promo())
    print("Rendering tutorial.mp4 ...")
    print("  frames:", build_tutorial())
    print("Done ->", OUT)
