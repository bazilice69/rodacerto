#!/usr/bin/env python3
"""Gera icon-192.png e icon-512.png sem dependências externas.
Ícone moderno: quadrado arredondado em degradê verde-petróleo com a
silhueta de um carro (sedan) branco visto de lado, com capô e para-brisa
inclinados para parecer um carro de verdade (não um vagão)."""
import struct, zlib

TOP = (23, 195, 178)     # #17c3b2
BOT = (13, 148, 136)     # #0d9488
WHITE = (255, 255, 255)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i]-a[i])*t) for i in range(3))

def make_png(size, path):
    px = [[(10,15,28) for _ in range(size)] for _ in range(size)]
    alpha = [[0]*size for _ in range(size)]
    r = int(size*0.22)

    def inside_rounded(x, y):
        if x < r and y < r: return (x-r)**2 + (y-r)**2 <= r*r
        if x > size-r and y < r: return (x-(size-r))**2 + (y-r)**2 <= r*r
        if x < r and y > size-r: return (x-r)**2 + (y-(size-r))**2 <= r*r
        if x > size-r and y > size-r: return (x-(size-r))**2 + (y-(size-r))**2 <= r*r
        return True

    for y in range(size):
        t = y/size
        base = lerp(TOP, BOT, t)
        for x in range(size):
            if inside_rounded(x, y):
                px[y][x] = base
                alpha[y][x] = 255

    s = size/48.0
    def u(n): return n*s

    def put(x, y, color):
        xi, yi = int(x), int(y)
        if 0 <= xi < size and 0 <= yi < size:
            px[yi][xi] = color

    def bg_at(y):
        return lerp(TOP, BOT, y/size)

    # Polígono da carroceria do carro (silhueta de sedan, vista lateral).
    # Pontos em unidades de 0..48, desenhados com varredura (scanline fill).
    body = [
        (8, 30),    # traseira baixa
        (8, 26),    # para-lama traseiro
        (13, 26),
        (16, 19),   # sobe para o teto (coluna traseira inclinada)
        (30, 19),   # teto
        (34, 26),   # desce capô dianteiro inclinado
        (40, 27),   # bico dianteiro
        (40, 30),   # frente baixa
    ]

    def fill_poly(poly, color_fn):
        ys = [p[1] for p in poly]
        ymin, ymax = int(u(min(ys))), int(u(max(ys)))
        for y in range(ymin, ymax+1):
            yU = y/s
            xs = []
            n = len(poly)
            for i in range(n):
                x1,y1 = poly[i]; x2,y2 = poly[(i+1)%n]
                if (y1 <= yU < y2) or (y2 <= yU < y1):
                    xi = x1 + (x2-x1)*(yU-y1)/(y2-y1)
                    xs.append(xi)
            xs.sort()
            for k in range(0, len(xs)-1, 2):
                for x in range(int(u(xs[k])), int(u(xs[k+1]))+1):
                    put(x, y, color_fn(y))

    # corpo branco
    fill_poly(body, lambda y: WHITE)

    # janelas (recorte com cor de fundo) - dois vidros
    glass1 = [(17,20),(22.5,20),(22.5,25),(15,25)]
    glass2 = [(24,20),(29.5,20),(32.5,25),(24,25)]
    fill_poly(glass1, lambda y: bg_at(y))
    fill_poly(glass2, lambda y: bg_at(y))

    # rodas (pneu branco + miolo degradê)
    def disc(cx, cy, rad, color_fn):
        for y in range(int(cy-rad), int(cy+rad+1)):
            for x in range(int(cx-rad), int(cx+rad+1)):
                if (x-cx)**2+(y-cy)**2 <= rad*rad:
                    put(x, y, color_fn(y))
    for cx in (u(16), u(33)):
        cy = u(31)
        disc(cx, cy, u(4.2), lambda y: WHITE)
        disc(cx, cy, u(2.1), lambda y: bg_at(y))

    # monta PNG RGBA
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            r_,g_,b_ = px[y][x]
            raw += bytes((r_,g_,b_,alpha[y][x]))

    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        c += struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff)
        return c

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    out = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(out)
    print("gerado", path, size, "x", size)

make_png(192, "icon-192.png")
make_png(512, "icon-512.png")
