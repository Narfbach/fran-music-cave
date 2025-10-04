// Music tracks data - Se cargará desde Firebase
let musicTracks = [];
let allTracksLoaded = false;
let trackIds = new Set(); // Para detectar tracks nuevos

// Variables para infinite scroll
let currentIndex = 0;
const tracksPerLoad = 3;
const feedContainer = document.getElementById('musicFeed');
const loading = document.getElementById('loading');

// Cargar tracks desde Firebase
async function loadTracksFromFirebase() {
    if (!window.chatDb) {
        console.log('Waiting for Firebase...');
        setTimeout(loadTracksFromFirebase, 500);
        return;
    }

    try {
        const tracksRef = window.chatCollection(window.chatDb, 'tracks');
        const q = window.chatQuery(
            tracksRef,
            window.chatOrderBy('timestamp', 'desc')
        );

        // Escuchar cambios en tiempo real
        window.chatOnSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const trackData = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };

                    // Si es un track nuevo (no en la carga inicial)
                    if (allTracksLoaded && !trackIds.has(trackData.id)) {
                        // Insertar al principio del feed con animación
                        const newCard = createTrackCard(trackData);
                        newCard.classList.add('track-new');
                        feedContainer.insertBefore(newCard, feedContainer.firstChild);

                        // Quitar la clase después de la animación
                        setTimeout(() => {
                            newCard.classList.remove('track-new');
                        }, 1000);
                    }

                    trackIds.add(trackData.id);
                }
            });

            // Actualizar array completo
            musicTracks = [];
            snapshot.forEach((doc) => {
                musicTracks.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Si es la primera carga, mostrar tracks
            if (!allTracksLoaded) {
                allTracksLoaded = true;
                feedContainer.innerHTML = '';
                currentIndex = 0;
                loadMoreTracks();

                // Marcar todos los tracks iniciales
                snapshot.forEach((doc) => {
                    trackIds.add(doc.id);
                });
            }
        });
    } catch (error) {
        console.error('Error loading tracks:', error);
    }
}

// Intersection Observer para lazy loading
const lazyLoadObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const iframe = entry.target;
            if (iframe.dataset.src) {
                iframe.src = iframe.dataset.src;
                iframe.removeAttribute('data-src');
                observer.unobserve(iframe);
            }
        }
    });
}, {
    rootMargin: '200px' // Cargar 200px antes de que sea visible
});

// Función para crear una tarjeta de track
function createTrackCard(track) {
    const card = document.createElement('div');
    card.className = 'track-card';

    const platformClass = `platform-${track.platform}`;
    const platformName = track.platform.charAt(0).toUpperCase() + track.platform.slice(1);

    // Determinar altura del iframe según plataforma
    let iframeHeight = '152'; // Spotify default
    if (track.platform === 'soundcloud') iframeHeight = '166';
    if (track.platform === 'youtube') iframeHeight = '315';

    let submittedBy = track.submittedBy || 'Anonymous';

    // Clean username if it's an email
    if (submittedBy.includes('@')) {
        submittedBy = submittedBy.split('@')[0];
    }

    const trackId = track.id;
    const likes = track.likes || 0;
    const userId = track.userId || null;
    const isAdmin = track.isAdmin || false;

    // Verificar si el usuario ya dio like
    const likedTracks = JSON.parse(localStorage.getItem('likedTracks') || '[]');
    const isLiked = likedTracks.includes(trackId);

    // Generate user card ID
    const userCardId = `track-user-card-${trackId}`;

    // Apply neon glow based on admin status
    let userColor, userShadow;
    if (isAdmin) {
        userColor = '#ff3366';
        userShadow = '0 0 7px #ff3366, 0 0 10px #ff3366, 0 0 21px #ff3366, 0 0 42px #ff0044';
    } else {
        userColor = '#fff';
        userShadow = '0 0 7px #fff, 0 0 10px #fff, 0 0 21px #fff, 0 0 42px #ccc';
    }

    card.innerHTML = `
        <div class="track-header">
            <div class="track-title">${track.title}</div>
            <div class="track-artist">${track.artist}</div>
            <div class="track-meta">
                <span class="track-platform ${platformClass}">${platformName}</span>
                <span class="track-submitter" style="position:relative;display:flex;align-items:center;gap:0.5rem">
                    <span style="color:#999">shared by</span>
                    <div class="track-user-info" style="display:flex;align-items:center;gap:0.4rem;cursor:pointer">
                        <div class="track-user-avatar" style="width:24px;height:24px;border-radius:50%;border:1px solid #333;overflow:hidden;background:#0a0a0a;display:flex;align-items:center;justify-content:center"></div>
                        <a href="${userId ? `profile.html?user=${userId}` : 'profile.html'}" class="track-username" style="color:${userColor};text-shadow:${userShadow};text-decoration:none;cursor:pointer">${submittedBy}</a>
                    </div>
                </span>
            </div>
        </div>
        <div class="track-player">
            <iframe
                data-src="${track.embedUrl}"
                height="${iframeHeight}"
                frameborder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style="background: #0a0a0a;">
            </iframe>
        </div>
        <div class="track-interactions">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-track-id="${trackId}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span class="like-count">${likes}</span>
            </button>
            <button class="comment-btn" data-track-id="${trackId}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Comment</span>
                <span class="comment-count" style="display: none;">0</span>
            </button>
        </div>
        <div class="track-comments" id="comments-${trackId}" style="display: none;">
            <div class="comments-list" id="comments-list-${trackId}"></div>
            <div class="comment-input-container">
                <input type="text" class="comment-input" placeholder="Add a comment..." maxlength="200">
                <button class="comment-send">Send</button>
            </div>
        </div>
    `;

    // Event listeners para likes y comentarios
    setupInteractions(card, trackId);

    // Inicializar contador de comentarios
    initCommentCount(trackId);

    // Setup user card hover if user exists
    if (userId) {
        setupTrackUserCard(card, userId, userCardId, submittedBy, isAdmin);
    }

    // Lazy load iframe
    const iframe = card.querySelector('iframe');
    if (iframe) {
        lazyLoadObserver.observe(iframe);
    }

    return card;
}

