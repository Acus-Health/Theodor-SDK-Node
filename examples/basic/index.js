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

client.on('websocket_error', (error) => {
  console.warn('WebSocket error occurred:', error);
  console.log('This is handled gracefully - the client will attempt to reconnect');
});

client.on('websocket_reconnected', () => {
  console.log('WebSocket reconnected successfully!');
});

client.on('recording_classification_failure', (data) => {
  console.error('Recording classification failed:', data);
});

async function analyse() {
  try {
    console.log('Analyzing auscultation file');
    
    // Path to sample audio file (replace with your own file)
    const filePath = path.join(__dirname, 'sample.wav');
    
    // Upload file for analysis and wait for prediction
    const result = await client.analyzeRecording({
      filePath:         filePath,
      site:             'heart',
      waitForPrediction: true,
      timeout:           60000 // 60 seconds
    });
    
    console.log('Analysis complete!');
    console.log(JSON.stringify(result, null, 2));
    
    // Test error handling with non-existent file
    try {
      console.log('Testing error handling with non-existent file...');
      await client.analyzeRecording({
        filePath: 'non_existent_file.wav',
        site: 'heart'
      });
    } catch (fileError) {
      console.log('Expected error caught successfully:', fileError.message);
    }
    
    // Close client when done
    client.close();
  } catch (error) {
    console.error('Error analyzing auscultation file:');
    
    if (error.isTheodorError) {
      console.error(`API Error (${error.status}):`, error.data);
      if (error.data.detailed_error) {
        console.error('Detailed error:', error.data.detailed_error);
      }
    } else if (error.isNetworkError) {
      console.error('Network error - check your internet connection');
    } else {
      console.error(error);
    }
    
    client.close();
  }
}

// Run the example
analyse();