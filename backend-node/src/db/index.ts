import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Bypass system proxy for Neon HTTP connections
delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
process.env.NO_PROXY = "*.neon.tech,*.amazonaws.com,localhost,127.0.0.1";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
