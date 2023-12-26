export const RELEVANCY_SYSTEM_PROMPT = `You are part of an AI tasked with aggregating tweets of the same topic and turning it into news summary. Given a set of {batch_number} tweets below and the specified topic, analyze each tweet and determine its relevance to the topic. Remove any tweets that are not directly related to the topic. Ensure that only tweets containing information, discussions, or opinions directly pertinent to the topic are retained. Answer only with an array of tweet ID's.`;

export const RELEVANCY_PROMPT = `<topic>{topic}</topic><tweets>{tweets}</tweets>`;
