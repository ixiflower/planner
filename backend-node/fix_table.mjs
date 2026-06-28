import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const tables = await sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema='public' ORDER BY table_name
  `;
  console.log("Tables:", tables.map(t => t.table_name).join(", "));
  
  if (!tables.some(t => t.table_name === 'calendar_events')) {
    console.log("Creating calendar_events table...");
    await sql`
      CREATE TABLE calendar_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        color TEXT DEFAULT 'blue',
        is_important BOOLEAN DEFAULT FALSE,
        category TEXT DEFAULT 'general'
      )
    `;
    console.log("✅ Created!");
  } else {
    console.log("✅ Already exists");
  }
}

main().catch(e => console.error("Error:", e.message));
