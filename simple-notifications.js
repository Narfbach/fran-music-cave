// Simple notification system that works WITHOUT Cloud Functions
// Uses browser's native Notification API

class SimpleNotificationSystem {
    constructor() {
        this.permission = 'default';
    }

    async init(user) {
        if (!user) return;

        this.userId = user.uid;

        // Check notification support
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
            return;
        }

        this.permission = Notification.permission;

        if (this.permission === 'granted') {
            console.log('Notifications already enabled');
        } else if (this.permission === 'default') {
            this.showPermissionPrompt();
        }

        // Listen for new notifications in Firestore
        this.listenForNotifications();
    }

    showPermissionPrompt() {
        const promptEl = document.getElementById('notificationPermissionPrompt');
        if (promptEl) {
            promptEl.style.display = 'flex';
        }
    }

    hidePermissionPrompt() {
        const promptEl = document.getElementById('notificationPermissionPrompt');
        if (promptEl) {
            promptEl.style.display = 'none';
        }
    }

    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;

            if (permission === 'granted') {
                this.hidePermissionPrompt();
                customAlert('Notifications enabled! You\'ll receive updates when someone interacts with your tracks.', '🔔');

                // Save permission state
                if (this.userId && window.chatDb) {
                    await window.chatUpdateDoc(
                        window.chatDoc(window.chatDb, 'users', this.userId),
                        { notificationsEnabled: true }
                    );
                }
            } else {
                customAlert('Notification permission denied.', '⚠️');
            }
        } catch (error) {
            console.error('Error requesting permission:', error);
        }
    }

    listenForNotifications() {
        if (!this.userId || !window.chatDb) return;

        // Listen for unread notifications
        const notificationsRef = window.chatCollection(window.chatDb, 'notifications');
        const q = window.chatQuery(
            notificationsRef,
            window.chatWhere('userId', '==', this.userId),
            window.chatWhere('read', '==', false)
        );

        window.chatOnSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const notif = change.doc.data();

                    // Only show notification for new items (not on initial load)
                    if (notif.timestamp && this.isRecent(notif.timestamp)) {
                        this.showNotification(notif);
                    }
                }
            });
        });
    }

    isRecent(timestamp) {
        if (!timestamp || !timestamp.toDate) return false;
        const now = new Date();
        const notifTime = timestamp.toDate();
        const diff = (now - notifTime) / 1000; // seconds
        return diff < 10; // Only show if less than 10 seconds old
    }

    showNotification(notif) {
        if (this.permission !== 'granted') return;

        let title = '';
        let body = '';
        let icon = '❤️';

        // Clean username
        let username = notif.fromUsername || 'Someone';
        if (username.includes('@')) {
            username = username.split('@')[0];
        }

        if (notif.type === 'like') {
            title = 'New Like!';
            body = `${username} liked your track "${notif.trackTitle}"`;
            icon = '❤️';
        } else if (notif.type === 'comment') {
            title = 'New Comment!';
            body = `${username} commented on "${notif.trackTitle}"`;
            icon = '💬';
        }

        // Create browser notification
        const notification = new Notification(title, {
            body: body,
            icon: '/fran-music-cave/icon-192.png',
            badge: '/fran-music-cave/icon-192.png',
            tag: notif.trackId || 'notification',
            requireInteraction: false,
            vibrate: [200, 100, 200],
            data: {
                url: window.location.origin + '/fran-music-cave/',
                notificationId: notif.id
            }
        });

        // Handle click
        notification.onclick = () => {
            window.focus();
            notification.close();

            // Mark as read
            if (window.chatDb && notif.id) {
                const notifRef = window.chatDoc(window.chatDb, 'notifications', notif.id);
                window.chatUpdateDoc(notifRef, { read: true }).catch(console.error);
            }
        };

        // Auto close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        console.log('Browser notification shown:', title);
    }
}

// Global instance
window.simpleNotificationSystem = new SimpleNotificationSystem();

// Override the push notification manager methods
window.pushNotificationManager = {
    init: (messaging, user) => {
        window.simpleNotificationSystem.init(user);
    },
    requestPermission: () => {
        window.simpleNotificationSystem.requestPermission();
    },
    hidePermissionPrompt: () => {
        window.simpleNotificationSystem.hidePermissionPrompt();
    }
};
