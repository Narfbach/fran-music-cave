// Music tracks data - Se cargará desde Firebase
let musicTracks = [];
let allTracksLoaded = false;

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
            musicTracks = [];
            snapshot.forEach((doc) => {
                musicTracks.push(doc.data());
            });

            // Si es la primera carga, mostrar tracks
            if (!allTracksLoaded) {
                allTracksLoaded = true;
                feedContainer.innerHTML = '';
                currentIndex = 0;
                loadMoreTracks();
            }
        });
    } catch (error) {
        console.error('Error loading tracks:', error);
    }
}

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
                src="${track.embedUrl}"
                height="${iframeHeight}"
                frameborder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy">
            </iframe>
        </div>
    `;

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

// Iniciar carga desde Firebase
window.addEventListener('load', () => {
    setTimeout(loadTracksFromFirebase, 500);
});
