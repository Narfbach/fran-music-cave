// Push Notifications Manager
class PushNotificationManager {
    constructor() {
        this.messaging = null;
        this.currentToken = null;
        this.userId = null;
    }

    async init(messagingInstance, user) {
        if (!user) {
            console.log('Push: No user provided');
            return;
        }

        this.messaging = messagingInstance;
        this.userId = user.uid;

        console.log('Push: Initializing for user', this.userId);

        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('Push: Notifications not supported');
            return;
        }

        // Check current permission
        const permission = Notification.permission;
        console.log('Push: Current permission:', permission);

        if (permission === 'granted') {
            await this.registerToken();
        } else if (permission === 'default') {
            this.showPermissionPrompt();
        }

        // Listen for foreground messages
        this.setupForegroundListener();
    }

    showPermissionPrompt() {
        // Show custom permission prompt UI
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
            console.log('Push: Requesting permission...');

            const permission = await Notification.requestPermission();
            console.log('Push: Permission result:', permission);

            if (permission === 'granted') {
                this.hidePermissionPrompt();
                await this.registerToken();
                customAlert('Notifications enabled! You\'ll receive updates when someone likes or comments on your tracks.', '🔔');
            } else {
                customAlert('Notification permission denied. You can enable it later in your browser settings.', '⚠️');
            }
        } catch (error) {
            console.error('Push: Error requesting permission:', error);
            customAlert('Error enabling notifications. Please try again.', '❌');
        }
    }

    async registerToken() {
        if (!this.messaging) {
            console.error('Push: Messaging not initialized');
            return;
        }

        try {
            console.log('Push: Getting FCM token...');

            // Get registration token
            const token = await this.messaging.getToken({
                vapidKey: 'YOUR_VAPID_KEY_HERE' // We'll generate this in Firebase Console
            });

            if (token) {
                console.log('Push: FCM token received:', token);
                this.currentToken = token;
                await this.saveTokenToFirestore(token);
            } else {
                console.log('Push: No registration token available');
            }

            // Listen for token refresh
            this.messaging.onTokenRefresh(async () => {
                console.log('Push: Token refreshed');
                const newToken = await this.messaging.getToken();
                await this.saveTokenToFirestore(newToken);
            });

        } catch (error) {
            console.error('Push: Error getting token:', error);
        }
    }

    async saveTokenToFirestore(token) {
        if (!this.userId || !window.chatDb) {
            console.error('Push: Cannot save token - no user or db');
            return;
        }

        try {
            const userRef = window.chatDoc(window.chatDb, 'users', this.userId);

            // Get existing tokens
            const userDoc = await window.chatGetDoc(userRef);
            const userData = userDoc.data() || {};
            const existingTokens = userData.fcmTokens || [];

            // Add new token if not already present
            if (!existingTokens.includes(token)) {
                existingTokens.push(token);

                await window.chatUpdateDoc(userRef, {
                    fcmTokens: existingTokens,
                    lastTokenUpdate: window.chatServerTimestamp()
                });

                console.log('Push: Token saved to Firestore');
            }
        } catch (error) {
            console.error('Push: Error saving token:', error);
        }
    }

    setupForegroundListener() {
        if (!this.messaging) return;

        // Handle messages when app is in foreground
        this.messaging.onMessage((payload) => {
            console.log('Push: Foreground message received:', payload);

            // Show in-app notification or update UI
            this.showForegroundNotification(payload);
        });
    }

    showForegroundNotification(payload) {
        // For foreground messages, we can show a custom in-app notification
        // or just let the notification badge update via the existing listener
        console.log('Push: Showing foreground notification:', payload.notification.title);

        // Optional: Show a toast notification
        if (payload.notification) {
            const title = payload.notification.title;
            const body = payload.notification.body;

            // Create a temporary notification element
            const notifEl = document.createElement('div');
            notifEl.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: #0a0a0a;
                border: 1px solid #333;
                padding: 1rem;
                border-radius: 4px;
                max-width: 300px;
                z-index: 10001;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                animation: slideInRight 0.3s ease-out;
            `;

            notifEl.innerHTML = `
                <div style="font-size: 0.75rem; font-weight: bold; color: #fff; margin-bottom: 0.5rem;">
                    ${title}
                </div>
                <div style="font-size: 0.7rem; color: #999;">
                    ${body}
                </div>
            `;

            document.body.appendChild(notifEl);

            // Remove after 4 seconds
            setTimeout(() => {
                notifEl.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => notifEl.remove(), 300);
            }, 4000);
        }
    }

    async disableNotifications() {
        if (!this.currentToken || !this.userId) return;

        try {
            // Remove token from Firestore
            const userRef = window.chatDoc(window.chatDb, 'users', this.userId);
            const userDoc = await window.chatGetDoc(userRef);
            const userData = userDoc.data() || {};
            const existingTokens = userData.fcmTokens || [];

            const updatedTokens = existingTokens.filter(t => t !== this.currentToken);

            await window.chatUpdateDoc(userRef, {
                fcmTokens: updatedTokens
            });

            // Delete token from FCM
            if (this.messaging) {
                await this.messaging.deleteToken();
            }

            this.currentToken = null;
            console.log('Push: Notifications disabled');
            customAlert('Notifications disabled successfully.', '🔕');
        } catch (error) {
            console.error('Push: Error disabling notifications:', error);
        }
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export global instance
window.pushNotificationManager = new PushNotificationManager();
