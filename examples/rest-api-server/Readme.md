# Theodor API Server Example
A complete RESTful API server example for the Theodor SDK, allowing you to analyze heart, lung, and abdominal sounds through a robust API with a simple web interface.

## Features

- RESTful API for audio analysis
- Audio file upload and base64 data submission
- Asynchronous processing with status updates
- Simple web interface for testing
- Secure authentication (optional)
- Comprehensive error handling
- Rate limiting protection

## Requirements
- Node.js 14+
- NPM or Yarn
- A Theodor API key

## Installation

1. Clone this repository or copy the example folder

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your Theodor API key:
   ```
   THEODOR_API_KEY=your_api_key_here
   ```

5. Create the uploads directory:
   ```
   mkdir -p uploads/metadata
   ```

## Usage

### Starting the Server
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

The server will start on port 3000 by default (configurable in .env).

### Web Interface
Open your browser to `http://localhost:3000` to access the simple web interface for uploading and analyzing audio files.

### API Endpoints

#### Submit Audio File

POST /api/analysis/submit
Form data:
- `audio`: Audio file (WAV, MP3, OGG, M4A)
- `site`: Recording site ('heart', 'lung', or 'abdomen')
- `examId`: (Optional) Exam ID to associate with the recording


```bash
curl -X POST http://localhost:3000/api/analysis/submit \
	-H "Authorization: Bearer YOUR_TOKEN" \
	-F "audio=@/path/to/audio.wav" \
	-F "site=heart"
```

#### Submit Base64 Audio
POST /api/analysis/submit-base64

JSON body:
- `data`: Base64 encoded audio data
- `mimeType`: Audio file type (e.g., 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/m4a')
- `site`: Recording site ('heart', 'lung', or 'abdomen')
- `examId`: (Optional) Exam ID to associate with the recording


```bash
curl -X POST http://localhost:3000/api/analysis/submit-base64 \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer YOUR_TOKEN" \
	-d '{
	"data": "BASE64_AUDIO_DATA",
	"mimeType": "audio/wav",
	"size": 1024000,
	"site": "heart"
	}'
```
#### Get Analysis Status
GET /api/analysis/:id

##### cURL Example

```bash
curl -X GET http://localhost:3000/api/analysis/123e4567-e89b-12d3-a456-426614174000 \
-H "Authorization: Bearer YOUR_TOKEN"
```

#### Get All Analyses
GET /api/analysis

##### cURL Example

```bash
curl -X GET http://localhost:3000/api/analysis \
-H "Authorization: Bearer YOUR_TOKEN"
```

### Authentication

The API supports JWT authentication. To enable it, update the authentication middleware in the routes.

When authentication is enabled, clients must include a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Deployment

### Docker

You can containerize this application using Docker:

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY . .
VOLUME ["/app/uploads"]
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t theodor-api-server .
docker run -p 3000:3000 -v ./uploads:/app/uploads -e THEODOR_API_KEY=your_key_here theodor-api-server
```

### Cloud Platforms

This server can be deployed to various cloud platforms:

- **Heroku**: Use a Procfile with `web: node server.js`
- **AWS Elastic Beanstalk**: Use the provided Docker configuration
- **Google Cloud Run**: Package as a Docker container

## Customization

### Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `THEODOR_API_KEY`: Your Theodor API key
- `JWT_SECRET`: Secret for JWT authentication
- `JWT_EXPIRATION`: JWT token expiration time
- `STORAGE_PATH`: Path for storing uploaded files

### Adding Authentication

To implement user authentication:

1. Create a user model and database connection
2. Add login/register endpoints
3. Modify the `auth-middleware.js` to validate against your user database

## License

This example is provided as part of the Theodor SDK.

## Support

For questions or support with the Theodor SDK, please contact support@theodor.ai


