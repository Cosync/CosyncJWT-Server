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
const appService = require('../libs/cosync/appService'); 
const appLogService = require('../libs/cosync/appLogsService');
const appUserService = require('../libs/cosync/appUserService');  
let initCosyncJWT = require('../libs/cosync/initCosyncJWT'); 
let initCosyncEngine = require('../libs/cosync/initCosyncEngine'); 
let multer = require('multer')
    , inMemoryStorage = multer.memoryStorage()
    , uploadStrategy = multer({ storage: inMemoryStorage }).single('file');
    
const util = require('../libs/util');
const azure = require('azure-sb');
let notificationHubService;
if (global.__config.azureNotification ){
  notificationHubService = azure.createNotificationHubService(global.__config.azureNotification.hubname,global.__config.azureNotification.connectionstring);
}


let _error = {status: 'Fails', message: 'Invalid Data'};

router.post("/", async (req, res) => {

    let valid = req.body.name;
    if(!valid) { 
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }

    appService.addApp(req.body, function(result, err){
        if(err){  
          util.responseFormat(res, err, util.HTTP_STATUS_CODE.BAD_REQUEST);
          //appLogService.addLog("undefined", 'create', JSON.stringify(_error), 'error', 'app'); 
        } 
        else{
          appLogService.addLog(result.appId, 'create', true, 'success', 'app'); 
          util.responseFormat(res, result);
        } 
      });
});





router.get("/connection",
  async function (req, res) {
    if (req.scope != 'server') util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    else util.responseFormat(res, true);
  }
);


router.get("/allApps",
  async function (req, res) {
    if (req.scope != 'server')
    {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      return;
    }

    appService.getApps(function(apps, err){
      if(apps) util.responseFormat(res, apps);
      else util.responseFormat(res, err, util.HTTP_STATUS_CODE.BAD_REQUEST);
    });
  }
);


router.get("/appId/:appId", async function (req, res) { 

    if (req.scope != 'server')
    {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      return;
    }

    let valid = req.params.appId;
    if(!valid) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }
    
    appService.getApp(req.params.appId, function(app, err){
      if(app) util.responseFormat(res, app);
      else util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    });
    

    
  }
); 


router.get("/search", async function (req, res) {  
   
  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  }
  
  appService.search(req.query, function(apps, err){
      if(apps) util.responseFormat(res, apps);
      else util.responseFormat(res, err, util.HTTP_STATUS_CODE.BAD_REQUEST);
  }); 
  
});


router.get("/searchUser",
  async function (req, res) {
    if (req.scope != 'server')
    { 
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      return;
    }

    let valid = req.query.appId && req.query.value;
    if(!valid) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }

    appService.searchUser(req.query, function(data, err){
      if(data) util.responseFormat(res, data);
      else util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    });
  }
);


 

router.get("/searchSingUp",
  async function (req, res) {
    if (req.scope != 'server')
    { 
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      return;
    }

    let valid = req.query.appId && req.query.value;
    if(!valid) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }

    appService.searchSignUp(req.query, function(data, err){
      if(data) util.responseFormat(res, data);
      else util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    });
  }
);



router.get("/searchInvite",
  async function (req, res) {
    if (req.scope != 'server')
    { 
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      return;
    }

    let valid = req.query.appId && req.query.value;
    if(!valid) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }

    appService.searchInvite(req.query, function(data, err){
      if(data) util.responseFormat(res, data);
      else util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    });
  }
);



router.post("/update", async (req, res) => { 
    let valid = req.body.appId;
    if(!valid || req.scope != 'server') {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }


    appService.updateApp(req.body, function(result, err){ 
      
        if(err){ 
          let error = _error;
          error.message = err;
          util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
          appLogService.addLog(req.body.appId, 'update', JSON.stringify(error), 'error', 'app'); 
        } 
        else{
          util.responseFormat(res, result);
          appLogService.addLog(req.body.appId, 'update', JSON.stringify(req.body), 'success', 'app'); 
        } 
      });
});



