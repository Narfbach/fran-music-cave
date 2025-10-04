// Complete Supabase Tracks System with likes, comments, and notifications
let tracksSubscription = null;
let musicTracks = [];

async function loadTracksFromSupabase() {
    if (!window.supabase) {
        console.log('Waiting for Supabase...');
        setTimeout(loadTracksFromSupabase, 500);
        return;
    }

    try {
        // Initial load with user join
        const { data: tracks, error } = await supabase
            .from('tracks')
            .select(`
                *,
                users:user_id (username, photo_url, is_admin)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        musicTracks = tracks;
        renderTracks(tracks);
        setupRealtimeSubscription();

    } catch (error) {
        console.error('Error loading tracks:', error);
    }
}

function renderTracks(tracks) {
    const feedContainer = document.getElementById('musicFeed');
    feedContainer.innerHTML = '';

    tracks.forEach(track => {
        const card = createTrackCard(track);
        feedContainer.appendChild(card);
    });
}

function createTrackCard(track) {
    const card = document.createElement('div');
    card.className = 'track-card';
    card.setAttribute('data-track-id', track.id);

    const platformClass = `platform-${track.platform}`;
    const platformName = track.platform.charAt(0).toUpperCase() + track.platform.slice(1);

    let iframeHeight = '152';
    if (track.platform === 'soundcloud') iframeHeight = '166';
    if (track.platform === 'youtube') iframeHeight = '315';

    let submittedBy = track.submitted_by || 'Anonymous';
    if (submittedBy.includes('@')) {
        submittedBy = submittedBy.split('@')[0];
    }

    const userId = track.user_id;
    const isAdmin = track.users?.is_admin || false;

    const likedTracks = JSON.parse(localStorage.getItem('likedTracks') || '[]');
    const isLiked = likedTracks.includes(track.id);

    const userColor = isAdmin ? '#ff3366' : '#fff';
    const userShadow = isAdmin
        ? '0 0 7px #ff3366, 0 0 10px #ff3366, 0 0 21px #ff3366, 0 0 42px #ff0044'
        : '0 0 7px #fff, 0 0 10px #fff, 0 0 21px #fff, 0 0 42px #ccc';

    const photoURL = track.users?.photo_url || null;
    const smallAvatarHTML = photoURL
        ? `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover" alt="${submittedBy}">`
        : `<svg width="24" height="24" viewBox="0 0 100 100" style="opacity:0.3">
            <circle cx="50" cy="50" r="45" fill="#111"/>
            <circle cx="50" cy="50" r="40" fill="#0a0a0a"/>
            <circle cx="50" cy="50" r="30" fill="#111"/>
            <circle cx="50" cy="50" r="20" fill="#0a0a0a"/>
            <circle cx="50" cy="50" r="8" fill="#222"/>
            <circle cx="50" cy="50" r="3" fill="#000"/>
          </svg>`;

    card.innerHTML = `
        <div class="track-header">
            <div class="track-title">${track.title}</div>
            <div class="track-artist">${track.artist}</div>
            <div class="track-meta">
                <span class="track-platform ${platformClass}">${platformName}</span>
                <span class="track-submitter" style="position:relative;display:flex;align-items:center;gap:0.5rem">
                    <span style="color:#999">shared by</span>
                    <div class="track-user-info" style="display:flex;align-items:center;gap:0.4rem">
                        <div class="track-user-avatar" style="width:24px;height:24px;border-radius:50%;border:1px solid #333;overflow:hidden;background:#0a0a0a">
                            ${smallAvatarHTML}
                        </div>
                        <a href="${userId ? `profile.html?user=${userId}` : 'profile.html'}" class="track-username" style="color:${userColor};text-shadow:${userShadow};text-decoration:none">${submittedBy}</a>
                    </div>
                </span>
            </div>
        </div>
        <div class="track-player">
            <iframe
                src="${track.embed_url}"
                height="${iframeHeight}"
                frameborder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style="background: #0a0a0a;">
            </iframe>
        </div>
        <div class="track-interactions">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-track-id="${track.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span class="like-count">${track.likes || 0}</span>
            </button>
            <button class="comment-btn" data-track-id="${track.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Comment</span>
                <span class="comment-count" style="display: none;">0</span>
            </button>
        </div>
        <div class="track-comments" id="comments-${track.id}" style="display: none;">
            <div class="comments-list" id="comments-list-${track.id}"></div>
            <div class="comment-input-container">
                <input type="text" class="comment-input" placeholder="Add a comment..." maxlength="200">
                <button class="comment-send">Send</button>
            </div>
        </div>
    `;

    setupTrackInteractions(card, track.id, userId);
    initCommentCount(track.id);

    return card;
}

function setupTrackInteractions(card, trackId, trackOwnerId) {
    const likeBtn = card.querySelector('.like-btn');
    const commentBtn = card.querySelector('.comment-btn');
    const commentsSection = card.querySelector(`#comments-${trackId}`);
    const commentInput = card.querySelector('.comment-input');
    const commentSend = card.querySelector('.comment-send');

    // Like button
    likeBtn.addEventListener('click', async () => {
        if (!window.currentUser) {
            customAlert('You must be logged in to like tracks', '⚠️');
            return;
        }

        const likedTracks = JSON.parse(localStorage.getItem('likedTracks') || '[]');
        const isCurrentlyLiked = likedTracks.includes(trackId);

        try {
            const { data: trackData } = await supabase
                .from('tracks')
                .select('likes, title, user_id')
                .eq('id', trackId)
                .single();

            const newLikes = isCurrentlyLiked
                ? Math.max(0, trackData.likes - 1)
                : trackData.likes + 1;

            await supabase
                .from('tracks')
                .update({ likes: newLikes })
                .eq('id', trackId);

            // Update UI
            const likeCountSpan = likeBtn.querySelector('.like-count');
            likeCountSpan.textContent = newLikes;

            if (isCurrentlyLiked) {
                likedTracks.splice(likedTracks.indexOf(trackId), 1);
                likeBtn.classList.remove('liked');
                likeBtn.querySelector('svg').setAttribute('fill', 'none');
            } else {
                likedTracks.push(trackId);
                likeBtn.classList.add('liked');
                likeBtn.querySelector('svg').setAttribute('fill', 'currentColor');

                // Create notification (if not liking own track)
                if (trackOwnerId && trackOwnerId !== window.currentUser.id) {
                    await supabase
                        .from('notifications')
                        .insert({
                            user_id: trackOwnerId,
                            type: 'like',
                            track_id: trackId,
                            track_title: trackData.title,
                            from_user_id: window.currentUser.id,
                            from_username: window.currentUser.user_metadata?.username || window.currentUser.email.split('@')[0],
                            read: false
                        });
                }
            }

            localStorage.setItem('likedTracks', JSON.stringify(likedTracks));

        } catch (error) {
            console.error('Error liking track:', error);
        }
    });

    // Comment button
    commentBtn.addEventListener('click', () => {
        const isVisible = commentsSection.style.display !== 'none';
        commentsSection.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            loadComments(trackId);
        }
    });

    // Send comment
    commentSend.addEventListener('click', () => sendComment(trackId, commentInput, trackOwnerId));
    commentInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendComment(trackId, commentInput, trackOwnerId);
    });
}

