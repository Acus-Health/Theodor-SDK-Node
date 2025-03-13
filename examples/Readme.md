# Theodor SDK Examples

This directory contains examples of how to use the Theodor SDK in different environments.

## Basic Example

The basic example demonstrates how to use the Theodor SDK in a simple Node.js application.

### Setup

1. Navigate to the basic example directory:
   ```
   cd basic
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with your Theodor API key:
   ```
   THEODOR_API_KEY=your_api_key_here
   ```

4. Add a sample audio file named `sample.wav` to the directory or update the file path in `index.js`.

5. Run the example:
   ```
   npm start
   ```

## AWS Lambda Example

The AWS Lambda example demonstrates how to use the Theodor SDK in a serverless AWS Lambda environment.

### Setup

1. Navigate to the AWS Lambda example directory:
   ```
   cd aws-lambda
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your AWS credentials:
   ```
   export AWS_ACCESS_KEY_ID=your_access_key
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   export THEODOR_API_KEY=your_api_key_here
   ```

4. Deploy the Lambda functions:
   ```
   npx serverless deploy
   ```

### Usage

The Lambda example creates two API endpoints:

1. `POST /analyze` - Submit an audio file for analysis
   ```
   {
     "audioData": "base64_encoded_audio_data",
     "mimeType": "audio/wav",
     "site": "heart"
   }
   ```

2. `GET /results/{id}` - Get analysis results
   ```
   https://your-api-endpoint.execute-api.us-east-1.amazonaws.com/dev/results/your-analysis-id
   ```