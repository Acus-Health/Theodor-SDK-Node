const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { Buffer } = require('buffer');

const API_URL = 'http://localhost:3000';

// Sample audio file (replace with a valid audio file path)
const SAMPLE_AUDIO_PATH = './sample.wav';

/**
 * Reads and encodes an audio file as base64
 * @param {string} filePath - Path to audio file
 * @returns {Promise<{data: string, mimeType: string, size: number}>}
 */
async function readAudioFile(filePath) {
  // Check if file exists to prevent errors
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    console.log('Using a dummy audio buffer for testing instead');
    
    // Create a simple dummy WAV audio buffer (8-bit, mono, 8kHz, 1 second)
    const dummyBuffer = Buffer.alloc(8000 + 44); // 8000 samples + 44 byte header
    
    // WAV header (44 bytes)
    const header = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x24, 0x1F, 0x00, 0x00, // File size - 8 (36 + data size)
      0x57, 0x41, 0x56, 0x45, // "WAVE"
      0x66, 0x6D, 0x74, 0x20, // "fmt "
      0x10, 0x00, 0x00, 0x00, // fmt chunk size (16)
      0x01, 0x00,             // Audio format (1 = PCM)
      0x01, 0x00,             // Channels (1 = mono)
      0x40, 0x1F, 0x00, 0x00, // Sample rate (8000)
      0x40, 0x1F, 0x00, 0x00, // Byte rate (8000)
      0x01, 0x00,             // Block align (1)
      0x08, 0x00,             // Bits per sample (8)
      0x64, 0x61, 0x74, 0x61, // "data"
      0x00, 0x1F, 0x00, 0x00  // Data chunk size (8000)
    ]);
    
    // Copy header to dummy buffer
    header.copy(dummyBuffer);
    
    // Generate a 440Hz sine wave
    for (let i = 0; i < 8000; i++) {
      dummyBuffer[i + 44] = Math.floor(128 + 127 * Math.sin(2 * Math.PI * 440 * i / 8000));
    }
    
    return {
      data: dummyBuffer.toString('base64'),
      mimeType: 'audio/wav',
      size: dummyBuffer.length
    };
  }
  
  // Read real file
  const fileData = await fs.promises.readFile(filePath);
  const base64Data = fileData.toString('base64');
  
  return {
    data: base64Data,
    mimeType: 'audio/wav',
    size: fileData.length
  };
}

/**
 * Tests the analyze API endpoint
 */
async function testAnalyzeEndpoint() {
  try {
    console.log('Reading audio file...');
    const audioData = await readAudioFile(SAMPLE_AUDIO_PATH);
    
    console.log(`Sending request to ${API_URL}/dev/analyze`);
    const response = await axios.post(`${API_URL}/dev/analyze`, {
      audioData: audioData.data,
      mimeType: audioData.mimeType,
      site: 'heart'
    });
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // If successful, store the recording ID for the next test
    if (response.data && response.data.recordingId) {
      console.log(`Recording ID: ${response.data.recordingId}`);
      console.log(`\nYou can fetch the results with: ${API_URL}/dev/results/${response.data.recordingId}`);
    }
  } catch (error) {
    console.error('Error testing analyze endpoint:');
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else {
      console.error(error.message);
    }
  }
}

// Run the test
testAnalyzeEndpoint(); 