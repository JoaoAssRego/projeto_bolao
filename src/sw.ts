/// <reference lib="webworker" />
// Excluído do tsc -b (tsconfig.json) porque a lib "webworker" conflita com a
// lib "DOM" usada pelo resto do app; o bundling do injectManifest (esbuild)
// não depende de checagem de tipos.
declare const self: ServiceWorkerGlobalScope

import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

// injectManifest não ativa skipWaiting/clientsClaim sozinho (diferente do
// generateSW). Sem isso, ao trocar de estratégia (generateSW → injectManifest)
// o novo SW fica em "waiting" indefinidamente enquanto a aba antiga estiver
// aberta, e `navigator.serviceWorker.ready` nunca resolve — travando o botão
// "Ativar" das notificações push em "Ativando..." para sempre.
self.skipWaiting()
clientsClaim()

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
