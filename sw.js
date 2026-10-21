/* Service Worker — RodaCerto
   Estratégia: REDE PRIMEIRO (network-first).
   Sempre tenta baixar a versão nova quando há internet; usa o cache só
   como reserva quando está offline. Assim o app nunca "trava" numa versão velha. */
const CACHE = 'rodacerto-v4';
const ARQUIVOS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(ARQUIVOS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    fetch(e.request)
      .then(resp=>{
        // deu certo buscar da rede: atualiza o cache e devolve a versão nova
        const copia = resp.clone();
        caches.open(CACHE).then(c=>c.put(e.request, copia)).catch(()=>{});
        return resp;
      })
      .catch(()=>
        // sem internet: usa o que estiver no cache (ou o index como reserva)
        caches.match(e.request).then(r=> r || caches.match('./index.html'))
      )
  );
});
