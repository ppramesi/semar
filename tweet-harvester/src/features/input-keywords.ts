import { Page } from "@playwright/test";
import chalk from "chalk";

function toYYYYMMDDHHMMSSUTC(date: Date): string {
  // Convert to UTC
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // getUTCMonth() is zero-indexed
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();

  // Pad single digit months, days, hours, minutes, and seconds with a leading zero
  const formattedMonth = month < 10 ? `0${month}` : `${month}`;
  const formattedDay = day < 10 ? `0${day}` : `${day}`;
  const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

  return `${year}-${formattedMonth}-${formattedDay}_${formattedHours}:${formattedMinutes}:${formattedSeconds}_UTC`;
}

export const inputKeywords = async (
  page: Page,
  { SEARCH_FROM_DATE, SEARCH_TO_DATE, SEARCH_KEYWORDS, MODIFIED_SEARCH_KEYWORDS }
) => {
  // wait until it shown: input[name="allOfTheseWords"]
  await page.waitForSelector('input[name="allOfTheseWords"]', {
    state: "visible",
  });

  await page.click('input[name="allOfTheseWords"]');

  
  if (SEARCH_FROM_DATE) {
    let searchFromDate: Date;
    if (SEARCH_FROM_DATE instanceof Date) {
      searchFromDate = SEARCH_FROM_DATE;
    } else {
      searchFromDate = new Date(SEARCH_FROM_DATE);
    }
    
    MODIFIED_SEARCH_KEYWORDS += ` since:${toYYYYMMDDHHMMSSUTC(searchFromDate)}`;
  }

  if (SEARCH_TO_DATE) {
    let searchToDate: Date;
    if (SEARCH_FROM_DATE instanceof Date) {
      searchToDate = SEARCH_TO_DATE;
    } else {
      searchToDate = new Date(SEARCH_TO_DATE);
    }

    MODIFIED_SEARCH_KEYWORDS += ` until:${toYYYYMMDDHHMMSSUTC(searchToDate)}`;
  }

  console.info(chalk.yellow(`\nFilling in keywords: ${MODIFIED_SEARCH_KEYWORDS}\n`));

  await page.fill('input[name="allOfTheseWords"]', MODIFIED_SEARCH_KEYWORDS);

  // Press Enter
  await page.press('input[name="allOfTheseWords"]', "Enter");
};
