
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

const express = require('express');
const router = express.Router();
const appUser = require('../libs/cosync/appUserService');  
const appService = require('../libs/cosync/appService');
const appLogService = require('../libs/cosync/appLogsService');
const util = require('../libs/util');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const serverPublicKey = fs.readFileSync(global.publicKey, 'utf8');
 
router.post("/login", async (req, res) => {
 
  if (req.scope != "app")
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_APP_TOKEN, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  let valid = req.body.handle && req.appId && req.body.password; 
  if (!valid)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  let data = req.body;
  data.appId = req.appId;
  data.handle = data.handle.toLowerCase();
  data.handle = data.handle.trim();

  appUser.getAppUserAuth(data, function(result, error){
    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      error.handle = req.body.handle;
      appLogService.addLog(data.appId, 'login', JSON.stringify(error), 'error', 'user'); 
     
    } 
    else{
      util.responseFormat(res, result);
      let log = {
        handle: data.handle,
        status: true
      };
      appLogService.addLog(data.appId, 'login', JSON.stringify(log), 'success', 'user'); 
     
    } 
  });
});


router.post("/loginComplete", async (req, res) => {
 
  let valid = req.body.code && req.body.loginToken && req.appId; 
  if (!valid)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  if(isNaN(req.body.code)) {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  } 

  
  let verified  = jwt.verify(req.body.loginToken, serverPublicKey); 
  if(!verified){
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_CREDENTIALS, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  let data = req.body;
  data.appId = verified.appId;
  data.handle = verified.handle;

  appUser.verifyTwoFactor(data, function(result, error){
    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      error.handle = data.handle;
      appLogService.addLog(data.appId, 'loginComplete', JSON.stringify(error), 'error', 'user'); 
      
    } 
    else{
      
      util.responseFormat(res, result);

      let log = {
        handle: data.handle,
        status: true
      }; 
      appLogService.addLog(data.appId, 'loginComplete', JSON.stringify(log), 'success', 'user'); 

    } 
  });
});




router.post("/loginAnonymous", async (req, res) => {
 
  if (req.scope != "app")
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_APP_TOKEN, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  let valid = req.body.handle && req.appId && (req.body.handle.indexOf("ANON_") >= 0);
  if (!valid)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_CREDENTIALS, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  let data = req.body;
  data.appId = req.appId;
  
  appUser.getANONUserAuth(data, function(result, error){
    
    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      error.handle = req.body.handle;
      appLogService.addLog(data.appId, 'loginAnonymous', JSON.stringify(error), 'error', 'user'); 
     
    } 
    else{
      util.responseFormat(res, result);
      let log = {
        handle: data.handle,
        status: true
      };
      appLogService.addLog(data.appId, 'loginAnonymous', JSON.stringify(log), 'success', 'user'); 
     
    } 
  });
});


router.post("/signup", async (req, res) => {
 
  if (req.scope != "app")
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_APP_TOKEN, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }


  let valid = req.body.handle && req.body.password && req.appId;

  if (!valid)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  if(req.body.password.length != 32) {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }
  req.body.handle = req.body.handle.toLowerCase();
  req.body.handle = req.body.handle.trim();

  appUser.signup(req, function(result, error){ 
    
    if(result){
      util.responseFormat(res, result);
      let log = {
        handle: req.body.handle,
        status: true
      }; 

      appLogService.addLog(req.appId, 'signup', JSON.stringify(log), 'success', 'user');

    } 
    else{ 
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);

      error.handle = req.body.handle;
      appLogService.addLog(req.appId, 'signup', JSON.stringify(error), 'error', 'user'); 
    } 
  });
});




router.post("/completeSignup", async (req, res) => {
 
  let valid = req.body.handle && req.appId && req.body.code;

  if (!valid)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  if(isNaN(req.body.code)) {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  let signUpData = req.body;
  signUpData.appId = req.appId; 

  appUser.completeSignup(signUpData, function(result, error){ 
    
    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);

      error.handle = signUpData.handle;
      appLogService.addLog(signUpData.appId, 'completeSignup', JSON.stringify(error), 'error', 'user'); 
      
    } 
    else{

      util.responseFormat(res, result);

      let log = {
        handle: signUpData.handle,
        status: true
      }; 

      appLogService.addLog(signUpData.appId, 'completeSignup', JSON.stringify(log), 'success', 'user'); 
      
    } 
  });
});




