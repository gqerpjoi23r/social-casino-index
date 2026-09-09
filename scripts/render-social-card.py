from PIL import Image, ImageDraw, ImageEnhance, ImageFont

IMAGE_SIZE = (1200, 630)
GOLD = (247, 185, 45)
WHITE = (246, 247, 250)
SUBTLE = (216, 222, 236, 220)


def text_size(font, text):
    box = ImageDraw.Draw(Image.new("RGB", (1, 1))).textbbox(
        (0, 0), text, font=font
    )
    return box[2] - box[0], box[3] - box[1]


def draw_crown(draw, left, center_y):
    band_top = center_y - 22
    band_bottom = center_y + 22
    draw.line((left + 23, center_y + 18, left + 23, center_y - 4), fill=GOLD, width=18)
    draw.line((left + 6, center_y + 10, left + 9, center_y - 24), fill=GOLD, width=20)
    draw.line((left + 40, center_y + 10, left + 37, center_y - 24), fill=GOLD, width=20)
    draw.line((left + 15, center_y + 18, left + 26, center_y - 10), fill=GOLD, width=14)
    draw.line((left + 31, center_y + 18, left + 20, center_y - 10), fill=GOLD, width=14)
    draw.ellipse((left + 11, band_top + 34, left + 17, band_top + 40), fill=GOLD)
    draw.ellipse((left + 29, band_top + 34, left + 35, band_top + 40), fill=GOLD)
    draw.line((left + 46, band_top + 45, left + 46, band_bottom + 45), fill=(247, 185, 45, 210), width=8)


image = Image.open("src/assets/hero-casino.jpg").convert("RGB")
source_ratio = image.width / image.height
target_ratio = IMAGE_SIZE[0] / IMAGE_SIZE[1]
if source_ratio > target_ratio:
    width = int(image.height * target_ratio)
    left = (image.width - width) // 2
    image = image.crop((left, 0, left + width, image.height))
else:
    height = int(image.width / target_ratio)
    top = max(0, int((image.height - height) * 0.38))
    image = image.crop((0, top, image.width, top + height))
image = image.resize(IMAGE_SIZE, Image.Resampling.LANCZOS)
image = ImageEnhance.Brightness(image).enhance(0.78)
image = ImageEnhance.Contrast(image).enhance(1.08)

dark_left = Image.new("L", IMAGE_SIZE, 0)
gradient = ImageDraw.Draw(dark_left)
for x in range(IMAGE_SIZE[0]):
    alpha = max(138, 255 - int(x * 0.13))
    gradient.line((x, 0, x, IMAGE_SIZE[1]), fill=alpha)
dark_layer = Image.new("RGB", IMAGE_SIZE, (10, 14, 22))
image = Image.composite(dark_layer, image, dark_left)

gradient_line = Image.new("L", IMAGE_SIZE, 0)
edge = ImageDraw.Draw(gradient_line)
for y in range(IMAGE_SIZE[1]):
    alpha = max(60, 184 - int(y / IMAGE_SIZE[1] * 124))
    edge.line((0, y, IMAGE_SIZE[0], y), fill=alpha)
edge_layer = Image.new("RGB", IMAGE_SIZE, (10, 14, 22))
image = Image.composite(edge_layer, image, gradient_line)

draw = ImageDraw.Draw(image, "RGBA")
draw.rectangle((0, 0, IMAGE_SIZE[0], 6), fill=(247, 185, 45, 255))
draw.rectangle((0, 6, IMAGE_SIZE[0], 8), fill=(247, 185, 45, 115))

serif = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
regular = "/System/Library/Fonts/Supplemental/Georgia.ttf"
brand_font = ImageFont.truetype(serif, 67)
sans_regular = "/System/Library/Fonts/Supplemental/Arial.ttf"
sans_bold = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
brand = "Social Casino Index"
brand_width = text_size(brand_font, brand)[0]
brand_x = 86
brand_baseline_y = 196
draw_crown(draw, brand_x - 73, brand_baseline_y - 26)
draw.text((brand_x, brand_baseline_y - 51), brand, font=brand_font, fill=WHITE)
draw.rounded_rectangle((86, 236, 322, 240), 2, fill=(247, 185, 45, 235))

headline_font = ImageFont.truetype(serif, 60)
headline = "Independent research on U.S. sweepstakes casinos."
draw.text((86, 280), headline, font=headline_font, fill=WHITE)

detail_font = ImageFont.truetype(sans_regular, 31)
draw.text(
    (86, 375),
    "Dated, source-linked records, structured data and downloads",
    font=detail_font,
    fill=SUBTLE,
)
draw.text(
    (86, 424),
    "so players and AI search engines can read the same facts.",
    font=detail_font,
    fill=SUBTLE,
)

tag_font = ImageFont.truetype(sans_bold, 20)
draw.text((88, 548), "SOCIALCASINOINDEX.COM", font=tag_font, fill=GOLD)
import sys
output = sys.argv[1] if len(sys.argv) > 1 else "src/assets/social-card.jpg"
image.save(output, "JPEG", quality=90, optimize=True, subsampling=0)
