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

    const submittedBy = track.submittedBy || 'Anonymous';
    const trackId = track.id;
    const likes = track.likes || 0;

    // Verificar si el usuario ya dio like
    const likedTracks = JSON.parse(localStorage.getItem('likedTracks') || '[]');
    const isLiked = likedTracks.includes(trackId);

    card.innerHTML = `
        <div class="track-header">
            <div class="track-title">${track.title}</div>
            <div class="track-artist">${track.artist}</div>
            <div class="track-meta">
                <span class="track-platform ${platformClass}">${platformName}</span>
                <span class="track-submitter">shared by ${submittedBy}</span>
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

    // Lazy load iframe
    const iframe = card.querySelector('iframe');
    if (iframe) {
        lazyLoadObserver.observe(iframe);
    }

    return card;
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
            const currentLikes = docSnap.data().likes || 0;

            if (isCurrentlyLiked) {
                // Quitar like
                const newLikes = Math.max(0, currentLikes - 1);
                await window.chatUpdateDoc(trackRef, { likes: newLikes });

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
