
 
const express = require("express");  
 
const jwt = require('jsonwebtoken');
const fs = require('fs');

global.publicKey = './config/publickey.pem';
global.privateKey = './config/privatekey.pem';
global.__config = require('./config/config.js'); 
const serverPublicKey = fs.readFileSync(global.publicKey, 'utf8');

const key = process.argv[2];

if(process.env.PASS_KEY) global.__passKey = process.env.PASS_KEY;
else if(key) global.__passKey = key;


if(!global.__passKey){
  console.log("Please provide pass key to start the service ");
  console.log("Service is shutdown! ");
  return; 
}

const util = require('./libs/util');
const app = express(); 
const port = normalizePort(global.__config.serverPort);
app.listen(port); 
console.log("server is starting at port: ", port); 


app.use(function(req, res, next){
  next();
})


// TODO: Check headers and bearer token
app.use((req, res, next) => {
    try {
      

      if(req.headers['server-secret']) {
        try {
          let verified  = jwt.verify(req.headers['server-secret'], serverPublicKey); 
          if (verified && verified.scope == 'server') {
            // good to go... 
            req.scope = 'server';
          } 
          else{
            util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_SERVER_TOKEN, util.HTTP_STATUS_CODE.FORBIDDEN); 
            return;
          } 
        } catch (error) {
          util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_SERVER_TOKEN, util.HTTP_STATUS_CODE.FORBIDDEN); 
          return;
        }
        
      } 
      else {
        util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_SIGN_TOKEN, util.HTTP_STATUS_CODE.FORBIDDEN); 
        return;
      }
    
    
    
    } catch (error) {
      util.responseFormat(res, util.INTERNAL_STATUS_CODE.INTERNAL_SERVER_ERROR, util.HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR); 
      return;
    }
        
    next();
    
})
  



let cors = require('cors');
app.use(cors()); 

app.use(express.json());
app.use(express.urlencoded({ extended: false }));  

app.use(function(req, res, next) { 
   
  //res.header("Access-Control-Allow-Origin", global.__config.allowOriginDomain);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});



const indexRouter = require('./routes/index');
const appRouter = require('./routes/app');
const appUserRouter = require('./routes/appUser');

app.use('', indexRouter); 
app.use('/api/app', appRouter); 
app.use('/api/appuser', appUserRouter);

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
  const port = parseInt(val, 10);

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



const secret = util.generateServerSecretToken();
if(!secret) {
  console.info('Look like you provided invalid pass key');
  process.exit(0);
}
else console.warn('Here is your server secret token: ', secret);
 


require('./libs/cosync/databaseService').init(function(res){});
 