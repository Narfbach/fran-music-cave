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
            const username = user.displayName || user.email.split('@')[0];

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
function addMessageToDOM(username, message, timestamp, isAdmin = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';

    // Apply neon glow based on admin status
    let userColor, userShadow;
    if (isAdmin) {
        userColor = '#ff3366';
        userShadow = '0 0 7px #ff3366, 0 0 10px #ff3366, 0 0 21px #ff3366, 0 0 42px #ff0044';
    } else {
        userColor = '#fff';
        userShadow = '0 0 7px #fff, 0 0 10px #fff, 0 0 21px #fff, 0 0 42px #ccc';
    }

    messageDiv.innerHTML = `
        <div class="chat-message-user" style="color: ${userColor}; text-shadow: ${userShadow}">${username}</div>
        <div class="chat-message-text">${message}</div>
        <div class="chat-message-time">${formatTime(timestamp)}</div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Función para enviar mensaje
async function sendMessage() {
    // Only allow registered users to send messages
    if (!currentChatUser) {
        alert('⚠️ Debes estar registrado para usar el chat.\n\nHaz click en LOGIN para crear tu cuenta gratis.');
        chatMessage.value = ''; // Clear the message
        return;
    }

    const username = currentChatUser.username;
    const message = chatMessage.value.trim();

    if (!message) {
        return;
    }

    if (!window.chatDb) {
        alert('Firebase no está configurado. Por favor sigue las instrucciones en firebase-config.js');
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
            isAdmin: currentChatUser ? currentChatUser.isAdmin : false
        });

        chatMessage.focus();
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        alert('Error al enviar mensaje. Verifica que Firebase esté configurado correctamente.');
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
            window.chatOrderBy('timestamp', 'desc'),
            window.chatLimit(50)
        );

        window.chatOnSnapshot(q, (snapshot) => {
            chatMessages.innerHTML = '';
            const messages = [];

            snapshot.forEach((doc) => {
                messages.push(doc.data());
            });

            // Mostrar en orden cronológico (inverso a como vienen)
            messages.reverse().forEach((data) => {
                addMessageToDOM(data.username, data.message, data.timestamp, data.isAdmin || false);
            });
        });
    } catch (error) {
        console.error('Error al escuchar mensajes:', error);
    }
}

// Iniciar escucha de mensajes cuando la página cargue
window.addEventListener('load', () => {
    setTimeout(startListeningToMessages, 500);
});
