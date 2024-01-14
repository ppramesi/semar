import { LLMChain } from "langchain/chains";
import { Tweet } from "../../types/tweet.js";
import _ from "lodash";

export abstract class TweetChain extends LLMChain {
  static processTweets(tweets: Tweet[]): string {
    return tweets.reduce((acc, tweet) => {
      let media = "";
      if (!_.isNil(tweet.media)) {
        tweet.media!.map((tweetMedia) => {
          const caption = `<generated-caption>${tweetMedia.caption.join('</generated-caption><generated-caption>')}</generated-caption>`
          const ocr = `<ocr-result>${tweetMedia.text.join(`</ocr-result><ocr-result>`)}</ocr-result>`
          media = `<media>${caption}${ocr}</media>`
        })
      }
      const date = new Date(tweet.date).toISOString();
      return `${acc}<tweet><id>${tweet.id}</id><text>${tweet.text}</text><date>${date}</date><url>${tweet.url}</url>${media}</tweet>`;
    }, "");
  }
}
