// Supabase Configuration for STL Sales Tracker
const SUPABASE_URL = 'https://zhgpccmzgyertwnvyiaz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoZ3BjY216Z3llcnR3bnZ5aWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTU4NDQsImV4cCI6MjA3OTU3MTg0NH0.A0WxSn-8JKpd4tXTxSxLQIoq3M-654vGpw_guAHpQQc';

// Initialize Supabase client
let supabase;
let supabaseLib; // Will be set when library is available

// Function to initialize Supabase client
function initSupabase() {
    // Save reference to the Supabase library if not already saved
    if (!supabaseLib && typeof window.supabase !== 'undefined') {
        supabaseLib = window.supabase;
    }

    if (typeof supabaseLib !== 'undefined' && supabaseLib.createClient) {
        // Create the client and assign it to the global supabase variable
        supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        // Also assign to window.supabase to ensure global access
        window.supabase = supabase;
        console.log('✅ Supabase client initialized successfully');
        return true;
    } else {
        console.error('❌ Supabase library not loaded yet');
        return false;
    }
}

// Try to initialize immediately
if (!initSupabase()) {
    // If failed, wait for window load event
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (!initSupabase()) {
                console.error('❌ Failed to initialize Supabase client after page load');
            }
        }, 100);
    });
}

// Email check interval (2 hours = 7200000 milliseconds)
const EMAIL_CHECK_INTERVAL = 2 * 60 * 60 * 1000; // 2 ore

// Configuration
const CONFIG = {
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_ANON_KEY,
    emailCheckInterval: EMAIL_CHECK_INTERVAL,
    notificationSound: true,
    enablePushNotifications: true
};
