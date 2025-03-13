require('dotenv').config();
const path          = require('path');
const TheodorClient = require('theodor-sdk');

// Initialize client with API key from environment variable
const client = new TheodorClient({
  apiKey: process.env.THEODOR_API_KEY,
  debug: true
});

// Handle events
client.on('recording_classified', (data) => {
  console.log('Recording classified!', data);
  console.log(`Murmur classification: ${data.murmur}`);
  console.log(`Heart rate: ${data.heart_rate} BPM`);
});

client.on('recording_created', (data) => {
  console.log('Recording created!', data);
});

client.on('websocket_connected', () => {
  console.log('WebSocket connected!');
});

async function analyse() {
  try {
    console.log('Analyzing auscultation file');
    
    // Path to sample audio file (replace with your own file)
    const filePath = path.join(__dirname, 'sample.wav');
    
    // Upload file for analysis and wait for prediction
    const result = await client.analyzeRecording({
      filePath: filePath,
      site: 'heart',
      waitForPrediction: true,
      timeout: 60000 // 60 seconds
    });
    
    console.log('Analysis complete!');
    console.log(JSON.stringify(result, null, 2));
    
    // Close client when done
    client.close();
  } catch (error) {
    console.error('Error analyzing auscultation file:', error);
    client.close();
  }
}

// Run the example
analyse();