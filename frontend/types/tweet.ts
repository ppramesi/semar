export type Tweet = {
  id: string;
  text: string;
  date: Date;
  url: string;
  tags?: string[];
  embedding?: number[];
  media?: {
    text: string[];
    caption: string[];
  }[];
};

export type RawTweet = {
  id: string;
  text: string;
  date: Date;
  url: string;
  tags?: string;
  embedding?: number[];
  media?: {
    text: string[];
    caption: string[];
  }[];
};