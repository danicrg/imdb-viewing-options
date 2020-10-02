const express = require("express");
const bodyParser = require("body-parser");
const path = require('path');

const cors = require("cors");
const { fetchImdbWatchList } = require("./imdb");
const { fetchJustWatchData } = require("./justwatch");
const { movieData, viewingOptionData } = require("./models");

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(cors());

app.get("/", (req, res) => {
	res.render('index', { movies: [] })
});

app.post("/", (req, res) => {
	const userId = req.body.userId || 'ur39373174';
	fetchImdbWatchList(userId).then(list => {
		Promise.all(list['movies'].map(
			movie => fetchMovieDetails(movie)))
		.then(justwatchlist => {
			listWithViewingOptions = justwatchlist.filter(item => item.viewingOptions.length > 0)

			res.render('index', { movies: listWithViewingOptions })
	})
	})
	.catch(err => {
		res.render('index', { movies: [] })
	});
});

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
			console.log("Not found in JustWatch: ", movie.title, movie.year);
			return { viewingOptions: []};
		})
		.catch(error => {
			console.error(error);
		});

// process.env.PORT lets the port be set by Heroku
const port = process.env.PORT || 8080;

app.listen(port, () => {
	console.log(`App listening on port ${port}!`);
});
