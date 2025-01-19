import supertest from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';

const staticToken = 'STATIC_API_TOKEN'; // Static token for authentication

describe('Video API Endpoints', () => {
    it('should upload a video successfully', async () => {
        const res = await supertest(app)
            .post('/api/videos/upload')
            .attach('files', 'uploads/1737260213698-big_buck_bunny_720p_1mb.mp4') // Replace with actual file path
            .set('Authorization', staticToken); // Use static token

        expect(res.status).to.equal(200);
        expect(res.body.message).to.include('video(s) uploaded successfully');
    });

    it('should trim a video successfully', async () => {
        const res = await supertest(app)
            .put('/api/videos/trim')
            .send({ videoId: 58, start: 0, end: 3 })
            .set('Authorization', staticToken); // Use static token

        expect(res.status).to.equal(200);
        expect(res.body.message).to.equal('Video trimmed successfully');
    });

    it('should merge videos successfully', async function () {
        this.timeout(10000); // Set timeout to 10 seconds (10000ms)
        const res = await supertest(app)
            .post('/api/videos/merge')
            .send({ videoIds: [60, 62] })
            .set('Authorization', staticToken); // Use static token

        expect(res.status).to.equal(200);
        expect(res.body.message).to.equal('Videos merged successfully');
    });

    it('should generate an expiring link successfully', async () => {
        const res = await supertest(app)
            .post('/api/videos/generate-link')
            .send({ videoId: 1, expiry: '1h' })
            .set('Authorization', staticToken); // Use static token

        expect(res.status).to.equal(200);
        expect(res.body.link).to.include('http://localhost:3000/api/videos/');
    });

    it('should return 403 if the video link is expired', async () => {
        const res = await supertest(app)
            .get('/api/videos/expired_token')
            .set('Authorization', staticToken); // Use static token

        expect(res.status).to.equal(403);
        expect(res.body.message).to.equal('Link expired');
    });
});