// Function to get rank from score
function getRankFromScore(score) {
    if (score >= 1000) return 'CAVE MASTER';
    if (score >= 500) return 'LEGEND';
    if (score >= 100) return 'TASTE MAKER';
    if (score >= 50) return 'CRATE DIGGER';
    if (score >= 10) return 'DIGGER';
    return 'NEWCOMER';
}

// Setup user card hover for track
async function setupTrackUserCard(card, userId, userCardId, username, isAdmin) {
    try {
        // Clean username if it's an email
        if (username && username.includes('@')) {
            username = username.split('@')[0];
        }

        const userDoc = await window.chatGetDoc(window.chatDoc(window.chatDb, 'users', userId));
        if (!userDoc.exists()) return;

        const userData = userDoc.data();
        const rank = getRankFromScore(userData.diggerScore || 0);
        const displayRank = isAdmin ? 'ADMIN' : rank;
        const photoURL = userData.photoURL || null;

        const defaultAvatar = `<svg width="50" height="50" viewBox="0 0 100 100" style="opacity:0.3">
            <circle cx="50" cy="50" r="45" fill="#111"/>
            <circle cx="50" cy="50" r="40" fill="#0a0a0a"/>
            <circle cx="50" cy="50" r="30" fill="#111"/>
            <circle cx="50" cy="50" r="20" fill="#0a0a0a"/>
            <circle cx="50" cy="50" r="8" fill="#222"/>
            <circle cx="50" cy="50" r="3" fill="#000"/>
        </svg>`;

        const smallAvatar = `<svg width="24" height="24" viewBox="0 0 100 100" style="opacity:0.3">
            <circle cx="50" cy="50" r="45" fill="#111"/>
            <circle cx="50" cy="50" r="40" fill="#0a0a0a"/>
            <circle cx="50" cy="50" r="30" fill="#111"/>
            <circle cx="50" cy="50" r="20" fill="#0a0a0a"/>
            <circle cx="50" cy="50" r="8" fill="#222"/>
            <circle cx="50" cy="50" r="3" fill="#000"/>
        </svg>`;

        const cardAvatarHTML = photoURL
            ? `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover" alt="${username}">`
            : defaultAvatar;

        const smallAvatarHTML = photoURL
            ? `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover" alt="${username}">`
            : smallAvatar;

        const rankColor = isAdmin ? '#ff3366' : '#999';
        const userNameColor = isAdmin ? '#ff3366' : '#fff';
        const userNameShadow = isAdmin ? '0 0 7px #ff3366, 0 0 10px #ff3366' : '0 0 7px #fff, 0 0 10px #fff';

        // Set small avatar in track meta
        const trackAvatar = card.querySelector('.track-user-avatar');
        if (trackAvatar) {
            trackAvatar.innerHTML = smallAvatarHTML;
        }

        // Create user card in body instead of inside track card
        let userCard = document.getElementById(userCardId);
        if (!userCard) {
            userCard = document.createElement('div');
            userCard.id = userCardId;
            userCard.className = 'track-user-card';
            userCard.style.cssText = 'display:none;position:fixed;background:#0a0a0a;border:1px solid #333;padding:1rem;min-width:220px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.5);white-space:nowrap';
            document.body.appendChild(userCard);
        }

        userCard.innerHTML = `
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

        // Setup hover - exactly like chat
        const trackAvatarEl = card.querySelector('.track-user-avatar');
        const usernameLink = card.querySelector('.track-username');

        if (!trackAvatarEl || !usernameLink) {
            console.error('Track avatar or username not found');
            return;
        }

        const showCard = (e) => {
            const rect = trackAvatarEl.getBoundingClientRect();
            userCard.style.display = 'block';
            userCard.style.left = `${rect.left}px`;
            userCard.style.top = `${rect.bottom + 10}px`;
        };

        const hideCard = () => {
            userCard.style.display = 'none';
        };

        trackAvatarEl.addEventListener('mouseenter', showCard);
        trackAvatarEl.addEventListener('mouseleave', hideCard);
        usernameLink.addEventListener('mouseenter', showCard);
        usernameLink.addEventListener('mouseleave', hideCard);
        userCard.addEventListener('mouseenter', () => userCard.style.display = 'block');
        userCard.addEventListener('mouseleave', hideCard);

    } catch (error) {
        console.error('Error loading user data for track:', error);
    }
}

// Función para cargar más tracks
function loadMoreTracks() {
    const endIndex = Math.min(currentIndex + tracksPerLoad, musicTracks.length);

    for (let i = currentIndex; i < endIndex; i++) {
        const trackCard = createTrackCard(musicTracks[i]);
        feedContainer.appendChild(trackCard);
    }

    currentIndex = endIndex;

    // Si llegamos al final, volver a empezar (infinite scroll)
    if (currentIndex >= musicTracks.length) {
        currentIndex = 0;
    }
}

// Infinite scroll detection
function handleScroll() {
    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.documentElement.scrollHeight - 500;

    if (scrollPosition >= threshold && !loading.classList.contains('active')) {
        loading.classList.add('active');

        // Simular delay de carga
        setTimeout(() => {
            loadMoreTracks();
            loading.classList.remove('active');
        }, 800);
    }
}

// Event listeners
window.addEventListener('scroll', handleScroll);

// Función para configurar interacciones (likes y comentarios)
function setupInteractions(card, trackId) {
    const likeBtn = card.querySelector('.like-btn');
    const commentBtn = card.querySelector('.comment-btn');
    const commentsSection = card.querySelector(`#comments-${trackId}`);
    const commentInput = card.querySelector('.comment-input');
    const commentSend = card.querySelector('.comment-send');

    // Like button
    likeBtn.addEventListener('click', async () => {
        if (!window.chatDb) return;

        // Obtener likes guardados localmente
        const likedTracks = JSON.parse(localStorage.getItem('likedTracks') || '[]');
        const isCurrentlyLiked = likedTracks.includes(trackId);

        const trackRef = window.chatDoc(window.chatDb, 'tracks', trackId);
        const likeCountSpan = likeBtn.querySelector('.like-count');

        try {
            const docSnap = await window.chatGetDoc(trackRef);
            const trackData = docSnap.data();
            const currentLikes = trackData.likes || 0;
            const trackOwnerId = trackData.userId;

            if (isCurrentlyLiked) {
                // Quitar like
                const newLikes = Math.max(0, currentLikes - 1);
                await window.chatUpdateDoc(trackRef, { likes: newLikes });

                // Update track owner's totalLikes and diggerScore
                if (trackOwnerId) {
                    const userRef = window.chatDoc(window.chatDb, 'users', trackOwnerId);
                    const userDoc = await window.chatGetDoc(userRef);
                    if (userDoc.exists()) {
                        const currentTotalLikes = userDoc.data().totalLikes || 0;
                        const currentScore = userDoc.data().diggerScore || 0;
                        await window.chatUpdateDoc(userRef, {
                            totalLikes: Math.max(0, currentTotalLikes - 1),
                            diggerScore: Math.max(0, currentScore - 1) // -1 point per like removed
                        });
                    }
                }

                // Actualizar UI inmediatamente
                likeCountSpan.textContent = newLikes;

                // Remover del localStorage
                const updatedLikes = likedTracks.filter(id => id !== trackId);
                localStorage.setItem('likedTracks', JSON.stringify(updatedLikes));

                // Actualizar corazón
                likeBtn.classList.remove('liked');
                const svg = likeBtn.querySelector('svg');
                svg.setAttribute('fill', 'none');
            } else {
                // Dar like
                const newLikes = currentLikes + 1;
                await window.chatUpdateDoc(trackRef, { likes: newLikes });

                // Update track owner's totalLikes and diggerScore
                if (trackOwnerId) {
                    const userRef = window.chatDoc(window.chatDb, 'users', trackOwnerId);
                    const userDoc = await window.chatGetDoc(userRef);
                    if (userDoc.exists()) {
                        const currentTotalLikes = userDoc.data().totalLikes || 0;
                        const currentScore = userDoc.data().diggerScore || 0;
                        await window.chatUpdateDoc(userRef, {
                            totalLikes: currentTotalLikes + 1,
                            diggerScore: currentScore + 1 // +1 point per like
                        });
                    }
                }

                // Actualizar UI inmediatamente
                likeCountSpan.textContent = newLikes;

                // Agregar al localStorage
                likedTracks.push(trackId);
                localStorage.setItem('likedTracks', JSON.stringify(likedTracks));

                // Actualizar corazón
                likeBtn.classList.add('liked');
                const svg = likeBtn.querySelector('svg');
                svg.setAttribute('fill', 'currentColor');
            }
        } catch (error) {
            console.error('Error liking track:', error);
        }
    });

    // Comment button - toggle
    commentBtn.addEventListener('click', () => {
        const isVisible = commentsSection.style.display !== 'none';
        commentsSection.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            loadComments(trackId);
        }
    });

    // Send comment
    commentSend.addEventListener('click', () => sendComment(trackId, commentInput));
    commentInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendComment(trackId, commentInput);
    });
}

