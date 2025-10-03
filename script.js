// Music tracks data
const musicTracks = [
    {
        title: "Round 1",
        artist: "Estella Boersma",
        platform: "spotify",
        embedUrl: "https://open.spotify.com/embed/track/3RLG2UI8wEu1Rnf80Vg7xN"
    },
    {
        title: "Street Funk",
        artist: "West Code",
        platform: "spotify",
        embedUrl: "https://open.spotify.com/embed/track/7y2pM8ZmH3fvcc6nyLZsbn"
    },
    {
        title: "russian porn magazine",
        artist: "Vladimir Dubyshkin",
        platform: "spotify",
        embedUrl: "https://open.spotify.com/embed/track/764FhIvhhpu1Krl2DOQTLK"
    },
    {
        title: "Daily Prayer",
        artist: "Mr. G",
        platform: "spotify",
        embedUrl: "https://open.spotify.com/embed/track/64FyP2IcDx6cgyZUUSIPYa"
    },
    {
        title: "Valley of the Shadows",
        artist: "Origin Unknown",
        platform: "spotify",
        embedUrl: "https://open.spotify.com/embed/track/6fzwardfFs6sVfNA5R1ypt"
    }
];

// Variables para infinite scroll
let currentIndex = 0;
const tracksPerLoad = 3;
const feedContainer = document.getElementById('musicFeed');
const loading = document.getElementById('loading');

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

    card.innerHTML = `
        <div class="track-header">
            <div class="track-title">${track.title}</div>
            <div class="track-artist">${track.artist}</div>
            <span class="track-platform ${platformClass}">${platformName}</span>
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

// Carga inicial
loadMoreTracks();

// INSTRUCCIONES PARA AGREGAR TUS TRACKS:
//
// SPOTIFY:
// 1. Abre el track en Spotify web
// 2. Click en "..." > "Share" > "Embed track"
// 3. Copia el URL del src (ejemplo: https://open.spotify.com/embed/track/XXXXXX)
// 4. Agrega al array: { title: "Nombre", artist: "Artista", platform: "spotify", embedUrl: "URL_COPIADO" }
//
// SOUNDCLOUD:
// 1. Abre el track en SoundCloud
// 2. Click en "Share" > "Embed"
// 3. Copia el URL del src del iframe
// 4. Agrega al array: { title: "Nombre", artist: "Artista", platform: "soundcloud", embedUrl: "URL_COPIADO" }
//
// YOUTUBE:
// 1. Abre el video en YouTube
// 2. Click en "Share" > "Embed"
// 3. Copia el URL (https://www.youtube.com/embed/VIDEO_ID)
// 4. Agrega al array: { title: "Nombre", artist: "Artista", platform: "youtube", embedUrl: "URL_COPIADO" }
