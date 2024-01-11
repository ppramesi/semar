import express, { Express, Request, Response } from "express";
import _ from "lodash";
import { deferrer } from "./utils/deferrer.js";
import ocr from "./processors/ocr.js";
import captioning from "./processors/captioning.js";

export class Server {
  private app: Express;
  private setupDeferrer = deferrer();

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
    console.log("Setting up OCR and captioning workers + models + a bunch of other shit...might take a while");
    Promise.all([
      ocr.getDeferrer(),
      captioning.getDeferrer()
    ])
      .then(() => this.setupDeferrer.resolve())
  }

  private authMiddleware(req: Request, res: Response, next: () => void): void {
    const authToken = req.header("auth-token");
    if (
      !_.isNil(process.env.AUTH_TOKEN) &&
      process.env.AUTH_TOKEN.length > 0 &&
      process.env.AUTH_TOKEN !== authToken
    ) {
      res.status(403).json({ status: "unauthorized" });
      return;
    }

    next();
  }

  private setupRoutes(): void {
    this.app.use(this.authMiddleware.bind(this));
    this.app.post(
      "/ocr",
      this.handleOcrRequest.bind(this),
    );
    this.app.post(
      "/caption",
      this.handleCaptionRequest.bind(this),
    );
  }

  private async handleCaptionRequest(req: Request, res: Response): Promise<void> {
    const { imageUrl } = req.body;
    try {
      const captionResult = await captioning.processImageUrl(imageUrl);
      res.status(200).json({ status: "success", caption_result: captionResult });
      return;
    } catch (error) {
      res.status(400).json({ status: "error", error: error });
      return;
    }
  }

  private async handleOcrRequest(req: Request, res: Response): Promise<void> {
    const { imageUrl } = req.body;
    try {
      const ocrResult = await ocr.processImageUrl(imageUrl);
      res.status(200).json({ status: "success", ocr_result: ocrResult });
      return;
    } catch (error) {
      res.status(400).json({ status: "error", error: error });
      return;
    }
  }

  public async listen(port: number | string): Promise<void> {
    await this.setupDeferrer;
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
        resolve();
      });
    })
  }
}
