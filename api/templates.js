const fs = require('fs');
const path = require('path');

let kv = null;
let USE_KV = false;
try {
  kv = require('@vercel/kv').kv;
  USE_KV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
} catch (_) {
  USE_KV = false;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).end();
  }

  try {
    if (USE_KV && kv) {
      const data = await kv.get('templates');
      if (data) {
        return res.status(200).json({ templates: data });
      }
    }

    const filePath = path.join(process.cwd(), 'server', 'data', 'templates.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    const templates = JSON.parse(raw);
    return res.status(200).json({ templates });
  } catch (e) {
    console.error('Read templates failed:', e);
    return res.status(500).json({ error: 'Failed to load templates' });
  }
};


