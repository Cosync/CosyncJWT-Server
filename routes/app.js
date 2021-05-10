

"use strict"; 
const express = require('express');
const router = express.Router();
const appService = require('../libs/cosync/appService'); 
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

  

  
}
);


router.post("/update", async (req, res) => {

    let valid = req.body.appId && req.body.name;
    if(!valid) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }

    appService.editAppName(req.body, function(result, err){
        if(err){ 
            _error.message = err;
            util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
        } 
        else util.responseFormat(res, result);
      });
});


router.delete("/:appId",
  async function (req, res) {
     
    let valid = req.params.appId
    if(!valid) {
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




 

module.exports = router;