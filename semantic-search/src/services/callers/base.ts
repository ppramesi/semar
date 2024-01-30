export abstract class BaseServiceCaller {
  abstract crossEncoderRerank(
    basePassage: string,
    passages: string[],
  ): Promise<number[]>;
}
