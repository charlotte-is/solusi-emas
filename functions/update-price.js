// functions/update-price.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const ADMIN_KEY = process.env.ADMIN_KEY || ''; // required to protect endpoint
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''; // optional: to commit to repo
const GITHUB_OWNER = process.env.GITHUB_OWNER || '';
const GITHUB_REPO = process.env.GITHUB_REPO || '';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const PRICE_PATH_IN_REPO = 'data/price.json'; // path in repo

function githubApiRequest(method, apiPath, body){
  const data = body ? JSON.stringify(body) : null;
  const opts = {
    hostname: 'api.github.com',
    path: apiPath,
    method: method,
    headers: {
      'User-Agent': 'solusiemas-updater',
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${GITHUB_TOKEN}`,
    }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(chunks || '{}'); } catch(e) { parsed = { raw: chunks }; }
        if(res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
        else reject({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if(data) req.write(data);
    req.end();
  });
}

exports.handler = async function(event, context){
  // Only accept POST
  if(event.httpMethod !== 'POST') {
    return { statusCode: 405, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // simple auth using ADMIN_KEY header
  const provided = (event.headers && (event.headers['x-admin-key'] || event.headers['X-Admin-Key'])) || '';
  if(!ADMIN_KEY || provided !== ADMIN_KEY){
    return { statusCode: 401, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ error: 'Unauthorized - admin key required' }) };
  }

  // parse body json
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch(e) {
    return { statusCode: 400, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  // basic validation
  if(!payload.prices || typeof payload.prices !== 'object'){
    return { statusCode: 400, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ error: 'Missing prices object' }) };
  }

  // attach lastUpdated if not present
  if(!payload.lastUpdated) payload.lastUpdated = new Date().toISOString();
  if(!payload.source) payload.source = 'admin';

  const newContent = JSON.stringify(payload, null, 2);

  // If GITHUB_TOKEN provided -> commit to repo
  if(GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO){
    try {
      // 1) GET current file to obtain sha
      const getPath = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${PRICE_PATH_IN_REPO}?ref=${GITHUB_BRANCH}`;
      const current = await githubApiRequest('GET', getPath);
      const sha = current.sha;

      // 2) PUT updated content
      const putPath = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${PRICE_PATH_IN_REPO}`;
      const payloadBody = {
        message: `Update price.json via admin @ ${payload.lastUpdated}`,
        content: Buffer.from(newContent).toString('base64'),
        branch: GITHUB_BRANCH,
        sha
      };
      const result = await githubApiRequest('PUT', putPath, payloadBody);
      return { statusCode: 200, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ok: true, github: result }) };
    } catch(e){
      return { statusCode: 500, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ error: 'GitHub commit failed', detail: e }) };
    }
  }

  // Else, try write to local file (works in netlify dev, not persistent on Netlify production)
  try {
    const filePath = path.join(__dirname, '..', 'data', 'price.json');
    fs.writeFileSync(filePath, newContent, 'utf8');
    return { statusCode: 200, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ok: true, note: 'written to local data/price.json (dev mode)' }) };
  } catch(e){
    return { statusCode: 500, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ error: 'Failed to write file', detail: e && e.message ? e.message : e }) };
  }
};
