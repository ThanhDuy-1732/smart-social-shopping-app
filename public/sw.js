const VERSION='minhdung-static-v2';
const STATIC=['/offline.html','/icon-192.png','/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(STATIC))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('minhdung-static-')&&key!==VERSION)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='APPLY_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.match('/offline.html')));return;}if(STATIC.includes(url.pathname)&&!url.search)event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));});
self.addEventListener('push',event=>{event.waitUntil(self.registration.showNotification('Mình dùng',{body:'Bạn có cập nhật mới. Mở ứng dụng để xem.',icon:'/icon-192.png',tag:'minhdung-update'}));});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.openWindow('/notifications'));});
