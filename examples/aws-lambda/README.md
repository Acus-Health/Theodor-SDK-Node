# Theodor SDK AWS Lambda Example

This example demonstrates how to use the Theodor SDK in an AWS Lambda environment, allowing you to analyze auscultation recordings through serverless functions.

## Prerequisites

- Node.js 16.x or later
- NPM or Yarn
- An AWS account (for deployment only, not needed for local testing)
- Theodor API key

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with your Theodor API key:
```
THEODOR_API_KEY=your-api-key-here
```

## Local Testing

You can test the Lambda functions locally without deploying to AWS using the Serverless Offline plugin:

1. Start the local development server:
```bash
npm run start
```
or with your API key directly:
```bash
npm run dev
```

2. Test the API endpoints using the provided test script:
```bash
npm run test
```

This will:
- Generate a test audio file if none exists
- Send a request to analyze the audio
- Display the response, including the recording ID

## Deployment to AWS

To deploy to AWS, make sure you have your AWS credentials configured and then run:

```bash
npm run deploy
```

## API Endpoints

When running locally, the following endpoints are available:

- `POST http://localhost:3000/dev/analyze` - Submit an audio recording for analysis
- `GET http://localhost:3000/dev/results/{id}` - Retrieve analysis results for a specific recording ID

## Request Format for Analysis

```json
{
  "audioData": "base64_encoded_audio_data",
  "mimeType": "audio/wav",
  "site": "heart" // Optional, defaults to "heart". Can be "heart", "lung", or "abdomen"
}
```

## Architecture

This example uses a lightweight implementation of the Theodor SDK client that:
1. Handles authentication with your API key
2. Submits audio recordings for analysis
3. Retrieves analysis results asynchronously

The implementation is optimized for serverless environments with minimal dependencies. 