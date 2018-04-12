const mongoose = require("mongoose");
const validator = require("validator");

let UserSchema = mongoose.Schema({
	userName: {
		type: String,
		required: true,
		unique: true
	},

	email: {
		type: String,
		required: true,
		trim: true,
		minlength: 8,
		unique: true,
		validate: {
			isAsync: false,
			validator: validator.isEmail,
			message: `{value} is not a valid email`
		}
	},

	location: {
		type: String,
		default: "somewhere"
	},

	books: Array,

	requestsFromOthers: [{
		book: String,
		from: String,
		id: String,
		queryFromId: String,
		accept: {type: Boolean, default: null},
		created: String
	}],

	requestsToOthers: [{
		book: String,
		to: String,
		id: String,
		accept: {type: Boolean, default: null},
		created: String
	}]

});

let BookSchema = mongoose.Schema({
	title: String,
	author: String,
	image: String,
	owner: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		ownerName: String
	},
	created: String
});

let TestSchema = mongoose.Schema({
	testString: String,
	testProperty: String,
	owner: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		ownerName: String
	},
	created: String
});

//Property for books in UserSchema must be revised for this to work
UserSchema.methods.deleteUserBook = function(title) {
	let user = this;
	
	return user.update({
		$pull: {
			books: {title}
		}
	});
};




let User = mongoose.model("User", UserSchema);
let Book = mongoose.model("Book", BookSchema);
let Test = mongoose.model("Test", TestSchema);

module.exports = {User, Book, Test};