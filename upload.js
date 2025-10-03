// Upload functionality
const uploadSection = document.getElementById('uploadSection');
const uploadToggle = document.getElementById('uploadToggle');
const uploadClose = document.getElementById('uploadClose');
const uploadForm = document.getElementById('uploadForm');
const uploadSuccess = document.getElementById('uploadSuccess');

// Abrir modal de upload
uploadToggle.addEventListener('click', () => {
    uploadSection.classList.add('active');
    document.body.style.overflow = 'hidden';
});

// Cerrar modal
uploadClose.addEventListener('click', closeUploadModal);

uploadSection.addEventListener('click', (e) => {
    if (e.target === uploadSection) {
        closeUploadModal();
    }
});

function closeUploadModal() {
    uploadSection.classList.remove('active');
    document.body.style.overflow = 'auto';
    uploadForm.reset();
    uploadForm.style.display = 'block';
    uploadSuccess.classList.remove('active');
}

// Función para detectar plataforma y convertir URL
function processTrackUrl(url) {
    // Spotify
    if (url.includes('spotify.com')) {
        const match = url.match(/track\/([a-zA-Z0-9]+)/);
        if (match) {
            return {
                platform: 'spotify',
                embedUrl: `https://open.spotify.com/embed/track/${match[1]}`
            };
        }
    }

    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId;
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else {
            const match = url.match(/[?&]v=([^&]+)/);
            videoId = match ? match[1] : null;
        }
        if (videoId) {
            return {
                platform: 'youtube',
                embedUrl: `https://www.youtube.com/embed/${videoId}`
            };
        }
    }

    // SoundCloud
    if (url.includes('soundcloud.com')) {
        return {
            platform: 'soundcloud',
            embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`
        };
    }

    return null;
}

// Enviar formulario
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const trackUrl = document.getElementById('trackUrl').value.trim();
    const trackTitle = document.getElementById('trackTitle').value.trim();
    const trackArtist = document.getElementById('trackArtist').value.trim();
    const submitterName = document.getElementById('submitterName').value.trim();

    // Procesar URL
    const trackData = processTrackUrl(trackUrl);

    if (!trackData) {
        alert('Invalid URL. Please use Spotify, YouTube or SoundCloud links.');
        return;
    }

    if (!window.chatDb) {
        alert('Firebase is not configured properly.');
        return;
    }

    try {
        // Get current user info
        const userId = window.currentUser?.uid || null;
        const username = window.currentUser?.displayName || submitterName || 'Anonymous';

        // Guardar directamente en la colección "tracks" (publicación automática)
        await window.chatAddDoc(window.chatCollection(window.chatDb, 'tracks'), {
            title: trackTitle,
            artist: trackArtist,
            platform: trackData.platform,
            embedUrl: trackData.embedUrl,
            submittedBy: username,
            userId: userId,
            timestamp: window.chatServerTimestamp(),
            likes: 0
        });

        // Mostrar mensaje de éxito
        uploadForm.style.display = 'none';
        uploadSuccess.classList.add('active');

        // Cerrar automáticamente después de 2 segundos
        setTimeout(() => {
            closeUploadModal();
        }, 2000);

    } catch (error) {
        console.error('Error submitting track:', error);
        alert('Error submitting track. Please try again.');
    }
});
