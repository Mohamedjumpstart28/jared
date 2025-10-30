const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { WebClient } = require('@slack/web-api');
let kv = null;
let USE_KV = false;
try {
  // Lazy require so local dev doesn't break without the package
  // KV works on Vercel with KV_REST_API_URL and KV_REST_API_TOKEN set
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  kv = require('@vercel/kv').kv;
  USE_KV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
} catch (_) {
  USE_KV = false;
}
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// File paths for persistent storage
const TEMPLATES_FILE = path.join(__dirname, 'data', 'templates.json');
const CONTACTS_FILE = path.join(__dirname, 'data', 'contacts.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Default templates
const defaultTemplates = {
  'Enterprise': {
    title: 'Enterprise',
    content: 'Hi {{name}}, this is [Your Name] from [Your Company]. I noticed {{startup}} has been growing rapidly in the {{persona}} space. I help companies like yours streamline their sales processes. Do you have 2 minutes to discuss how we could help {{startup}} increase revenue?'
  },
  'Startup': {
    title: 'Startup',
    content: 'Hi {{name}}, I\'m reaching out because I noticed {{startup}} is in the {{persona}} space. I work with companies to help optimize their development workflows. Would you be interested in a quick 5-minute conversation about how we could help {{startup}} accelerate development?'
  },
  'SMB': {
    title: 'SMB',
    content: 'Hi {{name}}, I help companies like {{startup}} increase their close rates. I\'d love to share a quick strategy that could help {{startup}} hit their revenue targets faster. Do you have 2 minutes to chat?'
  },
  'Tech': {
    title: 'Tech',
    content: 'Hi {{name}}, I noticed {{startup}} has been doing great work in the {{persona}} space. I help tech companies optimize their lead generation. Would you be interested in a brief conversation about how we could help {{startup}} generate more qualified leads?'
  }
};

// Load templates from file or use defaults
function loadTemplates() {
  try {
    if (fs.existsSync(TEMPLATES_FILE)) {
      const data = fs.readFileSync(TEMPLATES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading templates:', error);
  }
  return defaultTemplates;
}

// Save templates to file
function saveTemplates(templates) {
  try {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
    console.log('Templates saved successfully');
  } catch (error) {
    console.error('Error saving templates:', error);
  }
}

// KV-aware async storage helpers
async function getTemplatesStore() {
  if (USE_KV && kv) {
    try {
      const data = await kv.get('templates');
      return data || defaultTemplates;
    } catch (e) {
      console.error('KV get templates failed, falling back to file:', e);
      return loadTemplates();
    }
  }
  return loadTemplates();
}

async function setTemplatesStore(nextTemplates) {
  if (USE_KV && kv) {
    try {
      await kv.set('templates', nextTemplates);
      return;
    } catch (e) {
      console.error('KV set templates failed, saving to file:', e);
    }
  }
  saveTemplates(nextTemplates);
}

// Load contacts from file
function loadContacts() {
  try {
    if (fs.existsSync(CONTACTS_FILE)) {
      const data = fs.readFileSync(CONTACTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading contacts:', error);
  }
  return [];
}

// Save contacts to file
function saveContacts(contacts) {
  try {
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
    console.log('Contacts saved successfully');
  } catch (error) {
    console.error('Error saving contacts:', error);
  }
}

async function getContactsStore() {
  if (USE_KV && kv) {
    try {
      const data = await kv.get('contacts');
      return data || [];
    } catch (e) {
      console.error('KV get contacts failed, falling back to file:', e);
      return loadContacts();
    }
  }
  return loadContacts();
}

async function setContactsStore(nextContacts) {
  if (USE_KV && kv) {
    try {
      await kv.set('contacts', nextContacts);
      return;
    } catch (e) {
      console.error('KV set contacts failed, saving to file:', e);
    }
  }
  saveContacts(nextContacts);
}

// Initialize storage
let contacts = [];
let templates = defaultTemplates;
// Initialize from storage (KV or file)
(async () => {
  templates = await getTemplatesStore();
  contacts = await getContactsStore();
})();

// Routes
app.post('/api/upload', upload.single('csv'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  let headers = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('headers', (headerList) => {
      headers = headerList;
    })
    .on('data', (data) => results.push(data))
    .on('end', () => {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      // Store contacts
      contacts = results;
      setContactsStore(contacts);
      
      // Get unique personas for grouping
      const personas = [...new Set(results.map(contact => contact.persona || 'Other'))];
      
      res.json({
        message: 'CSV uploaded successfully',
        contacts: results,
        roles: personas,
        headers: headers,
        totalContacts: results.length
      });
    })
    .on('error', (error) => {
      console.error('CSV parsing error:', error);
      res.status(500).json({ error: 'Error parsing CSV file' });
    });
});

app.get('/api/contacts', (req, res) => {
  res.json({ contacts, totalContacts: contacts.length });
});

app.get('/api/contacts/:role', (req, res) => {
  const { role } = req.params;
  const filteredContacts = contacts.filter(contact => 
    contact.role === role
  );
  res.json({ contacts: filteredContacts, role });
});

app.get('/api/templates', async (req, res) => {
  // Ensure we return the latest from storage in serverless
  templates = await getTemplatesStore();
  res.json({ templates });
});

app.put('/api/templates/:persona', async (req, res) => {
  const { persona } = req.params;
  const { template, title } = req.body;
  
  if (!template) {
    return res.status(400).json({ error: 'Template content is required' });
  }
  
  templates[persona] = {
    title: title || persona,
    content: template
  };
  await setTemplatesStore(templates);
  res.json({ message: 'Template updated successfully', templates });
});

app.post('/api/send-to-slack', async (req, res) => {
  const { contact } = req.body;
  
  console.log('Received contact:', contact);
  console.log('SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN ? 'Set' : 'Not set');
  console.log('SLACK_USER_ID:', process.env.SLACK_USER_ID);
  
  if (!contact) {
    return res.status(400).json({ error: 'Contact information is required' });
  }
  
  try {
    const message = `🧑‍💻 ${contact.name}\n🏢 ${contact.startup}\n🧻 ${contact.persona}\n☎️ <tel:${contact.phone.replace(/[^\d+]/g, '')}|${contact.phone}>\n-----------------`;
    
    console.log('Sending message:', message);
    
    // Open a DM channel with the user first
    const dmChannel = await slack.conversations.open({
      users: process.env.SLACK_USER_ID
    });
    
    console.log('DM channel opened:', dmChannel.channel.id);
    
    await slack.chat.postMessage({
      channel: dmChannel.channel.id,
      text: message,
      unfurl_links: false,
      unfurl_media: false
    });
    
    console.log('Message sent successfully');
    res.json({ message: 'Contact sent to Slack successfully' });
  } catch (error) {
    console.error('Slack API error:', error);
    res.status(500).json({ error: 'Failed to send message to Slack' });
  }
});

app.post('/api/generate-script', (req, res) => {
  const { contact, persona } = req.body;
  
  if (!contact || !persona) {
    return res.status(400).json({ error: 'Contact and persona are required' });
  }
  
  const templateObj = templates[persona] || templates['Enterprise'];
  const template = templateObj.content || templateObj;
  let script = template;
  
  // Replace variables in template
  Object.keys(contact).forEach(key => {
    const placeholder = `{{${key}}}`;
    script = script.replace(new RegExp(placeholder, 'g'), contact[key] || '');
  });
  
  res.json({ script });
});

// Serve React app for all other routes (only in production)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Loaded ${Object.keys(templates).length} templates from storage`);
  console.log(`Loaded ${contacts.length} contacts from storage`);
});
