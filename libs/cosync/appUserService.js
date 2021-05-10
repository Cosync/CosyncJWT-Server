'use strict';
const mongoose = require('mongoose');  
const nrsa = require('node-rsa');  
const util = require('../util'); 
const CONT = require('../../config/constants');
const SCHEMA = require('../../config/schema');  

const appProjection = {
  __v: false,
  _id: false
  
}; 

let _error = {status: 'Fails', message: `Invalid Data`}; 
 

class AppUserService {

  constructor() {

  } 
     

  async signup(req, callback){

    let that = this;
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: req.appId });

    if(!app ) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    }
    
    if(app.status != 'active') {
      callback(null, util.INTERNAL_STATUS_CODE.APP_IS_SUSPENDED);
      return;
    } 

    if(!app.signupEnabled) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_ISNOT_SIGNUPABLE);
      return;
    } 

    req.body.handle = req.body.handle.toLowerCase();

  
    let _appUserTbl = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let item = await _appUserTbl.findOne({ handle: req.body.handle, appId: req.appId });

    if (!item) { 
      let _signupTbl = mongoose.model(CONT.TABLE.SIGNUPS, SCHEMA.signup);
      let signup = await _signupTbl.findOne({ handle: req.body.handle, appId: req.appId }); 
      that.createSignup(req, app, signup, callback);  
    }
    else callback(null, util.INTERNAL_STATUS_CODE.HANDLE_ALREADY_REGISTERED );
    
    
  }



  async createSignup(req, app, signup, callback){
     
    let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate);
    let tempalte = await _email.findOne({ appId: app.appId, templateName: 'signUp' }); 
    let _signupTbl = mongoose.model(CONT.TABLE.SIGNUPS, SCHEMA.signup); 
      
    let code = util.getRandomNumber(); 
    if(signup){
      code = signup.code; 
      signup.status = 'pending';
      signup.updatedAt = util.getCurrentTime();
      signup.save();
    } 

    let tml;
    let handle = req.body.handle.toLowerCase();
    
    let metaData;
    let finalMetaData = {};


    if(app.signupFlow == 'none'){
      try {
        
        try {
          
          if(req.body.metaData) metaData = JSON.parse(req.body.metaData); 

          if(app.metaData.length){
            app.metaData.forEach(field => {
              let value = _.get(metaData, field.path);

              if(value !== undefined) _.set(finalMetaData, field.path, value); 

              if(field.required && value === undefined){ 
                callback(null, util.INTERNAL_STATUS_CODE.INVALID_METADATA);
                return;
              }

            });
          }


        } catch (error) {
          callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
          return;
        }

        let data = {
          handle: handle, 
          password: req.body.password,
          appId: req.appId,
          metaData: finalMetaData,
          status: 'active',
          code: code,
          createdAt: util.getCurrentTime(),
          updatedAt: util.getCurrentTime(),
        };

        let signupUser = new _signupTbl(data);
        signupUser.save(); 

        let result = await this.addAppUserData(data, app);
        result.code = code;
        if(result.jwt) callback(result);
        else callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
        
      } catch (error) {
        callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
      }
      
      return;
    } 

    if(app.signupFlow == 'code'){
      tml = tempalte.htmlTemplate.split('%CODE%').join(code);
      tml = tml.split('%HANDLE%').join(handle);
      tml = tml.split('%APP_NAME%').join(app.name);
    }
    else{

      let link = `${global.__config.webbaseurl}clickthrough/${app.appToken}/${handle}/${code}`;

      tml = tempalte.htmlTemplate.split('%CODE%').join(`Please <a href="${link}">click here</a> to verify your sign up.`);
      tml = tml.split('%HANDLE%').join(handle); 
      tml = tml.split('%APP_NAME%').join(app.name);
    } 

    let emailData = {
      to: handle, 
      from: tempalte.replyTo,
      subject : tempalte.subject.split('%APP_NAME%').join(app.name),
      text: `Thanks for verifying your ${handle} account!
      Your code is: ${code}
      Sincerely,
      ${app.name}`,
      html: tml
    };

    

    if(!signup){

      try {
       
        if(req.body.metaData) metaData = JSON.parse(req.body.metaData); 

        if(app.metaData.length){
          
          for (let index = 0; index < app.metaData.length; index++) {
            const field = app.metaData[index];
            
          
            let value = _.get(metaData, field.path);

            if(value !== undefined) _.set(finalMetaData, field.path, value);

            if(field.required && value === undefined){ 
              callback(null, util.INTERNAL_STATUS_CODE.INVALID_METADATA);
               
              return;
            }

          };
        }


      } catch (error) {
        callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
        return;
      }

      callback(true); 

      let item = {
        handle: handle, 
        password: req.body.password,
        appId: req.appId,
        metaData: finalMetaData,
        status: 'pending',
        code: code,
        createdAt: util.getCurrentTime(),
        updatedAt: util.getCurrentTime(),
      };
      

      let signupUser = new _signupTbl(item);
      signupUser.save();

      
    } 
    else  callback(true);

    emailService.send(emailData);
  }



  addAppUserData(data, app){

    return new Promise((resolve, reject) =>{
      let that = this;
      let _appUserTbl = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);

      let user = {
        handle: data.handle,
        password: data.password,
        appId: app.appId,
        status: 'active', 
        createdAt: util.getCurrentTime(),
        updatedAt: util.getCurrentTime(),
      };

      data.appId = app.appId;
      
      if(data.metaData) user.metaData = data.metaData;

      let appUser = new _appUserTbl(user);
      appUser.save();

      data.uid = user.uid;

      const accessToken = util.generateAccessToken(user , data.owner);
      const jwtToken = util.generateAuthJWTToken(user, app); 
      const signToken = util.generateSignToken(data, app); 
      
      resolve({'jwt':jwtToken, 'access-token':accessToken, 'signed-user-token':signToken});  
       
    });
  }


      

}

const instance = new AppUserService()
module.exports = instance

 