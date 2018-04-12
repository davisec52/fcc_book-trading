require("../../.config/.config");
const {deleteFromRequestor, deleteOwnerBook, findFrom, changeBookOwner, otherRequestsTo, otherRequestsFrom} = require("../helpers/book-helpers");
const express = require("express");
const admin = express();
const mongoose = require("mongoose");
const router = express.Router();
const request = require("request");
const bodyParser = require("body-parser");
const passwordless = require("passwordless");
const urlencodedParser = bodyParser.urlencoded({extended: false});
const registerParser = bodyParser.urlencoded({extended: true});
const queryString = require("querystring");
const {User, Book, Test} = require("../models/users");

router.get("/", (req, res) => {
	if(req.user) {
		res.render("index", {user: res.locals.user});
	}else {
		res.render("index", {user: req.user});
	}
});

router.get("/login", (req, res) => {
	res.render("login", {user: req.user});
});

router.get("/register", (req, res) => {
	res.render("register", {user: req.user});
});

router.get("/catalog", passwordless.restricted({failureRedirect: "/login"}), (req, res) => {
	Book.find({}, (err, allBooks) => {
		res.render("allbooks", {books: allBooks, user: res.locals.user});
	});
});

router.get("/profile/:id", passwordless.restricted({
	failureRedirect: "/login"
}), (req, res) => {
	console.log("checking req.params.id: ", req.params.id);
	User.findById(req.params.id, (err, user) => {
		if(err) {
			console.log("profile - err: ", err);
			throw err;
		}else {
			res.render("profile", {
				location: user.location,
				username: user.userName,
				email: user.email
			});
		}
	});//User.find
});//router.get

router.get("/edit-profile/:id", passwordless.restricted({failureRedirect: "/login"}), (req, res) => {
	User.findById(req.params.id, (err, user) => {
		if(err) {
			console.log("profile err: ", err);
		}else {
			res.render("edit-profile", {user: user});
		}
	});
});

router.put("/edit-profile-feature/:id/:currentName", registerParser, passwordless.restricted({failureRedirect: "/login"}), (req, res) => {
	
	let updator;
	let property;
	let name;
	if(req.body.location) {
		updator = {$set:{location: req.body.location}};
	}else if(req.body.name) {
		updator = {$set:{userName: req.body.name}};
		name = req.body.name;
		property = "name";
	}else if(req.body.email) {
		updator = {$set:{email: req.body.email}};
	}

	User.findByIdAndUpdate(req.params.id, updator, (err, updatedUser) => {
		if(err) {
			console.log("err: ", err);
			res.redirect("/");
		}else {
			if(property === "name") {
				changeBookOwner(name, req.params.id);
				otherRequestsTo(req.params.id, req.params.currentName, name);
				otherRequestsFrom(req.params.id, req.params.currentName, name);
			}
			updatedUser.save(function(err) {
				if(err) {
					console.log(err);
					throw err;
				}else {
					console.log("saved updatedUser from profile feature update");
				}
			});
			res.redirect("/edit-profile/"+req.params.id);
		}
	});
});

router.get("/dashboard/:id",/* passwordless.restricted({failureRedirect: "/login"}),*/ (req, res) => {
	//console.log("locals: ", res.locals.user);
	User.findById(req.params.id, (err, user) => {
		console.log("checking req.params.id - dashboard: ", req.params.id);
		if(err) {
			console.log("err - dashboard: ", err);
			res.redirect("/");
		}else {
			res.render("dashboard", {
				user: user,
				books: user.books,
				incoming: user.requestsFromOthers,
				outgoing: user.requestsToOthers,
				false: false,
				true: true
			});
		}
	});
});

router.get("/find-book/:search", /*passwordless.restricted({failureRedirect: "/login"}),*/ (req, res) => {
	let term = req.params.search;
	term = term.toLowerCase().split(" ").join("+");
	let apiUrl =  `https://www.googleapis.com/books/v1/volumes?q=${term}&intitle&key=${process.env.API_KEY}`;
	request(apiUrl, (err, response, body) => {
		if(err) {
			console.log(err);
			throw err;
		}else {
			let result = JSON.parse(body);
			result = result.items;
			let list = result.map((item) => {
				item.volumeInfo.authors === undefined ? author = "" : author = item.volumeInfo.authors[0];
				item.volumeInfo.imageLinks === undefined || item.volumeInfo.imageLinks.thumbnail === undefined ? image = "http://via.placeholder.com/150x150" : image = item.volumeInfo.imageLinks.thumbnail;
				let titleList = {
					title: item.volumeInfo.title,
					author: author,
					image: image
				}
				return titleList;
			});
			res.status(200).json(list);
		}
	});
});

router.post("/create-book", registerParser, /*passwordless.restricted({failureRedirect: "/login"}),*/ (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	User.findById(req.user, (err, user) => {
		Book.create(req.body, (err, book) => {
			if(err) {
				console.log("err: ", err);
			}else {
				//console.log("user.userName: ", user.userName);
				book.owner.ownerName = user.userName,
				book.owner.id = user._id;
				book.save();
				let userBook = {
					id: book._id,
					title: book.title,
					author: book.author,
					ownerId: book.owner.id,
					image: book.image
				}
				user.books.push(userBook);
				user.save();
				book.save();
				res.status(200).json(book);
			}
		});
	});
});

