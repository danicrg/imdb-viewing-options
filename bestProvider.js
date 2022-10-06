const fetch = require('node-fetch');
const leven = require('leven');
const { viewingOptionData } = require('./models');
const { handleErrors } = require('./utils');
const { fetchImdbWatchList } = require("./imdb");

var offer_ids = []

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
  8: 'Netflix',
  // 119: 'Amazon Prime',
  9: 'Amazon Prime',
  384: 'HBO',
  //63: 'Filmin'
};

const extractBestProvider = (offers) => {
  const viewingOptionsByProvider = offers.filter(
    offer => offer.monetization_type === 'flatrate'
  );
  return viewingOptionsByProvider
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


      return fetch(`http://apis.justwatch.com/content/titles/${content_type}/${title_id}/locale/en_US`, {
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

          const viewingOptions = extractBestProvider(offers)
          return viewingOptions

        });

    });

};

const express = require("express");
const bodyParser = require("body-parser");
const path = require('path');

const cors = require("cors");

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(cors());



const userId = 'ur39373174';
fetchImdbWatchList(userId).then(list => {
  Promise.all(list['movies'].map(
    movie => fetchMovieDetails(movie)))
    .then(justwatchlist => {
      listWithViewingOptions = justwatchlist.filter(item => item.viewingOptions.length > 0)

      listWithViewingOptions = listWithViewingOptions.sort((a, b) => {
        return (b.metascore || 0) - (a.metascore || 0)
      })

      let providerCount = {}
      let providerName = {}
      listWithViewingOptions.forEach(movie => {
        movie.viewingOptions.forEach(offer => {
          console.log(offer)
          providerCount[offer.provider_id] = providerCount[offer.provider_id] ? providerCount[offer.provider_id] + 1 : 1
          providerName[offer.provider_id] = offer.package_short_name

        })
      })
      console.log(providerCount)
      console.log(providerName)


    })
})

const fetchMovieDetails = movie =>
  fetchJustWatchData(
    movie.id,
    movie.title,
    movie.type,
    movie.year
  )
    .then(JustWatchData => {
      return {
        title: movie.title,
        year: movie.year,
        viewingOptions: JustWatchData,
        runtime: movie.runTime,
        metascore: movie.ratings.metascore,
        poster: movie.poster,
        url: movie.imdbUrl,
        certificate: movie.certificate
      }
    })
    .catch(error => {
      // console.log("Not found in JustWatch: ", movie.title, movie.year);
      console.error(error.message)
      return { viewingOptions: [] };
    })