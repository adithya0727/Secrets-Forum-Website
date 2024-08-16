require('dotenv').config();
const express = require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose")
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.set('Cache-Control', 'no-store');
app.use(bodyparser.urlencoded({extended:true}));

app.use(session({
  secret: "Our Little Secret.",
  resave: false,
  saveUninitialized:false
}))

app.use(passport.initialize());

app.use(passport.session());

mongoose.connect("mongodb+srv://adithyab727:XQZ0Lkih2gNHChNJ@cluster0.mihhgjm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
}, { timestamps: true });

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = mongoose.model("User",userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});


passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "https://secrets-forum-website-2.onrender.com/auth/google/secrets",
},
function(accessToken, refreshToken, profile, cb) {
  
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));


app.get("/",function(req,res){
    res.render("home")
})

app.route('/auth/google')

  .get(passport.authenticate('google', {

    scope: ['profile']

  }));


  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    
    res.redirect('/secrets');
  })


app.get("/login",function(req,res){
    res.render("login")
})





app.get("/register",function(req,res){
    res.render("register")
})

app.get("/secrets", async function(req, res) {
  try {
    const founditems = await User.find({"secret": {$ne: null}});
    if (founditems) {
      res.render("secrets", {usersWithSecrets: founditems});
    }
  } catch (err) {
    console.log(err);
  }
});


app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit")
  } else{
    res.redirect("/login")
  }  
})

app.post("/submit",async function(req,res){
  const sub = req.body.secret;

  try {
    const found = await User.findById(req.user.id);
    if (found) {
      found.secret = sub;
      await found.save();
      res.redirect("/secrets");
    }
  } catch (err) {
    console.log(err);
  }
  




})






app.get("/logout",function(req,res){
  req.logout(function(err){
    if(err){
      console.log(err)
    }else{
      res.redirect("/");
    }
  });
  
});



app.post("/register",async function(req, res) {
    User.register({username:req.body.username}, req.body.password,function(err,user){
      if(err){
        console.log(err);
        res.redirect("/register");
      }
      else{
        passport.authenticate("local")(req,res,function(){
          res.redirect("/secrets");
        })
      }
    })
      

  });
   
// app.post("/login", async function(req,res){
//     const user = new User({
//       username: req.body.username,
//       password:req.body.password
//     })

//     req.login(user , function(err){
//       if(err){
//         console.log(err);
//       } else{
//         passport.authenticate("local")(req,res,function(){
//           res.redirect("/secrets")
//         })
//       }
//     })


// });
    


app.post('/login', passport.authenticate('local', {
  successRedirect: '/secrets',
  failureRedirect: '/login',
}));






app.listen(3000,function(){
    console.log("Listening on port 3000!")
});
