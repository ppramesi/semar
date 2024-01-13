import { pipeline, ImageToTextOutput, ImageToTextPipeline } from "@xenova/transformers";
import { Processor } from "./base.js";
import _ from "lodash";

export class Captioning extends Processor {
  pipeline: ImageToTextPipeline;
  constructor(){
    super();
    let percentages: number[] = [];
    pipeline('image-to-text', 'Xenova/vit-gpt2-image-captioning', {
      progress_callback: (progress: {progress: number, loaded: number, total: number}) => {
        // should be every like 10% or something. problem is, it's not an integer so...
        if (!_.isNil(progress.progress) && percentages.indexOf(Math.round(progress.progress)) === -1 && progress.progress < 100) {
          percentages.push(Math.round(progress.progress));
          console.log(`Downloading Xenova/vit-gpt2-image-captioning: ${Math.ceil(progress.progress)}%`);
        }
      }
    })
      .then((pipe) => {
        this.pipeline = pipe;
        this.setupDeferrer.resolve();
      })
  }

  public async processImageUrl(imageUrl: string): Promise<string[]> {
    await this.setupDeferrer;
    const output = await this.pipeline(imageUrl);
    const wrappedOutput = (Array.isArray(output) ? output : [output]) as ImageToTextOutput;
    return wrappedOutput.map((caption) => caption.generated_text);
  }
}

export default new Captioning();