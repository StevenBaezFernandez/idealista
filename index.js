const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');

const PORT = 3000;  // Server port
const API_ENDPOINT = '/extract';  // Endpoint for requests

// API keys configuration
const apiKeys = [
  '308ff234ebmsh26b37ab29b3e8abp1c8d0djsne4f46bd4c064',
  'bb9f6eb5c4msh9d3b47786cd371fp13d6e4jsnb9a0c458d1bb',
  '761eba8edcmsheec2c20dc3cffc5p18b22fjsn0254fa46a1fd',
];

const stateFilePath = './apikey_index.json';

// Load last used API key index
function loadLastUsedIndex() {
  try {
    return JSON.parse(fs.readFileSync(stateFilePath)).lastIndex || 0;
  } catch (err) {
    return 0;
  }
}

// Save current API key index
function saveLastUsedIndex(index) {
  fs.writeFileSync(stateFilePath, JSON.stringify({ lastIndex: index }));
}

// Rotate API keys
function getNextApiKey() {
  const lastIndex = loadLastUsedIndex();
  const nextIndex = (lastIndex + 1) % apiKeys.length;
  saveLastUsedIndex(nextIndex);
  return apiKeys[nextIndex];
}

// Fetch property details from Idealista API
function fetchPropertyDetails(propertyId, res) {
  const apiKey = getNextApiKey();
  
  const options = {
    method: 'GET',
    hostname: 'idealista7.p.rapidapi.com',
    path: `/propertydetails?propertyId=${propertyId}&location=es&language=en`,
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'idealista7.p.rapidapi.com'
    }
  };

  const req = https.request(options, (apiRes) => {
    let data = '';
    
    apiRes.on('data', (chunk) => data += chunk);
    
    apiRes.on('end', () => {
      console.log(`✅ Used API key: ${apiKey}`);
      
      // Forward API response to client
      res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
      res.end(data);
    });
  });

  req.on('error', (err) => {
    console.error(`❌ API Error with key ${apiKey}:`, err.message);
    
    // Send error to client
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'API request failed',
      message: err.message
    }));
  });

  req.end();
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url, true);
  
  // Only handle POST requests to our endpoint
  if (req.method === 'POST' && pathname === API_ENDPOINT) {
    let body = '';
    
    req.on('data', chunk => body += chunk);
    
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        
        // Validate request format
        if (!payload || typeof payload.emailBody !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ 
            error: 'Invalid request format',
            message: 'Missing or invalid emailBody field'
          }));
        }
        
        // Extract property ID using regex
        const regex = /(?<=https:\/\/www\.idealista\.com\/inmueble\/)\d+/;
        const match = payload.emailBody.match(regex);
        
        if (!match) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ 
            error: 'Property ID not found',
            message: 'No valid Idealista URL found in email body'
          }));
        }
        
        const propertyId = match[0];
        console.log(`🔍 Extracted property ID: ${propertyId}`);
        
        // Fetch property details
        fetchPropertyDetails(propertyId, res);
        
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Invalid JSON format',
          message: err.message
        }));
      }
    });
  } else {
    // Handle other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Not found',
      message: 'Only POST requests to /extract are supported'
    }));
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});