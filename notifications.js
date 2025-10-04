// Notifications system
let notificationsListener = null;

// Initialize notifications when user logs in
function initNotifications(user) {
    if (!user || !window.chatDb) {
        console.log('Notifications: Waiting for user or Firebase...', { user: !!user, db: !!window.chatDb });
        return;
    }

    console.log('Notifications: Initializing for user', user.uid);

    // Show notification button
    const notifBtn = document.getElementById('notificationsBtn');
    if (notifBtn) notifBtn.style.display = 'block';

    // Check if where is available
    if (!window.chatWhere) {
        console.error('Notifications: chatWhere is not available!');
        return;
    }

    console.log('Notifications: Creating query...');

    // Listen for notifications - simplified query without orderBy to avoid index requirement
    const notificationsRef = window.chatCollection(window.chatDb, 'notifications');
    const q = window.chatQuery(
        notificationsRef,
        window.chatWhere('userId', '==', user.uid),
        window.chatLimit(50)
    );

    console.log('Notifications: Query created, setting up listener...');

    notificationsListener = window.chatOnSnapshot(q, (snapshot) => {
        console.log('Notifications: Snapshot received, count:', snapshot.size);

        const notifications = [];
        let unreadCount = 0;

        snapshot.forEach((doc) => {
            const notif = { id: doc.id, ...doc.data() };
            notifications.push(notif);
            if (!notif.read) unreadCount++;
        });

        // Sort notifications by timestamp (newest first) on client side
        notifications.sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0;
            return b.timestamp.toMillis() - a.timestamp.toMillis();
        });

        // Keep only last 20
        notifications.splice(20);

        console.log('Notifications: Unread count:', unreadCount);

        // Update badge
        const badge = document.getElementById('notifBadge');
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }

        // Update notifications list
        renderNotifications(notifications);
    });

    console.log('Notifications: Listener set up successfully');
}

// Render notifications in panel
function renderNotifications(notifications) {
    const listEl = document.getElementById('notificationsList');
    if (!listEl) return;

    if (notifications.length === 0) {
        listEl.innerHTML = `
            <div style="padding:2rem;text-align:center;color:#444;font-size:.75rem;letter-spacing:1px">
                No notifications yet
            </div>
        `;
        return;
    }

    listEl.innerHTML = '';

    notifications.forEach((notif) => {
        const notifEl = document.createElement('div');
        notifEl.style.cssText = `
            padding:1rem;
            border-bottom:1px solid #1a1a1a;
            cursor:pointer;
            transition:background .3s;
            ${!notif.read ? 'background:#0d0d0d;' : ''}
        `;

        notifEl.onmouseenter = () => notifEl.style.background = '#111';
        notifEl.onmouseleave = () => notifEl.style.background = notif.read ? 'transparent' : '#0d0d0d';

        let icon = '';
        let message = '';
        let time = '';

        if (notif.timestamp) {
            const date = notif.timestamp.toDate();
            const now = new Date();
            const diff = Math.floor((now - date) / 1000);

            if (diff < 60) time = 'just now';
            else if (diff < 3600) time = `${Math.floor(diff / 60)}m ago`;
            else if (diff < 86400) time = `${Math.floor(diff / 3600)}h ago`;
            else time = `${Math.floor(diff / 86400)}d ago`;
        }

        // Clean username if it's an email
        let username = notif.fromUsername || 'Someone';
        if (username.includes('@')) {
            username = username.split('@')[0];
        }

        if (notif.type === 'like') {
            icon = '❤️';
            message = `<strong>${username}</strong> liked your track <em>"${notif.trackTitle}"</em>`;
        } else if (notif.type === 'comment') {
            icon = '💬';
            message = `<strong>${username}</strong> commented on <em>"${notif.trackTitle}"</em>`;
            if (notif.commentText) {
                message += `<br><span style="color:#666;font-size:.7rem">"${notif.commentText}"</span>`;
            }
        }

        notifEl.innerHTML = `
            <div style="display:flex;align-items:flex-start;gap:0.8rem">
                <div style="font-size:1.5rem;flex-shrink:0">${icon}</div>
                <div style="flex:1">
                    <div style="color:#999;font-size:.75rem;letter-spacing:0.5px;line-height:1.5;margin-bottom:.3rem">
                        ${message}
                    </div>
                    <div style="color:#444;font-size:.65rem;letter-spacing:1px">${time}</div>
                </div>
                ${!notif.read ? '<div style="width:8px;height:8px;background:#ff3366;border-radius:50%;flex-shrink:0;margin-top:0.3rem"></div>' : ''}
            </div>
        `;

        notifEl.onclick = () => handleNotificationClick(notif);
        listEl.appendChild(notifEl);
    });
}

// Handle notification click
async function handleNotificationClick(notif) {
    // Mark as read
    if (!notif.read && window.chatDb) {
        const notifRef = window.chatDoc(window.chatDb, 'notifications', notif.id);
        await window.chatUpdateDoc(notifRef, { read: true });
    }

    // Close panel
    toggleNotifications();

    // Scroll to track (simple approach - reload page will show it)
    // In a real app, you might scroll to the specific track card
    window.location.hash = '';
    setTimeout(() => {
        window.location.reload();
    }, 100);
}

// Toggle notifications panel
function toggleNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (!panel) return;

    const isVisible = panel.style.display === 'block';
    panel.style.display = isVisible ? 'none' : 'block';

    // Close user dropdown if open
    if (!isVisible) {
        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown) userDropdown.style.display = 'none';
    }
}

// Close notifications when clicking outside
document.addEventListener('click', (e) => {
    const panel = document.getElementById('notificationsPanel');
    const btn = document.getElementById('notificationsBtn');

    if (panel && btn && !btn.contains(e.target) && !panel.contains(e.target)) {
        panel.style.display = 'none';
    }
});

// Export functions
window.initNotifications = initNotifications;
window.toggleNotifications = toggleNotifications;
