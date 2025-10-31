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

async function readJsonBody(req) {
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function applyTemplate(template, contact) {
  let script = typeof template === 'string' ? template : (template?.content || '');
  if (!contact || typeof contact !== 'object') return script;
  for (const key of Object.keys(contact)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    script = script.replace(placeholder, contact[key] || '');
  }
  return script;
}

async function getTemplates() {
  if (USE_KV && kv) {
    try {
      const data = await kv.get('templates');
      if (data) return data;
    } catch (_) {}
  }
  const filePath = path.join(process.cwd(), 'server', 'data', 'templates.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).end();
  }

  try {
    const { contact, persona } = await readJsonBody(req);
    if (!contact) {
      return res.status(400).json({ error: 'Contact is required' });
    }
    const templates = await getTemplates();
    const key = persona || 'Enterprise';
    const tplObj = templates[key] || templates['Enterprise'];
    const script = applyTemplate(tplObj, contact);
    return res.status(200).json({ script });
  } catch (e) {
    console.error('generate-script error:', e);
    return res.status(500).json({ error: 'Failed to generate script' });
  }
};