router.get("/completeSignup", async (req, res) => {
 
  let valid = req.query.handle && req.query.appToken &&  req.query.code;

  if (!valid)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }
  if(isNaN(req.query.code)) {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  } 
  
  let verified  = jwt.verify(req.query.appToken, serverPublicKey); 
  if (verified && verified.scope == 'app') { 
    req.appId = verified.appId;
    if(!req.scope) req.scope = verified.scope;

  } else {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_APP_TOKEN, util.HTTP_STATUS_CODE.FORBIDDEN); 
    return;
  } 
  
  let signUpData = req.query;
  signUpData.appId = req.appId;


  appUser.completeSignup(signUpData, function(result, error){ 
    
    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);

      error.handle = signUpData.handle;
      appLogService.addLog(signUpData.appId, 'completeSignup', JSON.stringify(error), 'error', 'user'); 
      
    } 
    else{
      util.responseHTMLFormat(res, result);

      let log = {
        handle: signUpData.handle,
        status: true
      }; 

      appLogService.addLog(signUpData.appId, 'completeSignup', JSON.stringify(log), 'success', 'user'); 
      
    } 
  });
}); 


router.post("/socialLogin", async (req, res) => {
 
  let valid = req.body.token && req.body.provider && req.appId; 
  if (!valid){
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }
  let data = req.body;
  data.appId = req.appId;

  if (data.provider == "apple" || data.provider == "google"){

    appUser.socialLogin(req, function(result, error){
      if(error){
        util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
        error.token = data.token;
        error.provider = data.provider;

        appLogService.addLog(data.appId, 'socialLogin', JSON.stringify(error), 'error', 'user'); 
      
      } 
      else {
        util.responseFormat(res, {'jwt':result.jwt, 'access-token':result['access-token']});

        let log = { 
          status: true,
          provider : req.body.provider,
          handle: result.handle
        };
        appLogService.addLog(data.appId, 'socialLogin', JSON.stringify(log), 'success', 'user'); 
      }
    })
  } 
  else {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
  }

});



router.post("/socialSignup", async (req, res) => {
  if (req.scope != "app"){
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_APP_TOKEN, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  let valid = req.body.token && req.body.provider && req.appId && req.body.handle;

  if (!valid) {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  } 


  if (req.body.provider == "apple" || req.body.provider == "google") {

    appUser.socialSignup(req, function(result, error) {

      if(error){

        error.handle = req.body.handle;
        error.provider = req.body.provider;
        appLogService.addLog(req.appId, 'socialSignup', JSON.stringify(error), 'error', 'user');

        util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      } 
      else {

        util.responseFormat(res, result);

        let log = { 
          handle: req.body.handle, 
          provider : req.body.provider,
          status: true
        }; 
        appLogService.addLog(req.appId, 'socialSignup', JSON.stringify(log), 'success', 'user');
       
      } 
    })
 
  }
  else {
    util.responseFormat(res,  util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
  }
})
 

router.post("/invite", async (req, res) => {
 
  let valid = req.body.handle && req.body.senderUserId && req.appId;

  if (!valid || !req.handle)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }
  
  appUser.inviteUser(req, function(result, error){ 
  
    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      
      error.handle = req.handle;
      appLogService.addLog(req.appId, 'invite', JSON.stringify(error), 'error', 'user'); 
      
    } 
    else{
      let log = {
        handle: req.handle,
        email: req.body.handle,
        status: true
      }; 

      appLogService.addLog(req.appId, 'invite', JSON.stringify(log), 'success', 'user'); 
      util.responseFormat(res, result);
    } 
  });
}); 

router.post("/register", async (req, res) => {
 
  let valid = req.body.handle && req.body.password && req.appId && req.body.code;

  if (!valid && req.scope != 'app')
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  if(req.body.password.length != 32 || isNaN(req.body.code)) {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }
  
  appUser.verifyInvite(req, function(result, error){ 
    
    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);

      error.handle = req.body.handle;
      appLogService.addLog(req.appId, 'register', JSON.stringify(error), 'error', 'user');
     
    } 
    else{
      util.responseFormat(res, result);

      let log = { 
        handle: req.body.handle,
        status: true
      }; 

      appLogService.addLog(req.appId, 'register', JSON.stringify(log), 'success', 'user');
      
    }

  });
}); 


