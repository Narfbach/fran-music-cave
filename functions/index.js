const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Send notification when a new notification document is created
exports.sendPushNotification = functions.firestore
    .document('notifications/{notificationId}')
    .onCreate(async (snapshot, context) => {
        const notificationData = snapshot.data();

        // Get the user's FCM tokens
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(notificationData.userId)
            .get();

        if (!userDoc.exists) {
            console.log('User not found');
            return null;
        }

        const userData = userDoc.data();
        const fcmTokens = userData.fcmTokens || [];

        if (fcmTokens.length === 0) {
            console.log('No FCM tokens for user');
            return null;
        }

        // Prepare notification message
        let title = '';
        let body = '';

        if (notificationData.type === 'like') {
            title = '❤️ New Like!';
            body = `${notificationData.fromUsername} liked your track "${notificationData.trackTitle}"`;
        } else if (notificationData.type === 'comment') {
            title = '💬 New Comment!';
            body = `${notificationData.fromUsername} commented on "${notificationData.trackTitle}"`;
        }

        // Send to all user's devices
        const messages = fcmTokens.map(token => ({
            notification: {
                title: title,
                body: body
            },
            data: {
                trackId: notificationData.trackId || '',
                url: 'https://narfbach.github.io/fran-music-cave/'
            },
            token: token
        }));

        try {
            const response = await admin.messaging().sendAll(messages);
            console.log('Successfully sent notifications:', response.successCount);

            // Clean up invalid tokens
            const tokensToRemove = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error('Error sending to token:', resp.error);
                    if (resp.error.code === 'messaging/registration-token-not-registered' ||
                        resp.error.code === 'messaging/invalid-registration-token') {
                        tokensToRemove.push(fcmTokens[idx]);
                    }
                }
            });

            // Remove invalid tokens from Firestore
            if (tokensToRemove.length > 0) {
                const validTokens = fcmTokens.filter(t => !tokensToRemove.includes(t));
                await admin.firestore()
                    .collection('users')
                    .doc(notificationData.userId)
                    .update({ fcmTokens: validTokens });
            }

            return response;
        } catch (error) {
            console.error('Error sending notifications:', error);
            return null;
        }
    });
