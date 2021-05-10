

"use strict"; 
const express = require('express');
const router = express.Router();
const appUser = require('../libs/cosync/appUserService'); 
const util = require('../libs/util');
let _error = {status: 'Fails', message: 'Invalid Data'};



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


 


 

module.exports = router;