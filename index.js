const express = require('express');
const serverless = require('serverless-http');
const imagegramModel = require('./models/imagegram_model');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const multer  = require('multer');
const app = express();
const port = process.env.PORT || 4000;
const AWS = require('aws-sdk');
const BUCKET_NAME = process.env.s3bucket;
const IAM_USER_KEY = process.env.accessKeyId;
const IAM_USER_SECRET = process.env.secretAccessKey;
const s3 = new AWS.S3({
  accessKeyId: IAM_USER_KEY,
  secretAccessKey: IAM_USER_SECRET
});

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
var storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '.jpg');
  }
});

var upload = multer({
    /*storage: storage,*/
    fileFilter: function (req, file, callback) {
      var ext = path.extname(file.originalname);
      if(ext !== '.png' && ext !== '.jpg' && ext !== '.png' && ext !== '.bmp') {
          callback('Only images with formats: .png, .jpg, .bmp. are allowed');
      }else{
        callback(null,req.files);
      }
    },
}).any();

//User Stories 1: As a user, I should be able to create new accounts
app.post('/createcreator',upload, (req, res) => {
    const dataobj = {
      name : req.body.name
    }
    imagegramModel.createcreator(dataobj,function(err,result){
      if(err){
          res.send(err);
      }else{
        res.setHeader('x-account-id',result.creatorId);
        res.status(201).send(result);
      }
    });
});

app.post('/createpost2',function(req,res){
  const dataobj = {
    creator : req.headers['x-account-id'],
    caption : req.body.caption,
  }
  if(dataobj.creator){
    upload(req,res,function(err){
      if(err)
      {
        console.log(err);
        const response = {creatorId: dataobj.creator, data: null, message: err};
        res.setHeader('x-account-id',dataobj.creator);
        res.send(response);
      }
      else
      {
        const reqBody = {
          caption : req.body.caption,
          images   : req.files.map(a => a.filename).join(','),
          creator : dataobj.creator
        };        
        
        const images_arr = [];
        var fs = require('fs');
        const async = require('async');
        async.each(req.files, function(eachfile,asCb)
        {
          // Read the file
          const file = fs.readFileSync(eachfile);
              // Setting up S3 upload parameters
              const uploadParams = {
                Bucket: BUCKET_NAME, // Bucket into which you want to upload file
                Key: newfilename, // Name by which you want to save it
                Body: file // Local file 
            };
            s3.upload(uploadParams, function(err, data) {
                if (err) { 
                  asCb(err);
                } 
                if (data) {
                  images_arr.push(newfilename);
                  asCb();
                }
            });
        },function(err)
        {
          if(err)
          {
            console.log(err);
            const response = {creatorId: dataobj.creator, data: null, message: err};
            res.setHeader('x-account-id',dataobj.creator);
            res.send(response);
          }else{
            console.log("Images were uploaded");
            imagegramModel.createpost(reqBody,function(err,result){
              if(err){
                  res.setHeader('x-account-id',dataobj.creator);
                  res.send(err);
              }else{
                res.setHeader('x-account-id',dataobj.creator);
                res.status(201).send(result);
              }
            });    
          }    
        });
      }
    });
  }else{
    const response = {creatorId: null, data: null, message: "Creator cannot be null." };
    res.send(response);
  }
});

//User Stories 2: As a user, I should be able to create posts with images
app.post('/createpost', function(req, res){
  console.log(req.headers);
  const dataobj = {
    creator : req.headers['x-account-id']
  }
  if(dataobj.creator){
    upload(req,res,function(err){
        if(err)
        {
          console.log(err);
          const response = {creatorId: dataobj.creator, data: null, message: err};
          res.setHeader('x-account-id',dataobj.creator);
          res.send(response);
        }
        else
        {
          console.log("Images were uploaded");
          const reqBody = {
            caption : req.body.caption,
            images   : req.files.map(a => a.filename).join(','),
            creator : dataobj.creator
          };        
          imagegramModel.createpost(reqBody,function(err,result){
            if(err){
                res.setHeader('x-account-id',dataobj.creator);
                res.send(err);
            }else{
              res.setHeader('x-account-id',dataobj.creator);
              res.status(201).send(result);
            }
          });
        }
    });
  }else{
    const response = {creatorId: null, data: null, message: "Creator cannot be null." };
    res.send(response);
  }
});

//User Stories 3: As a user, I should be able to comment on a post
app.post('/addcomment',upload, (req, res) => {
  const dataobj = {
    creator : req.headers['x-account-id'],
    post_id : req.body.post_id,
    content : req.body.content
  }
  if(dataobj.creator){
    imagegramModel.addcomment(dataobj,function(err,result){
      if(err){
        res.setHeader('x-account-id',dataobj.creator);
        res.send(err);
      }else{
        res.setHeader('x-account-id',dataobj.creator);
        res.status(201).send(result);
      }
    });
  }else{
    const response = {creatorId: null, data: null, message: "Creator cannot be null." };
    res.send(response);
  }
});

//User Stories 4: As a user, I should be able to get the list of all posts from all users along with last 2 comments to each post
//Posts should be sorted by the number of comments (desc)
//Retrieve posts via a cursor-based pagination
app.get('/getallpost',function(req,res){
  const dataobj = {
    creator : req.headers['x-account-id']
  }
  if(dataobj.creator){
    imagegramModel.getallpost(dataobj,function(err,result){
      if(err){
          res.setHeader('x-account-id',dataobj.creator);
          res.send(err);
      }else{
        res.setHeader('x-account-id',dataobj.creator);
        res.status(201).send(result);
      }
    });
  }else{
    const response = {creatorId: null, data: null, message: "Creator cannot be null." };
    res.send(response);
  }
});

//User Stories 5: As a user, I should be able to delete myself along with all my posts, images, and comments
app.delete('/deletecreator',function(req,res){
  const dataobj = {
    creator : req.headers['x-account-id']
  }
  if(dataobj.creator){
    imagegramModel.deletecreator_Serverless(dataobj,function(err,result){
      if(err){
        res.setHeader('x-account-id',dataobj.creator);
        res.send(err);
      }else{
        const objects_to_delete = result.ilist;
        s3.deleteObject(objects_to_delete, function(err, data) {
          if (err){
            res.send(err);
          }else{
            res.status(201).send(result);
          }
        });
      }
    });
  }else{
    const response = {creatorId: null, data: null, message: "Creator cannot be null." };
    res.send(response);
  }
});

// Handle in-valid route
app.all('*', function(req, res) {
    const response = { data: null, message: 'Route not found!!' };
    res.status(400).send(response);
});

// wrap express app instance with serverless http function
exports.handler = serverless(app);

/* app.listen(port, function() {
  console.log('Imagegram is listening on port ' + port);
}); */