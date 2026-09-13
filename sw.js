/* Niyazi Kaya — Saha Görevleri Service Worker
   Amaç: uygulama kabuğunu (saha.html) önbelleğe alıp ZAYIF/SIFIR sinyalde de açılmasını sağlamak.
   Strateji: AĞ-ÖNCELİKLİ (network-first) → internet varken her zaman güncel sürüm gelir ve
   önbellek tazelenir; internet yoksa son önbellekten açılır. Supabase istekleri hiç önbelleğe
   alınmaz (veri her zaman canlı). */
const CACHE='nk-saha-v4';
const SHELL=['./saha.html','./','./manifest.webmanifest','./saha-192.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;                       // POST/PATCH (Supabase yazma) → dokunma
  let url; try{ url=new URL(req.url); }catch(_){ return; }
  if(url.hostname.indexOf('supabase')>=0) return;       // veri/storage → her zaman ağ

  // app shell (saha.html veya dizin kökü) → ağ-öncelikli, başarısızsa önbellek
  const shell = url.pathname.endsWith('/saha.html') || url.pathname.endsWith('/');
  if(shell){
    e.respondWith(
      fetch(req).then(resp=>{
        try{ const cp=resp.clone(); caches.open(CACHE).then(c=>c.put('./saha.html',cp)); }catch(_){}
        return resp;
      }).catch(()=> caches.match('./saha.html').then(r=> r || caches.match(req)))
    );
    return;
  }
  // diğer GET'ler → ağ, olmazsa önbellek
  e.respondWith(fetch(req).catch(()=>caches.match(req)));
});
