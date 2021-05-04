
const fs = require('fs');
const express = require("express"); 
const jwt = require('jsonwebtoken'); 
const cors = require('cors');

global.publicKey = './config/publickey.pem';
global.privateKey = './config/privateKey.pem';
global.__config = require('./config/config.js');

const serverPublicKey = fs.readFileSync(global.publicKey, 'utf8');

let key = process.argv[2];

if(process.env.AES_KEY) global.__aesKey = process.env.AES_KEY;
else if(key) global.__aesKey = key;


if(!global.__aesKey){
    console.log("Please provide aes key to start the service ");
    console.log("Service is shutdown! ");
    return;
  }

let app = express(); 
let port = normalizePort(process.env.PORT || '3000');  
app.listen(port); 
console.log("server is starting at port: ", port);

app.use(function(req, res, next){
    next();
})



// TODO: Check headers and bearer token
app.use((req, res, next) => {
    try {  
  
        if (req.headers['access-token'] !== undefined && req.headers['access-token'] != '') {
            
            
             
            
        } 
        
        if (req.headers['app-token'] !== undefined) { 
    
             
        }
    
    
        if (req.headers['admin-token'] !== undefined) { 
     
        }
    
        if (req.headers['app-secret'] !== undefined) { 
     
        }
    
    
    
    } catch (error) {
    
    }
        
    next();
    
})
  



app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));  

app.use(function(req, res, next) { 
   
    //res.header("Access-Control-Allow-Origin", global.__config.allowOriginDomain);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});

// // catch 404 and forward to error handler
app.use(function(req, res, next) {
	util.responseFormat(res, "Service Not found", 0, util.HTTP_STATUS_CODE.BAD_REQUEST);
	next();
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page 
  util.responseFormat(res, "Service Not found", 0, 401);
  
});



/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

