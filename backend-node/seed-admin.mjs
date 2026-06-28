import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf-8");
for (const line of env.split("\n")) {
  const [k, ...v] = line.split("=");
  if (k && v.length) process.env[k.trim()] = v.join("=").trim();
}

const sql = neon(process.env.DATABASE_URL);

// Make admin user a superuser
const [user] = await sql`
  UPDATE users 
  SET is_superuser = true, is_staff = true, team_role = 'Leader' 
  WHERE username = 'admin' 
  RETURNING id, username, email, is_superuser, is_staff
`;

console.log("Updated:", JSON.stringify(user));

// List all users
const all = await sql`SELECT id, username, email, is_superuser, is_staff FROM users`;
console.log("All users:", JSON.stringify(all));
