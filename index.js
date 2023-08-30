'use strict';
/**
 * Copyright 2021 Cosync, Inc. All Rights Reserved.
 * For questions about this license, you may write to mailto:info@cosync.io
 * 
 * This program is free software: you can redistribute it and/or modify 
 * it under the terms of the Server Side Public License, version 1, 
 * as published by MongoDB, Inc. 
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; 
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
 * See the Server Side Public License for more details. 
 * 
 * You should have received a copy of the Server Side Public License along with this program. 
 * If not, see <http://www.mongodb.com/licensing/server-side-public-license>
 * 
 */

/**
 * © 2021, Cosync, Inc. All Rights Reserved.
 * 
 * @author Tola VOEUNG
 * 
 * @Editor Tola VOEUNG  
 * For questions about this license, you may write to mailto:info@cosync.io
*/
 
const express = require("express");  

const jwt = require('jsonwebtoken');
const fs = require('fs');


global.publicKey = './config/publickey.pem';
global.privateKey = './config/privatekey.pem';
global.__config = require('./config/config.js'); 

if(process.env.ENV == "local" || process.argv[3] == "local"){
  global.publicKey = './config/publickey-local.pem';
  global.privateKey = './config/privatekey-local.pem';
  global.__config = require('./config/config-local.js'); 
}
else if(process.env.ENV == "prod" || process.argv[3] == "prod"){
  global.publicKey = './config/publickey-prod.pem';
  global.privateKey = './config/privatekey-prod.pem';
  global.__config = require('./config/config-prod.js'); 
}
else if(process.env.ENV == "dev" || process.argv[3] == "dev"){
  global.publicKey = './config/publickey-dev.pem';
  global.privateKey = './config/privatekey-dev.pem';
  global.__config = require('./config/config-dev.js'); 
}
console.log("your server enviroment is ", process.env.ENV || process.argv[3])
;
const serverPublicKey = fs.readFileSync(global.publicKey, 'utf8');

if(process.env.DB_CONN_STRING) global.__config.db.connectionString = process.env.DB_CONN_STRING;
if(process.env.SEND_GRID_API_KEY) global.__config.sendGrid.apiKey = process.env.SEND_GRID_API_KEY;
if(process.env.PORT) global.__config.serverPort = process.env.PORT; 
if(process.env.ENCRYPT_KEY) global.__config.encryptKey = process.env.ENCRYPT_KEY;
if(process.env.PASS_KEY) global.__config.passKey = process.env.PASS_KEY;

if(process.env.AZURE_HUB_NAME) global.__config.azureNotification.hubname = process.env.AZURE_HUB_NAME;
if(process.env.AZURE_HUB_CONN) global.__config.azureNotification.connectionstring = process.env.AZURE_HUB_CONN;


const key = process.argv[2] || process.env.PASS_KEY;
if(key) global.__config.passKey = key;

if(!global.__config.passKey){
  console.log("Please provide private passphrase to start the service ");
  console.error("Service is shutdown! ");
  return; 
}

const util = require('./libs/util');

if(!util.validatePassKey()){
  console.log("Your passphrase is invalid. Service is shutdown! "); 
  return; 
}


if (!fs.existsSync('temp')) {
  fs.mkdirSync('temp');
}

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
      else if(req.headers['app-token']) {
        try {
          let verified  = jwt.verify(req.headers['app-token'], serverPublicKey); 
          if (verified && verified.scope == 'app') {
            // good to go... 
            req.scope = 'app';
            req.appId = verified.appId;
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
      else if(req.headers['access-token']) {
        try {
          let verified  = jwt.verify(req.headers['access-token'], serverPublicKey); 
          if (verified && verified.scope == 'user') {
            // good to go... 
            req.scope = verified.scope; 
            req.appId = verified.appId;
            req.handle = verified.handle;
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

      else if(req.query.appToken) {
        try {
          let verified  = jwt.verify(req.query.appToken, serverPublicKey); 
          if (verified && verified.scope == 'app') {
            // good to go... 
            req.scope = verified.scope; 
            req.appId = verified.appId; 
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
      // else {
      //   util.responseFormat(res, util.INTERNAL_STATUS_CODE.INTERNAL_SERVER_ERROR, util.HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR); 
      //   return;
      // }
    
    } catch (error) {
      util.responseFormat(res, util.INTERNAL_STATUS_CODE.INTERNAL_SERVER_ERROR, util.HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR); 
      return;
    }

    if (!req.scope || req.scope === undefined){
      util.responseFormat(res, "Welcome to CosyncJWT Server Service");
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
else{
  
  console.info('connecting to your database...');

  require('./libs/cosync/databaseService').init(function(res, err){
    if(res) {

      
      let initCosyncJWT = require('./libs/cosync/initCosyncJWT'); 
      let initCosyncEngine = require('./libs/cosync/initCosyncEngine'); 

      initCosyncJWT.create();
      initCosyncEngine.create();

      console.log('Here is your server secret token: ', secret);
    }
    else {
      console.error('Fail to connect database: ', err.message);
      console.error(err)
      process.exit(0);
    }
  });

} 
  

 