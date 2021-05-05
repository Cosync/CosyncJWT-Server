
 
const express = require("express");  
const cors = require('cors');


global.publicKey = './config/publickey.pem';
global.privateKey = './config/privatekey.pem';
global.__config = require('./config/config.js'); 

let key = process.argv[2];

if(process.env.PASS_KEY) global.__passKey = process.env.PASS_KEY;
else if(key) global.__passKey = key;


if(!global.__passKey){
  console.log("Please provide pass key to start the service ");
  console.log("Service is shutdown! ");
  return; 
}

const util = require('./libs/util');
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


let indexRouter = require('./routes/index');
let appRouter = require('./routes/app');

app.use('', indexRouter); 
app.use('/api/app', appRouter); 


let secret = util.generateServerSecretToken();
console.warn('Here is your server secret token: ', secret);
 


require('./libs/cosync/databaseService').init(function(res){

  
});
 