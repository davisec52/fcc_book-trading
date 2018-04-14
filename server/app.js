require("../.config/config");
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const cookieParser = require("cookie-parser");
const expressSession = require("express-session");
const passwordless = require("passwordless");
const MongoStore = require("passwordless-mongostore");
const email = require("emailjs"); 
const path = require("path");
const publicPath = path.join(__dirname, "../public");
const indexRoutes = require("./routes/routes");
const {User} = require("./models/users");

let port = process.env.PORT || 3000;

let yourEmail = 'app.getlogin@outlook.com';
//let yourEmail = "app.passwordhelp@outlook.com";
let yourPwd = process.env.OUTLOOK_PASSWORD;
let yourSmtp = 'smtp-mail.outlook.com';
let smtpServer  = email.server.connect({
  user:    yourEmail, 
  password: yourPwd,
  timeout: 80000,
  host: yourSmtp, 
  tls: { ciphers: 'SSLv3' }
});

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI, {
	promiseLibrary: mongoose.promise
}).then((db) => {console.log("mongodb connected")}).catch((err) => {
	console.log("error connecting to db");
	throw err;
});

let host = "http://localhost:3000" || "https://fcc-book-ex-app.herokuapp.com";

passwordless.init( new MongoStore( process.env.MONGODB_URI ));
passwordless.addDelivery(
  function( tokenToSend, uidToSend, recipient, callback ) {
    // Send out token
    smtpServer.send({
      text: 'Hello!\nYou can now access your account here:\n'
      + host + '?token=' + tokenToSend + '&uid='
      + encodeURIComponent(uidToSend),
      from: yourEmail, 
      to: recipient,
      subject: 'Token for ' + host,

      /*-- Set "alternative" to true if you want to email to go out as html. Optionally, "attachment" can be
      be removed */
      attachment: [
        {
          data: "<html>INSERT HTML STRING LINKING TO TOKEN</html>",
          alternative: false
        }
      ]
      }, function( err, message ) { 
        if( err ) {
          console.log("error in sending: ", err );
        }
          callback("sending callback: ",  err );
        });
});

app.use( cookieParser() );
app.use( expressSession( 
  {
    secret: process.env.SECRET,
    saveUninitialized: false, 
    resave: false, 
    cookie: { maxAge: 60*60*24*365*10 }
  }));

app.use(passwordless.sessionSupport());
app.use(passwordless.acceptToken({successRedirect: "/catalog"}));

app.use(function(req, res, next) {
	//console.log("checking req.user in app.use: ", req.user);
    if(req.user) {
        User.findById(req.user, function(error, user) {
            res.locals.user = user;
            next();
        });
    } else { 
        next();
    }
});

app.use(methodOverride("_method"));
app.set("views", publicPath + "/views");
app.use(express.static(publicPath));
app.set("view engine", "ejs");

app.use("/", indexRoutes);


app.listen(port, process.env.IP, () => {
	console.log(`Server listening on port ${port}...`);
});