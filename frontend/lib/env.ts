export function getSummariesPerPage(){
  const envPerPage = process.env.NUXT_SUMMARIES_PER_PAGE;
  if (envPerPage && envPerPage.length > 0) {
    const parsedPerPage = Number(envPerPage);
    if (parsedPerPage > 0) {
      return parsedPerPage;
    }
    if(isNaN(parsedPerPage)){
      return 10;
    }
  }

  return 10;
}