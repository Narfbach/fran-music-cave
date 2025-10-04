// Supabase Authentication
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
