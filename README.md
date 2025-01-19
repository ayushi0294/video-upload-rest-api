# Video Processing API

A RESTful API for uploading, trimming, merging, and managing videos.

## Table of Contents

1. [Setup](#setup)
2. [Running the API Server](#running-the-api-server)
3. [Running the Test Suite](#running-the-test-suite)
4. [API Endpoints](#api-endpoints)

---

## Setup

### Prerequisites

- **Node.js**: Version `16.x` or later. You can install it from [Node.js official site](https://nodejs.org/).
- **npm**: Comes with Node.js installation.

### Steps to Set Up the Repository

1. Clone the repository:

   ```bash
   git clone https://github.com/ayushi0294/video-upload-rest-api.git
  
2. Install the dependencies
   npm install

3. Create a .env file in the root directory and configure the following variables
    BASE_URL=http://localhost:3000/api/videos

4. initialize db 
    npm run db:init
5. To start the API server, run: npm run dev
6. To run the unit tests, use -npm run test
7.  vidoes.postman_collection.json for api docs

# API Endpoints
 1) Upload Video
Endpoint: POST /upload
Description: Upload one or more video files.
Request: Form-data with files.
Response: { "message": "video(s) uploaded successfully" }

2) Trim Video
Endpoint: PUT /trim
Description: Trim a video by providing start and end times.
Request: JSON { "videoId": <id>, "start": <start>, "end": <end> }
Response: { "message": "Video trimmed successfully" }
3) Merge Videos
Endpoint: POST /merge
Description: Merge multiple videos into one.
Request: JSON { "videoIds": [<id1>, <id2>, ...] }
Response: { "message": "Videos merged successfully" }

4) Generate Expiring Link
Endpoint: POST /generate-link
Description: Generate a link that expires after a set period.
Request: JSON { "videoId": <id>, "expiry": <expiry-time> }
Response: { "link": "<expiring-link>" }

5) Access Video via Expiring Link
Endpoint: GET /:token
Description: Access a video using an expiring link.
Request: URL parameter token
Response: Video file


