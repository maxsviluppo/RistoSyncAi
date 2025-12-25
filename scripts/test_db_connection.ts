
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual Env Load
let supabaseUrl = '';
let supabaseKey = '';

try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const parts = line.trim().split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
                if (key === 'VITE_SUPABASE_URL' || key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
                if (key === 'VITE_SUPABASE_ANON_KEY' || key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseKey = val;
            }
        });
    }
} catch (e) { console.error("Env Read Error", e); }

console.log("URL:", supabaseUrl);
// console.log("Key:", supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Testing Connection...");
    const { data, error } = await supabase.from('reservations').select('id').limit(1);

    if (error) {
        console.error("Connection Check Failed:", error);
    } else {
        console.log("Connection OK. Found rows:", data?.length);
    }

    console.log("Testing Auth State...");
    const { data: authData } = await supabase.auth.getSession();
    console.log("Session:", authData.session ? "Active" : "None");

    // Try Insert (Public/Anon)
    console.log("Attempting Anonymous Insert...");
    const { error: insertError } = await supabase.from('reservations').insert({
        id: `test_${Date.now()}`,
        table_number: '99',
        customer_name: 'Test Bot',
        status: 'PENDING',
        reservation_date: '2025-01-01',
        reservation_time: '12:00',
        user_id: 'test-user-id' // Random ID
    });

    if (insertError) {
        console.error("Insert Failed (Expected if RLS active):", insertError.message);
        console.log("Details:", insertError);
    } else {
        console.log("Insert SUCCESS (RLS is weak or open)!");
    }
}

test();
