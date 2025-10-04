// Supabase Client Configuration
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://mcologfwjggmmsihtrrq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jb2xvZ2Z3amdnbW1zaWh0cnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NDE3NjgsImV4cCI6MjA3NTExNzc2OH0.oBdDaOprgrR_elipZYDyVkilxWeW6mECWgtugnenm68'

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
