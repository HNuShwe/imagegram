const express = require('express');
const serverless = require('serverless-http');
const pool = require('./configs/database');
const compression = require('compression');
const path = require('path');
const multer  = require('multer');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 4000;

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    
    let dir =  __dirname + '/public/uploads/'+req['x-account-id'];

    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    cb(null,dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '.jpg')
  }
})

var upload = multer({
    storage: storage,
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
  
    const name = req.body.name;
    const query = 'INSERT INTO accounts (name) VALUES (?);'
    pool.query(query,[name], (err, results, fields) => {
      if (err) {
        const response = { data: null, message: err.message, }
        res.send(response)
      }else{
        const { insertId } = results;
        const account = { id: insertId };
        const response = {
          creatorId: insertId,
          data: account,
          message: 'Account ' + name + ' has successfully created.',
        }
        res.status(201).send(response);
      }
    });
});

//User Stories 2: As a user, I should be able to create posts with images
app.post('/createpost', function(req, res){
  
  const creator = req.headers['x-account-id'];
  if(creator){
    upload(req,res,function(err){
        if(err)
        {
          const response = {creatorId: creator, data: null, message: err }
          res.send(response)
        }
        else
        {
            console.log("Images were uploaded");
            const reqBody = {
              caption : req.body.caption,
              images   : req.files.map(a => a.filename).join(','),
              creator : creator,
            }
            const query = 'INSERT INTO posts set ?;'
            var i = pool.query(query,[reqBody], (err, results, fields) => {
              if (err) {
                const response = {creatorId: creator, data: null, message: err }
                res.send(response);
              }else{
                const { insertId } = results;
                reqBody['id'] = insertId;
                const response = {
                  creatorId: creator,
                  message: 'Post has successfully created.',
                  data: reqBody,
                }
                res.status(201).send(response);
              } // console.log(i.sql);
            });
        }
    });
  }else{
    const response = {creatorId: null, data: null, message: "Creator cannot be null." }
    res.send(response);
  }
});

//User Stories 3: As a user, I should be able to comment on a post
app.post('/addcomment',upload, (req, res) => {
  
  const creator = req.headers['x-account-id'];
  if(creator){
    const post_id = req.body.post_id;
    
    const query = 'INSERT INTO comments (content,creator) values (?,NULLIF(' +creator+',""));'
    var i = pool.query(query,[req.body.content], (err, results, fields) => {
      if (err) {
        const response = {creatorId: creator, data: null, message: err }
        res.send(response);
      }else{
        const { insertId } = results;
        const comment_id = insertId ;
        
        const updatequery = "update posts set comments=concat(IFNULL(comments,''),"+comment_id+",',') where id = ?; ";
        var j = pool.query(updatequery,post_id, (err, results, fields) => {
          if (err) {
            const response = {creatorId: creator, data: null, message: err }
            res.send(response);
          }else{
            const selectquery = "SELECT comments.id AS comment_id, comments.content,comments.creator AS comment_creator, comments.created_at AS comment_created_at, posts.id AS post_id, caption,images,posts.creator AS post_creator,posts.created_at AS post_created_at FROM comments JOIN posts  ON FIND_IN_SET(comments.id,posts.comments) WHERE posts.id= ? ;";
            pool.query(selectquery,post_id, (err, s_results, fields) => {
              if (err) {
                const response = {creatorId: creator, data: null, message: err }
                res.send(response);
              }else{
                const response = {
                  creatorId: creator,
                  message: 'New comment has been successfully added.',
                  data: s_results,
                  
                }
                res.status(201).send(response);

              }
            });
            
          }console.log(j.sql);
        });
        
      }console.log(i.sql);
    });
  }else{
    const response = {creatorId: null, data: null, message: "Creator cannot be null." }
    res.send(response);
  }
});

//User Stories 4: As a user, I should be able to get the list of all posts from all users along with last 2 comments to each post
// Posts should be sorted by the number of comments (desc)
app.get('/getallpost',function(req,res){
  const creator = req.headers['x-account-id'];
  if(creator){
    const selectquery = "SELECT posts.*,accounts.name FROM posts LEFT JOIN accounts ON accounts.id = posts.creator ORDER BY LENGTH(posts.comments) - LENGTH(REPLACE(posts.comments, ',', '')) + 1  DESC ";
    pool.query(selectquery, (err, allposts, fields) => {
      if (err) {
        const response = {creatorId: creator, data: null, message: err }
        res.send(response);
      }else{
        const async = require('async');
        async.each(allposts, function(post,asCb)
        {
          const last2c_query = 'SELECT comments.*,accounts.name FROM comments LEFT JOIN accounts ON accounts.id = comments.creator WHERE FIND_IN_SET(comments.id,(SELECT comments FROM posts WHERE posts.id=?)) ORDER BY comments.id DESC LIMIT 2 ';
          pool.query(last2c_query,post.id, (err, lasttwocomments, fields) => {
            if (err) {
              const response = {creatorId: creator, data: null, message: err }
              res.send(response);
            }else{
              post.comments = lasttwocomments;
              asCb();
            }
          });
        },
        function(err)
        {
          if(err){
            const response = {creatorId: creator, data: null, message: err }
            res.send(response);
          }else{
            const response = {
              creatorId: creator,
              message: 'New Feed',
              data: allposts,
              
            }
            res.status(201).send(response);
          }
        });
      }
    });
  }else{
    const response = {creatorId: null, data: null, message: "Creator cannot be null." }
    res.send(response);
  }
});


//User Stories 5: As a user, I should be able to delete myself along with all my posts, images, and comments
app.delete('/deletecreator',function(req,res){
  const creator = req.headers['x-account-id'];
  if(creator){
    const dquery = "DELETE  accounts,posts,comments FROM accounts INNER JOIN posts ON accounts.id = posts.creator INNER JOIN comments ON FIND_IN_SET(comments.id,posts.comments) WHERE accounts.id = ? ";
    var i = pool.query(dquery,creator, (err, results, fields) => {
      if (err) {
        const response = {creatorId: creator, data: null, message: err }
        res.send(response);
      }else{
        let dir =  __dirname + '/public/uploads/'+ creator;
        fs.rmdir(dir, { recursive: true }, (err) => {
            if (err) {
                throw err;
            }   
            const response = {
              data: null,
              message: 'Account was deleted successfully',
            }
            res.status(201).send(response);
        });
      }console.log(i.sql);
    });
  }else{
    const response = {creatorId: null, data: null, message: "Creator cannot be null." }
    res.send(response);
  }
});


// Handle in-valid route
app.all('*', function(req, res) {
    const response = { data: null, message: 'Route not found!!' }
    res.status(400).send(response)
});

// wrap express app instance with serverless http function
//module.exports.handler = serverless(app)

app.listen(port, function() {
  console.log('Imagegram is listening on port ' + port);
}); 