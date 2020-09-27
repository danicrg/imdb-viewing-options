const movieData = ({
  id,
  title,
  imdbUrl,
  type,
  year,
  runTime,
  numberOfEpisodes,
  genres,
  metascore,
  rottenTomatoesMeter,
  imdbRating,
  bechdelRating,
  netflix,
  hbo,
  itunes,
  amazon,
  showtime,
}) => ({
  id,
  title,
  imdbUrl,
  type,
  year,
  runTime,
  numberOfEpisodes,
  genres,
  ratings: {
    metascore,
    rottenTomatoesMeter,
    imdb: imdbRating,
    bechdel: bechdelRating,
  },
  viewingOptions: {
    netflix: netflix || null,
    hbo: hbo || null,
    itunes: itunes || null,
    amazon: amazon || null,
    showtime: showtime || null,
  },
});

const viewingOptionData = ({
  provider,
  url,
  monetizationType,
  presentationType,
  price,
}) => ({
  provider,
  url,
  monetizationType,
  presentationType,
  price: price || null,
});

module.exports = {viewingOptionData, movieData}