router.post("/deleteAccount", async (req, res) => {
 
  let valid =  req.appId && req.handle;
  if (!valid)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  let data = req.body; 

  if (!data.token && !data.handle && !data.password){
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  data.email = req.handle
  data.appId = req.appId; 

  if(data.handle && data.password) {
    data.handle = data.handle.toLowerCase();
    data.handle = data.handle.trim(); 

    if (data.handle.indexOf("@") > 0 && data.handle !=  data.email){
      util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_CREDENTIALS, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }
    appUser.deleteAppUserAccount(data, function(result, error){

      if(error){
        util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
        error.handle = req.body.handle;
        appLogService.addLog(data.appId, 'deleteAccount', JSON.stringify(error), 'error', 'user'); 
      
      } 
      else {
        
        util.responseFormat(res, true);
        let log = {
          handle: data.handle
        };
        appLogService.addLog(data.appId, 'deleteAccount', JSON.stringify(log), 'success', 'user'); 
      
      } 

    });
  } 
  else if (data.token){

    appUser.deleteAppUserAccountWithToken(data, function(result, error){

      if(error){
        util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
        error.handle = data.email;
        appLogService.addLog(data.appId, 'deleteAccount', JSON.stringify(error), 'error', 'user'); 
       
      } 
      else {
        
        util.responseFormat(res, true);
        let log = {
          email: data.email
        };
        appLogService.addLog(data.appId, 'deleteAccount', JSON.stringify(log), 'success', 'user'); 
       
      } 
  
    });

  }
  else {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST); 
  }

}); 

router.post("/forgotPassword", async (req, res) => {
 
  let valid = req.body.handle && req.appId; 
  if (!valid && req.scope != 'app')
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }
  appUser.forgotPassword(req, function(result, error){ 
    
    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);

      error.handle = req.body.handle;
      appLogService.addLog(req.appId, 'forgotPassword', JSON.stringify(error), 'error', 'user');
    } 
    else{

      util.responseFormat(res, result);

      let log = { 
        handle: req.body.handle,
        status: true
      }; 

      appLogService.addLog(req.appId, 'forgotPassword', JSON.stringify(log), 'success', 'user');
      
    }
  });
   
});



router.post("/resetPassword", async (req, res) => {
 
  let valid = req.body.handle && req.body.password && req.body.code && req.appId; 
  if (!valid)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  if(req.body.password.length != 32 || isNaN(req.body.code)) {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  } 


  appUser.resetPassword(req, function(result, error){ 
    
    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);

      error.handle = req.body.handle;
      appLogService.addLog(req.appId, 'resetPassword', JSON.stringify(error), 'error', 'user');
    }
    else{

      util.responseFormat(res, result);

      let log = { 
        handle: req.body.handle,
        status: true
      }; 
      appLogService.addLog(req.appId, 'resetPassword', JSON.stringify(log), 'success', 'user');
     
    }
  });
   
});



router.post("/changePassword", async (req, res) => {
 
  let valid = req.body.password && req.body.newPassword && req.appId; 
  if (!valid || !req.handle || req.body.password == req.body.newPassword)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  if(req.body.newPassword.length != 32) {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  appUser.changePassword(req, function(result, error){ 
    
    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);

      error.handle = req.handle;
      appLogService.addLog(req.appId, 'changePassword', JSON.stringify(error), 'error', 'user');
      
    } 
    else{

      util.responseFormat(res, result);

      let log = { 
        handle: req.handle,
        status: true
      }; 
      appLogService.addLog(req.appId, 'changePassword', JSON.stringify(log), 'success', 'user');
      
    }
  });
   
});


router.get("/getUser", async (req, res) => { 

  if (!req.handle)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  } 

  appUser.getUser(req, function(result, error){ 

    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);

      error.handle = req.handle;
      appLogService.addLog(req.appId, 'getUser', JSON.stringify(error), 'error', 'user');
      
    } 
    else{

      util.responseFormat(res, result);

      let log = { 
        handle: req.handle,
        status: true
      }; 
      appLogService.addLog(req.appId, 'getUser', JSON.stringify(log), 'success', 'user');
      
    }

    
  });
   
});

router.get("/userNameAvailable", async (req, res) => { 
  let valid = req.query.userName && req.handle;

  if (!valid)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }
  req.query.userName = req.query.userName.toLowerCase();
  req.query.userName = req.query.userName.trim()

  appUser.checkAvailableUserName(req, function(result, error){
    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    }
    else {
      util.responseFormat(res, result);
    }
  })
 
})


router.post("/setLocale", async (req, res) => { 
  let valid = req.body.locale && req.handle;
  if (!valid)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  let params = req.body;
  params.handle = req.handle;
  params.appId = req.appId;

  appUser.setUserLocale(params, function(result, error){ 
    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);

      error.handle = params.handle;
      error.locale =  params.locale;
      appLogService.addLog(params.appId, 'setLocale', JSON.stringify(error), 'error', 'user');
    } 
    else{
      let log = { 
        handle: params.handle,
        data: params,
        status: true
      }; 
      appLogService.addLog(req.appId, 'setLocale', JSON.stringify(log), 'success', 'user');
      util.responseFormat(res, result);
    }
  })

})


