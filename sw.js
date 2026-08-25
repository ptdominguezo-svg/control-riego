/* Service worker mínimo: guarda el "cascarón" de la app para que abra
   sin señal. Los datos NO pasan por acá — viven en IndexedDB y se envían
   al Worker. Sube el número de CACHE cada vez que edites index.html,
   si no los teléfonos siguen mostrando la versión vieja. */
const CACHE = "monitoreo-riego-v6";
const ARCHIVOS = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", ev => {
  const req = ev.request;
  // Las llamadas al Worker nunca se cachean: si no hay red, que falle
  // y el registro se quede en la cola local.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Red primero, caché como respaldo: así una app recién publicada llega
  // al teléfono apenas hay señal, pero sigue abriendo sin ella.
  ev.respondWith(
    fetch(req)
      .then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