router.post("/deleteMetadata", async (req, res) => { 

  let valid = req.body.appId && req.body.index && req.body.type;
  if(!valid && req.scope != 'server') {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  } 

  if(isNaN(req.body.index)){
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  appService.deleteMetadata(req.body, function(result, err){
      if(err){ 
        let error = {status: 'Fails', message:err};
        appLogService.addLog(req.body.appId, 'deleteMetadata', JSON.stringify(error), 'error', 'app'); 
        util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      } 
      else{
        appLogService.addLog(req.body.appId, 'deleteMetadata', true, 'success', 'app'); 
        util.responseFormat(res, result);
      } 
    });
});


router.delete("/:appId",
  async function (req, res) {
     
    let valid = req.params.appId
    if(!valid && req.scope != 'server') {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }

    try {
      appService.deleteApp(req.params.appId, function(result, error) {
        if(error){
            _error.message = error;
            util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
            
        } 
        else{ 
          util.responseFormat(res, result);
        } 
      });
      
    } catch (e) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR); 
    }
  }
);




router.post("/user",
  async function (req, res) {
    if (req.scope != 'server')
    { 
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      return;
    }

    let valid = req.body.appId && req.body.status && req.body.userId;
    if(!valid) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }
    if(req.body.status != 'active' && req.body.status != 'suspend'){
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }

    appUserService.updateAppUser(req.body, function(data, err){
      if(data){
        util.responseFormat(res, data);
        appLogService.addLog(req.body.appId, 'updateAppUser', true, 'success', 'app'); 
      } 
      else{
        appLogService.addLog(req.body.appId, 'updateAppUser', JSON.stringify(_error), 'error', 'app'); 
        util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      } 
    });
  }
);



router.post("/resetUserPassword",
  async function (req, res) {
    if (req.scope != 'server')
    { 
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      return;
    }

    let valid = req.body.appId && req.body.rawValue  && req.body.hashValue && req.body.userId;
    if(!valid) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    } 

    appUserService.updateAppUserPasword(req.body, function(data, err){
      if(data){
        appLogService.addLog(req.body.appId, 'resetUserPassword', JSON.stringify({userId:req.body.userId}), 'success', 'app'); 
        util.responseFormat(res, data);
      } 
      else{
        let error = _error;
        error.userId = req.body.userId;
        appLogService.addLog(req.body.appId, 'resetUserPassword', JSON.stringify(error), 'error', 'app'); 
        util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      } 
    });
  }
); 



router.post("/updateAppUserMetaData", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  } 

  appUserService.updateAppUserMetaData(req, function(result, error){
    if(error){
      appLogService.addLog(req.body.appId, 'updateAppUserMetaData', JSON.stringify(error), 'error', 'app'); 
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    } 
    else{
      util.responseFormat(res, true);
      appLogService.addLog(req.body.appId, 'updateAppUserMetaData', JSON.stringify(req.body), 'success', 'app'); 
    } 
  });
   
});



router.post("/initCosyncJWT", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  } 

  initCosyncJWT.init(req, function(result, error){
    if(error){
      appLogService.addLog(req.body.appId, 'initCosyncJWT', JSON.stringify(error), 'error', 'app'); 
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    } 
    else{
      appLogService.addLog(req.body.appId, 'initCosyncJWT', true, 'success', 'app'); 
      util.responseFormat(res, result);
    } 
  });
   
});



router.post("/reinitCosyncJWT", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  } 

  initCosyncJWT.reinit(req, function(result, error){
    if(error){
      appLogService.addLog(req.body.appId, 'reinitCosyncJWT', JSON.stringify(error), 'error', 'app'); 
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    } 
    else{
      appLogService.addLog(req.body.appId, 'reinitCosyncJWT', true, 'success', 'app'); 
      util.responseFormat(res, result);
    } 
  });
   
});




router.post("/removeCosyncEngine", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  }

   
  try { 

    initCosyncEngine.remove(req, function(result, error){
      if(error){
        appLogService.addLog(req.body.appId, 'removeCosyncEngine', JSON.stringify(error),  'error', 'app'); 
        util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      } 
      else{
        appLogService.addLog(req.body.appId, 'removeCosyncEngine', true, 'success', 'app'); 
        util.responseFormat(res, result);
      } 
    }); 
     
    
  } catch (e) {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR); 
  }
});



router.post("/removeCosyncJWT", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  } 

  initCosyncJWT.remove(req, function(result, error){
    if(error){
      appLogService.addLog(req.body.appId, 'removeCosyncJWT', JSON.stringify(error),  'error', 'app'); 
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    } 
    else{
      appLogService.addLog(req.body.appId, 'removeCosyncJWT', true, 'success', 'app'); 
      util.responseFormat(res, result);
    } 
  });
   
});



