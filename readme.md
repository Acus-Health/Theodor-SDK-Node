# Theodor.ai Node.js SDK
Node.js SDK for Theodor.ai's auscultation sound analysis API.

## Introduction
Theodor SDK provides a comprehensive set of tools for integrating with the Theodor platform for AI-powered auscultation analysis. These examples showcase various implementation patterns to help you integrate Theodor into your applications.
The SDK enables you to:
- Upload audio recordings for analysis
- Receive real-time updates on analysis progress
- Retrieve detailed predictions including heart murmurs, rhythm analysis, and other findings
- Integrate with various environments (Node.js, AWS Lambda, etc.)

## Requirements
- Node.js 14.x or higher
- A valid Theodor API key (obtain from Theodor Dashboard)
- For audio recording: WAV format files (preferred for best analysis results)
- For AWS Lambda example: AWS CLI configured with appropriate permissions


## Available Examples
### Basic Example
A simple Node.js application demonstrating the core functionality of the Theodor SDK.

Navigate to the basic example directory:
```bash
cd examples/basic
```

Install dependencies:
```bash
npm install	
```

Create a `.env` file with your Theodor API key:
```bash
THEODOR_API_KEY=your_api_key_here
```

Add a sample audio file named sample.wav to the directory or update the file path in index.js.

Run the example:
```bash
npm start
```

### REST API Server Example

Navigate to the REST API server example directory:
```bash
cd examples/rest-api-server
```

Install dependencies:
```bash
npm install
```

Create a `.env` file with your Theodor API key:
```bash
THEODOR_API_KEY=your_api_key_here
```

Access the web interface at http://localhost:3000

API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/health | GET | Check API health status |
| /api/analysis | GET | Get list of all analyses |
| /api/analysis/{id} | GET | Get specific analysis status |
| /api/analysis/{id}/predictions | GET | Get detailed predictions for an analysis |
| /api/analysis/submit | POST | Submit new audio for analysis |


### AWS Lambda Example
A serverless implementation using AWS Lambda and API Gateway.

1. Navigate to the AWS Lambda example directory:
```bash
cd examples/aws-lambda
```

2. Install dependencies:
```bash
npm install
```

3. Set up your AWS credentials:
```bash
   export AWS_ACCESS_KEY_ID=your_access_key
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   export THEODOR_API_KEY=your_api_key_here
```

4. Deploy the Lambda functions:
```bash
npx serverless deploy
```

### Usage
The Lambda example creates two API endpoints:

POST /analyze - Submit an audio file for analysis:
```bash
{
	"audioData": "base64_encoded_audio_data",
	"mimeType": "audio/wav",
	"site": "heart"
}
```

GET /results/{id} - Get analysis results:

https://your-api-endpoint.execute-api.us-east-1.amazonaws.com/dev/results/your-analysis-id

### WebSocket Events
The Theodor SDK uses WebSocket connections to provide real-time updates on analysis progress. The following events can be received:

| Event | Description |
|-------|-------------|
| audio_recording_created | Audio file has been received and created in the system |
| audio_recording_uploaded | Audio file has been successfully uploaded |
| audio_recording_classified | Analysis has been completed and predictions are available |

Event data includes:
- audio_id: Unique identifier for the recording
- progress: Percentage of completion (10-100)
- murmur: heart murmur detection result (noise, murmur, normal)
- heart_rate: Detected heart rate in BPM
- Various other prediction attributes (see data spec for details)

## Installation

```bash
npm install theodor-sdk
```

```javascript
const { TheodorClient, RecordingSite } = require('theodor-sdk');

// Initialize the client
const client = new TheodorClient({
	apiKey: 	  'YOUR_API_KEY',
	debug: 		  true,
	useWebSocket: true // Enable real-time updates
});

// Upload and analyze an audio file
async function analyse() {
	try {
		// Upload audio file
		const recording = await client.uploadAudio({
			file: 		'./heart-sound.wav',
			site: 		RecordingSite.HEART,
			patientId:  'patient123',
			examId: 	'exam456'
		});

		console.log(Recording uploaded with ID: ${recording.id});

		// Wait for prediction
		const prediction = await client.waitForPrediction(recording.id);
		console.log('Prediction received:', prediction);

		// Access specific findings
		console.log(Murmur status: ${prediction.murmur});
		console.log(Heart rate: ${prediction.heart_rate} bpm);
		
		// Get detailed report
		const report = await client.getRecordingReport(recording.id);
		console.log('Detailed findings:', report.findings);

	} catch (error) {
		console.error('Error:', error);
	}
}

analyse();
```

## Real-time Updates with WebSocket

```javascript
const { TheodorClient } = require('theodor-sdk');
const client = new TheodorClient({
	apiKey: 'YOUR_API_KEY',
	useWebSocket: true
});

// Listen for real-time prediction events
client.on('prediction', (recording) => {
	console.log(New prediction for recording ${recording.id});
	console.log(Murmur status: ${recording.murmur});
	console.log(Heart rate: ${recording.heart_rate} bpm);
});

// Upload audio file
client.uploadAudio({
	file: './heart-sound.wav',
	site: 'heart',
	patientId: 'patient123'
}).then(recording => {
	console.log(Recording uploaded with ID: ${recording.id});
});
```


## API Reference

### TheodorClient

The main client for interacting with the Theodor.ai API.

#### Constructor Options

- `apiKey` (string): Your Theodor.ai API key
- `baseUrl` (string, optional): Base URL for the API (default: 'https://theodor.ai')
- `apiVersion` (string, optional): API version (default: 'v4')
- `debug` (boolean, optional): Enable debug logging (default: false)
- `useWebSocket` (boolean, optional): Use WebSocket for real-time updates (default: true)

#### Methods

- `authenticate(loginId, password)`: Authenticate with username/password
- `setToken(token)`: Set the authentication token
- `uploadAudio(options)`: Upload and analyze an audio file
- `getRecording(recordingId)`: Get a recording by ID
- `waitForPrediction(recordingId, [timeout])`: Wait for a prediction to be ready
- `getRecordingReport(recordingId)`: Get a detailed report for a recording
- `getExams([options])`: Get a list of exams
- `getExam(examId)`: Get an exam by ID
- `createExam(examData)`: Create a new exam

## License

MIT
