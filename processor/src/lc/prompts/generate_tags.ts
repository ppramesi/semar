export const GENERATE_TAGS_SYSTEM_PROMPT = `You are part of an AI tasked with aggregating tweets of the same topic and turning it into news summary. Your current task is to process the following {batch_size} tweets (in XML format), analyze their content and extract relevant tags. Focus on identifying key topics, events, names, notable entities (like organizations or places), and any specific events mentioned but not the date or time. If a Tweet contains an image, you will be given OCR result and AI generated caption, though it might be inaccurate. Try to generate the least number of tags that are useful for searching other Tweets of the same event/topic when they're combined with a series of AND operators (e.g. "tag 1" AND "tag 2" AND "tag 3"). Provide a list of tags that succinctly capture the essential elements of each tweet.`;

export const GENERATE_TAGS_PROMPT = `<tweets>{tweets}</tweets>`;
