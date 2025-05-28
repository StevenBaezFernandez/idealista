const fs = require('fs');
const https = require('https');

// List of your API keys
const apiKeys = [
  '308ff234ebmsh26b37ab29b3e8abp1c8d0djsne4f46bd4c064',
  'bb9f6eb5c4msh9d3b47786cd371fp13d6e4jsnb9a0c458d1bb',
  '761eba8edcmsheec2c20dc3cffc5p18b22fjsn0254fa46a1fd',
  // Add as many as you need
];

const stateFilePath = './apikey_index.json';

// Load the last used index from file
function loadLastUsedIndex() {
  try {
    const data = fs.readFileSync(stateFilePath, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.lastIndex || 0;
  } catch (err) {
    // If file doesn't exist or can't be read, start from 0
    return 0;
  }
}

// Save the new index to file
function saveLastUsedIndex(index) {
  fs.writeFileSync(stateFilePath, JSON.stringify({ lastIndex: index }));
}

// Get next API key and update the index
function getNextApiKey() {
  const lastIndex = loadLastUsedIndex();
  const nextIndex = (lastIndex + 1) % apiKeys.length;
  saveLastUsedIndex(nextIndex);
  return apiKeys[nextIndex];
}

// Make the request with the selected API key
function fetchPropertyDetails(propertyId) {
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

  const req = https.request(options, (res) => {
    const chunks = [];

    res.on('data', (chunk) => chunks.push(chunk));

    res.on('end', () => {
      const body = Buffer.concat(chunks).toString();
      console.log(`✅ Used API key: ${apiKey}`);
      console.log(body);
    });
  });

  req.on('error', (err) => {
    console.error(`❌ Error with key ${apiKey}:`, err.message);
  });

  req.end();
}

// === Usage ===
// const propertyId = '108154405'; // Replace with desired property ID
fetchPropertyDetails(propertyId);























