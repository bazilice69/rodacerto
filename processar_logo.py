#!/usr/bin/env python3
"""Processa os logos do RodaCerto SEM dependências externas (zlib + struct):
1) Remove o fundo branco das imagens (vira transparente).
2) Gera o logo horizontal com fundo transparente (p/ o topo do app).
3) Gera o ícone do app (192 e 512) com o símbolo centralizado sobre um
   quadrado arredondado com degradê da marca.
"""
import struct, zlib

# ---------- leitura de PNG (suporta RGB e RGBA, filtros básicos) ----------
def read_png(path):
    data = open(path, 'rb').read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'não é PNG'
    pos = 8
    width = height = bitd = colort = None
    idat = b''
    while pos < len(data):
        ln = struct.unpack('>I', data[pos:pos+4])[0]; pos += 4
        typ = data[pos:pos+4]; pos += 4
        chunk = data[pos:pos+ln]; pos += ln
        pos += 4  # crc
        if typ == b'IHDR':
            width, height, bitd, colort = struct.unpack('>IIBB', chunk[:10])
        elif typ == b'IDAT':
            idat += chunk
        elif typ == b'IEND':
            break
    assert bitd == 8, 'só 8-bit'
    channels = {0:1, 2:3, 3:1, 4:2, 6:4}[colort]
    raw = zlib.decompress(idat)
    stride = width*channels
    # desfaz os filtros por linha
    out = bytearray()
    prev = bytearray(stride)
    i = 0
    def paeth(a,b,c):
        p=a+b-c; pa=abs(p-a); pb=abs(p-b); pc=abs(p-c)
        return a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
    for y in range(height):
        ft = raw[i]; i += 1
        line = bytearray(raw[i:i+stride]); i += stride
        if ft == 1:
            for x in range(channels, stride):
                line[x] = (line[x] + line[x-channels]) & 255
        elif ft == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 255
        elif ft == 3:
            for x in range(stride):
                a = line[x-channels] if x>=channels else 0
                line[x] = (line[x] + ((a+prev[x])>>1)) & 255
        elif ft == 4:
            for x in range(stride):
                a = line[x-channels] if x>=channels else 0
                c = prev[x-channels] if x>=channels else 0
                line[x] = (line[x] + paeth(a, prev[x], c)) & 255
        out += line
        prev = line
    # converte para lista de pixels RGBA
    px = [[(0,0,0,0)]*width for _ in range(height)]
    for y in range(height):
        for x in range(width):
            o = (y*width+x)*channels
            if channels == 3:
                px[y][x] = (out[o], out[o+1], out[o+2], 255)
            elif channels == 4:
                px[y][x] = (out[o], out[o+1], out[o+2], out[o+3])
            elif channels == 1:
                v = out[o]; px[y][x] = (v,v,v,255)
            elif channels == 2:
                v = out[o]; px[y][x] = (v,v,v,out[o+1])
    return width, height, px

def write_png(path, px):
    h = len(px); w = len(px[0])
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            r,g,b,a = px[y][x]
            raw += bytes((r,g,b,a))
    def chunk(t,d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t+d) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    out = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(bytes(raw),9)) + chunk(b'IEND', b'')
    open(path,'wb').write(out)

def remove_white(px, limiar=238):
    """pixels quase-brancos viram transparentes (borda suavizada)."""
    h=len(px); w=len(px[0])
    for y in range(h):
        for x in range(w):
            r,g,b,a = px[y][x]
            if r>=limiar and g>=limiar and b>=limiar:
                px[y][x] = (r,g,b,0)
            elif r>215 and g>215 and b>215:
                # zona de transição: alpha parcial p/ não ficar serrilhado
                m = min(r,g,b)
                al = max(0, int((238-m)/(238-215)*255))
                px[y][x] = (r,g,b,al)
    return px

# ---------- 1) logo horizontal transparente ----------
w,h,px = read_png('logo-horizontal.png')
remove_white(px)
write_png('logo-horizontal.png', px)
print('logo horizontal: fundo removido', w,'x',h)

# ---------- 2) ícone do app com fundo arredondado da marca ----------
wi,hi,sym = read_png('logo-icone.png')
remove_white(sym)

TOP=(23,195,178); BOT=(13,148,136)
def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))

def make_icon(size, path):
    out=[[(0,0,0,0)]*size for _ in range(size)]
    r=int(size*0.22)
    def inside(x,y):
        if x<r and y<r: return (x-r)**2+(y-r)**2<=r*r
        if x>size-r and y<r: return (x-(size-r))**2+(y-r)**2<=r*r
        if x<r and y>size-r: return (x-r)**2+(y-(size-r))**2<=r*r
        if x>size-r and y>size-r: return (x-(size-r))**2+(y-(size-r))**2<=r*r
        return True
    # fundo arredondado degradê
    for y in range(size):
        base=lerp(TOP,BOT,y/size)
        for x in range(size):
            if inside(x,y): out[y][x]=(base[0],base[1],base[2],255)
    # símbolo centralizado (ocupa ~66% do ícone), escala por vizinho mais próximo
    alvo=int(size*0.66)
    esc=alvo/max(wi,hi)
    dw=int(wi*esc); dh=int(hi*esc)
    ox=(size-dw)//2; oy=(size-dh)//2
    for y in range(dh):
        sy=int(y/esc)
        for x in range(dw):
            sx=int(x/esc)
            r_,g_,b_,a_ = sym[sy][sx]
            if a_>20:
                # pixels brancos do carro -> deixa branco; sobrepõe
                out[oy+y][ox+x]=(r_,g_,b_,255)
    write_png(path,out)
    print('ícone', size, path)

make_icon(192, 'icon-192.png')
make_icon(512, 'icon-512.png')
