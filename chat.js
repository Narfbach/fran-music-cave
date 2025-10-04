// Chat functionality
const chatMessages = document.getElementById('chatMessages');
const chatUsername = document.getElementById('chatUsername');
const chatUsernameDisplay = document.getElementById('chatUsernameDisplay');
const chatUserContainer = document.getElementById('chatUserContainer');
const chatUserAvatar = document.getElementById('chatUserAvatar');
const chatUserCard = document.getElementById('chatUserCard');
const chatMessage = document.getElementById('chatMessage');
const chatSend = document.getElementById('chatSend');
const chatToggle = document.getElementById('chatToggle');
const chatSection = document.getElementById('chatSection');

// Store current user data
let currentChatUser = null;
let authListenerAttached = false;

// Function to initialize chat with auth
function initializeChatAuth() {
    if (authListenerAttached) return; // Prevent multiple listeners

    if (!window.firebaseAuth) {
        // Retry if auth not ready
        setTimeout(initializeChatAuth, 200);
        return;
    }

    authListenerAttached = true;

    // Listen for auth changes
    window.firebaseAuth.onAuthStateChanged((user) => {
        if (user) {
            setupChatUser(user);
        } else {
            // Not logged in - disable chat
            chatUserContainer.style.display = 'none';
            document.getElementById('chatUsernameInputWrapper').style.display = 'block';
            chatUsername.value = 'LOGIN REQUIRED';
            chatUsername.disabled = true;
            currentChatUser = null;

            // Disable message input
            chatMessage.disabled = true;
            chatMessage.placeholder = 'LOGIN TO CHAT';
            chatSend.disabled = true;
        }
    });
}

// Start initialization immediately
initializeChatAuth();

