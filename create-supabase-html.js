// Generate index-supabase.html from index.html
const fs = require('fs');

console.log('🚀 Creating index-supabase.html...\n');

let html = fs.readFileSync('index.html', 'utf8');

// Replace Firebase preconnects with Supabase
html = html.replace(
    `<link rel="preconnect" href="https://www.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://firestore.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://firebase.googleapis.com" crossorigin>`,
    `<link rel="preconnect" href="https://mcologfwjggmmsihtrrq.supabase.co" crossorigin>`
);

// Remove Firebase SDK section completely and replace with Supabase
const firebaseStart = html.indexOf('<!-- Firebase SDK -->');
const firebaseEnd = html.indexOf('</script>', firebaseStart + 1000) + 9;
const firebaseSection = html.substring(firebaseStart, firebaseEnd);

const supabaseSection = `<!-- Supabase SDK -->
    <script type="module">
        import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

        const supabaseUrl = 'https://mcologfwjggmmsihtrrq.supabase.co'
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jb2xvZ2Z3amdnbW1zaWh0cnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NDE3NjgsImV4cCI6MjA3NTExNzc2OH0.oBdDaOprgrR_elipZYDyVkilxWeW6mECWgtugnenm68'

        export const supabase = createClient(supabaseUrl, supabaseAnonKey)

        // Export globally
        window.supabase = supabase
        window.currentUser = null
        window.currentUserIsAdmin = false

        // Auth state listener
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (session) {
                const user = session.user
                window.currentUser = user

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
                        photo_url: user.user_metadata?.avatar_url || null
                    })
                }

                window.currentUserIsAdmin = userData?.is_admin || false

                // Update UI
                document.getElementById('loginLink').style.display = 'none'
                document.getElementById('userSection').style.display = 'block'
                document.getElementById('username').textContent = userData?.username || user.email.split('@')[0]

                if (userData?.photo_url) {
                    document.getElementById('headerAvatar').innerHTML =
                        \`<img src="\${userData.photo_url}" style="width:100%;height:100%;object-fit:cover" alt="Profile">\`
                }

                // Initialize notifications
                if (window.initSupabaseNotifications) {
                    window.initSupabaseNotifications(user)
                }
            } else {
                document.getElementById('loginLink').style.display = 'block'
                document.getElementById('userSection').style.display = 'none'
                document.getElementById('notificationsBtn').style.display = 'none'
                window.currentUser = null
                window.currentUserIsAdmin = false
            }
        })

        // Logout function
        window.handleLogout = async () => {
            if (confirm('Are you sure you want to logout?')) {
                await supabase.auth.signOut()
                window.location.reload()
            }
        }
    </script>`;

html = html.replace(firebaseSection, supabaseSection);

// Replace script includes
html = html.replace(
    `<script src="custom-alert.js"></script>
    <script src="simple-notifications.js"></script>
    <script src="notifications.js"></script>
    <script src="script.min.js"></script>
    <script src="chat.min.js"></script>
    <script src="upload.min.js"></script>`,
    `<script src="custom-alert.js"></script>
    <script src="supabase-notifications.js"></script>
    <script src="supabase-tracks-complete.js"></script>
    <script src="supabase-chat.js"></script>
    <script src="supabase-upload.js"></script>`
);

// Add badge at top to indicate Supabase version
html = html.replace(
    '<a href="./" class="logo" style="text-decoration:none;color:inherit">THE MUSIC CAVE</a>',
    `<a href="./" class="logo" style="text-decoration:none;color:inherit">THE MUSIC CAVE</a>
            <span style="font-size:0.5rem;color:#00ff00;letter-spacing:1px;margin-left:0.5rem;opacity:0.5">SUPABASE</span>`
);

// Save
fs.writeFileSync('index-supabase.html', html);

console.log('✅ index-supabase.html created successfully!\n');
console.log('To test:');
console.log('1. Open: http://localhost:8000/index-supabase.html (or your local server)');
console.log('2. Or push to GitHub and visit: https://narfbach.github.io/fran-music-cave/index-supabase.html\n');
console.log('If everything works, you can rename it to index.html to make it the default.\n');
