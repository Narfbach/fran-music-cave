// Automatic migration from Firebase to Supabase
const fs = require('fs');
const https = require('https');

console.log('🚀 Supabase Migration Tool\n');

// Step 1: Get Supabase credentials from user
console.log('Before running this script, create a Supabase project at https://supabase.com');
console.log('Then create a file called supabase-config.json with your credentials:\n');
console.log(JSON.stringify({
    "SUPABASE_URL": "https://your-project.supabase.co",
    "SUPABASE_ANON_KEY": "your-anon-key",
    "SUPABASE_SERVICE_KEY": "your-service-role-key"
}, null, 2));
console.log('\n');

// Check if config exists
if (!fs.existsSync('supabase-config.json')) {
    console.log('❌ supabase-config.json not found');
    console.log('Create this file with your Supabase credentials first');
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync('supabase-config.json', 'utf8'));

console.log('✅ Supabase config loaded\n');

// Step 2: Create all new files with Supabase SDK
console.log('📝 Creating Supabase integration files...\n');

// Create supabase-client.js
const supabaseClientCode = `// Supabase Client Configuration
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = '${config.SUPABASE_URL}'
const supabaseAnonKey = '${config.SUPABASE_ANON_KEY}'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
})

// Export for global use
window.supabase = supabase
`;

fs.writeFileSync('supabase-client.js', supabaseClientCode);
console.log('✅ Created supabase-client.js');

// Create auth.js for Supabase
const authCode = `// Supabase Authentication
async function setupAuth() {
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
        handleUserSession(session.user)
    } else {
        showLogin()
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            handleUserSession(session.user)
        } else {
            showLogin()
        }
    })
}

async function handleUserSession(user) {
    // Get or create user in database
    const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

    if (error && error.code === 'PGRST116') {
        // User doesn't exist, create
        await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            username: user.email.split('@')[0],
            photo_url: user.user_metadata.avatar_url
        })
    }

    // Update UI
    document.getElementById('loginLink').style.display = 'none'
    document.getElementById('userSection').style.display = 'block'
    document.getElementById('username').textContent = userData?.username || user.email.split('@')[0]

    window.currentUser = user
}

function showLogin() {
    document.getElementById('loginLink').style.display = 'block'
    document.getElementById('userSection').style.display = 'none'
    window.currentUser = null
}

// Initialize
setupAuth()
`;

fs.writeFileSync('supabase-auth.js', authCode);
console.log('✅ Created supabase-auth.js');

// Create tracks loader
const tracksCode = `// Load tracks from Supabase with realtime
let tracksSubscription = null

async function loadTracksFromSupabase() {
    // Initial load
    const { data: tracks, error } = await supabase
        .from('tracks')
        .select(\`
            *,
            users:user_id (username, photo_url, is_admin)
        \`)
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
`;

fs.writeFileSync('supabase-tracks.js', tracksCode);
console.log('✅ Created supabase-tracks.js');

console.log('\n✅ All Supabase files created!\n');
console.log('Next steps:');
console.log('1. Run the SQL schema in Supabase SQL Editor (see SUPABASE_MIGRATION.md)');
console.log('2. Update index.html to use new Supabase scripts');
console.log('3. Test the new system');
console.log('4. Migrate existing Firebase data\n');
