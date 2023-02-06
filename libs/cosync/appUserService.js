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
 

const mongoose = require('mongoose');  
const util = require('../util'); 
const CONT = require('../../config/constants');
const SCHEMA = require('../../config/schema');  
let twoFactorService = require('./authenticatorService');
let emailService = require('./emailService'); 
let twilioService = require('./twilioService');
let hashService  = require('./hashService');
const _ = require('lodash'); 

const appProjection = {
  __v: false,
  _id: false
  
}; 

let _error = {status: 'Fails', message: `Invalid Data`}; 
 


let resetPasswordTemplate = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" dir="ltr" lang="en">
  <tbody>
  <tr>
   <td valign="top" width="50%"></td>
   <td valign="top"> 
      <table width="640" cellpadding="0" cellspacing="0" border="0" dir="ltr" lang="en" style="border-left:1px solid #e3e3e3;border-right:1px solid #e3e3e3">
       <tbody>
       <tr style="background-color:#0072c6">
           <td width="1" style="background:#0072c6;border-top:1px solid #e3e3e3"></td>
           <td width="24" style="border-top:1px solid #e3e3e3;border-bottom:1px solid #e3e3e3">&nbsp;</td>
           <td width="310" valign="middle" style="border-top:1px solid #e3e3e3;border-bottom:1px solid #e3e3e3;padding:12px 0">
               <h1 style="line-height:20pt;font-family:Segoe UI Light;font-size:18pt;color:#ffffff;font-weight:normal">
                   
               <span ><font color="#FFFFFF">Your password has been reset from CosyncJWT Portal.</font></span>

               </h1>
           </td>
           <td width="24" style="border-top:1px solid #e3e3e3;border-bottom:1px solid #e3e3e3">&nbsp;</td>
       </tr>
      </tbody></table>
      
      <table width="640" cellpadding="0" cellspacing="0" border="0" dir="ltr" lang="en">
       <tbody><tr>
           <td width="1" style="background:#e3e3e3"></td>
           <td width="24">&nbsp;</td>
           <td width="640" valign="top" colspan="2" style="border-bottom:1px solid #e3e3e3;padding:10px 0 20px;border-bottom-style:hidden">		
                <table cellpadding="0" cellspacing="0" border="0">
                   <tbody><tr>
                       <td width="630" style="font-size:10pt;line-height:13pt;color:#000">
                           <table cellpadding="0" cellspacing="0" border="0" width="100%" dir="ltr" lang="en">
                               <tbody>
                               <tr>
                                   <td>
                                                                            
                                      <div style="font-family:'Segoe UI',Tahoma,sans-serif;font-size:14px;color:#333">
                                        <span >Your login account handle: <a href="#">%HANDLE%</a></span>
                                      </div>
                                      <br>
                                      <div style="font-family:'Segoe UI',Tahoma,sans-serif;font-size:14px;color:#333;font-weight:bold">
                                        <span>Your new account password: %PASSWORD%</span>
                                      </div>
                                      <br>
                                      <br>

                                       <div style="font-family:'Segoe UI',Tahoma,sans-serif;font-size:14px;color:#333">
                                       Sincerely,
                                       </div>
                                       <div style="font-family:'Segoe UI',Tahoma,sans-serif;font-size:14px;font-style:italic;color:#333">
                                       The %APP_NAME% team
                                       </div>
                                   </td>
                               </tr>
                              </tbody>
                            </table>
                       </td>
                   </tr>
                </tbody>
              </table>
           </td>

           <td width="1">&nbsp;</td>
           <td width="1"></td>
           <td width="1">&nbsp;</td>
           <td width="1" valign="top"></td>			 
           <td width="29">&nbsp;</td>
           <td width="1" style="background:#e3e3e3"></td>
       </tr>
       <tr>
           <td width="1" style="background:#e3e3e3;border-bottom:1px solid #e3e3e3"></td>
           <td width="24" style="border-bottom:1px solid #e3e3e3">&nbsp;</td>
           <td width="585" valign="top" colspan="6" style="border-bottom:1px solid #e3e3e3;padding:0px">
               

           </td>

           <td width="29" style="border-bottom:1px solid #e3e3e3">&nbsp;</td>
           <td width="1" style="background:#e3e3e3;border-bottom:1px solid #e3e3e3"></td>
       </tr>
      </tbody></table>

   </td>
   <td valign="top" width="50%"></td>
