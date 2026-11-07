"""Genera los íconos de la app (hoja rayada con margen rojo y un tilde de birome).

Uso:  python scripts/generate-icons.py      (requiere Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw

HOJA, RENGLON, MARGEN, BOLI = '#fbfbf9', '#c9dcef', '#d1303e', '#2a3fd6'
SS = 4  # supersampling para suavizar los bordes
OUT = Path(__file__).resolve().parent.parent / 'icons'


def make_icon(size, check_scale=1.0):
    s = size * SS
    img = Image.new('RGB', (s, s), HOJA)
    draw = ImageDraw.Draw(img)
    unit = s / 512

    # renglones y margen
    for i in range(1, 8):
        y = i * 64 * unit
        draw.line([(0, y), (s, y)], fill=RENGLON, width=round(4 * unit))
    draw.line([(112 * unit, 0), (112 * unit, s)], fill=MARGEN, width=round(7 * unit))

    # tilde, escalado desde el centro para respetar la zona segura de los íconos "maskable"
    def pt(x, y):
        c = 256
        return ((c + (x - c) * check_scale) * unit, (c + (y - c) * check_scale) * unit)

    points = [pt(170, 270), pt(236, 336), pt(372, 168)]
    width = round(46 * unit * check_scale)
    draw.line(points, fill=BOLI, width=width, joint='curve')
    for x, y in (points[0], points[-1]):
        r = width / 2
        draw.ellipse([x - r, y - r, x + r, y + r], fill=BOLI)

    return img.resize((size, size), Image.LANCZOS)


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    make_icon(192).save(OUT / 'icon-192.png', optimize=True)
    make_icon(512).save(OUT / 'icon-512.png', optimize=True)
    make_icon(512, check_scale=0.78).save(OUT / 'icon-maskable-512.png', optimize=True)
    print('Íconos generados en', OUT)
