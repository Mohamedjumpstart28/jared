const formidable = require('formidable');
const fs = require('fs');
const csv = require('csv-parser');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const form = formidable({ multiples: false, keepExtensions: false });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(400).json({ error: 'Invalid form data' });
    }

    let file = files.csv;
    if (Array.isArray(file)) file = file[0];
    if (!file || !file.filepath) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = [];
    let headers = [];

    fs.createReadStream(file.filepath)
      .pipe(csv())
      .on('headers', (headerList) => {
        headers = headerList;
      })
      .on('data', (data) => results.push(data))
      .on('end', () => {
        // Cleanup temp file
        fs.unlink(file.filepath, () => {});

        const personas = [...new Set(results.map((c) => c.persona || 'Other'))];

        return res.json({
          message: 'CSV uploaded successfully',
          contacts: results,
          roles: personas,
          headers,
          totalContacts: results.length,
        });
      })
      .on('error', (e) => {
        console.error('CSV parsing error:', e);
        return res.status(500).json({ error: 'Error parsing CSV file' });
      });
  });
};


