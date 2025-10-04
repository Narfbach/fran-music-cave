// Supabase Track Upload
async function uploadTrackToSupabase(trackData) {
    if (!window.currentUser) {
        customAlert('You must be logged in to upload tracks', '⚠️');
        return false;
    }

    try {
        const { data, error } = await supabase
            .from('tracks')
            .insert({
                user_id: window.currentUser.id,
                title: trackData.title,
                artist: trackData.artist,
                platform: trackData.platform,
                url: trackData.url,
                embed_url: trackData.embedUrl,
                submitted_by: window.currentUser.user_metadata?.username || window.currentUser.email.split('@')[0],
                likes: 0
            })
            .select()
            .single();

        if (error) throw error;

        // Update user's tracks_submitted count
        const { data: userData } = await supabase
            .from('users')
            .select('tracks_submitted, digger_score')
            .eq('id', window.currentUser.id)
            .single();

        if (userData) {
            await supabase
                .from('users')
                .update({
                    tracks_submitted: (userData.tracks_submitted || 0) + 1,
                    digger_score: (userData.digger_score || 0) + 5 // +5 points per upload
                })
                .eq('id', window.currentUser.id);
        }

        return true;
    } catch (error) {
        console.error('Error uploading track:', error);
        customAlert('Error uploading track: ' + error.message, '❌');
        return false;
    }
}

// Export
window.uploadTrackToSupabase = uploadTrackToSupabase;
