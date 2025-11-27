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

// In-memory cache for templates (persists during function warm state)
let templateCache = null;

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
    // Priority: KV > in-memory cache > file
    if (USE_KV && kv) {
      const data = await kv.get('templates');
      if (data) {
        templateCache = data; // Update cache
        return res.status(200).json({ templates: data });
      }
    }

    // Return cached templates if available
    if (templateCache) {
      return res.status(200).json({ templates: templateCache });
    }

    // Load from file as last resort
    const filePath = path.join(process.cwd(), 'server', 'data', 'templates.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    const templates = JSON.parse(raw);
    templateCache = templates; // Cache for next request
    return res.status(200).json({ templates });
  } catch (e) {
    console.error('Read templates failed:', e);
    return res.status(500).json({ error: 'Failed to load templates' });
  }
};




