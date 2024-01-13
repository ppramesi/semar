import { createWorker, createScheduler, Scheduler } from "tesseract.js";
import _ from "lodash";
import os from "os";
import { Processor } from "./base.js";

export class OCR extends Processor{
  private scheduler: Scheduler;

  constructor() {
    super();
    const numWorkers = Math.ceil(os.cpus().length / 2);
    this.setupTesseractWorkers(numWorkers);
  }

  private async setupTesseractWorkers(numWorkers: number): Promise<void> {
    this.scheduler = createScheduler();
    for (let i = 0; i < numWorkers; i++) {
      const worker = await createWorker("eng");
      this.scheduler.addWorker(worker);
    }

    ["SIGINT", "SIGTERM", "SIGABRT", "SIGQUIT"].forEach((signal) => {
      process.on(signal, async () => {
        console.log("killing tesseract workers");
        await this.scheduler.terminate();
        process.exit(0);
      });
    });

    this.setupDeferrer.resolve();
  }

  public async recognizeTextAndGroupByLines(imagePath: string) {
    this.scheduler.addJob("recognize", imagePath);
    const result = await this.scheduler.addJob("recognize", imagePath);
  
    // Group words by their line based on the y-coordinate of their bounding box
    const lines = result.data.words.reduce((acc, word) => {
      const lineIndex = word.bbox.y0; // Using y0 as the line identifier
  
      // Optionally filter out low confidence words
      if (word.confidence > 80) {
        if (!acc[lineIndex]) {
          acc[lineIndex] = [];
        }
        acc[lineIndex].push(word.text);
      }
  
      return acc;
    }, {} as { [lineIndex: number]: string[] });
  
    // Convert the grouped words into strings for each line
    const lineStrings = Object.values(lines).map(lineWords => lineWords.join(' '));
    return lineStrings;
  }

  public async processImageUrl(imageUrl: string): Promise<string[]> {
    await this.setupDeferrer;
    return new Promise(async (resolve, reject) => {
      try {
        const text = await this.recognizeTextAndGroupByLines(imageUrl);
        resolve(text);
      } catch (error) {
        reject(error);
      }
    });
  }

  public getDeferrer(): Promise<void> {
    return this.setupDeferrer;
  }
}

export default new OCR();