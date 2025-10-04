// Load tracks from Supabase with realtime
let tracksSubscription = null

async function loadTracksFromSupabase() {
    // Initial load
    const { data: tracks, error } = await supabase
        .from('tracks')
        .select(`
            *,
            users:user_id (username, photo_url, is_admin)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) {
        console.error('Error loading tracks:', error)
        return
    }

    // Render tracks
    renderTracks(tracks)

    // Subscribe to realtime changes
    tracksSubscription = supabase
        .channel('public:tracks')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'tracks' },
            (payload) => {
                console.log('New track added:', payload.new)
                prependTrack(payload.new)
            }
        )
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'tracks' },
            (payload) => {
                console.log('Track updated:', payload.new)
                updateTrack(payload.new)
            }
        )
        .subscribe()
}

function renderTracks(tracks) {
    const feedContainer = document.getElementById('musicFeed')
    feedContainer.innerHTML = ''

    tracks.forEach(track => {
        const card = createTrackCard(track)
        feedContainer.appendChild(card)
    })
}

// Start loading
window.addEventListener('load', loadTracksFromSupabase)
