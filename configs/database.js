const mysql = require('mysql');
const pool  = mysql.createPool({
  host            : 'localhost',
  user            : 'root',
  password        : '',
  database        : 'imagegram',
  connectionLimit : 100,
  multipleStatements:true
});

exports.getConnection = function(callback) {
  pool.getConnection(function(err, connection) {
      if(err)
      {
          callback(err);            
      }
      else
      {
          callback(err, connection);    
      }
      
  });
};


//export default pool;