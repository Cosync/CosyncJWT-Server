

"use strict"; 
const express = require('express');
const router = express.Router();
const appService = require('../libs/cosync/appService'); 
const appUserService = require('../libs/cosync/appUserService'); 
const util = require('../libs/util');
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
        } 
        else util.responseFormat(res, result);
      });
});


router.get("/appId/:appId", async function (req, res) { 

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
   
  appService.search(req.query, function(apps, err){
      if(apps) util.responseFormat(res, apps);
      else util.responseFormat(res, err, util.HTTP_STATUS_CODE.BAD_REQUEST);
  }); 
  
});


router.post("/update", async (req, res) => { 
    let valid = req.body.appId;
    if(!valid && req.scope != 'server') {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }


    appService.updateApp(req.body, function(result, err){
        if(err){ 
            _error.message = err;
            util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
        } 
        else util.responseFormat(res, result);
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
          
          util.responseFormat(res, {status: 'Fails', message:err}, util.HTTP_STATUS_CODE.BAD_REQUEST);
      } 
      else util.responseFormat(res, result);
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
        else util.responseFormat(res, result);
      });
      
    } catch (e) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR); 
    }
  }
);



router.post("/resetUserPassword",
  async function (req, res) {
    if (req.scope != 'server')
    { 
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      return;
    }

    let valid = req.uid && req.body.appId && req.body.rawValue  && req.body.hashValue && req.body.userId;
    if(!valid) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    } 

    appUserService.updateAppUserPasword(req.body, function(data, err){
      if(data) util.responseFormat(res, data);
      else util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
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
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, true);
  });
   
});



router.post("/initCosyncJWT", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  } 

  initCosyncJWT.init(req, function(result, error){
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
  });
   
});



router.post("/reinitCosyncJWT", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  } 

  initCosyncJWT.reinit(req, function(result, error){
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
  });
   
});




router.post("/removeCosyncJWT", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  } 

  initCosyncJWT.remove(req, function(result, error){
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
  });
   
});



router.post("/initCosyncEngine", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  } 

  initCosyncEngine.init(req, function(result, error){
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
  });
   
});



router.post("/reinitCosyncEngine", async (req, res) => {

  if (req.scope != 'server')
  {
    util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
    return;
  } 

  initCosyncEngine.reinit(req, function(result, error){
    if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
    else util.responseFormat(res, result);
  });
   
}); 

 
router.get("/getCosyncVersions",
  async function (req, res) {
    if (req.scope != 'server')
    {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
      return;
    }

    let valid = req.uid;
    if(!valid) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
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

    let valid = req.uid && req.body.appId && req.body.schema;
    if(!valid || typeof req.body.schema != 'object') {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }

    appService.saveUserSchema(req, function(result, error){
      if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      else util.responseFormat(res, true);
    });
    
  }
);

 

module.exports = router;