// Función para enviar comentario
async function sendComment(trackId, input) {
    const text = input.value.trim();
    if (!text || !window.chatDb) return;

    const username = localStorage.getItem('chatUsername') || 'Anonymous';

    try {
        await window.chatAddDoc(window.chatCollection(window.chatDb, `tracks/${trackId}/comments`), {
            username: username,
            text: text,
            timestamp: window.chatServerTimestamp()
        });

        input.value = '';
        loadComments(trackId);
    } catch (error) {
        console.error('Error sending comment:', error);
    }
}

// Función para inicializar contador de comentarios
async function initCommentCount(trackId) {
    if (!window.chatDb) return;

    const commentsRef = window.chatCollection(window.chatDb, `tracks/${trackId}/comments`);

    window.chatOnSnapshot(commentsRef, (snapshot) => {
        const commentCount = snapshot.size;
        const commentBtn = document.querySelector(`.comment-btn[data-track-id="${trackId}"]`);
        if (commentBtn) {
            const countSpan = commentBtn.querySelector('.comment-count');
            if (countSpan) {
                countSpan.textContent = commentCount;
                countSpan.style.display = commentCount > 0 ? 'inline' : 'none';
            }
        }
    });
}

// Función para cargar comentarios
async function loadComments(trackId) {
    if (!window.chatDb) return;

    const commentsRef = window.chatCollection(window.chatDb, `tracks/${trackId}/comments`);
    const q = window.chatQuery(commentsRef, window.chatOrderBy('timestamp', 'desc'), window.chatLimit(10));

    window.chatOnSnapshot(q, (snapshot) => {
        const commentsList = document.getElementById(`comments-list-${trackId}`);
        if (!commentsList) return;

        commentsList.innerHTML = '';

        // Actualizar contador de comentarios
        const commentCount = snapshot.size;
        const commentBtn = document.querySelector(`.comment-btn[data-track-id="${trackId}"]`);
        if (commentBtn) {
            const countSpan = commentBtn.querySelector('.comment-count');
            if (countSpan) {
                countSpan.textContent = commentCount;
                countSpan.style.display = commentCount > 0 ? 'inline' : 'none';
            }
        }

        snapshot.forEach((doc) => {
            const comment = doc.data();
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment-item';
            commentDiv.innerHTML = `
                <span class="comment-user">${comment.username}</span>
                <span class="comment-text">${comment.text}</span>
            `;
            commentsList.appendChild(commentDiv);
        });
    });
}

// Iniciar carga desde Firebase
window.addEventListener('load', () => {
    setTimeout(loadTracksFromFirebase, 500);
});
