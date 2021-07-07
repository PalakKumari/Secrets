//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

// const bcrypt = require("bcrypt");
// const saltRounds = 10;
//create app
const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

//initialize the session
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
  })
);
//tell our app to initialize passport
app.use(passport.initialize());
//tell app to use passport for ddealing with sessions.
app.use(passport.session());
//connect to mongoose
mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: [String],
});
//create a secret key
// const secret=process.env.SECRET;

// //add a plugin to userSchema.
// userSchema.plugin(encrypt,{secret:secret, encryptedFields:["password"]});
//this plugin will be used to hash and salt our password and to save our user to our database.
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//create a new mongoose model
const User = new mongoose.model("user", userSchema);

passport.use(User.createStrategy());
//seralize and desearlize for passport local strategy
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

//get routes
app.get("/", function (req, res) {
  res.render("home");
});
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);
app.get("/login", function (req, res) {
  res.render("login");
});
app.get("/register", function (req, res) {
  res.render("register");
});
app.get("/secrets", function (req, res) {
  User.find({ secret: { $ne: null } }, function (err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", { usersWithSecrets: foundUsers });
      }
    }
  });
});
app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});
app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});
app.post("/submit", function (req, res) {
  const submittedSecret = req.body.secret;
  User.findById(req.user.id, function (err, foundUser) {
    if (!err) {
      if (foundUser) {
        foundUser.secret.push(submittedSecret);
        foundUser.save(function (err) {
          if (!err) {
            res.redirect("/secrets");
          }
        });
      }
    } else {
      console.log(err);
    }
  });
});

///post route for register form
app.post("/register", function (req, res) {
  const username = req.body.username;
  const password = req.body.password;
  User.register({ username: username }, password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        //this function will only execute if authentication is successful.
        res.redirect("/secrets");
      });
    }
  });
});

///bcrypt method to add salting and hashing of password while registering
//   bcrypt.hash(password, saltRounds, function (err, hash) {
//     const newUser = new User({
//       email: username,
//       password: hash,
//     });
//     newUser.save(function (err) {
//       if (!err) {
//         res.render("secrets");
//       } else {
//         console.log(err);
//       }
//     });
//   });

//post route for login form
app.post("/login", function (req, res) {
  const username = req.body.username;
  const password = req.body.password;
  const user = new User({
    username: username,
    password: password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      //sends a cookie to the browser that contains some information about the current session.
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

//bcrypt method to login user
//   User.findOne({ email: username }, function (err, foundUser) {
//     if (!err) {
//       if (foundUser) {
//         bcrypt.compare(password, foundUser.password, function (err, result) {
//           if (result === true) {
//             res.render("secrets");
//           } else {
//             res.send("wrong password");
//           }
//         });
//       } else {
//         res.send("User not found");
//       }
//     } else {
//       console.log(err);
//     }
//   });

//connecting to port 3000
app.listen(3000, function () {
  console.log("Server started on port 3000");
});
