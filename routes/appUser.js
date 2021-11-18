
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
  
  appUser.getAppUserAuth(data, function(result, error){
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
  });
});


router.post("/loginComplete", async (req, res) => {
 
  let valid = req.body.code && req.body.loginToken; 
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
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
  });
});


router.post("/signup", async (req, res) => {
 
  if (req.scope != "app")
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_APP_TOKEN, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }


  let valid = req.body.handle && req.body.password;

  if (!valid)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  if(req.body.password.length != 32) {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  
  appUser.signup(req, function(result, error){ 
    
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
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
  signUpData.handle = signUpData.handle.toLowerCase();  

  appUser.completeSignup(signUpData, function(result, error){ 
    
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
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
  signUpData.handle = signUpData.handle.toLowerCase(); 

  appUser.completeSignup(signUpData, function(result, error){ 
    
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
  });
}); 




router.post("/invite", async (req, res) => {
 
  let valid = req.body.handle && req.body.senderUserId && req.appId;

  if (!valid || !req.handle)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }
  
  appUser.inviteUser(req, function(result, error){ 
  
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
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
    
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
  });
}); 



router.post("/forgotPassword", async (req, res) => {
 
  let valid = req.body.handle; 
  if (!valid && req.scope != 'app')
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.MISSING_PARAM, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }
  appUser.forgotPassword(req, function(result, error){ 
    
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
  });
   
});



router.post("/resetPassword", async (req, res) => {
 
  let valid = req.body.handle && req.body.password && req.body.code; 
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
    
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
  });
   
});



router.post("/changePassword", async (req, res) => {
 
  let valid = req.body.password && req.body.newPassword; 
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
    
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
  });
   
});


router.get("/getUser", async (req, res) => {
 
  
  if (!req.handle)
  {
    util.responseFormat(res, util.INTERNAL_STATUS_CODE.INVALID_DATA, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }
 

  appUser.getUser(req, function(result, error){ 
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
  });
   
});


router.post("/setUserMetadata", async (req, res) => {  

  appUser.setUserMetaData(req, function(result, error){
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
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
    if(result) util.responseFormat(res, true);
    else util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
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
    if(result) util.responseFormat(res, result);
    else util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
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
    if(result) util.responseFormat(res, result);
    else util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
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
    if(result) util.responseFormat(res, result);
    else util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
  });
   
});
 

module.exports = router;