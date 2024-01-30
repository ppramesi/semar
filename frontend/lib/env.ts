const services = {
  "semantic-search": process.env.NUXT_SEMANTIC_SEARCH_ENDPOINT,
};

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

export function getServicesUrl(service: keyof typeof services) {
  if (services[service] === undefined) {
    throw new Error(`Service ${service} not found`);
  }

  return new URL(services[service]!).toString();
}