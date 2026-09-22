import os
import re
from datetime import datetime

from PIL import Image, ImageDraw, ImageFont

# Palette OddFeed
VIOLET     = (79, 70, 229)
NAVY       = (30, 27, 75)
BLACK      = (17, 24, 39)
GRAY_LIGHT = (229, 231, 235)
GRAY_MID   = (156, 163, 175)
WHITE      = (255, 255, 255)

SIZE    = 1080
PAD     = 72

FONT_BOLD    = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
FONT_REGULAR = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'


def _load(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def _strip_emoji(text: str) -> str:
    pattern = re.compile(
        '[\U0001F600-\U0001F64F'
        '\U0001F300-\U0001F5FF'
        '\U0001F680-\U0001F9FF'
        '\U00002600-\U000027BF'
        '\U0001F1E0-\U0001F1FF'
        '\U00002702-\U000027B0]+',
        flags=re.UNICODE,
    )
    return pattern.sub('', text).strip()


def _wrap(text: str, font: ImageFont.FreeTypeFont,
          max_w: int, draw: ImageDraw.Draw) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ''
    for word in words:
        test = f'{current} {word}'.strip()
        if draw.textlength(test, font=font) <= max_w:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def compose_image(article: dict) -> str:
    img  = Image.new('RGB', (SIZE, SIZE), WHITE)
    draw = ImageDraw.Draw(img)

    f_logo    = _load(FONT_BOLD,    48)
    f_title   = _load(FONT_BOLD,    84)
    f_cat     = _load(FONT_BOLD,    30)
    f_url     = _load(FONT_REGULAR, 26)
    f_footer  = _load(FONT_REGULAR, 26)
    f_hashtag = _load(FONT_BOLD,    26)

    max_w = SIZE - PAD * 2

    # ── Wordmark OddFeed ─────────────────────────────────────────
    y = PAD
    odd_w = int(draw.textlength('Odd', font=f_logo))
    draw.text((PAD, y), 'Odd',  font=f_logo, fill=NAVY)
    draw.text((PAD + odd_w, y), 'Feed', font=f_logo, fill=VIOLET)

    url_w = int(draw.textlength('oddfeed.app', font=f_url))
    draw.text((SIZE - PAD - url_w, y + 10), 'oddfeed.app', font=f_url, fill=GRAY_MID)

    # ── Separatore navy spesso ───────────────────────────────────
    sep_y = y + 68
    draw.rectangle([(PAD, sep_y), (SIZE - PAD, sep_y + 5)], fill=NAVY)

    # ── Categoria ────────────────────────────────────────────────
    cat_raw   = article.get('categoryLabel') or article.get('category', '')
    cat_clean = _strip_emoji(cat_raw).upper()
    cat_y = sep_y + 36
    draw.text((PAD, cat_y), cat_clean, font=f_cat, fill=VIOLET)

    # ── Titolo ───────────────────────────────────────────────────
    title = article.get('titleIt') or article.get('title', '')
    # Sostituisce virgolette tipografiche con escape Unicode-safe
    title = title.replace('“', '"').replace('”', '"')
    title = title.replace('‘', ''').replace('’', ''')

    title_y   = cat_y + 52
    line_h    = 100
    lines     = _wrap(title, f_title, max_w, draw)

    for line in lines[:4]:
        draw.text((PAD, title_y), line, font=f_title, fill=BLACK)
        title_y += line_h

    # ── Separatore footer ────────────────────────────────────────
    bot_sep_y = SIZE - PAD - 52
    draw.rectangle([(PAD, bot_sep_y), (SIZE - PAD, bot_sep_y + 1)], fill=GRAY_LIGHT)

    # ── Footer: fonte · data | #categoria ───────────────────────
    source   = article.get('source', '')
    date_str = article.get('date', '')
    try:
        date_str = datetime.strptime(date_str, '%Y-%m-%d').strftime('%d/%m/%Y')
    except Exception:
        pass

    footer_left = f'{source}  ·  {date_str}'
    draw.text((PAD, bot_sep_y + 18), footer_left, font=f_footer, fill=GRAY_MID)

    hashtag = '#' + _strip_emoji(article.get('category', '')).replace('_', '')
    ht_w = int(draw.textlength(hashtag, font=f_hashtag))
    draw.text((SIZE - PAD - ht_w, bot_sep_y + 16), hashtag, font=f_hashtag, fill=VIOLET)

    # ── Salva ────────────────────────────────────────────────────
    os.makedirs('data', exist_ok=True)
    out = 'data/latest_post.jpg'
    img.save(out, 'JPEG', quality=95)
    print(f'   Immagine generata: {os.path.abspath(out)}')
    return out
