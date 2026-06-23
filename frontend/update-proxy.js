import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetUrl = process.argv[2];

if (!targetUrl) {
  console.error('Usage: node update-proxy.js <target-url>');
  process.exit(1);
}

try {
  const configPath = path.join(__dirname, 'proxy-config.json');
  const config = { target: targetUrl };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Proxy target updated to: ${targetUrl}`);
  console.log('Please restart your Vite dev server for changes to take effect.');
} catch (error) {
  console.error('Failed to update proxy config:', error);
  process.exit(1);
}