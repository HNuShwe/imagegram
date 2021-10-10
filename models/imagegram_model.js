var mysql = require('../configs/database');
const path = require('path');
const fs = require('fs');
exports.createcreator = function(data,callback){
    const query = 'INSERT INTO accounts (name) VALUES (?);';
    mysql.getConnection(function(err, connection){
        if(err){
            const response = {creatorId: dataobj.creator, data: null, message: err };
            callback(response);
        }else{
            connection.query(query,[data.name], (err, results, fields) => {
                if (err) {
                    const response = {creatorId: dataobj.creator, data: null, message: err };
                    callback(response);        
                }else{
                    const { insertId } = results;
                    const account = { id: insertId };
                    const response = {
                    creatorId: insertId,
                    data: account,
                    message: 'Account ' + data.name + ' has successfully created.'
                    };
                    callback(null,response);
                }
            });
        }
    });
};

exports.createpost = function(data,callback){  
    const query = 'INSERT INTO posts set ?;';
    mysql.getConnection(function(err, connection){
        if(err){
            const response = {creatorId: data.creator, data: null, message: err };
            callback(response);
        }else{        
            connection.query(query,[data], (err, results, fields) => {
                if (err) {
                const response = {creatorId: data.creator, data: null, message: err };
                callback(response);
                }else{
                const { insertId } = results;
                data['id'] = insertId;
                const response = {
                    creatorId: data.creator,
                    message: 'Post has successfully created.',
                    data: data
                };
                callback(null,response);
                }
            });
        }
    });
};

exports.getallpost = function(data,callback){
    const creator = data.creator;
    mysql.getConnection(function(err, connection){
    if(err){
        const response = {creatorId: dataobj.creator, data: null, message: err };
        callback(response);
    }else{
        const selectquery = "SELECT posts.*,accounts.name FROM posts LEFT JOIN accounts ON accounts.id = posts.creator ORDER BY LENGTH(posts.comments) - LENGTH(REPLACE(posts.comments, ',', '')) + 1  DESC ";
        connection.query(selectquery, (err, allposts, fields) => {
        if (err) {
            const response = {creatorId: dataobj.creator, data: null, message: err };
            callback(response);
        }else{
            const async = require('async');
            async.each(allposts, function(post,asCb)
            {
            const last2c_query = 'SELECT comments.*,accounts.name FROM comments LEFT JOIN accounts ON accounts.id = comments.creator WHERE FIND_IN_SET(comments.id,(SELECT comments FROM posts WHERE posts.id=?)) ORDER BY comments.id DESC LIMIT 2 ';
            connection.query(last2c_query,post.id, (err, lasttwocomments, fields) => {
                if (err) {
                    const response = {creatorId: dataobj.creator, data: null, message: err };
                    callback(response);
                }else{
                    post.comments = lasttwocomments;
                    asCb();
                }
            });
            },
            function(err)
            {
                if(err){
                    const response = {creatorId: dataobj.creator, data: null, message: err };
                    callback(response);
                }else{
                    const response = {
                    creatorId: creator,
                    message: 'New Feed',
                    data: allposts
                    };
                    callback(null,response);
                }
            });
        }
        });
        connection.release();
    }
});
};

exports.addcomment = function(data,callback){
    mysql.getConnection(function(err, connection){
        if(err){
            const response = {creatorId: dataobj.creator, data: null, message: err };
            callback(response);
        }else{
            const query = 'INSERT INTO comments (content,creator) values (?,NULLIF(' +data.creator+',""));';
            var i = connection.query(query,[data.content], (err, results, fields) => {
            if (err) {
                const response = {creatorId: data.creator, data: null, message: err };
                callback(response);
            }else{
                const { insertId } = results;
                const comment_id = insertId;
                const updatequery = "update posts set comments=concat(IFNULL(comments,''),"+comment_id+",',') where id = ?; ";
                var j = connection.query(updatequery,data.post_id, (err, results, fields) => {
                if (err) {
                    const response = {creatorId: data.creator, data: null, message: err };
                    callback(response);
                }else{
                    const selectquery = "SELECT comments.id AS comment_id, comments.content,comments.creator AS comment_creator, comments.created_at AS comment_created_at, posts.id AS post_id, caption,images,posts.creator AS post_creator,posts.created_at AS post_created_at FROM comments JOIN posts  ON FIND_IN_SET(comments.id,posts.comments) WHERE posts.id= ? ;";
                    connection.query(selectquery,data.post_id, (err, s_results, fields) => {
                    if (err) {
                        const response = {creatorId: data.creator, data: null, message: err };
                        callback(response);
                    }else{
                        const response = {
                        creatorId: data.creator,
                        message: 'New comment has been successfully added.',
                        data: s_results
                        };
                        callback(null,response);
                    }
                    });
                }console.log(j.sql);
                });
            }console.log(i.sql);
            });
        }
    });
}

exports.deletecreator = function(dataobj,callback){
    let dir =  __dirname + '/../public/uploads/'+ dataobj.creator;
                console.log(dir);
    mysql.getConnection(function(err, connection){
        if(err){
            const response = {creatorId: dataobj.creator, data: null, message: err };
            callback(response);
        }else{
            const dquery = "DELETE  accounts,posts,comments FROM accounts INNER JOIN posts ON accounts.id = posts.creator INNER JOIN comments ON FIND_IN_SET(comments.id,posts.comments) WHERE accounts.id = ? ";
            var i = connection.query(dquery,dataobj.creator, (err, results, fields) => {
            if (err) {
                const response = {creatorId: dataobj.creator, data: null, message: err };
                callback(response);
            }else{
                let dir =  __dirname + '/../public/uploads/'+ dataobj.creator;
                console.log(dir);
                fs.rmdir(dir, { recursive: true }, (err) => {
                    if (err) {
                        const response = {creatorId: dataobj.creator, data: null, message: err };
                        callback(response);
                    }
                    const response = {
                    data: null,
                    message: 'Account was deleted successfully'
                    };
                    callback(null,response);
                });
            }console.log(i.sql);
            });
        }
    });
}
exports.deletecreator_Serverless = function(dataobj,callback){
    
    mysql.getConnection(function(err, connection){
        if(err){
            const response = {creatorId: dataobj.creator, data: null, message: err };
            callback(response);
        }else{
            const dquery = "SELECT GROUP_CONCAT(posts.images SEPARATOR ',') as ilist FROM posts LEFT JOIN accounts ON accounts.id = posts.creator WHERE accounts.id = ?;DELETE  accounts,posts,comments FROM accounts INNER JOIN posts ON accounts.id = posts.creator INNER JOIN comments ON FIND_IN_SET(comments.id,posts.comments) WHERE accounts.id = ? ";
            var i = connection.query(dquery,dataobj.creator, (err, results, fields) => {
            if (err) {
                const response = {creatorId: dataobj.creator, data: null, message: err };
                callback(response);
            }else{
                const response = {
                    data: null,
                    message: 'Account was deleted successfully',
                    ilist: results[0].ilist
                    };
                    callback(null,response);
            }console.log(i.sql);
            });
        }
    });
}