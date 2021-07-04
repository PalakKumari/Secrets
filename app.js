//jshint esversion:6
require('dotenv').config()
const express=require("express");
const ejs=require("ejs");
const mongoose=require("mongoose");
const encrypt=require("mongoose-encryption");
//connect to mongoose
mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true});
const userSchema=new mongoose.Schema({
    email: String,
    password: String
});
//create a secret key
const secret=process.env.SECRET;

//add a plugin to userSchema.
userSchema.plugin(encrypt,{secret:secret, encryptedFields:["password"]});

//create a new mongoose model
const User=new mongoose.model("user", userSchema);

//create app
const app=express();
app.set('view engine','ejs');
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));

//get routes
app.get("/",function(req,res){
    res.render("home");
});
app.get("/login",function(req,res){
    res.render("login");
});
app.get("/register",function(req,res){
    res.render("register");
});

///post route for register form
app.post("/register",function(req,res){
    const username=req.body.username;
    const password=req.body.password;
    const newUser= new User({
        email:username,
        password:password
    });
    newUser.save(function(err){
        if(!err){
            res.render("secrets");
        }
        else{
            console.log(err);
        }
    });
});

//post route for login form
app.post("/login",function(req,res){
    const username=req.body.username;
    const password=req.body.password;
    User.findOne({email:username},function(err,foundUser){
        if(!err)
        {
            if(foundUser)
            {
                if(foundUser.password === password)
                {
                    res.render("secrets");
                }else{
                  res.send('Wrong Password');
                }
            }
            else{
                res.send('User not found');
            }
        }
        else{
            console.log(err);
        }
    })
})


//connecting to port 3000
app.listen(3000,function(){
    console.log("Server started on port 3000");
})
