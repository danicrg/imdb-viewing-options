const fetch = require('node-fetch');
const leven = require('leven');
const { viewingOptionData } = require('./models');
const { handleErrors } = require('./utils');

const findBestPossibleJustwatchResult = (title, year, type, results) => {

  if (!results) {
    return null;
  }

  return results.filter((result) => {
    
    const titleMatch = leven(result.title.toLowerCase(), title.toLowerCase());
    const yearMatch = result.original_release_year === parseInt(year);
    const titleAndYearMatch = titleMatch === 0 && yearMatch;
    const fuzzyTitleAndYearMatch = titleMatch <= 5 && yearMatch;
    const titleMatchesForSeries = titleMatch === 0 && type === 'series' && result.object_type === 'show';
    return titleAndYearMatch || titleMatchesForSeries ;
  })[0];
};

const justwatchType = (itemType) => {
  switch (itemType) {
    case 'film':
      return 'movie';
    case 'series':
      return 'show';
  }
};

const justWatchProviders = {
  8: 'Netflix',
  119: 'Amazon Prime',
  27: 'HBO',
};

const extractBestViewingOption = (offers) => {
  const viewingOptionsByProvider = offers.filter(
    offer => justWatchProviders[offer.provider_id] !== undefined && offer.monetization_type === 'flatrate'
  );

  const providers = [...new Set(viewingOptionsByProvider.map(viewingOption => justWatchProviders[viewingOption.provider_id]))]

  return providers;
};

const fetchJustWatchData = (imdbId, title, type, year) => {

  return fetch('http://apis.justwatch.com/content/titles/en_US/popular', {
    method: 'POST',
    body: JSON.stringify({
      content_types: [justwatchType(type)],
      query: title,
    }),
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
    },
  })
    .then(handleErrors)
    .then(response => response.json())
    .then((json) => {
      const possibleItem = findBestPossibleJustwatchResult(title, year, type, json.items);
      if (!possibleItem) {
        throw Error(`${imdbId}: ${title} was not found at JustWatch`);
      }

      const content_type = possibleItem.object_type;
      const title_id = possibleItem.id;


      return fetch(`http://apis.justwatch.com/content/titles/${content_type}/${title_id}/locale/es_ES`, {
        method: 'GET',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then(handleErrors)
        .then(response => response.json())
        .then((json) => {

          const item = json;

          // console.log(item)
          const offers = item.offers || [];

          const viewingOptions = extractBestViewingOption(offers)

          return viewingOptions

        });

    });

};

// fetchJustWatchData('tt5726616', 'Call Me by Your Name', 'film', 2017).then(res => console.log(res));

module.exports = {fetchJustWatchData}
