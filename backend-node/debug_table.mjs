import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function main() {
  // Check the table in detail
  const tables = await sql`
    SELECT table_schema, table_name FROM information_schema.tables 
    WHERE table_name='calendar_events'
  `;
  console.log("Found in schemas:", JSON.stringify(tables));

  // Try direct query to reproduce error
  try {
    const r = await sql`SELECT * FROM calendar_events LIMIT 1`;
    console.log("Direct SELECT ok:", r);
  } catch(e) {
    console.log("Direct SELECT failed:", e.message);
    
    // Try with public schema
    try {
      const r = await sql`SELECT * FROM public.calendar_events LIMIT 1`;
      console.log("With public. prefix ok:", r);
    } catch(e2) {
      console.log("With public. prefix also failed:", e2.message);
    }
  }
}

main().catch(e => console.error("Error:", e.message));
