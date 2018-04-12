const mongoose = require("mongoose");
const {User, Book} = require("../models/users");

function deleteFromRequestor(queryFromId, bookId) {
	console.log("queryFromId - deleteFromRequestor: ", queryFromId);
	console.log("bookId: ", bookId);
	User.findById(queryFromId, (err, user) => {
		console.log("checking book owner - delete req from others book: ", user);
		
		if(err) {
			console.log(err);
			throw err;
		}
		user.requestsToOthers.forEach((request, index, ar) => {
			if(request.id === bookId) {
				ar.splice(index, index+1);
			}
		});
		user.save(function(err) {
			if(err){
				console.log(err);
				throw err;
			}else {
				console.log("save owner: ", user);
			}
		});
	});
}

function deleteOwnerBook(id) {
	console.log("running deleteOwnerBook: ", id);
	Book.findOneAndRemove({_id: id}, (err, removedBook) => {
		if(err) {
			console.log("error removing book: ", err);
			throw err;
		}else {
			console.log("success deleting book from Books: ", removedBook);
		}
	});
}

function findFrom(query, reqId) {
	console.log("checking query - findFrom: ", query);
	let time = new Date;
	let timeStamp = time.toDateString();
	User.findOne({"userName": query.to}, (err, user) => {
		console.log("checking user - findFrom: ", user);
		user.requestsFromOthers.push({
			book: query.title,
			from: query.from,
			id: query.id,  //book id
			queryFromId: reqId,
			created: timeStamp
		});
		user.save();
	});
}

//changes book owner name when user changes username
function changeBookOwner(name, id) {
	Book.find({}, (err, allBooks) => {
		allBooks.filter((book) => {
			console.log("book owner id string: ", book.owner.id.toString());
			if(book.owner.id.toString() === id) {
				console.log("checking book title - changeBookOwner: ", book.title);
				book.owner.ownerName = name;
				book.save();
			}
		});
	});
}

//Changes username of outgoing book request pointing toward the active, logged in user
function otherRequestsTo(userId, oldName, changedUserName) {
	let idList = [];
	User.findById(userId, (err, user) => {
		if(err) {
			console.log(err);
			throw err;
		}else {
			//console.log("user from changeNameOnRequested: ", user);
			user.requestsFromOthers.forEach((request) => {
				idList.push(request.queryFromId);
			});
			idList.forEach((id) => {
				User.findById(id, (err, rUser) => {
					if(err) {console.log(err); throw err;}
					rUser.requestsToOthers.forEach((r) => {
						if(r.to === oldName) {
							r.to = changedUserName;
							rUser.save();
						}
					});
				});
			});
		}
	});
}

//Changes username of outgoing book requests when request is being made by the active, logged in user.
function otherRequestsFrom(userId, oldName, changedUserName) {
	let idList = [];
	User.findById(userId, (err, user) => {
		if(err) {
			console.log(err);
			throw err;
		}else {
			//console.log("user from changeNameOnRequested: ", user);
			user.requestsFromOthers.forEach((request) => {
				idList.push(request.queryFromId);
			});
			idList.forEach((id) => {
				User.findById(id, (err, rUser) => {
					if(err) {console.log(err); throw err;}
					rUser.requestsFromOthers.forEach((r) => {
						if(r.from === oldName) {
							r.from = changedUserName;
							rUser.save();
						}
					});
				});
			});
		}
	});
}

module.exports = {
	deleteFromRequestor,
	deleteOwnerBook,
	findFrom,
	changeBookOwner,
	otherRequestsTo,
	otherRequestsFrom
};