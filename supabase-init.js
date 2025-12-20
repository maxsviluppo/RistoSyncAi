// Supabase Configuration and Initialization
const SUPABASE_URL = 'https://zhgpccmzgyertwnvyiaz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoZ3BjY216Z3llcnR3bnZ5aWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTU4NDQsImV4cCI6MjA3OTU3MTg0NH0.A0WxSn-8JKpd4tXTxSxLQIoq3M-654vGpw_guAHpQQc';

// Initialize Supabase client immediately (library is already loaded)
if (window.supabase && window.supabase.createClient) {
    const lib = window.supabase;
    window.supabase = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase client initialized successfully');
} else {
    console.error('❌ Supabase library not found');
}

// Email check interval (2 hours)
const EMAIL_CHECK_INTERVAL = 2 * 60 * 60 * 1000;

// Configuration
const CONFIG = {
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_ANON_KEY,
    emailCheckInterval: EMAIL_CHECK_INTERVAL,
    notificationSound: true,
    enablePushNotifications: true
};
