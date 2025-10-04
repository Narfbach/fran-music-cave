// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyDa5zahCZE7Gsh0JAkC1iimWutpBddRF1s",
    authDomain: "fran-music-cave.firebaseapp.com",
    projectId: "fran-music-cave",
    storageBucket: "fran-music-cave.firebasestorage.app",
    messagingSenderId: "518773964413",
    appId: "1:518773964413:web:46f3b94fb6db076c323b14",
    measurementId: "G-3NN8Q90FX8"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon || '/fran-music-cave/icon-192.png',
        badge: '/fran-music-cave/icon-192.png',
        tag: payload.data.trackId || 'notification',
        data: {
            url: payload.data.url || '/fran-music-cave/',
            trackId: payload.data.trackId
        },
        requireInteraction: false,
        vibrate: [200, 100, 200]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked:', event);

    event.notification.close();

    const urlToOpen = event.notification.data.url || '/fran-music-cave/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if there's already a window open
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url.includes('fran-music-cave') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // If no window is open, open a new one
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
