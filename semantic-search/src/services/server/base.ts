import { SearchEngine } from "../engine.js";

export type SearchEngineOptions = {
  engine: SearchEngine;
};

export abstract class SearchEngineServer {
  engine: SearchEngine;
  constructor({ engine }: SearchEngineOptions) {
    this.engine = engine;
  }

  abstract buildRoute(): void;
  abstract startService(): void;
}