async function sendComment(trackId, input, trackOwnerId) {
    const text = input.value.trim();
    if (!text) return;

    if (!window.currentUser) {
        customAlert('You must be logged in to comment', '⚠️');
        input.value = '';
        return;
    }

    try {
        const username = window.currentUser.user_metadata?.username || window.currentUser.email.split('@')[0];

        await supabase
            .from('comments')
            .insert({
                track_id: trackId,
                user_id: window.currentUser.id,
                username: username,
                text: text
            });

        // Get track data for notification
        const { data: trackData } = await supabase
            .from('tracks')
            .select('title, user_id')
            .eq('id', trackId)
            .single();

        // Create notification (if not commenting on own track)
        if (trackOwnerId && trackOwnerId !== window.currentUser.id) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: trackOwnerId,
                    type: 'comment',
                    track_id: trackId,
                    track_title: trackData.title,
                    from_user_id: window.currentUser.id,
                    from_username: username,
                    comment_text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                    read: false
                });
        }

        input.value = '';
        loadComments(trackId);

    } catch (error) {
        console.error('Error sending comment:', error);
    }
}

async function loadComments(trackId) {
    const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('track_id', trackId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error loading comments:', error);
        return;
    }

    const commentsList = document.getElementById(`comments-list-${trackId}`);
    if (!commentsList) return;

    commentsList.innerHTML = '';

    comments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        commentDiv.innerHTML = `
            <span class="comment-user">${comment.username}</span>
            <span class="comment-text">${comment.text}</span>
        `;
        commentsList.appendChild(commentDiv);
    });

    // Update count
    const commentBtn = document.querySelector(`.comment-btn[data-track-id="${trackId}"]`);
    if (commentBtn) {
        const countSpan = commentBtn.querySelector('.comment-count');
        if (countSpan) {
            countSpan.textContent = comments.length;
            countSpan.style.display = comments.length > 0 ? 'inline' : 'none';
        }
    }
}

async function initCommentCount(trackId) {
    const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId);

    const commentBtn = document.querySelector(`.comment-btn[data-track-id="${trackId}"]`);
    if (commentBtn && count > 0) {
        const countSpan = commentBtn.querySelector('.comment-count');
        if (countSpan) {
            countSpan.textContent = count;
            countSpan.style.display = 'inline';
        }
    }
}

function setupRealtimeSubscription() {
    tracksSubscription = supabase
        .channel('public:tracks')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'tracks' },
            async (payload) => {
                const track = payload.new;

                // Get user data
                const { data: userData } = await supabase
                    .from('users')
                    .select('username, photo_url, is_admin')
                    .eq('id', track.user_id)
                    .single();

                track.users = userData;

                // Prepend to feed
                const feedContainer = document.getElementById('musicFeed');
                const newCard = createTrackCard(track);
                newCard.classList.add('track-new');
                feedContainer.insertBefore(newCard, feedContainer.firstChild);

                setTimeout(() => newCard.classList.remove('track-new'), 1000);
            }
        )
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'tracks' },
            (payload) => {
                const track = payload.new;
                const card = document.querySelector(`[data-track-id="${track.id}"]`);
                if (card) {
                    const likeCountSpan = card.querySelector('.like-count');
                    if (likeCountSpan) {
                        likeCountSpan.textContent = track.likes || 0;
                    }
                }
            }
        )
        .subscribe();
}

// Initialize
window.addEventListener('load', () => {
    setTimeout(loadTracksFromSupabase, 500);
});