router.post("/initCosyncEngine", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  } 

  initCosyncEngine.init(req, function(result, error){
    if(error){
      appLogService.addLog(req.body.appId, 'initCosyncEngine', JSON.stringify(error),  'error', 'app'); 
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    } 
    else{
      appLogService.addLog(req.body.appId, 'initCosyncEngine', true, 'success', 'app'); 
      util.responseFormat(res, result);
    } 
  });
   
});



router.post("/reinitCosyncEngine", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  } 

  initCosyncEngine.reinit(req, function(result, error){
    if(error){
      appLogService.addLog(req.body.appId, 'reinitCosyncEngine', JSON.stringify(error),  'error', 'app'); 
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    } 
    else{
      appLogService.addLog(req.body.appId, 'reinitCosyncEngine', true, 'success', 'app'); 
      util.responseFormat(res, result);
    } 
  });
   
}); 

 
router.get("/getCosyncVersions",
  async function (req, res) {
    if (req.scope != 'server')
    {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      return;
    }


    appService.getCosyncVersions(function(versions, err){
      if(versions) util.responseFormat(res, versions);
      else util.responseFormat(res, err, util.HTTP_STATUS_CODE.BAD_REQUEST);
    });
  }
);



router.post("/saveUserSchema", async function (req, res) {
    if (req.scope != 'server')
    {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      return;
    }

    let valid = req.body.appId && req.body.schema;
    if(!valid || typeof req.body.schema != 'object') {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }

    appService.saveUserSchema(req, function(result, error){
      if(error){
        appLogService.addLog(req.body.appId, 'saveUserSchema', JSON.stringify(error),  'error', 'app'); 
        util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      } 
      else {
        appLogService.addLog(req.body.appId, 'saveUserSchema', JSON.stringify(req.body), 'success', 'app'); 
        util.responseFormat(res, true);
      }
    });
    
  }
);



 
router.post("/updateAppSetting", async (req, res) => {
  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  }
    

  appService.updateAppSetting(req, function(result, error){
    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      appLogService.addLog(req.body.appId, 'updateAppSetting', req.body.setting,  'error', 'app'); 
    } 
    else{
      appLogService.addLog(req.body.appId, 'updateAppSetting', req.body.setting, 'success', 'app'); 
      util.responseFormat(res, result);
    } 
  });
     
});



router.post("/testEmailExtension", async function (req, res) {
  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  }

  let valid = req.body.appId;
  if(!valid) {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  appService.testEmailExtension(req, function(result, error) {

    if(error){
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST); 
    } 
    else{
      util.responseFormat(res, true); 
    } 

    
  })
})

router.post("/testAppTwilio", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  }

   
  try {  

    appService.testAppTwilio(req, function(result, error){
      if(error){
        util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
        appLogService.addLog(req.body.appId, 'testAppTwilio', JSON.stringify(error),  'error', 'app'); 
      } 
      else{
        appLogService.addLog(req.body.appId, 'testAppTwilio', JSON.stringify(req.body), 'success', 'app'); 
        util.responseFormat(res, result);
      } 
    });
    
  } catch (e) {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR); 
  }
});

 


router.post("/addUser", async function (req, res) {
    if (req.scope != 'server')
    { 
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      return;
    }

    let valid = req.body.appId &&  req.body.handle && req.body.password;
    if(!valid) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }

    appService.addUser(req.body, function(data, error){
      if(data){
        appLogService.addLog(req.body.appId, 'addUser', JSON.stringify(data), 'success', 'app'); 
        util.responseFormat(res, data);
      } 
      else{
        util.responseFormat(res, error, util.HTTP_STATUS_CODE.FORBIDDEN);
        appLogService.addLog(req.body.appId, 'addUser', JSON.stringify(error),  'error', 'app'); 
      } 
    });
  }
);


router.post("/removeUser",
  async function (req, res) {
    if (req.scope != 'server')
    { 
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      return;
    }

    let valid = req.body.appId;
    if(!valid) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }

    appService.removeUser(req.body, function(data, error){
      if(data){
        appLogService.addLog(req.body.appId, 'removeUser', JSON.stringify(req.body),  'success', 'app'); 
        util.responseFormat(res, data);
      } 
      else{
        appLogService.addLog(req.body.appId, 'removeUser', JSON.stringify(error),  'error', 'app'); 
        util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      } 
    });
  }
);


