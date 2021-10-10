const mysql = require('mysql');
const pool  = mysql.createPool({
  host     : process.env.RDS_HOSTNAME || 'localhost',
  user     : process.env.RDS_USERNAME || 'root',
  password : process.env.RDS_PASSWORD ||  '',
  port     : process.env.RDS_PORT || 3306,
  database: process.env.RDS_DB_NAME || 'imagegram',
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