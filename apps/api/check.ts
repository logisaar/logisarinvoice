import { Client } from 'pg';

async function run() {
    const client = new Client({ connectionString: "postgresql://paylink:paylink123@localhost:5434/paylinkpro?schema=public" });
    await client.connect();
    const sessions = await client.query("SELECT * FROM client_sessions");
    console.log("SESSIONS:\n", sessions.rows);

    const invoices = await client.query("SELECT id, client_google_email FROM invoices");
    console.log("\nINVOICES:\n", invoices.rows.filter(i => i.client_google_email));

    await client.end();
}

run().catch(console.error);
