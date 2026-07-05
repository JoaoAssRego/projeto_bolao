/// <reference lib="webworker" />
// Excluído do tsc -b (tsconfig.json) porque a lib "webworker" conflita com a
// lib "DOM" usada pelo resto do app; o bundling do injectManifest (esbuild)
// não depende de checagem de tipos.
declare const self: ServiceWorkerGlobalScope

import { precacheAndRoute } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Bolão', {
      body: data.body,
      icon: '/icon.svg',
      data: { url: data.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow(event.notification.data?.url ?? '/'))
})
