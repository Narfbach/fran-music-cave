// Client-side notification sender using FCM HTTP v1 API
// This replaces the need for Cloud Functions

async function sendPushNotification(userId, notificationType, trackData, fromUser) {
    try {
        // Get user's FCM tokens from Firestore
        const userRef = window.chatDoc(window.chatDb, 'users', userId);
        const userDoc = await window.chatGetDoc(userRef);

        if (!userDoc.exists()) {
            console.log('User not found for push notification');
            return;
        }

        const userData = userDoc.data();
        const fcmTokens = userData.fcmTokens || [];

        if (fcmTokens.length === 0) {
            console.log('No FCM tokens for user', userId);
            return;
        }

        // Prepare notification data
        let title = '';
        let body = '';

        if (notificationType === 'like') {
            title = '❤️ New Like!';
            body = `${fromUser} liked your track "${trackData.title}"`;
        } else if (notificationType === 'comment') {
            title = '💬 New Comment!';
            body = `${fromUser} commented on "${trackData.title}"`;
        }

        // Send notification using Firebase Cloud Messaging via Firestore trigger
        // We create a document that will trigger the Cloud Function
        await window.chatAddDoc(window.chatCollection(window.chatDb, 'pushQueue'), {
            tokens: fcmTokens,
            notification: {
                title: title,
                body: body
            },
            data: {
                trackId: trackData.id || '',
                url: 'https://narfbach.github.io/fran-music-cave/'
            },
            timestamp: window.chatServerTimestamp(),
            processed: false
        });

        console.log('Push notification queued for', fcmTokens.length, 'devices');

    } catch (error) {
        console.error('Error sending push notification:', error);
    }
}

// Export globally
window.sendPushNotification = sendPushNotification;
