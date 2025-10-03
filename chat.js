// Chat functionality
const chatMessages = document.getElementById('chatMessages');
const chatUsername = document.getElementById('chatUsername');
const chatMessage = document.getElementById('chatMessage');
const chatSend = document.getElementById('chatSend');
const chatToggle = document.getElementById('chatToggle');
const chatSection = document.getElementById('chatSection');

// Guardar username y color en localStorage
const savedUsername = localStorage.getItem('chatUsername');
const savedColor = localStorage.getItem('chatColor');

if (savedUsername) {
    chatUsername.value = savedUsername;
}

// Función para generar color único basado en el username
function getUsernameColor(username) {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e2', '#f8b739', '#6c5ce7'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

chatUsername.addEventListener('blur', () => {
    if (chatUsername.value.trim()) {
        const username = chatUsername.value.trim().toUpperCase();
        localStorage.setItem('chatUsername', username);
        localStorage.setItem('chatColor', getUsernameColor(username));
    }
});

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
function addMessageToDOM(username, message, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';

    const userColor = getUsernameColor(username);

    messageDiv.innerHTML = `
        <div class="chat-message-user" style="color: ${userColor}">${username}</div>
        <div class="chat-message-text">${message}</div>
        <div class="chat-message-time">${formatTime(timestamp)}</div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Función para enviar mensaje
async function sendMessage() {
    const username = chatUsername.value.trim().toUpperCase();
    const message = chatMessage.value.trim();

    if (!username) {
        alert('Por favor ingresa tu nick');
        chatUsername.focus();
        return;
    }

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
            timestamp: window.chatServerTimestamp()
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
                addMessageToDOM(data.username, data.message, data.timestamp);
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
