# Firebase Cloud Function Deployment Instructions

## Quick Deploy (2 minutes)

### Step 1: Login to Firebase CLI

Open your terminal and run:

```bash
cd "C:\Users\Fran\Desktop\mi-landing-page"
firebase login
```

This will open your browser. Log in with your Google account that has access to the `fran-music-cave` Firebase project.

### Step 2: Deploy the Cloud Function

Once logged in, run:

```bash
firebase deploy --only functions
```

This will:
- Upload the function code to Firebase
- Deploy the `sendPushNotification` function
- Enable it to trigger automatically when notifications are created

### Step 3: Done!

That's it! The push notifications system is now fully operational.

## What Happens After Deploy:

1. User A likes/comments on User B's track
2. Notification document created in Firestore
3. **Cloud Function automatically triggers**
4. Function reads User B's FCM tokens
5. Sends push notification to all User B's devices
6. User B receives notification even if browser is closed!

## Troubleshooting

### "Permission denied" error
Make sure you're logged in with the correct Google account that owns the Firebase project.

### "Firebase CLI not found"
Run: `npm install -g firebase-tools`

### "Project not found"
The project ID is already configured in `firebase.json` and `.firebaserc`. Just make sure you're in the correct directory.

## Alternative: Deploy via Firebase Console

If CLI doesn't work, you can deploy via the console:

1. Go to [Firebase Console](https://console.firebase.google.com/project/fran-music-cave/functions)
2. Click "Create Function"
3. Copy the code from `functions/index.js`
4. Paste it in the console editor
5. Deploy

---

**After deployment, the system will work automatically with zero maintenance required.**
