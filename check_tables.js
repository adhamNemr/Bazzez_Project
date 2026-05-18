require('dotenv').config();

async function getTables() {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_KEY}`);
        const data = await response.json();
        const paths = Object.keys(data.paths || {});
        console.log('✅ SUPABASE TABLES:', paths.filter(p => !p.includes('{')).join(', '));
    } catch (err) {
        console.error('❌ Error:', err);
    }
}

getTables();
