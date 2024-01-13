import { deferrer } from "../utils/deferrer.js";

export abstract class Processor {
  protected setupDeferrer = deferrer();
  abstract processImageUrl(imageUrl: string): Promise<string[]>;
  getDeferrer(): Promise<void> {
    return this.setupDeferrer;
  }
}