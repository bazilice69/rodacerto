/* Service Worker DESLIGADO (fase de desenvolvimento).
   Este SW não guarda mais nada em cache. Ele se auto-remove e apaga
   os caches antigos, garantindo que todo celular passe a pegar sempre
   a versão mais nova direto da internet (sem "fantasma" de versão velha).
   Quando o app estiver estável, a gente religa o modo offline. */

self.addEventListener('install', e=>{ self.skipWaiting(); });

self.addEventListener('activate', e=>{
  e.waitUntil((async ()=>{
    // apaga todos os caches antigos do RodaCerto
    const ks = await caches.keys();
    await Promise.all(ks.map(k=>caches.delete(k)));
    // remove este próprio service worker
    await self.registration.unregister();
    // recarrega todas as abas abertas para pegar a versão limpa
    const clients = await self.clients.matchAll();
    clients.forEach(c=> c.navigate(c.url));
  })());
});

// sem interceptar fetch: tudo vai direto para a rede
