export type Tweet = {
  id: string;
  text: string;
  date: Date;
  url: string;
  tags?: string[];
  embedding?: number[];
};

export type BetweenDates = {
  start?: Date;
  end?: Date;
};

export type FetchTweetsOpts = {
  textSearch?: string;
  betweenDates?: BetweenDates;
  vectorSearch?: number[];
};

export type Summary = {
  id: string;
  text: string;
  sources_id: string[];
};
