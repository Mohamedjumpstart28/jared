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

async function saveTemplates(templates) {
  if (USE_KV && kv) {
    try {
      await kv.set('templates', templates);
      return;
    } catch (e) {
      console.error('KV set templates failed:', e);
    }
  }
  const filePath = path.join(process.cwd(), 'server', 'data', 'templates.json');
  fs.writeFileSync(filePath, JSON.stringify(templates, null, 2), 'utf8');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT, OPTIONS');
    return res.status(405).end();
  }

  try {
    const { persona } = req.query;
    if (!persona) return res.status(400).json({ error: 'Persona is required' });

    const { template, title } = await readJsonBody(req);
    if (!template) return res.status(400).json({ error: 'Template content is required' });

    const templates = await getTemplates();
    templates[persona] = {
      title: title || persona,
      content: template,
    };
    await saveTemplates(templates);
    return res.status(200).json({ message: 'Template updated successfully', templates });
  } catch (e) {
    console.error('PUT templates error:', e);
    return res.status(500).json({ error: 'Failed to save template' });
  }
};