//Initiated by book owner. Deletes book brom Book, book owner, and book requestor if requested
router.delete("/delete-book/:deleteData", /*password.restricted({failureRedirect: "/login"}),*/ (req, res) => {
	let qObj = queryString.parse(req.params.deleteData);
	let bookId = qObj.id;
	let queryFrom;
	console.log("checking queryString ownerId: ", qObj.ownerId);

	User.findById(req.user, (err, user) => {
		console.log("checking user - from delete-book: ", user);
		user.books.forEach((book, index, ar) => {
			if(book.id.toString() === bookId) {
				ar.splice(index, index+1);
			}
		});
		console.log("book deleted from user.books");
		user.save(function(err) {
			if(err) {
				console.log("err: ", err);
			}else {
				console.log("saved user from user.books: ", user);
			}
		});
		deleteOwnerBook(bookId);
		if(user.requestsFromOthers.length > 0) {
			user.requestsFromOthers.forEach((request, index, ar) => {
				if(request.id.toString() === bookId) {
					queryFrom = request.queryFromId;
					ar.splice(index, index+1);
				}
			});
			console.log("book deleted from requestsFromOthers");
			user.save(function(err) {
				if(err) {
					console.log(err);
				}else {
					console.log("user saved after book deletion from requestsFromOthers: ", user);
				}
			});
			if(queryFrom !== undefined) {
				deleteFromRequestor(queryFrom, bookId);
			}
		}
		res.status(200).redirect("/dashboard/"+req.user);
	});
});

//Initiated by person requesting trade. Deletes the request from requestor and requestee
router.delete("/delete-req/:bookid/:bookOwner", /*password.restricted({failureRedirect: "/login"}),*/ (req, res) => {
	let bookId = req.params.bookid;
	let ownerName = req.params.bookOwner;
	User.findById(req.user, (err, user) => {
		if(err) {
			console.log(err);
			throw err;
		}
		user.requestsToOthers.forEach((request, index, ar) => {
			console.log("checking request: ", request);
			if(request.id.toString() === bookId) {
				ar.splice(index, index+1);
			}
		});
		user.save();

		User.findOne({userName: ownerName}, (err, owner) => {
			owner.requestsFromOthers.forEach((request, index, ar) => {
				if(request.id.toString() === bookId) {
					ar.splice(index, index+1);
				}
			});
			owner.save();
			res.redirect("/dashboard/"+req.user);
		});
	});
});

router.post("/request-book/:requestInfo", /*password.restricted({failureRedirect: "/login"}),*/ (req, res) => {
	let query = queryString.parse(req.params.requestInfo);
	console.log("checking query - toOthers: ", query);
	let time = new Date;
	let timeStamp = time.toDateString();
	User.findById(req.user, (err, user) => {
		if(err) {
			console.log(err);
			throw err;
		}else {
			user.requestsToOthers.push({
				book: query.title,
				to: query.to,
				id: query.id, //book id
				created: timeStamp
			});
			user.save(function(err) {
				if(err) {
					throw err;
				}else {
					findFrom(query, req.user);
					res.redirect("/dashboard/"+req.user);
				}
			});
			
		}
	});
});

//Initiated by active user and points toward some other user who has requested books
router.get("/accept/:bool/:bookId", /*password.restricted({failureRedirect: "/login"}),*/ (req, res) => {
	console.log("checking accept bool: ", req.params.bool);
	let queryFrom;
	User.findById(req.user, (err, user) => {
		if(err) {
			console.log("accept bool err: ", err);
		}
		user.requestsFromOthers.forEach((request) => {
			queryFrom = request.queryFromId;
			if(request.id === req.params.bookId) {
				request.accept = req.params.bool;
			}
		});
		user.save(function(err) {
			if(err) {
				console.log(err);
				throw err;
			}else {
				console.log("user saved in user.requestsFromOthers");
			}
		});
		User.findById(queryFrom, (err, user) => {
			user.requestsToOthers.forEach((request) => {
				if(request.id === req.params.bookId) {
					request.accept = req.params.bool;
				}
			});
			user.save(function(err) {
				if(err) {
					console.log(err);
					throw err;
				}else {
					console.log("user saved in requestsToOthers");
				}
			});
			res.redirect("/dashboard/"+req.user);
		});
	});
});

//login - using npm passwordless for passwordless login
router.post("/send-login-token", urlencodedParser, passwordless.requestToken(
	function(user, delivery, callback){
		User.findOne({email: user}, (err, ret) => {
			if(err) {
				console.log("err: ", err);
			}
			else if(ret) {
				console.log("if ret: ", ret.id);
				callback(null, ret.id);
			}else{
				callback(null, null);
			}
		});
	}), (req, res) => {
		res.render("sent", {user: req.user});
});

//Register
router.post("/new-user", registerParser, (req,res) => {
	let time = new Date;
	let timeCreated = time.toDateString();
	let newUser = {
		userName: req.body.username,
		email: req.body.email
	}

	User.create(newUser, (err, user) => {
		if(err) {
			console.log(err);
		}else {
			console.log("user saved");
			res.render("login", {user: user.email});
		}
	});
});

router.get("/logout", passwordless.logout(), (req, res) => {
	res.status(200).redirect("/");
});


module.exports = router;