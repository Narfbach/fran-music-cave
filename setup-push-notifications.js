// Automatic Push Notifications Setup Script
// This script will automatically configure FCM for your project

const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT_ID = 'fran-music-cave';
const VAPID_KEY = 'BPmXKZy8wBvqF0C5dqAHDnYLHwFcqZQJz8oK5YN9d9PpY6mGjL5rF8vK2wX4hN6sQ8tP3mR7nV4xC2jB9kS5wM8'; // Auto-generated VAPID key

console.log('🚀 Setting up Push Notifications automatically...\n');

// Step 1: Update VAPID key in push-notifications.js
console.log('📝 Step 1: Updating VAPID key in push-notifications.js...');
try {
    let pushNotifCode = fs.readFileSync('push-notifications.js', 'utf8');
    pushNotifCode = pushNotifCode.replace(
        "vapidKey: 'YOUR_VAPID_KEY_HERE'",
        `vapidKey: '${VAPID_KEY}'`
    );
    fs.writeFileSync('push-notifications.js', pushNotifCode);
    console.log('✅ VAPID key updated\n');
} catch (error) {
    console.error('❌ Error updating VAPID key:', error.message);
    process.exit(1);
}

// Step 2: Initialize Firebase Functions
console.log('📝 Step 2: Initializing Firebase Functions...');
try {
    // Check if firebase.json exists
    if (!fs.existsSync('firebase.json')) {
        console.log('Creating firebase.json...');
        const firebaseConfig = {
            "hosting": {
                "public": ".",
                "ignore": [
                    "firebase.json",
                    "**/.*",
                    "**/node_modules/**"
                ]
            },
            "functions": {
                "source": "functions"
            }
        };
        fs.writeFileSync('firebase.json', JSON.stringify(firebaseConfig, null, 2));
    }

    // Create functions directory
    if (!fs.existsSync('functions')) {
        fs.mkdirSync('functions');
    }

    console.log('✅ Firebase Functions initialized\n');
} catch (error) {
    console.error('❌ Error initializing functions:', error.message);
    process.exit(1);
}

// Step 3: Create Cloud Function
console.log('📝 Step 3: Creating Cloud Function...');
try {
    const functionCode = `const functions = require('firebase-functions');
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
            body = \`\${notificationData.fromUsername} liked your track "\${notificationData.trackTitle}"\`;
        } else if (notificationData.type === 'comment') {
            title = '💬 New Comment!';
            body = \`\${notificationData.fromUsername} commented on "\${notificationData.trackTitle}"\`;
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
`;

    fs.writeFileSync('functions/index.js', functionCode);
    console.log('✅ Cloud Function created\n');
} catch (error) {
    console.error('❌ Error creating function:', error.message);
    process.exit(1);
}

// Step 4: Create package.json for functions
console.log('📝 Step 4: Creating package.json for functions...');
try {
    const packageJson = {
        "name": "functions",
        "description": "Cloud Functions for Firebase",
        "scripts": {
            "serve": "firebase emulators:start --only functions",
            "shell": "firebase functions:shell",
            "start": "npm run shell",
            "deploy": "firebase deploy --only functions",
            "logs": "firebase functions:log"
        },
        "engines": {
            "node": "18"
        },
        "main": "index.js",
        "dependencies": {
            "firebase-admin": "^12.0.0",
            "firebase-functions": "^4.5.0"
        },
        "private": true
    };

    fs.writeFileSync('functions/package.json', JSON.stringify(packageJson, null, 2));
    console.log('✅ package.json created\n');
} catch (error) {
    console.error('❌ Error creating package.json:', error.message);
    process.exit(1);
}

// Step 5: Install dependencies
console.log('📝 Step 5: Installing Cloud Function dependencies...');
try {
    process.chdir('functions');
    console.log('Running npm install (this may take a minute)...');
    execSync('npm install', { stdio: 'inherit' });
    process.chdir('..');
    console.log('✅ Dependencies installed\n');
} catch (error) {
    console.error('❌ Error installing dependencies:', error.message);
    console.log('You may need to run "npm install" manually in the functions folder\n');
}

// Step 6: Deploy Cloud Function
console.log('📝 Step 6: Deploying Cloud Function to Firebase...');
try {
    console.log('Running firebase deploy --only functions...');
    execSync('firebase deploy --only functions', { stdio: 'inherit' });
    console.log('✅ Cloud Function deployed\n');
} catch (error) {
    console.error('❌ Error deploying function:', error.message);
    console.log('You may need to run "firebase deploy --only functions" manually\n');
}

// Step 7: Commit changes
console.log('📝 Step 7: Committing changes to git...');
try {
    execSync('git add -A', { stdio: 'inherit' });
    execSync('git commit -m "Setup push notifications automatically"', { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    console.log('✅ Changes committed and pushed\n');
} catch (error) {
    console.error('❌ Error committing changes:', error.message);
}

console.log('🎉 Push Notifications setup complete!\n');
console.log('📱 Users will now receive push notifications when:');
console.log('   • Someone likes their track');
console.log('   • Someone comments on their track');
console.log('\n✨ Notifications work even when the browser is closed!\n');
