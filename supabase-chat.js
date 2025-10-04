// Supabase Chat System
let chatSubscription = null;

async function initSupabaseChat() {
    if (!window.supabase || !window.currentUser) {
        console.log('Waiting for Supabase and user...');
        setTimeout(initSupabaseChat, 500);
        return;
    }

    loadMessages();
    setupChatSubscription();
}

async function loadMessages() {
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

    if (error) {
        console.error('Error loading messages:', error);
        return;
    }

    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';

    messages.forEach(msg => {
        addMessageToDOM(
            msg.username,
            msg.message,
            msg.created_at,
            msg.is_admin || false,
            msg.user_id,
            msg.photo_url,
            msg.id
        );
    });

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setupChatSubscription() {
    chatSubscription = supabase
        .channel('public:messages')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload) => {
                const msg = payload.new;
                addMessageToDOM(
                    msg.username,
                    msg.message,
                    msg.created_at,
                    msg.is_admin || false,
                    msg.user_id,
                    msg.photo_url,
                    msg.id
                );

                // Scroll to bottom
                const chatMessages = document.getElementById('chatMessages');
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        )
        .on('postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'messages' },
            (payload) => {
                const messageEl = document.querySelector(`[data-message-id="${payload.old.id}"]`);
                if (messageEl) messageEl.remove();
            }
        )
        .subscribe();
}

function addMessageToDOM(username, message, timestamp, isAdmin = false, userId = null, photoURL = null, messageId = null) {
    // Clean username if it's an email
    if (username && username.includes('@')) {
        username = username.split('@')[0];
    }

    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    if (messageId) messageDiv.setAttribute('data-message-id', messageId);

    const userColor = isAdmin ? '#ff3366' : '#fff';
    const userShadow = isAdmin
        ? '0 0 7px #ff3366, 0 0 10px #ff3366, 0 0 21px #ff3366, 0 0 42px #ff0044'
        : '0 0 7px #fff, 0 0 10px #fff, 0 0 21px #fff, 0 0 42px #ccc';

    const avatarHTML = photoURL
        ? `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover" alt="${username}">`
        : `<svg width="32" height="32" viewBox="0 0 100 100" style="opacity:0.3">
            <circle cx="50" cy="50" r="45" fill="#111"/>
            <circle cx="50" cy="50" r="40" fill="#0a0a0a"/>
            <circle cx="50" cy="50" r="30" fill="#111"/>
            <circle cx="50" cy="50" r="20" fill="#0a0a0a"/>
            <circle cx="50" cy="50" r="8" fill="#222"/>
            <circle cx="50" cy="50" r="3" fill="#000"/>
          </svg>`;

    const deleteBtn = (window.currentUser && (window.currentUser.uid === userId || window.currentUserIsAdmin))
        ? `<button class="delete-message-btn" onclick="deleteMessage('${messageId}')" style="margin-left:auto;background:transparent;border:none;color:#333;cursor:pointer;padding:0.25rem;transition:color .3s" onmouseover="this.style.color='#ff3366'" onmouseout="this.style.color='#333'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>`
        : '';

    messageDiv.innerHTML = `
        <div class="chat-message-avatar" style="width:32px;height:32px;border-radius:50%;overflow:hidden;background:#0a0a0a;display:flex;align-items:center;justify-content:center;border:1px solid #333;flex-shrink:0">
            ${avatarHTML}
        </div>
        <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem">
                <a href="${userId ? `profile.html?user=${userId}` : 'profile.html'}" class="chat-username" style="color:${userColor};text-shadow:${userShadow};font-size:0.75rem;letter-spacing:1px;text-decoration:none;cursor:pointer">${username}</a>
                <span class="chat-time" style="color:#333;font-size:0.6rem">${formatTimestamp(timestamp)}</span>
                ${deleteBtn}
            </div>
            <div class="chat-text" style="color:#999;font-size:0.75rem;word-wrap:break-word">${escapeHTML(message)}</div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message || !window.currentUser) return;

    try {
        const { error } = await supabase
            .from('messages')
            .insert({
                user_id: window.currentUser.id,
                username: window.currentUser.user_metadata?.username || window.currentUser.email.split('@')[0],
                message: message,
                is_admin: window.currentUserIsAdmin || false,
                photo_url: window.currentUser.user_metadata?.avatar_url || null
            });

        if (error) throw error;

        input.value = '';
    } catch (error) {
        console.error('Error sending message:', error);
        customAlert('Error sending message', '❌');
    }
}

async function deleteMessage(messageId) {
    if (!confirm('Delete this message?')) return;

    try {
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting message:', error);
        customAlert('Error deleting message', '❌');
    }
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export
window.sendMessage = sendMessage;
window.deleteMessage = deleteMessage;

// Initialize when page loads
window.addEventListener('load', () => {
    setTimeout(initSupabaseChat, 1000);
});
