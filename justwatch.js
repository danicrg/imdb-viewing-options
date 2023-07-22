const fetch = require('node-fetch');
const leven = require('leven');
const { viewingOptionData } = require('./models');
const { handleErrors } = require('./utils');

var offer_ids = []

const findBestPossibleJustwatchResult = (title, year, type, results) => {

  if (!results) {
    return null;
  }

  return results.filter((result) => {

    const titleMatch = leven(result.title.toLowerCase(), title.toLowerCase());
    const yearMatch = result.original_release_year <= parseInt(year) + 3 && result.original_release_year >= parseInt(year) - 3;
    const titleAndYearMatch = titleMatch === 0 && yearMatch;
    const fuzzyTitleAndYearMatch = titleMatch <= 5 && yearMatch;
    const titleMatchesForSeries = titleMatch === 0 && type === 'series' && result.object_type === 'show';
    return titleAndYearMatch || titleMatchesForSeries;
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
  "en_US": {
    8: 'Netflix US',
    9: 'Amazon Prime US',
    384: 'Max US',
  },
  "es_ES": {
    // 119: 'Amazon Prime ES',
    63: 'Filmin ES'
  },
  "it_IT": {
    1796: 'Netflix IT',
  }
};

const extractBestViewingOption = (offers, locale) => {
  // console.log(offers)
  const viewingOptionsByProvider = offers.filter(
    offer => justWatchProviders[locale][offer.provider_id] !== undefined && offer.monetization_type === 'flatrate'
  );

  const providers = [...new Set(viewingOptionsByProvider.map(viewingOption => justWatchProviders[locale][viewingOption.provider_id]))]

  return providers;
};

const fetchJustWatchData = (imdbId, title, type, year, locale) => {

  return fetch(`http://apis.justwatch.com/content/titles/${locale}/popular`, {
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
        throw Error(`${imdbId}: ${title}: ${year} was not found at JustWatch`);
      }

      const content_type = possibleItem.object_type;
      const title_id = possibleItem.id;


      return fetch(`http://apis.justwatch.com/content/titles/${content_type}/${title_id}/locale/${locale}`, {
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
          const offers = item.offers || [];
          const viewingOptions = extractBestViewingOption(offers, locale)
          return viewingOptions

        });

    });

};

// fetchJustWatchData('tt2358891', 'La grande belleza', 'film', 2013, "it_IT").then(res => console.log(res));



const fetchProviders = (locale) => {

  return fetch(`http://apis.justwatch.com/content/providers/locale/${locale}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
    },
  })
    .then(handleErrors)
    .then(response => response.json())
    .then((json) => { return json })
}

// fetchProviders('it_IT').then(res => console.log(res));

module.exports = { fetchJustWatchData }
