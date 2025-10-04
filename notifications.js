// Supabase Notifications System
let notificationsSubscription = null;

async function initSupabaseNotifications(user) {
    if (!user || !window.supabase) return;

    const notifBtn = document.getElementById('notificationsBtn');
    if (notifBtn) notifBtn.style.display = 'block';

    // Load notifications
    loadNotifications(user.id);

    // Subscribe to realtime updates
    notificationsSubscription = supabase
        .channel(`notifications:${user.id}`)
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            },
            () => {
                loadNotifications(user.id);
            }
        )
        .subscribe();
}

async function loadNotifications(userId) {
    const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error loading notifications:', error);
        return;
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    // Update badge
    const badge = document.getElementById('notifBadge');
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }

    // Render notifications
    renderNotifications(notifications);
}

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

        if (notif.created_at) {
            const date = new Date(notif.created_at);
            const now = new Date();
            const diff = Math.floor((now - date) / 1000);

            if (diff < 60) time = 'just now';
            else if (diff < 3600) time = `${Math.floor(diff / 60)}m ago`;
            else if (diff < 86400) time = `${Math.floor(diff / 3600)}h ago`;
            else time = `${Math.floor(diff / 86400)}d ago`;
        }

        // Clean username
        let username = notif.from_username || 'Someone';
        if (username.includes('@')) {
            username = username.split('@')[0];
        }

        if (notif.type === 'like') {
            icon = '❤️';
            message = `<strong>${username}</strong> liked your track <em>"${notif.track_title}"</em>`;
        } else if (notif.type === 'comment') {
            icon = '💬';
            message = `<strong>${username}</strong> commented on <em>"${notif.track_title}"</em>`;
            if (notif.comment_text) {
                message += `<br><span style="color:#666;font-size:.7rem">"${notif.comment_text}"</span>`;
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

async function handleNotificationClick(notif) {
    if (!notif.read) {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notif.id);
    }

    toggleNotifications();
    window.location.reload();
}

function toggleNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (!panel) return;

    const isVisible = panel.style.display === 'block';
    panel.style.display = isVisible ? 'none' : 'block';

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

// Export
window.initSupabaseNotifications = initSupabaseNotifications;
window.toggleNotifications = toggleNotifications;
