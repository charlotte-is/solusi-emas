// scripts/sync-from-api.js
// Usage (locally): node sync-from-api.js
// In GitHub Actions: set env GITHUB_TOKEN, REPO_OWNER, REPO_NAME, BRANCH, EXTERNAL_API_URL
const fetch = require('node-fetch');
const b64 = (s)=> Buffer.from(s,'utf8').toString('base64');

(async ()=>{
  const GITHUB_API = 'https://api.github.com';
  const OWNER = process.env.REPO_OWNER;
  const REPO = process.env.REPO_NAME;
  const BRANCH = process.env.BRANCH || 'main';
  const GH_TOKEN = process.env.GITHUB_TOKEN;
  const EXTERNAL_API = process.env.EXTERNAL_API_URL;
  const FILEPATH = 'data/price.json';

  if(!OWNER || !REPO || !GH_TOKEN || !EXTERNAL_API) {
    console.error('Missing env vars. Set REPO_OWNER, REPO_NAME, GITHUB_TOKEN, EXTERNAL_API_URL');
    process.exit(1);
  }

  try {
    console.log('Fetching external price source:', EXTERNAL_API);
    const r = await fetch(EXTERNAL_API);
    if(!r.ok) throw new Error('External API fetch failed: ' + r.status);
    const src = await r.json();

    // Expect external API returns object { prices: {24:...,22:...}, ... } 
    // If different, map accordingly here.
    const newJson = {
      lastUpdated: new Date().toISOString(),
      prices: src.prices || src, // adjust if API returns nested
      meta: { source: EXTERNAL_API }
    };
    const content = JSON.stringify(newJson, null, 2);

    // get existing file sha
    const getUrl = `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(FILEPATH)}?ref=${BRANCH}`;
    let res = await fetch(getUrl, { headers: { Authorization: `token ${GH_TOKEN}`, 'User-Agent':'sync-script' }});
    let sha = null;
    if(res.status === 200){
      const meta = await res.json(); sha = meta.sha;
    } else if(res.status === 404){
      sha = null;
    } else {
      throw new Error('Failed to fetch file meta: ' + (await res.text()));
    }

    // commit
    const putUrl = `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(FILEPATH)}`;
    const body = {
      message: `Auto-update price.json from ${EXTERNAL_API} @ ${new Date().toISOString()}`,
      content: b64(content),
      branch: BRANCH
    };
    if(sha) body.sha = sha;

    res = await fetch(putUrl, {
      method: 'PUT',
      headers: { Authorization: `token ${GH_TOKEN}`, 'User-Agent':'sync-script', 'Content-Type':'application/json' },
      body: JSON.stringify(body)
    });

    const result = await res.json();
    if(!res.ok) throw new Error('GitHub commit failed: ' + JSON.stringify(result));
    console.log('Committed:', result.commit && result.commit.sha);
    process.exit(0);
  } catch(err){
    console.error('Error:', err.message || err);
    process.exit(2);
  }
})();
