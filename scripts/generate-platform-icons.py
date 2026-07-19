#!/usr/bin/env python3
"""Generate the platform icon files used by the static FigureLoom site."""

from __future__ import annotations

import binascii
import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BG = (12, 46, 40, 255)
PAPER = (247, 251, 250, 255)
MINT = (121, 214, 195, 255)
MINT_LIGHT = (166, 232, 218, 255)


def blank(size: int) -> bytearray:
    return bytearray(BG * (size * size))


def pixel(buf: bytearray, size: int, x: int, y: int, color: tuple[int, int, int, int]) -> None:
    if 0 <= x < size and 0 <= y < size:
        offset = (y * size + x) * 4
        buf[offset:offset + 4] = bytes(color)


def disc(buf: bytearray, size: int, cx: float, cy: float, radius: float, color: tuple[int, int, int, int]) -> None:
    r = max(1, int(round(radius)))
    rr = radius * radius
    for y in range(int(cy) - r, int(cy) + r + 1):
        for x in range(int(cx) - r, int(cx) + r + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= rr:
                pixel(buf, size, x, y, color)


def thick_line(buf: bytearray, size: int, points: list[tuple[float, float]], width: float, color: tuple[int, int, int, int]) -> None:
    radius = max(0.7, width / 2)
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        steps = max(1, int(max(abs(x1 - x0), abs(y1 - y0)) * 1.8))
        for step in range(steps + 1):
            t = step / steps
            disc(buf, size, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius, color)


def rounded_rect_outline(buf: bytearray, size: int, box: tuple[float, float, float, float], radius: float, width: float, color: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    points: list[tuple[float, float]] = []
    segments = 20
    for cx, cy, start in ((x0 + radius, y0 + radius, 180), (x1 - radius, y0 + radius, 270), (x1 - radius, y1 - radius, 0), (x0 + radius, y1 - radius, 90)):
        for index in range(segments + 1):
            angle = math.radians(start + index * 90 / segments)
            points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    points.append(points[0])
    thick_line(buf, size, points, width, color)


def cubic(p0: tuple[float, float], p1: tuple[float, float], p2: tuple[float, float], p3: tuple[float, float], steps: int = 70) -> list[tuple[float, float]]:
    result = []
    for index in range(steps + 1):
        t = index / steps
        u = 1 - t
        result.append((
            u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
            u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1],
        ))
    return result


def render(size: int) -> bytearray:
    scale = size / 512
    buf = blank(size)
    rounded_rect_outline(buf, size, (108 * scale, 90 * scale, 404 * scale, 420 * scale), 40 * scale, max(1.2, 36 * scale), PAPER)
    curve = cubic((135 * scale, 335 * scale), (190 * scale, 335 * scale), (185 * scale, 190 * scale), (252 * scale, 190 * scale))
    curve += cubic((252 * scale, 190 * scale), (315 * scale, 190 * scale), (315 * scale, 335 * scale), (377 * scale, 335 * scale))[1:]
    thick_line(buf, size, curve, max(1.2, 32 * scale), MINT)
    disc(buf, size, 135 * scale, 335 * scale, max(1, 16 * scale), MINT)
    disc(buf, size, 252 * scale, 190 * scale, max(1, 17 * scale), MINT_LIGHT)
    disc(buf, size, 377 * scale, 335 * scale, max(1, 16 * scale), MINT)
    for y in range(round(125 * scale), round(165 * scale)):
        for x in range(round(333 * scale), round(373 * scale)):
            pixel(buf, size, x, y, PAPER)
    return buf


def png_bytes(size: int) -> bytes:
    raw = render(size)
    scanlines = b''.join(b'\x00' + raw[y * size * 4:(y + 1) * size * 4] for y in range(size))

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', binascii.crc32(kind + data) & 0xFFFFFFFF)

    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(scanlines, 9)) + chunk(b'IEND', b'')


def write_icons() -> None:
    files = {
        'favicon-16x16.png': 16,
        'favicon-32x32.png': 32,
        'figureloom-icon-32-v1.png': 32,
        'apple-touch-icon.png': 180,
        'figureloom-apple-touch-180-v1.png': 180,
        'android-chrome-192x192.png': 192,
        'figureloom-app-192-v1.png': 192,
        'android-chrome-512x512.png': 512,
        'figureloom-app-512-v1.png': 512,
        'mstile-150x150.png': 150,
        'mstile-150x150-v1.png': 150,
        'mstile-310x310.png': 310,
        'mstile-310x310-v1.png': 310,
    }
    for name, size in files.items():
        (ROOT / name).write_bytes(png_bytes(size))

    ico_sizes = (16, 32, 48, 64, 128, 256)
    images = [png_bytes(size) for size in ico_sizes]
    offset = 6 + 16 * len(images)
    entries = []
    for size, data in zip(ico_sizes, images):
        encoded_size = 0 if size == 256 else size
        entries.append(struct.pack('<BBBBHHII', encoded_size, encoded_size, 0, 0, 1, 32, len(data), offset))
        offset += len(data)
    (ROOT / 'favicon.ico').write_bytes(struct.pack('<HHH', 0, 1, len(images)) + b''.join(entries) + b''.join(images))

    browser_config = '''<?xml version="1.0" encoding="utf-8"?>
<browserconfig><msapplication><tile>
<square150x150logo src="/mstile-150x150.png"/>
<square310x310logo src="/mstile-310x310.png"/>
<TileColor>#0c2e28</TileColor>
</tile></msapplication></browserconfig>
'''
    (ROOT / 'browserconfig.xml').write_text(browser_config, encoding='utf-8')


if __name__ == '__main__':
    write_icons()