async function setupChatUser(user) {
    try {
        // Get user data from Firestore
        const userDoc = await window.chatGetDoc(window.chatDoc(window.chatDb, 'users', user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            // Get username from Firestore, fallback to displayName, then email
            let username = userData.username || user.displayName || user.email?.split('@')[0] || 'Anonymous';

            // If username is an email, extract part before @
            if (username.includes('@')) {
                username = username.split('@')[0];
            }

            // Store user data for chat
            currentChatUser = {
                username: username.toUpperCase(),
                isAdmin: userData.isAdmin || false,
                userId: user.uid,
                photoURL: userData.photoURL || null,
                diggerScore: userData.diggerScore || 0,
                tracksSubmitted: userData.tracksSubmitted || 0
            };

            // Hide input wrapper, show user container
            document.getElementById('chatUsernameInputWrapper').style.display = 'none';
            chatUserContainer.style.display = 'flex';

            // Set avatar
            if (currentChatUser.photoURL) {
                chatUserAvatar.innerHTML = `<img src="${currentChatUser.photoURL}" style="width:100%;height:100%;object-fit:cover" alt="Avatar">`;
            }

            // Set username with neon effect
            chatUsernameDisplay.textContent = currentChatUser.username;

            // Apply neon glow based on admin status
            if (currentChatUser.isAdmin) {
                chatUsernameDisplay.style.color = '#ff3366';
                chatUsernameDisplay.style.textShadow = '0 0 7px #ff3366, 0 0 10px #ff3366, 0 0 21px #ff3366, 0 0 42px #ff0044';
            } else {
                chatUsernameDisplay.style.color = '#fff';
                chatUsernameDisplay.style.textShadow = '0 0 7px #fff, 0 0 10px #fff, 0 0 21px #fff, 0 0 42px #ccc';
            }

            // Setup user card hover
            setupUserCard();

            // Enable message input
            chatMessage.disabled = false;
            chatMessage.placeholder = 'MESSAGE';
            chatSend.disabled = false;
        }
    } catch (error) {
        console.error('Error setting up chat user:', error);
    }
}

// Setup user card hover functionality
function setupUserCard() {
    const cardAvatar = document.getElementById('cardAvatar');
    const cardUsername = document.getElementById('cardUsername');
    const cardRank = document.getElementById('cardRank');
    const cardScore = document.getElementById('cardScore');
    const cardTracks = document.getElementById('cardTracks');

    // Populate card data
    if (currentChatUser.photoURL) {
        cardAvatar.innerHTML = `<img src="${currentChatUser.photoURL}" style="width:100%;height:100%;object-fit:cover" alt="Avatar">`;
    } else {
        cardAvatar.innerHTML = `<svg width="50" height="50" viewBox="0 0 100 100" style="opacity:0.3">
            <circle cx="50" cy="50" r="45" fill="#111"/>
            <circle cx="50" cy="50" r="40" fill="#0a0a0a"/>
            <circle cx="50" cy="50" r="30" fill="#111"/>
            <circle cx="50" cy="50" r="20" fill="#0a0a0a"/>
            <circle cx="50" cy="50" r="8" fill="#222"/>
            <circle cx="50" cy="50" r="3" fill="#000"/>
        </svg>`;
    }

    cardUsername.textContent = currentChatUser.username;

    // Get rank from score
    const rank = getRank(currentChatUser.diggerScore);
    cardRank.textContent = currentChatUser.isAdmin ? 'ADMIN' : rank;

    // Apply color based on admin status
    if (currentChatUser.isAdmin) {
        cardUsername.style.color = '#ff3366';
        cardUsername.style.textShadow = '0 0 7px #ff3366, 0 0 10px #ff3366';
        cardRank.style.color = '#ff3366';
    } else {
        cardUsername.style.color = '#fff';
        cardUsername.style.textShadow = '0 0 7px #fff, 0 0 10px #fff';
        cardRank.style.color = '#999';
    }

    cardScore.textContent = currentChatUser.diggerScore;
    cardTracks.textContent = currentChatUser.tracksSubmitted;

    // Show/hide card on hover
    chatUserContainer.addEventListener('mouseenter', () => {
        chatUserCard.style.display = 'block';
    });

    chatUserContainer.addEventListener('mouseleave', () => {
        chatUserCard.style.display = 'none';
    });
}

// Get rank from score (same logic as profile)
function getRank(score) {
    if (score >= 1000) return 'CAVE MASTER';
    if (score >= 500) return 'LEGEND';
    if (score >= 100) return 'TASTE MAKER';
    if (score >= 50) return 'CRATE DIGGER';
    if (score >= 10) return 'DIGGER';
    return 'NEWCOMER';
}

// Toggle chat minimize/maximize
chatToggle.addEventListener('click', () => {
    chatSection.classList.toggle('minimized');
    chatToggle.textContent = chatSection.classList.contains('minimized') ? '+' : '—';
});

// Función para formatear tiempo
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Función para agregar mensaje al DOM
async function addMessageToDOM(username, message, timestamp, isAdmin = false, userId = null, photoURL = null, messageId = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.setAttribute('data-message-id', messageId);
    messageDiv.style.display = 'flex';
    messageDiv.style.gap = '.5rem';
    messageDiv.style.alignItems = 'flex-start';

    // Apply neon glow based on admin status
    let userColor, userShadow;
    if (isAdmin) {
        userColor = '#ff3366';
        userShadow = '0 0 7px #ff3366, 0 0 10px #ff3366, 0 0 21px #ff3366, 0 0 42px #ff0044';
    } else {
        userColor = '#fff';
        userShadow = '0 0 7px #fff, 0 0 10px #fff, 0 0 21px #fff, 0 0 42px #ccc';
    }

    // Create avatar SVG default
    const defaultAvatar = `<svg width="32" height="32" viewBox="0 0 100 100" style="opacity:0.3">
        <circle cx="50" cy="50" r="45" fill="#111"/>
        <circle cx="50" cy="50" r="40" fill="#0a0a0a"/>
        <circle cx="50" cy="50" r="30" fill="#111"/>
        <circle cx="50" cy="50" r="20" fill="#0a0a0a"/>
        <circle cx="50" cy="50" r="8" fill="#222"/>
        <circle cx="50" cy="50" r="3" fill="#000"/>
    </svg>`;

    const avatarHTML = photoURL
        ? `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover" alt="${username}">`
        : defaultAvatar;

    // Generate unique ID for this message's card
    const cardId = `user-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check if current user is admin
    const showDeleteBtn = currentChatUser && currentChatUser.isAdmin && messageId;
    const deleteBtnHTML = showDeleteBtn
        ? `<button onclick="deleteMessage('${messageId}')" style="background:transparent;border:1px solid #333;color:#666;font-size:.6rem;padding:.2rem .5rem;cursor:pointer;font-family:'Courier New',monospace;letter-spacing:1px;transition:all .3s" onmouseover="this.style.borderColor='#ff3366';this.style.color='#ff3366'" onmouseout="this.style.borderColor='#333';this.style.color='#666'" title="Delete message">✕</button>`
        : '';

    const profileUrl = userId ? `profile.html?user=${userId}` : 'profile.html';

    messageDiv.innerHTML = `
        <div style="position:relative">
            <a href="${profileUrl}" style="display:block">
                <div class="message-avatar" style="width:32px;height:32px;border-radius:50%;border:1px solid #333;overflow:hidden;background:#0a0a0a;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer">
                    ${avatarHTML}
                </div>
            </a>
            <div id="${cardId}" class="message-user-card" style="display:none;position:fixed;background:#0a0a0a;border:1px solid #333;padding:1rem;min-width:220px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.5);white-space:nowrap"></div>
        </div>
        <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:baseline;gap:.5rem;margin-bottom:.2rem;position:relative">
                <a href="${profileUrl}" class="chat-message-user" style="color: ${userColor}; text-shadow: ${userShadow}; text-decoration:none; cursor:pointer">${username}</a>
                <div class="chat-message-time" style="font-size:.5rem;color:#333;letter-spacing:1px">${formatTime(timestamp)}</div>
                ${deleteBtnHTML}
            </div>
            <div class="chat-message-text" style="color:#999;font-size:.7rem;letter-spacing:1px;word-wrap:break-word">${message}</div>
        </div>
    `;

    // Setup hover for avatar and username
    const avatar = messageDiv.querySelector('.message-avatar');
    const usernameLink = messageDiv.querySelector('.chat-message-user');
    const card = messageDiv.querySelector(`#${cardId}`);

    // Load user data if userId is available
    if (userId) {
        try {
            const userDoc = await window.chatGetDoc(window.chatDoc(window.chatDb, 'users', userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const rank = getRank(userData.diggerScore || 0);
                const displayRank = isAdmin ? 'ADMIN' : rank;

                // Use current photoURL from Firestore instead of the one from message
                const currentPhotoURL = userData.photoURL || null;

                // Update message avatar with current photo
                const messageAvatar = avatar.querySelector('img') || avatar;
                if (currentPhotoURL) {
                    avatar.innerHTML = `<img src="${currentPhotoURL}" style="width:100%;height:100%;object-fit:cover" alt="${username}">`;
                }

                const cardAvatarHTML = currentPhotoURL
                    ? `<img src="${currentPhotoURL}" style="width:100%;height:100%;object-fit:cover" alt="${username}">`
                    : defaultAvatar.replace('32', '50');

                const rankColor = isAdmin ? '#ff3366' : '#999';
                const userNameColor = isAdmin ? '#ff3366' : '#fff';
                const userNameShadow = isAdmin ? '0 0 7px #ff3366, 0 0 10px #ff3366' : '0 0 7px #fff, 0 0 10px #fff';

                card.innerHTML = `
                    <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:.8rem">
                        <div style="width:50px;height:50px;border-radius:50%;border:1px solid #333;overflow:hidden;background:#0a0a0a;display:flex;align-items:center;justify-content:center">
                            ${cardAvatarHTML}
                        </div>
                        <div>
                            <div style="font-size:.8rem;letter-spacing:2px;margin-bottom:.3rem;color:${userNameColor};text-shadow:${userNameShadow}">${username}</div>
                            <div style="font-size:.6rem;letter-spacing:1px;color:${rankColor}">${displayRank}</div>
                        </div>
                    </div>
                    <div style="border-top:1px solid #1a1a1a;padding-top:.8rem;font-size:.6rem;letter-spacing:1px;color:#666">
                        <div style="margin-bottom:.3rem">DIGGER SCORE: <span style="color:#999">${userData.diggerScore || 0}</span></div>
                        <div>TRACKS SHARED: <span style="color:#999">${userData.tracksSubmitted || 0}</span></div>
                    </div>
                `;

                // Show/hide card on hover with dynamic positioning
                const showCard = (e) => {
                    const rect = avatar.getBoundingClientRect();
                    card.style.display = 'block';
                    card.style.left = `${rect.left}px`;
                    card.style.top = `${rect.top - card.offsetHeight - 10}px`;
                };

                const hideCard = () => {
                    card.style.display = 'none';
                };

                avatar.addEventListener('mouseenter', showCard);
                avatar.addEventListener('mouseleave', hideCard);
                usernameLink.addEventListener('mouseenter', showCard);
                usernameLink.addEventListener('mouseleave', hideCard);
                card.addEventListener('mouseenter', () => card.style.display = 'block');
                card.addEventListener('mouseleave', hideCard);
            }
        } catch (error) {
            console.error('Error loading user data for message:', error);
        }
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Función para enviar mensaje
async function sendMessage() {
    // Only allow registered users to send messages
    if (!currentChatUser) {
        customAlert('Debes estar registrado para usar el chat.\n\nHaz click en LOGIN para crear tu cuenta gratis.', '⚠️');
        chatMessage.value = ''; // Clear the message
        return;
    }

    const username = currentChatUser.username;
    const message = chatMessage.value.trim();

    if (!message) {
        return;
    }

    if (!window.chatDb) {
        customAlert('Firebase no está configurado. Por favor sigue las instrucciones en firebase-config.js', '⚠️');
        return;
    }

    try {
        // Limpiar el campo ANTES de enviar
        const messageText = message;
        chatMessage.value = '';

        await window.chatAddDoc(window.chatCollection(window.chatDb, 'messages'), {
            username: username,
            message: messageText,
            timestamp: window.chatServerTimestamp(),
            userId: currentChatUser ? currentChatUser.userId : null,
            isAdmin: currentChatUser ? currentChatUser.isAdmin : false,
            photoURL: currentChatUser ? currentChatUser.photoURL : null
        });

        chatMessage.focus();
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        customAlert('Error al enviar mensaje. Verifica que Firebase esté configurado correctamente.', '❌');
        // Si hay error, devolver el mensaje al campo
        chatMessage.value = message;
    }
}

// Event listeners para enviar mensaje
chatSend.addEventListener('click', sendMessage);

chatMessage.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Escuchar mensajes en tiempo real
let loadedMessageIds = new Set();

function startListeningToMessages() {
    if (!window.chatDb) {
        console.log('Esperando configuración de Firebase...');
        setTimeout(startListeningToMessages, 1000);
        return;
    }

    try {
        const messagesRef = window.chatCollection(window.chatDb, 'messages');
        const q = window.chatQuery(
            messagesRef,
            window.chatOrderBy('timestamp', 'asc'),
            window.chatLimit(50)
        );

        window.chatOnSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                const messageId = change.doc.id;

                if (change.type === 'added' && !loadedMessageIds.has(messageId)) {
                    loadedMessageIds.add(messageId);
                    addMessageToDOM(
                        data.username,
                        data.message,
                        data.timestamp,
                        data.isAdmin || false,
                        data.userId || null,
                        data.photoURL || null,
                        messageId
                    );
                }

                if (change.type === 'removed') {
                    loadedMessageIds.delete(messageId);
                    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
                    if (messageElement) {
                        messageElement.remove();
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error al escuchar mensajes:', error);
    }
}

// Función para eliminar mensaje (solo admins)
window.deleteMessage = async function(messageId) {
    if (!currentChatUser || !currentChatUser.isAdmin) {
        customAlert('Solo los admins pueden eliminar mensajes.', '⚠️');
        return;
    }

    const confirmation = confirm('¿Estás seguro de que quieres eliminar este mensaje?');
    if (!confirmation) return;

    try {
        const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        await deleteDoc(doc(window.chatDb, 'messages', messageId));
    } catch (error) {
        console.error('Error deleting message:', error);
        customAlert('Error al eliminar el mensaje.', '❌');
    }
}

// Iniciar escucha de mensajes cuando la página cargue
window.addEventListener('load', () => {
    setTimeout(startListeningToMessages, 500);
});
