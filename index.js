require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
let bodyParser = require("body-parser");
const short = require('shortid');
const mongoose = require('mongoose');
let passport = require('passport');
let LocalStrategy = require('passport-local').Strategy;
const port = process.env.PORT || 3000;
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
mongoose.connect(process.env.MONGO_URI);

let userSchema= new mongoose.Schema({
  username: String
});

let exercisesSchema= new mongoose.Schema({
  id: String,
  username:String,
  date: Date,
  duration:Number,
  description: {type:Array}
  
});

let userData = mongoose.model('userData', userSchema);
let exercisesData=mongoose.model('exerciseData', exercisesSchema);

app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

async function addUserToDbAndReturnResponse(user,res)
{
    let createAndSaveUser= async function() 
    {
      user = new userData({username:user});
      user.save(function(err, data) 
        {
          if (err) return console.error(err);
            console.log(data+" saved.");
        });  
        res.send(user);
    }
  createAndSaveUser(user);
}

async function addExerciseToDbAndReturnResponse(id,duration,description,date,res)
{
  let foundUserData = await userData.findOne({"_id":id});
  let foundExerciseData=await exercisesData.findOne({"id":id});
 
  if(foundExerciseData===null)
  {
      let createAndSaveExercise= async function() 
      {
        newExerciseData = new 
        exercisesData({id:id, username:foundUserData['username'],
        description:{description:description,
                     duration:parseInt(duration),
                     date: new Date(date).toDateString()}});
        newExerciseData.save(async function(err, data) 
        {
          if (err) return console.log(err);
            console.log(data+" saved");
        });  
      }
      
      createAndSaveExercise();
    
      return res.json({ 
      username:foundUserData['username'],description:description,
      duration:parseInt(duration),
      date:new Date(date).toDateString(),_id:id});
  }
  else
  {
      exercisesData.findOne({'id':id}).exec(async function(err,data)
      {      
         data.description.push({description:description,
                                duration:parseInt(duration),
                                date: new Date(date).toDateString()});
        
         data.save(async function(err){
             console.log(data);
          });
          let foundExerciseData=await exercisesData.find({'id':id});
          return res.json({ 
          username:foundUserData['username'],description:description,
          duration:parseInt(duration),
          date: new Date(date).toDateString(),_id:id});
      });
 } 
}

app.get('/api/users', async function(request, response) {
  let allusers= await userData.find();
  return response.send(allusers);

});

app.post('/api/users', async function(req, res) {
  let user=req.body.username;
  try{
      addUserToDbAndReturnResponse(user,res);
  }catch(error){
      return response.send(error);
  }
});

app.post('/api/users/:_id/exercises', async function(req, res) {
  let duration=req.body.duration;
  let description=req.body.description;
  let date=req.body.date;
  let id=req.params._id;
  if((date===undefined)||date===''){
    date=new Date();
  } 
  addExerciseToDbAndReturnResponse(id,duration,description,date,res);

});

app.get('/api/users/:_id/logs/:from?/:to?/:limit?', async function(req, res) {
  
  let id=req.params._id;
  let from=req.query.from;
  let to=req.query.to;
  let foundExerciseData;
  let logData;
  //option 'to' and 'from' params and filter the array of jsons. 
  if(to!=undefined&&from!=undefined){
      foundExerciseData=await exercisesData.find({'id':id});
      foundExerciseData=foundExerciseData[0]['description'];
      let startDate = new Date(from);
      let endDate = new Date(to);
      let resultProductData = foundExerciseData.filter(data => {
      let date = new Date(data.date);
      return (date >= startDate && date <= endDate);
  });
  logData=resultProductData;
  }else{
    foundExerciseData=await exercisesData.find({'id':id});
    logData=foundExerciseData[0]['description'];
  }
  
  let foundUserData=await userData.find({'_id':id});
  let userNameData=foundExerciseData[0]['username'];
  let limit=req.query.limit;
  let temporaryLogData=[];
  //initialize count to add to an array and check against limit
  var count=1;
  //if limit param passed replace array of exercises with array with limit
    if(limit!=null){
      for(var element of logData){
        if(count<=parseInt(limit)){
        temporaryLogData.push(element)
          count=count+1;
        }else{
          count=limit+1;
        }
      }
    logData=temporaryLogData;
    }
  return res.json({_id:id, 
  username:userNameData,count:logData.length,log:logData});
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});





