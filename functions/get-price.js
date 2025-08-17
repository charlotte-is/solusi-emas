// functions/get-price.js
const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  const filePath = path.join(__dirname, '..', 'data', 'price.json');
  try {
    if(!fs.existsSync(filePath)){
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'price.json not found' })
      };
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    if(!raw || raw.trim().length === 0){
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'price.json is empty' })
      };
    }
    const data = JSON.parse(raw);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to read price.json', detail: e.message })
    };
  }
};
