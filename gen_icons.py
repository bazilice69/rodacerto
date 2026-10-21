#!/usr/bin/env python3
"""Gera icon-192.png e icon-512.png sem dependências externas.
Fundo verde-petróleo (tema do app) com um emoji simples desenhado (carro estilizado em pixels)."""
import struct, zlib

BG = (15, 118, 110)      # #0f766e verde-petróleo
FG = (255, 255, 255)     # branco

def make_png(size, path):
    # grade de pixels RGB
    px = [[BG for _ in range(size)] for _ in range(size)]

    def rect(x0, y0, x1, y1, color):
        for y in range(max(0,y0), min(size,y1)):
            for x in range(max(0,x0), min(size,x1)):
                px[y][x] = color

    s = size / 16.0  # unidade
    def u(n): return int(n * s)

    # Corpo do carro (retângulo arredondado simplificado)
    rect(u(3), u(7), u(13), u(10), FG)       # corpo
    rect(u(5), u(5), u(11), u(7), FG)        # cabine/teto
    # Rodas (quadrados "escuros" = cor de fundo recortada dentro de brancos)
    rect(u(4), u(10), u(6), u(12), FG)
    rect(u(10), u(10), u(12), u(12), FG)
    # centro das rodas (buraco verde)
    rect(u(4)+u(0.4), u(10)+u(0.4), u(6)-u(0.4), u(12)-u(0.4), BG)
    rect(u(10)+u(0.4), u(10)+u(0.4), u(12)-u(0.4), u(12)-u(0.4), BG)
    # janela (recorte verde na cabine)
    rect(u(5)+u(0.5), u(5)+u(0.5), u(11)-u(0.5), u(7)-u(0.3), BG)

    # monta bytes raw com filtro 0 por linha
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            r,g,b = px[y][x]
            raw += bytes((r,g,b))

    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        c += struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff)
        return c

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    idat = zlib.compress(bytes(raw), 9)
    out = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(out)
    print("gerado", path, size, "x", size)

make_png(192, "icon-192.png")
make_png(512, "icon-512.png")
