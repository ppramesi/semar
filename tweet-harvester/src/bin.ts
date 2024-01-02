#!/usr/bin/env node
import { crawl } from "./crawl";
import { execSync } from "child_process";
import prompts from "prompts";
import chalk from "chalk";
import yargs from "yargs";

async function run() {
  console.log(chalk.bold("\nWelcome to the Twitter Crawler 🕷️\n"));
  console.log("This script uses Chromium Browser to crawl data from Twitter with *your* Twitter auth token.");
  console.log("Please enter your Twitter auth token when prompted.\n");
  console.log("Note: Keep your access token secret! Don't share it with anyone else.");
  console.log("Note: This script only runs on your local device.\n");

  const questions: prompts.PromptObject[] = [];

  const argv: any = yargs
    .usage("Usage: $0 [options]")
    .options({
      token: {
        describe: "Twitter auth token",
        type: "string",
      },
      from: {
        alias: "f",
        describe: "From date (DD-MM-YYYY)",
        type: "string",
      },
      to: {
        alias: "t",
        describe: "To date (DD-MM-YYYY)",
        type: "string",
      },
      search_keyword: {
        alias: "s",
        describe: "Search keyword",
        type: "string",
      },
      tweet_thread_url: {
        alias: "thread",
        describe: "Tweet thread URL",
        type: "string",
      },
      limit: {
        alias: "l",
        describe: "Limit number of tweets to crawl",
        type: "number",
      },
      delay: {
        alias: "d",
        describe: "Delay between each tweet (in seconds)",
        type: "number",
        default: 3,
      },
      debug: {},
      output_filename: {
        alias: "o",
        describe: "Output filename",
        type: "string",
      },
      search_tab: {
        alias: "tab",
        describe: "Search tab (TOP or LATEST)",
        default: "LATEST",
        choices: ["TOP", "LATEST"],
      },
    })
    .help()
    .alias("help", "h").argv;

  if (!argv.token) {
    questions.push({
      type: "password",
      name: "auth_token",
      message: `What's your Twitter auth token?`,
      validate: (value) => {
        if (value.length < 1) {
          return "Please enter your Twitter auth token";
        } else if (value.length < 30) {
          return "Please enter a valid Twitter auth token";
        }

        return true;
      },
    });
  }

  if (!argv.search_keyword && !argv.tweet_thread_url) {
    questions.push({
      type: "text",
      name: "search_keyword",
      message: "What's the search keyword?",
      validate: (value) => {
        if (value.length < 1) {
          return "Please enter a search keyword";
        }
        return true;
      },
    });
  }

  if (!argv.limit) {
    questions.push({
      type: "number",
      name: "target_tweet_count",
      message: "How many tweets do you want to crawl?",
      validate: (value) => {
        if (value < 1) {
          return "Please enter a number greater than 0";
        }
        return true;
      },
    });
  }

  const answers = await prompts(questions, {
    onCancel: () => {
      console.info("Exiting...");
      process.exit(0);
    },
  });

  if (!argv.token) {
    argv.token = answers.auth_token;
  }

  if (!argv.search_keyword) {
    argv.search_keyword = answers.search_keyword;
  }

  if (!argv.limit) {
    argv.limit = answers.target_tweet_count;
  }

  try {
    // Run `npx playwright install` to install the Playwright dependencies
    const output = execSync("npx playwright --version").toString();
    execSync("npm i @playwright/test", { stdio: "inherit" });
    execSync("npx playwright install chromium --with-deps", { stdio: "inherit" });
    if (!output.includes("Version")) {
      console.log("Installing required playwright browser dependencies... Please wait, this will take a while");
    }

    // Call the `crawl` function with the access token
    crawl({
      ACCESS_TOKEN: argv.token,
      SEARCH_KEYWORDS: argv.search_keyword,
      TWEET_THREAD_URL: argv.tweet_thread_url,
      SEARCH_FROM_DATE: argv.from,
      SEARCH_TO_DATE: argv.to,
      TARGET_TWEET_COUNT: argv.limit,
      DELAY_EACH_TWEET_SECONDS: argv.delay_each_tweet,
      OUTPUT_FILENAME: argv.output_filename,
      SEARCH_TAB: String(argv.search_tab).toUpperCase() as "TOP" | "LATEST",
    });
  } catch (err) {
    console.error("Error running script:", err);
    process.exit(1);
  }
}

run();
