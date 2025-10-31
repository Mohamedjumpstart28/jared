const { WebClient } = require('@slack/web-api');

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).end();
  }

  const token = process.env.SLACK_BOT_TOKEN;
  const userId = process.env.SLACK_USER_ID;
  if (!token || !userId) {
    return res.status(400).json({ error: 'Missing Slack configuration (SLACK_BOT_TOKEN, SLACK_USER_ID)' });
  }

  try {
    const { contact } = await readJsonBody(req);
    if (!contact) return res.status(400).json({ error: 'Contact is required' });

    const slack = new WebClient(token);
    const dm = await slack.conversations.open({ users: userId });
    const phone = (contact.phone || '').replace(/[^\d+]/g, '');
    const message = `🧑‍💻 ${contact.name}\n🏢 ${contact.startup}\n🧻 ${contact.persona}\n☎️ <tel:${phone}|${contact.phone || ''}>\n-----------------`;
    await slack.chat.postMessage({ channel: dm.channel.id, text: message, unfurl_links: false, unfurl_media: false });
    return res.status(200).json({ message: 'Contact sent to Slack successfully' });
  } catch (e) {
    console.error('send-to-slack error:', e);
    return res.status(500).json({ error: 'Failed to send message to Slack' });
  }
};