router.get("/logs", async function (req, res) {
  if (req.scope != 'server')
  { 
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  }

  let valid = req.query.appId;
  if(!valid) {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  appService.getAppLogs(req.query, function(data, err){
    if(data) util.responseFormat(res, data);
    else util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
  });
})
  
router.get("/stat",
  async function (req, res) {
    if (req.scope != 'server')
    { 
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      return;
    }

    let valid =req.query.appId;
    if(!valid) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }

    appService.getAppStat(req.query, function(data, err){
      if(data) util.responseFormat(res, data);
      else util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    });
  }
); 
 



router.get("/emailTemplates", async function (req, res) {
  if (req.scope != 'server')
  { 
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  }

  let valid = req.query.appId;
  if(!valid) {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  appService.emailTemplates(req, function(data, err){
    if(data) util.responseFormat(res, data);
    else util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
  });
});


router.post("/updateEmailTemplate", async function (req, res) {
  if (req.scope != 'server')
  { 
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  }

  let valid = req.body.appId;
  if(!valid) {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  appService.updateEmailTemplate(req, function(data, err){
    if(data){
      appLogService.addLog(req.body.appId, 'updateEmailTemplate', JSON.stringify(data),  'success', 'app'); 
      util.responseFormat(res, data);
    } 
    else{
      appLogService.addLog(req.body.appId, 'updateEmailTemplate', JSON.stringify(_error),  'error', 'app'); 
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    } 
  });
});



router.post("/updateAppMetaData", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  }

   
  try {  

    appService.updateAppMetaData(req, function(result, error){
      if(error){
        appLogService.addLog(req.body.appId, 'updateAppMetaData', JSON.stringify(_error),  'error', 'app'); 
        util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      } 
      else{
        appLogService.addLog(req.body.appId, 'updateAppMetaData', JSON.stringify(req.body.metaData),  'success', 'app'); 
        util.responseFormat(res, result);
      } 
    });
    
  } catch (e) {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR); 
  }
});




router.post("/updateAppInviteMetaData", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  } 
   
  try {  

    appService.updateAppInviteMetaData(req, function(result, error){
      if(error){
        util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
        appLogService.addLog(req.body.appId, 'updateAppInviteMetaData', JSON.stringify(error),  'error', 'app'); 
      } 
      else{
        appLogService.addLog(req.body.appId, 'updateAppInviteMetaData', JSON.stringify(result.metaDataInvite),  'success', 'app'); 
        util.responseFormat(res, result);
      } 
    });
    
  } catch (e) {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR); 
  }
});




router.post("/reset", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  }

  // reset app data
  try { 

    appService.resetApp(req.body, function(result, error){
      if(error){
        appLogService.addLog(req.body.appId, 'resetApp', JSON.stringify(error),  'error', 'app'); 
        util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      } 
      else{
        appLogService.addLog(req.body.appId, 'resetApp', 'true',  'success', 'app'); 
        util.responseFormat(res, result);
      } 
    });
    
  } catch (e) {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR); 
  }
}); 

router.post("/importDatabase", uploadStrategy, async function (req, res) {
  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  }

  let valid = req.body.appName && req.file;
  if(!valid) {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  appService.importDatabase(req, res, function(result){
    if(result.status == 'fails'){
      appLogService.addLog("undefined", 'importDatabase', JSON.stringify(result),  'error', 'app'); 
      util.responseFormat(res, result, util.HTTP_STATUS_CODE.BAD_REQUEST);
    } 
    else{
      appLogService.addLog(result.appId, 'importDatabase', 'true',  'success', 'app'); 
      util.responseFormat(res, result);
    } 
  })
   
  
});
 





router.get("/export", async function (req, res) {
  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  }

  let valid =  req.query.appId;
  if(!valid) {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }

  appService.exportAppDatabase(req, res, function(filename, error){
    if(error){
      appLogService.addLog(req.query.appId, 'exportAppDatabase', JSON.stringify(error),  'error', 'app'); 
      util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    } 
    else { 
      appLogService.addLog(req.query.appId, 'exportAppDatabase', 'true',  'success', 'app');  
    }
  });
  
});


router.post("/remoteNotification", async function (req, res) {
  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  } 

  let valid =  req.body.userId;
  if(!valid || !notificationHubService) {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    return;
  }
  // return back to request, no delay
  util.responseFormat(res, true);

  let payload={
    alert: req.body.message
  };
  
  let tags = `$UserId:{${req.body.userId}}`;
  notificationHubService.apns.send(tags, payload, function(error){
    if(!error){
      //notification sent
    }
    else  console.log("notificationHubService apns error ", error);
     
  });




})

module.exports = router;