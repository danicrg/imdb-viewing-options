const fetch = require('node-fetch');
const { handleErrors } = require('./utils');
const { movieData } = require('./models');

const fetchImdbWatchList = userId =>
  fetch(`http://www.imdb.com/user/${userId}/watchlist?view=detail`)
    .then(response => response.text())
    .then((text) => {
      const initialStateRegex = /IMDbReactInitialState\.push\((\{.+\})\);/g;
      const matches = initialStateRegex.exec(text);
      const initialStateText = matches[1];

      const watchlistData = JSON.parse(initialStateText);

      const movieIds = watchlistData.list.items.map(i => i.const);

      return fetch(`http://www.imdb.com/title/data?ids=${movieIds.join(',')}`, {
        method: 'GET',
        headers: { 'Accept-Language': 'en-US,en' },
      })
        .then(handleErrors)
        .then(response => response.json())
        .then((movieData) => {
          const movies = movieIds.map(movieId => convertImdbMovieToMovie(movieData[movieId].title));

          return {
            id: watchlistData.list.id,
            name: watchlistData.list.name,
            movies,
          };
        });
    });

const imdbMovieTypes = {
  featureFilm: 'film',
  series: 'series',
  episode: 'series',
};

const convertImdbMovieToMovie = imdbMovieData => {
  const releaseDate = new Date(imdbMovieData.metadata.release);
  const releaseYear = releaseDate.getFullYear();
  return movieData({
    id: imdbMovieData.id,
    title: imdbMovieData.primary.title,
    imdbUrl: `http://www.imdb.com${imdbMovieData.primary.href}`,
    type: imdbMovieTypes[imdbMovieData.type],
    year: imdbMovieData.primary.year === undefined ? releaseYear : imdbMovieData.primary.year[0],
    runTime: calculateMovieRunTime(imdbMovieData),
    numberOfEpisodes: imdbMovieData.metadata.numberOfEpisodes || 1,
    genres: imdbMovieData.metadata.genres,
    metascore: imdbMovieData.ratings.metascore,
    imdbRating: imdbMovieData.ratings.rating,
  });
}

const calculateMovieRunTime = (imdbMovieData) => {
  const runTimeInSeconds = imdbMovieData.metadata.runtime;
  return runTimeInSeconds ? runTimeInSeconds / 60 : null;
};

fetchImdbWatchList('ur39373174').then(result => {
  // console.log(result)
  return
});

module.exports = {fetchImdbWatchList}