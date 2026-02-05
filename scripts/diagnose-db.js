const { Client } = require('pg');

// Using credentials found in the production app container
const connectionString = "postgresql://postgres:password123@localhost:5432/sae_unified?sslmode=disable";

const client = new Client({
    connectionString: connectionString,
});

async function main() {
    console.log('--- PRODUCTION DB CHECK (sae_unified) ---');

    try {
        await client.connect();
        console.log('✅ Connected successfully with production credentials!');

        // Check tables
        const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    `);

        console.log('Tables found:');
        res.rows.forEach(row => console.log(' - ' + row.table_name));

        // Try to count customers to be sure
        const countRes = await client.query('SELECT count(*) FROM "Customer";');
        console.log(`📊 TOTAL CUSTOMERS IN PRODUCTION: ${countRes.rows[0].count}`);

        await client.end();
    } catch (err) {
        if (err.message.includes('database "sae_unified" does not exist')) {
            console.log('❌ Error: The database "sae_unified" does not exist on this server.');
        } else {
            console.error('❌ Connection Failed:', err.message);
        }
    }
}

main();
