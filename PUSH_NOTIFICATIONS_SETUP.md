# Push Notifications Setup Guide

This guide explains how to complete the Push Notifications setup for The Music Cave.

## What's Already Done ✅

1. ✅ Service Worker created (`firebase-messaging-sw.js`)
2. ✅ Push notification manager module (`push-notifications.js`)
3. ✅ Permission request UI
4. ✅ Token storage in Firestore
5. ✅ Frontend code integrated

## What You Need to Do

### Step 1: Get VAPID Key from Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **fran-music-cave**
3. Click on the **Settings gear icon** → **Project settings**
4. Go to the **Cloud Messaging** tab
5. Scroll down to **Web Push certificates**
6. Click **Generate key pair** (if you don't have one yet)
7. Copy the **Key pair** value (starts with `B...`)

### Step 2: Update VAPID Key in Code

Open `push-notifications.js` and find line ~88:

```javascript
vapidKey: 'YOUR_VAPID_KEY_HERE'
```

Replace `'YOUR_VAPID_KEY_HERE'` with your actual VAPID key:

```javascript
vapidKey: 'BPmX..._your_key_here'  // Your full VAPID key
```

### Step 3: Create Firebase Cloud Function

You need to create a Firebase Cloud Function that sends push notifications when a like or comment is created.

#### 3.1 Initialize Firebase Functions

In your project directory, run:

```bash
firebase init functions
```

Choose:
- Language: **JavaScript** (or TypeScript if you prefer)
- Install dependencies: **Yes**

#### 3.2 Create the Function

Edit `functions/index.js`:

```javascript
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
        let icon = '';

        if (notificationData.type === 'like') {
            title = '❤️ New Like!';
            body = `${notificationData.fromUsername} liked your track "${notificationData.trackTitle}"`;
            icon = '❤️';
        } else if (notificationData.type === 'comment') {
            title = '💬 New Comment!';
            body = `${notificationData.fromUsername} commented on "${notificationData.trackTitle}"`;
            icon = '💬';
        }

        // Send to all user's devices
        const messages = fcmTokens.map(token => ({
            notification: {
                title: title,
                body: body,
                icon: icon
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
```

#### 3.3 Deploy the Function

```bash
firebase deploy --only functions
```

### Step 4: Update Service Worker Path

Since your site is hosted at `/fran-music-cave/`, you need to update the Service Worker registration.

The Firebase Messaging SW must be at the root of your scope. Add this to `index.html` after the existing SW registration:

```javascript
// Register Firebase Messaging Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/fran-music-cave/firebase-messaging-sw.js')
        .then((registration) => {
            console.log('Firebase Messaging SW registered:', registration);
        })
        .catch((err) => {
            console.log('Firebase Messaging SW registration failed:', err);
        });
}
```

### Step 5: Test Push Notifications

1. Open the website in a browser
2. Log in with your account
3. You should see a prompt asking to enable notifications
4. Click **ENABLE**
5. Grant permission in the browser dialog
6. Open another browser (or incognito tab) and log in with a different account
7. Like or comment on the first user's track
8. **Close the first browser completely**
9. The first user should receive a native push notification from the OS

## Firestore Security Rules

Make sure your Firestore rules allow the Cloud Function to write notifications:

```javascript
match /notifications/{notificationId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null;
}

match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

## Troubleshooting

### "getToken() failed - no VAPID key"
- Make sure you added your VAPID key in `push-notifications.js`

### "Permission denied"
- User needs to grant notification permissions in browser settings

### "Service Worker registration failed"
- Check that `firebase-messaging-sw.js` is accessible at the correct path
- Check browser console for CORS or path errors

### "Cloud Function not triggering"
- Check Firebase Console → Functions → Logs
- Make sure function is deployed: `firebase deploy --only functions`

### "Token not registered"
- Token may have expired or been revoked
- Function automatically removes invalid tokens

## Architecture Overview

```
User A likes track →
  Firestore: notifications/{id} created →
    Cloud Function triggered →
      Reads User B's FCM tokens →
        Sends push to all User B's devices →
          Service Worker receives push →
            Shows native OS notification
```

## References

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications](https://web.dev/push-notifications-overview/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