router.post("/setUserName", async (req, res) => {  

  let valid = req.body.userName && req.handle;
  if (!valid)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  req.body.userName = req.body.userName.toLowerCase();
  req.body.userName = req.body.userName.trim();
  appUser.setUserName(req, function(result, error){
    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);

      error.handle = req.handle;
      error.userName = req.body.userName
      appLogService.addLog(req.appId, 'setUserName', JSON.stringify(error), 'error', 'user');
    } 
    else{
      let log = { 
        handle: req.handle,
        data: req.body,
        status: true
      }; 
      appLogService.addLog(req.appId, 'setUserName', JSON.stringify(log), 'success', 'user');
      util.responseFormat(res, result);
    }
  });
})

router.post("/setUserMetadata", async (req, res) => {  

  let valid = req.handle;
  if (!valid)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  appUser.setUserMetadata(req, function(result, error){
    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);

      error.handle = req.handle;
      appLogService.addLog(req.appId, 'setUserMetadata', JSON.stringify(error), 'error', 'user');
    } 
    else{
      let log = { 
        handle: req.handle,
        data: req.body,
        status: true
      }; 
      appLogService.addLog(req.appId, 'setUserMetadata', JSON.stringify(log), 'success', 'user');
      util.responseFormat(res, result);
    }
  });
});

 

router.get("/getApplication", async (req, res) => {
 
  if (!req.appId)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }
 

  appService.getUserApplication(req.appId, function(result, error){ 
    if(result) util.responseFormat(res, result);
    else util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
  });
   
}); 




router.post("/setPhone", async (req, res) => {
 
  if (!req.appId || !req.handle)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  let valid = req.body.phone;
  if (!valid)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  
  appUser.setPhone(req, function(result, error){ 
    if(result) { 
      util.responseFormat(res, true);

      let log = { 
        handle: req.handle,
        data: req.body,
        status: true
      }; 

      appLogService.addLog(req.appId, 'setPhone', JSON.stringify(log), 'success', 'user');
      
    }
    else{
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);

      error.handle = req.handle;
      appLogService.addLog(req.appId, 'setPhone', JSON.stringify(error), 'error', 'user');
    } 
  });
   
});



router.post("/verifyPhone", async (req, res) => {
 
  if (!req.appId && !req.handle)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  let valid = req.body.code; 
  if (!valid)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }


  if(isNaN(req.body.code)) {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  } 
  
  appUser.verifyPhone(req, function(result, error){ 
    if(result){

      util.responseFormat(res, result);

      let log = { 
        handle: req.handle, 
        status: true
      }; 

      appLogService.addLog(req.appId, 'verifyPhone', JSON.stringify(log), 'success', 'user');
     
    } 
    else{

      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST); 
     
      error.handle = req.handle;
      appLogService.addLog(req.appId, 'verifyPhone', JSON.stringify(error), 'error', 'user');
     
    } 
  });
   
});



router.post("/setTwoFactorGoogleVerification", async (req, res) => {
 
  if (!req.appId && !req.handle)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }
  req.isGoogle = true;

  appUser.requestTwoFactorVerifications(req, function(result, error){ 
    if(result){
      util.responseFormat(res, result);

      let log = { 
        handle: req.handle, 
        status: true
      }; 

      appLogService.addLog(req.appId, 'setTwoFactorGoogleVerification', JSON.stringify(log), 'success', 'user');
      
    } 
    else{
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST); 
     
      error.handle = req.handle;
      appLogService.addLog(req.appId, 'setTwoFactorGoogleVerification', JSON.stringify(error), 'error', 'user');
      
    } 
  });
   
});



router.post("/setTwoFactorPhoneVerification", async (req, res) => {
 
  if (!req.appId && !req.handle)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }
  req.isPhone = true;
  appUser.requestTwoFactorVerifications(req, function(result, error){ 
    if(result){
      util.responseFormat(res, result);
      let log = { 
        handle: req.handle, 
        status: true
      }; 
      appLogService.addLog(req.appId, 'setTwoFactorPhoneVerification', JSON.stringify(log), 'success', 'user');
      
    } 
    else{
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      
      error.handle = req.handle;
      appLogService.addLog(req.appId, 'setTwoFactorPhoneVerification', JSON.stringify(error), 'error', 'user');
     
    } 
  });
   
});
 

module.exports = router;