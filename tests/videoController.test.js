import { expect } from "chai";
import sinon from "sinon";
import {
  uploadVideo,
  trimVideo,
  mergeVideos,
  generateLink,
  accessVideo,
} from "../src/controllers/videoController.js";
import db from "../src/db/sqlite.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import getVideoDurationInSeconds from "get-video-duration";
import ffmpeg from "fluent-ffmpeg";

describe("Video Controller", () => {
  beforeEach(() => {
    sinon.restore();
    // Clear all previous stubs
  });

  describe("uploadVideo", () => {
    it("should return an error if no files are uploaded", async () => {
      const req = { files: [] };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await uploadVideo(req, res);
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: "No files uploaded" })).to.be.true;
    });

    it("should successfully upload a video if valid", async () => {
      const req = {
        files: [
          {
            filename: "1737260213698-big_buck_bunny_720p_1mb.mp4",
            path: "uploads/1737260213698-big_buck_bunny_720p_1mb.mp4",
            size: 1024 * 1024 * 5,
          },
        ],
      };
      const res = { json: sinon.stub() };

      // Stub getVideoDurationInSeconds directly
      sinon
        .stub(getVideoDurationInSeconds, "getVideoDurationInSeconds")
        .returns(10); // Mocking video duration

      await uploadVideo(req, res);
      expect(
        res.json.calledWith(
          sinon.match.has("message", "1 video(s) uploaded successfully")
        )
      ).to.be.true;
      getVideoDurationInSeconds.getVideoDurationInSeconds.restore(); // Restore the stub
    });
  });

  describe("trimVideo", () => {
    afterEach(() => {
      sinon.restore();
    });
    it("should return an error if start time is invalid", async () => {
      const req = { body: { videoId: 58, start: "invalid", end: 10 } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

      await trimVideo(req, res);
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: "Invalid start or end time" })).to
        .be.true;
    });

    it("should return 404 if video is not found", async () => {
      const req = { body: { videoId: 1, start: 0, end: 10 } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

      sinon.stub(db, "get").callsFake((query, params, callback) => {
        callback(null, null); // Simulate video not found
      });

      await trimVideo(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith(sinon.match.has("message", "Video not found")))
        .to.be.true;
    });

    it("should trim video successfully", async () => {
      const req = { body: { videoId: 1, start: 0, end: 10 } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };
      const video = { filepath: "uploads/sample.mp4" };

      // Mock database `get` method
      sinon.stub(db, "get").callsFake((query, params, callback) => {
        callback(null, video); // Simulate video found
      });

      // Mock `ffmpeg`
      const ffmpegMock = {
        setStartTime: sinon.stub().returnsThis(),
        setDuration: sinon.stub().returnsThis(),
        output: sinon.stub().returnsThis(),
        on: sinon.stub().callsFake(function (event, callback) {
          if (event === "end") {
            callback(); // Simulate successful trimming
          }
          return this;
        }),
        run: sinon.stub(),
      };
      sinon.stub(ffmpeg, "constructor").callsFake(() => ffmpegMock);

      sinon
        .stub(getVideoDurationInSeconds, "getVideoDurationInSeconds")
        .returns(10);

      // Mock database `run` method for updating video details
      sinon.stub(db, "run").callsFake((query, params, callback) => {
        callback(null); // Simulate successful update
      });
      await trimVideo(req, res);
      expect(
        res.json.calledWith(
          sinon.match.has("message", "Video trimmed successfully")
        )
      )
    });
  });

  describe("mergeVideos", () => {
    it("should return an error if videoIds are invalid", async () => {
      const req = { body: { videoIds: [] } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

      await mergeVideos(req, res);
      expect(res.status.calledWith(400)).to.be.true;
      expect(
        res.json.calledWith({
          message: "Please provide at least two video IDs to merge.",
        })
      ).to.be.true;
    });

    it("should merge videos successfully", async () => {
      const req = { body: { videoIds: [60, 62] } };
      const res = { json: sinon.stub() };
      sinon
        .stub(db, "all")
        .resolves([
          { filepath: "uploads/1737260213698-big_buck_bunny_720p_1mb.mp4" },
          { filepath: "uploads/1737260213698-big_buck_bunny_720p_1mb.mp4" },
        ]);
      sinon
        .stub(getVideoDurationInSeconds, "getVideoDurationInSeconds")
        .resolves(10);
      await mergeVideos(req, res);
      expect(
        res.json.calledWith(
          sinon.match.has("message", "Videos merged successfully")
        )
      )
      db.all.restore();
    });
  });

  describe("generateLink", () => {
    it("should generate a valid expiring link", async () => {
      const req = { body: { videoId: 1, expiry: "1h" } };
      const res = { json: sinon.stub() };

      sinon
        .stub(db, "get")
        .yields(null, {
          filepath: "uploads/1737267709331-big_buck_bunny_720p_1mb.mp4",
        });
      sinon.stub(jwt, "sign").returns("mocked_token");

      await generateLink(req, res);
      expect(
        res.json.calledWith(
          sinon.match.has(
            "link",
            "http://localhost:3000/api/videos/mocked_token"
          )
        )
      ).to.be.true;
      db.get.restore();
      jwt.sign.restore();
    });
  });

  describe("accessVideo", () => {
    it("should return error if link is expired", async () => {
      const req = { params: { token: "invalid_token" } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

      sinon.stub(jwt, "verify").yields(new Error("Link expired"));

      await accessVideo(req, res);
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledWith({ message: "Link expired" })).to.be.true;
      jwt.verify.restore();
    });
  });
});
