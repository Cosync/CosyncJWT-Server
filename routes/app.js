

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


router.get("/", async function (req, res) { 

    let valid = req.query.appId;
    if(!valid) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }

    appService.getApp(req.query.appId, function(app, err){
      if(app) util.responseFormat(res, app);
      else util.responseFormat(res, _error, util.HTTP_STATUS_CODE.FORBIDDEN);
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
          util.responseFormat(res, err, util.HTTP_STATUS_CODE.BAD_REQUEST);
        } 
        else util.responseFormat(res, result);
      });
});


router.delete("/",
  async function (req, res) {
     
    let valid = req.body.appId;
    if(!valid) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.BAD_REQUEST);
      return;
    }

    try {
      appService.deleteApp(req.body.appId, function(result, error) {
        if(error) util.responseFormat(res, error, util.HTTP_STATUS_CODE.BAD_REQUEST);
        else util.responseFormat(res, result);
      });
      
    } catch (e) {
      util.responseFormat(res, _error, util.HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR); 
    }
  }
);





 
router.get("/allApps",
  async function (req, res) { 

    appService.getApps(function(apps, err){
      if(apps) util.responseFormat(res, apps);
      else util.responseFormat(res, err, util.HTTP_STATUS_CODE.BAD_REQUEST);
    });
  }
);

module.exports = router;