</tr>
</tbody></table>`;



class AppUserService {

  constructor() {

  } 
     

  /**
   * 
   * @param {*} req 
   * @param {*} callback 
   * @returns 
   */
  async signup(req, callback){ 
    
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: req.appId });

    if(!app ) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    }
    
    if(!this.checkAppStatus(app, callback)) return;

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

      this.createSignup(req, app, signup, callback);  
    }
    else callback(null, util.INTERNAL_STATUS_CODE.HANDLE_ALREADY_REGISTERED );
    
    
  }


  /**
   * 
   * @param {*} req 
   * @param {*} app 
   * @param {*} oldSignup 
   * @param {*} callback 
   * @returns 
   */
  async createSignup(req, app, oldSignup, callback){
     
    let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate);
    let tempalte = await _email.findOne({ appId: app.appId, templateName: 'signUp' }); 
    let _signupTbl = mongoose.model(CONT.TABLE.SIGNUPS, SCHEMA.signup);
     
    let code =  oldSignup ? oldSignup.code : util.getRandomNumber(); 

    let tml;
    let handle = req.body.handle.toLowerCase();
    
    let metaData;
    let finalMetaData = {};


    if(app.signupFlow == 'none'){
      try {
        
        try {
          
          if(req.body.metaData) metaData = JSON.parse(req.body.metaData); 

          if(app.metaData && app.metaData.length){
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

        let hashedPassword = await hashService.generateHash(req.body.password);
        
        let data = {
          handle: handle, 
          password: hashedPassword,
          appId: req.appId,
          metaData: finalMetaData,
          status: 'active',
          code: code,
          createdAt: util.getCurrentTime(),
          updatedAt: util.getCurrentTime(),
        };

        let signupUser = new _signupTbl(data);
        signupUser.save(); 

        let result = await this.addAppUserDataSkipPasswordHash(data, app);
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
      let modifiedEmail = handle.replace(/\+/g, "%2B");
      let link = `${global.__config.apiUrl}/api/appuser/completeSignup?appToken=${app.appToken}&handle=${modifiedEmail}&code=${code}`;

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

    try {
      
      if(req.body.metaData) metaData = JSON.parse(req.body.metaData); 

      if(app.metaData && app.metaData.length){
        
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

   


    let hashedPassword = await hashService.generateHash(req.body.password);

    if(oldSignup){ 
      
      oldSignup.status = 'pending';
      oldSignup.updatedAt = util.getCurrentTime();
      oldSignup.metaData = finalMetaData;
      oldSignup.password = hashedPassword;
      oldSignup.save();
      
    }
    else{

      let item = {
        handle: handle, 
        password: hashedPassword,
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

    let signupResult;
    
    if(app.emailExtensionAPIKey && app.emailExtension){
      signupResult = await emailService.sendAppMail(emailData, null, app); 
    } 
    else{
      signupResult = await emailService.send(emailData , null, app);
    } 

    if(signupResult) callback(signupResult)
    else callback(signupResult, util.INTERNAL_STATUS_CODE.INTERNAL_SERVER_ERROR)
  }



  async completeSignup(signUpData, callback){
    let that = this;

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: signUpData.appId });
    
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    } 
    
    if(!this.checkAppStatus(app, callback)) return;

    if(!app.signupEnabled) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_ISNOT_SIGNUPABLE);
      return;
    } 
    
    let _signupTbl = mongoose.model(CONT.TABLE.SIGNUPS, SCHEMA.signup); 
    let signup = await _signupTbl.findOne({ appId: signUpData.appId, handle:signUpData.handle, code: parseInt(signUpData.code) }); 
    
    if(!signup) {
      callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
      return;
    }

    let hours = util.countHour(signup.updatedAt);
    if(hours > 48){
      callback(null, util.INTERNAL_STATUS_CODE.SIGNUP_CODE_EXPRIRED);
      return;
    }

    if(signup.status == 'pending'){

      signup.status = 'verified';
      signup.updatedAt = util.getCurrentTime();
      signup.save();

      signUpData.metaData = signup.metaData; 
      signUpData.password = signup.password; // already hashed

      let result = await that.addAppUserDataSkipPasswordHash(signUpData, app);

      if(!result.jwt){
        callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
        return;
      }

      if(app.signupFlow == 'link'){
        let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate);
        let emailTemplate = await _email.findOne({appId: signUpData.appId, templateName: 'clickThrough'}); 

        let template = emailTemplate.htmlTemplate.split('%APP_NAME%').join(app.name);
        template = template.split('%HANDLE%').join(signup.handle);
        template = template.split('%CODE%').join(signup.code);  
        callback(template);
      } 
      else callback(result);
      
    } 
    else if(signup.status == 'verified'){
      callback(null, util.INTERNAL_STATUS_CODE.HANDLE_ALREADY_REGISTERED);
    }
    else callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA); 
  

  }


  addAppUserData(data, app){

    return new Promise((resolve, reject) =>{
       
      let _appUserTbl = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
      hashService.generateHash(data.password).then(hashedPassword => {

        let user = {
          handle: data.handle,
          password: hashedPassword,
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
    });
  }



  addAppUserDataSkipPasswordHash(data, app){

    return new Promise((resolve, reject) =>{
       
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

  async getANONUserAuth(params, callback) {

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: params.appId});
    if(!app){
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    } 
    else if(!app.anonymousLoginEnabled ){
      callback(null, util.INTERNAL_STATUS_CODE.APP_ISNOT_ANONYMOUS_LOGIN);
      return;
    }

    if(!this.checkAppStatus(app, callback)) return;

    let _user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);  
    let user = await _user.findOne({ handle: params.handle, appId:app.appId });
    
    if(!user){
      //params.password = "";
      let tokenData = await this.addAppUserDataSkipPasswordHash(params, app); 
      delete tokenData['signed-user-token']
      
      callback(tokenData)
    }
    else {
      const jwtToken = util.generateAuthJWTToken(user, app); 
      if(!jwtToken){
        callback(null, util.INTERNAL_STATUS_CODE.INVALID_METADATA)
        return;
      }
      let scope = 'user';
      let accessToken = util.generateAccessToken(user, scope); 

      user.lastLogin = util.getCurrentTime();
      user.save(); 

      callback({'jwt':jwtToken, 'access-token':accessToken});
    }

  }
  
  async getAppUserAuth(params, callback) {
    
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: params.appId});
    if(!app){
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    } 
    
    if (params.handle.indexOf("@") > 0 && !app.userNamesEnabled){
      callback(null, util.INTERNAL_STATUS_CODE.APP_ISNOT_USERNAME_LOGIN);
      return;
    }

    if(!this.checkAppStatus(app, callback)) return;

    let _user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);  
    let query = {
      $or: [ { handle: params.handle, appId:app.appId }, 
             { userName: params.handle, appId:app.appId } 
      ]
  };

    let user = await _user.findOne(query);
    
    if(!user){
      let response = util.INTERNAL_STATUS_CODE.INVALID_CREDENTIALS; 
      if(app.signupFlow != 'none'){
        let _signup = mongoose.model(CONT.TABLE.SIGNUPS, SCHEMA.signup);  
        let signup = await _signup.findOne({ handle: params.handle, appId:app.appId });
        if(signup) response.signup = {status: signup.status}; 
      }
      
      callback(null, response);
        
    } 
    else if(user.status != 'active'){
      callback(null, util.INTERNAL_STATUS_CODE.USER_IS_SUSPENDED);
    }
    else{ 

      let validHash = await hashService.validateHash(params.password, user.password);
      if(!validHash){
        callback(null, util.INTERNAL_STATUS_CODE.INVALID_CREDENTIALS);
        return; 
      } 
      
      if(app.twoFactorVerification != 'none' && user.twoFactorGoogleVerification == true || (user.twoFactorPhoneVerification == true && user.phoneVerified == true) ){
        
        this.sendTwoFactorVerification(app, user).then(twoFactor => {
          callback(twoFactor);
        }).catch(err => {
          callback(null, err);
        })
      }
      else{
        
        const jwtToken = util.generateAuthJWTToken(user, app); 
        if(!jwtToken){
          callback(null, util.INTERNAL_STATUS_CODE.INVALID_METADATA)
          return;
        }
        let scope = 'user';
        let accessToken = util.generateAccessToken(user, scope); 

        user.lastLogin = util.getCurrentTime();
        user.save(); 

        callback({'jwt':jwtToken, 'access-token':accessToken});

      } 
      
    }
     
  }


  sendTwoFactorVerification(app, user){
    return new Promise((resolve, reject) => {

      let signToken = util.generateSigninToken(user);
      
      if(app.twoFactorVerification == 'phone' && user.twoFactorPhoneVerification){ // send SMS Code
        twilioService.sendSMS(user, app, function(result, err){
          if(result){
            user.twoFactorCode = result.twoFactorCode;
            user.save();
            resolve({'login-token': signToken});
          }
          else reject(err);
        });
      } 
      else if(app.twoFactorVerification == 'google' && user.twoFactorGoogleVerification) resolve({'login-token': signToken});
      else{
        const jwtToken = util.generateAuthJWTToken(user, app); 
        let accessToken = util.generateAccessToken(user);
        user.lastLogin = util.getCurrentTime();
        user.save(); 
        resolve({'jwt':jwtToken, 'access-token':accessToken}); 
      }
    })
  } 
 

  async verifyTwoFactor(data, callback){

    let __user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let user = await __user.findOne({handle:data.handle, appId: data.appId });

    if(!user){
      callback(false, util.INTERNAL_STATUS_CODE.INVALID_CREDENTIALS);
      return;
    } 

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: data.appId});
         
    if(!this.checkAppStatus(app, callback)) return;

    if(!data.code){
      callback(false,  util.INTERNAL_STATUS_CODE.INVALID_CREDENTIALS);
      return;
    }

    if(app.twoFactorVerification == 'google'){
      let verified = twoFactorService.verifyCode(user, data.code);
      if(!verified){
        callback(false,  util.INTERNAL_STATUS_CODE.INVALID_CREDENTIALS);
        return;
      }
    }
    else if(app.twoFactorVerification == 'phone'){
      if(user.twoFactorCode != data.code){
        callback(false,  util.INTERNAL_STATUS_CODE.INVALID_CREDENTIALS);
        return;
      }
    }

    const jwtToken = util.generateAuthJWTToken(user, app); 
    let accessToken = util.generateAccessToken(user); 
    user.lastLogin = util.getCurrentTime();
    user.twoFactorCode = '';
    user.save();

    callback({'jwt':jwtToken, 'access-token':accessToken});
  
  }

  checkAppStatus(app, callback){
    

      if(app.status == 'inactive') {
        callback(null, util.INTERNAL_STATUS_CODE.APP_IS_SUSPENDED);
        return false;
      } 
      else if(app.status == 'migrated') {
        callback(null, util.INTERNAL_STATUS_CODE.APP_IS_MIGRATED);
        return false;
      } 
      else return true;

     
  }


  async forgotPassword(req, callback){

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: req.appId });
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    } 

    if(!this.checkAppStatus(app, callback)) return;


    let handle = req.body.handle.toLowerCase()
    let _appUserTbl = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let item = await _appUserTbl.findOne({ handle: handle, appId: req.appId });

    if (item) {
      callback(true);

      let code = util.getRandomNumber();
      let _resetTbl = mongoose.model(CONT.TABLE.RESET_PASSWORDS, SCHEMA.resetPassword); 

      let data = {
        handle: handle, 
        appId: req.appId, 
        status: 'pending',
        code: code,
        createdAt: util.getCurrentTime(),
        updatedAt: util.getCurrentTime()
      };

      let result = new _resetTbl(data);
      result.save(); 
    
      let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate);
      let tempalte = await _email.findOne({ appId: req.appId, templateName: 'resetPassword' }); 

      let tml = tempalte.htmlTemplate.split('%CODE%').join(code);
      tml = tml.split('%HANDLE%').join(handle);
      tml = tml.split('%APP_NAME%').join(app.name);
      let emailData = {
        to: handle,
        from: tempalte.replyTo,
        subject : tempalte.subject.split('%APP_NAME%').join(app.name),
        text: `Someone has requested password reset for ${handle} account!
        Here is your reset key: ${code}
        Sincerely,
        ${app.name}`,
        html: tml
      };

     

      if(app.emailExtensionAPIKey && app.emailExtension) emailService.sendAppMail(emailData, null, app);
      else emailService.send(emailData, null, app);
    }
    else{
      callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
    } 


  }




  async resetPassword(req, callback){
    
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: req.appId });
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    } 

    if(!this.checkAppStatus(app, callback)) return;

  
    let handle = req.body.handle.toLowerCase();
    let _resetTbl = mongoose.model(CONT.TABLE.RESET_PASSWORDS, SCHEMA.resetPassword);
    let resetCode = await _resetTbl.findOne({ handle: handle, appId: req.appId , code: parseInt(req.body.code)});

    if (resetCode) {
      
      if(resetCode.status == "pending"){ 
        
        // remove used record
        resetCode.remove();

        let _appUserTbl = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
        let user = await _appUserTbl.findOne({ handle: handle, appId: req.appId });
        

        if(user){
         
          user.password = await hashService.generateHash(req.body.password);
          user.googleSecretKey = "";
          user.twoFactorPhoneVerification = false;
          user.twoFactorGoogleVerification = false;
          user.updatedAt = util.getCurrentTime();
          user.save();
          callback(true);
        }
        else callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
      }
      else callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
    }
    else callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA); 
   

  }



  async changePassword(req, callback){

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: req.appId });
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    } 

    if(!this.checkAppStatus(app, callback)) return;

    let _appUserTbl = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let user = await _appUserTbl.findOne({ handle: req.handle, appId: req.appId});

    if(user){
      
      let validHash = await hashService.validateHash(req.body.password, user.password);

      if(validHash){ 
        user.password = await hashService.generateHash(req.body.newPassword);
        user.updatedAt = util.getCurrentTime();
        user.save();
        
        callback(true);
      }
      else callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
    }
    else callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
  

  }



  async getUser(req, callback){

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: req.appId });
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    } 

    if(!this.checkAppStatus(app, callback)) return;
 

    let _appUserTbl = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let user = await _appUserTbl.findOne({ handle: req.handle, appId: req.appId });

    if(user){

      let data = {
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        handle: user.handle,
        twoFactorPhoneVerification: user.twoFactorPhoneVerification || false,
        twoFactorGoogleVerification: user.twoFactorGoogleVerification || false,
        appId: user.appId,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        metaData:user.metaData,
        lastLogin: user.lastLogin
      }; 

      callback(data);
    }
    else callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
    
  }

  async checkAvailableUserName(req, callback){

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: req.appId });

    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    }

    if(!app.userNamesEnabled) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_ISNOT_USERNAME_LOGIN);
      return;
    }

    let _appUserTbl = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let username = await _appUserTbl.findOne({ userName: req.body,userName, appId: req.appId});

    if (username) callback({available:false})
    else callback({available:true})

  }

  async setUserName(req, callback){

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: req.appId });
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    }

    if(!app.userNamesEnabled) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_ISNOT_USERNAME_LOGIN);
      return;
    }  
    if(!this.checkAppStatus(app, callback)) return; 

    let _appUserTbl = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let user = await _appUserTbl.findOne({ handle: req.handle, appId: req.appId});
    if (!user) {
      callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
      return;
    }

    let username = await _appUserTbl.findOne({ userName: req.body,userName, appId: req.appId});
    if (username){
      callback(null, util.INTERNAL_STATUS_CODE.USERNAME_ALREADY_IN_USE);
      return
    }

    user.userName = req.body.userName;
    user.updatedA = util.getCurrentTime()
    user.save()

  }

  async setUserMetaData(req, callback){

    let metaData;
    try {
       metaData = JSON.parse(req.body.metaData); 
    } catch (error) {
      callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
      return;
    }


    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: req.appId });
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    }

    if(!this.checkAppStatus(app, callback)) return; 
    
    let appMetaData = util.getAppMetaData(app);
    if(!appMetaData){
      callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
      return;
    }

    let _appUserTbl = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let user = await _appUserTbl.findOne({ handle: req.handle, appId: req.appId});

    if (user) {
       
      let finalMetaData = {};

      if(app.metaData){
        for (let index = 0; index < app.metaData.length; index++) {
          const field = app.metaData[index]; 
          
          let value = _.get(metaData, field.path);

          if(value && field.canEdit === true) _.set(finalMetaData, field.path, value);  
          else if (value && !field.canEdit){
            callback(null, util.INTERNAL_STATUS_CODE.INVALID_METADATA);
            return;
          }
          else if(field.required && value === undefined){
            callback(null, util.INTERNAL_STATUS_CODE.INVALID_METADATA);
            return;
          }
        };
      }

      if(user.metaData && app.metaDataInvite){ // get old invite meta data

        for (let index = 0; index < app.metaDataInvite.length; index++) {
          const field = app.metaDataInvite[index]; 
          let value = _.get(user.metaData, field.path); 
          if(value) _.set(finalMetaData, field.path, value);  
        }; 
      }

      user.metaData = finalMetaData;
      user.save();

      callback(true);
    }
    else{
      callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
    }
    
 
       
  }



  async setPhone(req, callback){
    
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: req.appId });
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    } 

    if(!this.checkAppStatus(app, callback)) return;

    if(app.twoFactorVerification != "phone"){
      callback(null, util.INTERNAL_STATUS_CODE.APP_NO_PHONE_TWO_FACTOR);
      return;
    }

  
    this.checkExistingPhone(app.appId, req.body.phone, async function(exist){
      if(exist) {
        callback(null, util.INTERNAL_STATUS_CODE.PHONE_NUMBER_ALREADY_IN_USE);
      }
      else{

        let _appUserTbl = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
        let user = await _appUserTbl.findOne({ handle: req.handle, appId: req.appId });

        if(user){
          user.phone = req.body.phone;
          user.phoneVerified = false;

          twilioService.sendSMS(user, app, function(res, err){
            if(res){
              
              user.phoneCode = res.twoFactorCode;
              user.updatedAt = util.getCurrentTime();
              user.save();
            }
            callback(res, err);
          }) 
        }
        else callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
      }
    });
    
    

  }



  async verifyPhone(req, callback){
    
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: req.appId });
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    } 
    
    if(!this.checkAppStatus(app, callback)) return;


    this.checkExistingPhone(app.appId, req.body.phone, async function(exist){
      if(exist) callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
      else{
        let _appUserTbl = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
        let user = await _appUserTbl.findOne({ handle: req.handle, appId: req.appId });

        if(user && user.phoneCode == parseInt(req.body.code)){

          user.phoneCode = 0;
          user.phoneVerified = true;
          user.updatedAt = util.getCurrentTime();
          
          user.save(); 

          callback(true);
        }
        else callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
      }
    });
  

  }


  async checkExistingPhone(appId, phone, callback){
    let _appUserTbl = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let user = await _appUserTbl.findOne({appId: appId, phone: phone, phoneVerified:true });
    callback(user);
  }



  sendPhoneCode(user, app, callback){
    twilioService.sendSMS(user, app, callback)
  }


  async requestTwoFactorVerifications(req, callback){

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: req.appId });
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    }

    if(!this.checkAppStatus(app, callback)) return;  

    
    if(req.isGoogle && app.twoFactorVerification == 'none'){
      callback(null, util.INTERNAL_STATUS_CODE.APP_NO_GOOGLE_TWO_FACTOR);
      return;
    } 
    else if(req.isPhone && app.twoFactorVerification == 'none'){
      callback(null, util.INTERNAL_STATUS_CODE.APP_NO_PHONE_TWO_FACTOR);
      return;
    }  

    let _appUserTbl = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let user = await _appUserTbl.findOne({ handle: req.handle, appId: req.appId });
      
    if (!user) { 
      callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
    }
    else { 

      if(req.body.twoFactor == true || req.body.twoFactor == 'true' ){

        if(app.twoFactorVerification == 'google'){

          user.twoFactorGoogleVerification = true;

          let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate); 
          let tempalte = await _email.findOne({ appId: app.appId, templateName: 'qrCode' }); 

          twoFactorService.generateAppUserKeyQRImage(user, app, function(twoFactor){

            let tml = tempalte.htmlTemplate.split('%APP_NAME%').join(app.name);
            tml = tml.split('%HANDLE%').join(user.handle);
            tml = tml.split('%CODE%').join(twoFactor.googleSecretKey); 
            
            let emailData = {
              to: user.handle,
              from: tempalte.replyTo,
              subject : tempalte.subject.split('%APP_NAME%').join(app.name),
              html: tml
            }; 

            let QRimage = {
              qrImage: twoFactor.imageBuffer,
              type: 'image',
              filename: "QRCode.png"
            }

            if(app.emailExtensionAPIKey && app.emailExtension) emailService.sendAppMail(emailData, QRimage, app);
            else emailService.send(emailData, QRimage); 
          
            
            user.googleSecretKey = twoFactor.googleSecretKey;
            user.save();

            callback({googleSecretKey:twoFactor.googleSecretKey,  QRDataImage: twoFactor.QRDataImage}); 
          });
        }
        else if(app.twoFactorVerification == 'phone'){ // send Twilio SMS
            
          if(user.phoneVerified){
            user.twoFactorPhoneVerification = true;
            user.save();
            callback(true); 
          }
          else callback(null, util.INTERNAL_STATUS_CODE.USER_NO_VERIFIED_PHONE);
        }
        
      }
      else{
        if(app.twoFactorVerification == 'google') user.twoFactorGoogleVerification = false;
        else if(app.twoFactorVerification == 'phone') user.twoFactorPhoneVerification = false;
        user.save();
        callback(true);
      } 
      
    }
    
  }




  async confirmTwoFactorVerifications(req){

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: req.appId });
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    }

    if(app.status != 'active') {
      callback(null, util.INTERNAL_STATUS_CODE.APP_IS_SUSPENDED);
      return;
    }

    let handle = req.body.handle.toLowerCase();

    let _appUserTbl = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let user = await _appUserTbl.findOne({ handle: handle, appId: req.appId });

    if (!user) { 
      callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
    }
    else {

      if(app.twoFactorVerification == 'google'){

        let verified = twoFactorService.verifyCode(user, req.body.twoFactorCode);
        if(verified){
          user.twoFactorVerification = true;
          user.save();
          callback(true);
        }
        else callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);

      }
      else{

        if(user.twoFactorCode == req.body.twoFactorCode) callback(true);
        else callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA); 
      }
      
    }
  
  }


  async updateAppUserMetaData(req, callback){

    let data = req.body;

    let error = {status: 'Fails', message: 'Invalid Data'};

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: data.appId, developerUid:req.uid });

    if(!app ) {
      callback(null, error); 
      return;
    } 


    let _user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user); 
    let user = await _user.findOne({handle: data.handle, appId: data.appId });

    if(!user){
      callback(null, error); 
      return;
    }

    let valid = await this.validateUserMetaData(data.metaData, app);
    
    if(!valid){
      callback(null, error); 
      return;
    }

    user.metaData = valid;
    app.updatedAt = util.getCurrentTime();
    user.save();
    callback(true); 
  }



  validateUserMetaData(metaData, app){
    return new Promise((resolve, reject) => {  

      let finalMetaData = {}; 

      for (let index = 0; index < app.metaData.length; index++) {
        const field = app.metaData[index]; 
        let value = _.get(metaData, field.path); 
        if(value !== undefined && value != "") _.set(finalMetaData, field.path, value);
      }; 

      for (let index = 0; index < app.metaDataInvite.length; index++) {
        const field = app.metaDataInvite[index]; 
        let value = _.get(metaData, field.path); 
        if(value !== undefined && value != "") _.set(finalMetaData, field.path, value);
      }; 
      
      resolve(finalMetaData);

    })
  } 




  async updateAppUser(data, callback){ 

    let _user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let user = await _user.findOne({_id: data.userId}); 
    if(user){
      user.status = data.status;
      user.updatedAt = util.getCurrentTime();
      user.save();
      callback(true);
    }
    else callback(false);

  }

  

  async updateAppUserPasword(data, callback){ 

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: data.appId});
    if(!app){
      callback(null, _error);
      return;
    }

    let _user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let user = await _user.findOne({_id: data.userId}); 
    if(user){
      
      user.password = await hashService.generateHash(data.hashValue);
      user.updatedAt = util.getCurrentTime();
      user.save();
      

      let tml = resetPasswordTemplate.split('%PASSWORD%').join(data.rawValue);
      tml = tml.split('%HANDLE%').join(user.handle);
      tml = tml.split('%APP_NAME%').join(app.name);
      let emailData = {
        to: user.handle, 
        subject : `${app.name}: account passowrd has been reset.`,
        text: `Your login account handle: ${user.handle}
        Your new account password: ${data.rawValue}
        Sincerely,
        ${app.name}`,
        html: tml
      };


      let emailResult;
      if(app.emailExtensionAPIKey && app.emailExtension){
        emailResult = await emailService.sendAppMail(emailData, null, app);
      } 
      else {
        emailResult = await emailService.send(emailData, null, app);
      } 
      callback(emailResult); 
    }
    else callback(false);

  }


  async inviteUser(req, callback){

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: req.appId });
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    }

    if(!this.checkAppStatus(app, callback)) return;

    if(!app.invitationEnabled) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_ISNOT_INVITATBLE);
      return;
    }

    let finalMetaData = {};
    if(app.metaDataInvite && app.metaDataInvite.length){ 
      
      let metaData = {};
      let valid = true;

      try {
        if(req.body.metaData) metaData = JSON.parse(req.body.metaData);
      } catch (error) {
        callback(null, util.INTERNAL_STATUS_CODE.INVALID_METADATA);
        return;
      }

      for (let index = 0; index < app.metaDataInvite.length; index++) {
        let field = app.metaDataInvite[index];
        let value = _.get(metaData, field.path);

        if(value !== undefined) _.set(finalMetaData, field.path, value); 

        if(field.required && value === undefined){ 
          valid = false;
          callback(null, util.INTERNAL_STATUS_CODE.INVALID_METADATA);
          return;
        }

      };

      if(!valid) return;
    } 
    this.createInvite(req, app, finalMetaData, callback);  
  }


  async createInvite(req, app, metaData, callback){ 

    let handle = req.body.handle.toLowerCase();
    let senderUserId = req.body.senderUserId;
    let _user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user); 
    let user = await _user.findOne({ appId: req.appId,  handle: handle});
    if(user){
      callback(null, util.INTERNAL_STATUS_CODE.HANDLE_ALREADY_REGISTERED);
      return;
    }

    callback(true); 

    let code = util.getRandomNumber();

    let _inviteTbl = mongoose.model(CONT.TABLE.INVITES, SCHEMA.invite); 
    let invite = await _inviteTbl.findOne({ appId: req.appId,  handle: handle, senderHandle: req.handle});
    if(invite && invite.code) code = invite.code;

    let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate);
    let tempalte = await _email.findOne({ appId: req.appId, templateName: 'invite' }); 

    let tml = tempalte.htmlTemplate.split('%CODE%').join(code);
    tml = tml.split('%HANDLE%').join(handle);
    tml = tml.split('%APP_NAME%').join(app.name);
   
    let emailData = {
      to: handle, 
      from: tempalte.replyTo,
      subject : tempalte.subject.split('%APP_NAME%').join(app.name),
      text: `Someone has invited your ${handle} account!
      Here is your register key: ${code}
      Sincerely,
      ${app.name}`,
      html: tml
    };

    
    if(app.emailExtensionAPIKey && app.emailExtension) emailService.sendAppMail(emailData, null, app);
    else emailService.send(emailData, null, app);

    if(invite && invite.code) invite.save();
    else{
      let inviteData = {
        handle: handle, 
        appId: req.appId,
        senderHandle: req.handle,
        senderUserId: senderUserId,
        status: 'pending',
        code: code, 
        metaData: metaData,
        createdAt: util.getCurrentTime(),
        updatedAt: util.getCurrentTime(),
      };
      let result = new _inviteTbl(inviteData);
      result.save();
    }
    
    
  }
  

  async verifyInvite(req, callback){

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: req.appId });
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    }

    if(!this.checkAppStatus(app, callback)) return;

    if(!app.invitationEnabled) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_ISNOT_INVITATBLE);
      return;
    }
    let handle = req.body.handle.toLowerCase();

    let _inviteTbl = mongoose.model(CONT.TABLE.INVITES, SCHEMA.invite); 
    let invite = await _inviteTbl.findOne({ appId: req.appId, handle:handle, code: parseInt(req.body.code) });
    
    if(!invite) {
      callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
      return;
    } 

    if(invite && invite.status == 'pending'){

      let data = req.body;
      data.appId = req.appId; 
      data.senderHandle = invite.senderHandle;
      data.senderUserId = invite.senderUserId;
        
      let valid = true;
      let finalMetaData = {};
      let metaData = {};
      try { 

        if(app.metaData && app.metaData.length){

          if(req.body.metaData) metaData = JSON.parse(req.body.metaData); 

          for (let index = 0; index < app.metaData.length; index++) {
            let field = app.metaData[index];
            let value = _.get(metaData, field.path);

            if(value !== undefined) _.set(finalMetaData, field.path, value); 

            if(field.required && value === undefined){ 
              valid = false;
              callback(null, util.INTERNAL_STATUS_CODE.INVALID_METADATA);
              return;
            }

          };
        }


      } catch (error) {
        callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
        return;
      } 
      
      if(!valid) return;

      if(invite.metaData) _.merge(finalMetaData, invite.metaData);

      invite.status = 'verified';
      invite.updatedAt = util.getCurrentTime();
      invite.save();

      data.metaData = finalMetaData;
      
      this.addAppUserAccount(data, app, callback);
    }
    else if(invite && invite.status == 'verified'){
      callback(null, util.INTERNAL_STATUS_CODE.HANDLE_ALREADY_REGISTERED);
    }
    else callback(null, util.INTERNAL_STATUS_CODE.INVALID_DATA);
    
  

  }




  async addAppUserAccount(data, app, callback){

    let _user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user); 
    let user = await _user.findOne({ appId: data.appId, handle:data.handle });
    if(user) {
      callback(null, util.INTERNAL_STATUS_CODE.HANDLE_ALREADY_REGISTERED); 
      return;
    } 

    let result = await this.addAppUserData(data, app);

    if(result.jwt) callback(result, null);
    else callback(null, util.INTERNAL_STATUS_CODE.INVALID_METADATA);
  
  }


  



      

}

const instance = new AppUserService()
module.exports = instance

 