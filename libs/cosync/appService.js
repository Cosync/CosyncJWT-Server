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
const nrsa = require('node-rsa');  
const util = require('../util'); 
const CONT = require('../../config/constants');
const SCHEMA = require('../../config/schema');
const LOCALES = require('../../config/locales.json'); 
const twilioService = require('./twilioService');
const appUserService = require('./appUserService'); 
let emailService = require('./emailService'); 
const hashService  = require('./hashService');
const fs = require('fs');
const DIR = 'temp';
const zipper = require('zip-local');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter; 

const appProjection = {
  __v: false,
  _id: false,
  appPrivateKey: false,
  appSecret : false
  
}; 


const userProjection = {
  __v: false, 
  password: false,
}; 



const inviteProjection = {
  __v: false, 
  password: false,
}; 


const signupProjection = {
  __v: false, 
  password: false,
}; 

 

class AppService {

  constructor() {

  } 
     

  async addApp( data, callback) { 
   
    let error = {status: 'Fails', message: `App '${data.name}' already exists.`}; 
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ name: data.name });
    
    if(app) callback(null, error); 
    else {
      let appId = util.getRandomID();
      let key = new nrsa();
      key.generateKeyPair();
      let publicKey = key.exportKey('public');
      let privateKey = key.exportKey();
      let publicKey64 = Buffer.from(publicKey).toString('base64');
      let privateKey64 = Buffer.from(privateKey).toString('base64');  

      const appToken = util.generateAppToken({appId: appId});

      let item =  {
        name: data.name, 
        appId: appId,
        appToken: appToken,
        appPublicKey: publicKey64,
        handle: 'email',
        status:'active',
        locales: ["EN"],
        invitationEnabled: true,
        signupEnabled: true, 
        metaDataEmail: true,
        jwtEnabled: data.jwtEnabled || false,
        twoFactorVerification:'none',
        createdAt: util.getCurrentTime(),
        updatedAt: util.getCurrentTime()
      }; 

      callback(item); 

      const appSecret = util.generateAppSecretToken({appId: appId});
      item.appSecret = hashService.aesEncrypt(appSecret);

      item.appPublicKey = hashService.aesEncrypt(publicKey64);
      item.appPrivateKey = hashService.aesEncrypt(privateKey64);  

      let app = new _app(item); 
      app.save();
      
      this.createAppEmailTemplate(app, "EN"); 
    }
    
  }



  async getApp( appId, callback) { 
   
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: appId }, appProjection); 

    if(app && global.__config.encryptKey){
      
      app.appPublicKey = hashService.aesDecrypt(app.appPublicKey); 

      if(app.TWILIOAccountSid) app.TWILIOAccountSid = hashService.aesDecrypt(app.TWILIOAccountSid);
      if(app.TWILIOToken) app.TWILIOToken = hashService.aesDecrypt(app.TWILIOToken);
      if(app.TWILIOPhoneNumber) app.TWILIOPhoneNumber = hashService.aesDecrypt(app.TWILIOPhoneNumber);
    }

    callback(app);
  }

  async getApps(callback) {

    let _apps = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
  
    let apps = await _apps.find({},  appProjection); 

    let results = [];
    if(global.__config.encryptKey){

      for (let index = 0; index < apps.length; index++) {
        let app = apps[index];
        app.appPublicKey = hashService.aesDecrypt(apps[index].appPublicKey);

        if(app.TWILIOAccountSid) app.TWILIOAccountSid = hashService.aesDecrypt(apps[index].TWILIOAccountSid);
        if(app.TWILIOToken) app.TWILIOToken = hashService.aesDecrypt(apps[index].TWILIOToken);
        if(app.TWILIOPhoneNumber) app.TWILIOPhoneNumber = hashService.aesDecrypt(apps[index].TWILIOPhoneNumber); 
         
        results.push(app);
      }
      
    }
    else results = apps;

    callback(results); 
  }


  async getUserApplication(appId, callback) { 
 

    const appProjection2 = {
      __v: false,
      _id: false,
      appId: false,
      appToken:false,
      appSecret:false,
      appPrivateKey: false,
      appPublicKey: false,
      TWILIOAccountSid: false,
      TWILIOToken: false,
      TWILIOPhoneNumber: false,
      developerUid: false,
      type: false
    }; 

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.find({ appId: appId }, appProjection2);
    if(app && app[0]) callback(app[0]);
    else callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
  }





  async search(params, callback) {

    let _apps = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let apps;
    let results = [];

    if(params.name){
      if(params.case == "true") apps = await _apps.find({name: params.name}, appProjection).sort({createdAt: 'desc'}); 
      else apps = await _apps.find( { "name" : { $regex : new RegExp(params.name, "i") } }, appProjection).sort({createdAt: 'desc'});
    }
    else apps = await _apps.find({}, appProjection).sort({createdAt: 'desc'}); 
     
    if(apps.length){
      
      if(global.__config.encryptKey){
       
        for (let index = 0; index < apps.length; index++) {
          let app = apps[index];
          app.appPublicKey = hashService.aesDecrypt(apps[index].appPublicKey);

          if(app.TWILIOAccountSid) app.TWILIOAccountSid = hashService.aesDecrypt(apps[index].TWILIOAccountSid);
          if(app.TWILIOToken) app.TWILIOToken = hashService.aesDecrypt(apps[index].TWILIOToken);
          if(app.TWILIOPhoneNumber) app.TWILIOPhoneNumber = hashService.aesDecrypt(apps[index].TWILIOPhoneNumber); 
          
          results.push(app);
        }

      }
      else results = apps;
    }


    callback(results); 
  }


  async deleteApp( appId, callback) { 
    
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);  
    let app = await _app.deleteOne({ appId: appId});  
    if(app.deletedCount){
      this.deleteAppData(appId); 
      callback(true);
    } 
    else callback(false);
  }


  async deleteAppData(id) { 

    let _user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    _user.deleteMany({ "appId": id }, function (err) {});

    let _invite = mongoose.model(CONT.TABLE.INVITES, SCHEMA.invite);
    _invite.deleteMany({ "appId": id }, function (err) {});

    let _signup = mongoose.model(CONT.TABLE.SIGNUPS, SCHEMA.signup);
    _signup.deleteMany({ "appId": id }, function (err) {});  

    
    let _password = mongoose.model(CONT.TABLE.RESET_PASSWORDS, SCHEMA.resetPassword);
    _password.deleteMany({ "appId": id }, function (err) {}); 

    let _logs = mongoose.model(CONT.TABLE.APP_LOGS, SCHEMA.applicationLogs);
    _logs.deleteMany({ "appId": id }, function (err) {});  
    
    let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate);
    _email.deleteMany({ "appId": id }, function (err) {});
   

  }

  async deleteMetadata(data, callback) { 
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
     
    let app = await _app.findOne({ appId: data.appId });
    if(!app) callback(null, `App ID '${data.appId}' is not found.`); 
    else{

      let metaData = app[data.type]; 

      if(metaData && metaData.length > 0 && metaData.length >= parseInt(data.index)){ 
        metaData.splice(parseInt(data.index), 1);
        app[data.type] = metaData;
        app.updatedAt = util.getCurrentTime();
        app.save(); 
        callback(app); 
      }
      else{
        callback(null, `App doesn't have ${data.type} at index ${data.index}.`);
      }
    }
}
   
  async updateApp(data, callback) { 
   
      let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
      let app;
      if(data.name) {
        app = await _app.findOne({ name: data.name});
        if(app){
          callback(null, `App '${data.name}' already exists.`);
          return;
        }  
      } 
      

      app = await _app.findOne({ appId: data.appId });
      if(!app) callback(null, `App ID '${data.appId}' is not found.`); 
      else{

        let validKey = true;
        for (const key in data) {

          if (key != 'appId' && data[key]){

            if(key == 'signupEnabled') data[key] = data[key] == 'true' ? true : false;

            else if(key == 'invitationEnabled') data[key] = data[key] == 'true' ? true : false;

            else if(key == 'userJWTExpiration') data[key] = parseInt( data[key]);

            else if(key == 'passwordFilter')  data[key] = data[key] == 'true' ? true : false;

            else if(key == 'passwordMinLength') data[key] = parseInt( data[key]);
            else if(key == 'passwordMinUpper') data[key] = parseInt( data[key]);
            else if(key == 'passwordMinLower') data[key] = parseInt( data[key]);
            else if(key == 'passwordMinDigit') data[key] = parseInt( data[key]);
            else if(key == 'passwordMinSpecial') data[key] = parseInt( data[key]);
            
            else if(key == 'metaDataEmail') data[key] = data[key] == 'true' ? true : false;


            if(key == 'metaData' || key == 'metaDataInvite'){
              let metadata = JSON.parse(data[key]); 
              app[key].forEach(item => {
                metadata.forEach(element => {
                  if(item.path == element.path){
                    callback(null, `Duplicate metadata path '${element.path}'.`);
                    validKey = false; 
                    return;
                  }
                });
                
              });
              if(app[key] && app[key].length) app[key] = app[key].concat(metadata);
              else app[key] = metadata;
            }  
            else app[key] = data[key];
          } 
        }
        
        if(validKey){
          app.updatedAt = util.getCurrentTime();
          app.save(); 
          callback(app); 
        }
        
      } 
  }
 


  async getCosyncVersions(callback) {
    let _version = mongoose.model(CONT.TABLE.VERSIONS, SCHEMA.version);
    let versions = await _version.find({}).sort({createdAt: 'desc'});
    callback(versions);
  }


  async addRemoveAppLocaleEmailTemplate(data, callback){ 
    let error = {status: 'fails', message: 'Invalid Data'};
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: data.appId });
    
    if(!app){
      callback(null, error); 
      return;
    } 

    app.locales = app.locales || ["EN"];
    let validLocales = [];

    for (let index = 0; index < data.locales.length; index++) {
      let locale = data.locales[index]; 
      locale = locale.toUpperCase();

      const found = app.locales.find((element) => element === locale);
      
      const valid = LOCALES.list.find((element) => element.code === locale);

      if (valid) validLocales.push(locale);

      if(!found && locale != "EN" && valid){
        this.createAppEmailTemplate(app, locale)
      }
    }

   
    for (let index = 0; index < app.locales.length; index++) {
      const oldLocale = app.locales[index]; 
      const found = data.locales.find((element) => element === oldLocale);
      if(!found && oldLocale != "EN"){
        this.removeAppEmailTemplate(app, oldLocale)
      }
    }

    app.updatedAt = util.getCurrentTime();
    app.locales = validLocales;

    const found = app.locales.find((element) => element === "EN");
    if (!found) app.locales.unshift("EN");

    app.save().then(res => { 
      this.emailTemplates(data, callback)  
    });
   
  }

  removeAppEmailTemplate(app, locale){
    if (locale == "EN" || locale == "") return;

    let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate); 
    _email.deleteMany({ "appId": app.appId, "locale": locale }, function (err) {});
    
  }


  async createAppEmailTemplate(app, locale){

    locale = locale ? locale : "EN";
    let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate);
    
    let email = await _email.findOne({ appId: app.appId, locale : locale });
    if (email) return;

    let signUp = {
      appId: app.appId,
      templateName: 'signUp',
      subject: "Verify your email for %APP_NAME%",
      replyTo:'',
      locale:locale,
      htmlTemplate:"<p>Hello %HANDLE%,</p>\n<p>Please verify your email address: </p>\n<p><b>%CODE%</b></p>\n<p>If you didn’t ask to verify this address, you can ignore this email.</p>\n<p>Thanks,</p>\n<p>Your %APP_NAME% team</p>"
    }

    let template = new _email(signUp); 
    template.save();

    let signUpLink = {
      appId: app.appId,
      templateName: 'signUpLink',
      subject: "Verify your account for %APP_NAME%",
      replyTo:'',
      locale:locale,
      localeLinkText:"LINK",
      htmlTemplate:"<p>Hello %HANDLE%,</p>\n<p>Please verify your email address: </p>\n<p>Please click this <b>%LINK%</b> to verify your sign up.</p>\n<p>If you didn’t ask to verify this address, you can ignore this email.</p>\n<p>Thanks,</p>\n<p>Your %APP_NAME% team</p>"
    } 

    template = new _email(signUpLink); 
    template.save(); 


    let clickThrough = {
      appId: app.appId,
      templateName: 'clickThrough',
      subject: "clickThrough",
      replyTo:'',
      locale:locale,
      htmlTemplate:"<p>Hello %HANDLE%,</p>\n<p>You have successfully signed up.</p>\n<p><b>Please login to %APP_NAME% Application</b></p>\n<p>Thanks,</p>\n<p>Your %APP_NAME% team</p>"
    } 

    template = new _email(clickThrough); 
    template.save(); 

    let resetPassword = {
      appId: app.appId,
      templateName: 'resetPassword',
      subject: "Reset your password for %APP_NAME%",
      replyTo:'',
      locale:locale,
      htmlTemplate:"<p>Hello %HANDLE%,</p>\n<p>Here is your code to reset your %APP_NAME% password for your %HANDLE% account.</p>\n<p><b>%CODE%</b></p>\n<p>If you didn’t ask to reset your password, you can ignore this email.</p>\n<p>Thanks,</p>\n<p>Your %APP_NAME% team</p>"
    } 

    template = new _email(resetPassword); 
    template.save(); 

    let invite = {
      appId: app.appId,
      templateName: 'invite',
      subject: "Account invitation for %APP_NAME%",
      replyTo:'',
      locale:locale,
      htmlTemplate:"<p>Hello %HANDLE%,</p>\n<p>Someone has invited your %HANDLE%!.</p>\n<p>Here is your register key: <b>%CODE%</b></p>\n<p> If you don't recognize the %APP_NAME% account, you can ignore this email.</p>\n<p>Thanks,</p>\n<p>Your %APP_NAME% team</p>"
    } 

    template = new _email(invite); 
    template.save();


    let qrCode = {
      appId: app.appId,
      templateName: 'qrCode',
      subject: "QR Code for login two step verification of %APP_NAME%",
      replyTo:'',
      locale:locale,
      htmlTemplate:"<p>Hello %HANDLE%,</p>\n<p>You have asked for Two Factor Login Verification QR Code for %HANDLE%!.</p>\n<p>Plase scan the QR code or enter the secret key in Google Authenticator</p>\n<p>Here is your secret key: <b>%CODE%</b></p>\n<p> If you don't recognize the %APP_NAME% account, you can ignore this email.</p>\n<p>Thanks,</p>\n<p>Your %APP_NAME% team</p>"
    } 

    template = new _email(qrCode); 
    template.save();

    let sms = {
      appId: app.appId,
      templateName: 'sms',
      subject: "SMS for login two step verification of %APP_NAME%",
      replyTo:'',
      locale:locale,
      htmlTemplate:"%CODE% is your verification code for %APP_NAME%."
    } 

    template = new _email(sms); 
    template.save();

    let signUpSuccess = {
      appId: app.appId,
      templateName: 'signUpSuccess',
      subject: "Welcome to %APP_NAME%",
      replyTo:'',
      locale:locale,
      htmlTemplate:"You have successfully signup for your account %HANDLE%."
    } 

    template = new _email(signUpSuccess); 
    template.save();

  }



  async updateAppSetting(req, callback){
    let error = {status: 'Fails', message: 'Invalid Data'};
     
    let data = req.body;

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: data.appId });

    if(!app ) {
      callback(null, error); 
      return;
    } 
    let that = this; 

      switch (data.setting) {

        case 'status':
          
          app.status = data.status;
          app.updatedAt = util.getCurrentTime();
          app.save(); 
          delete app.appPrivateKey;
          delete app.appSecret;
          callback(app);  
           

        break;
 
      
        case 'invite':
           
          if(app.invitationEnabled == data.invitationEnabled || typeof(data.invitationEnabled) != "boolean"){
            callback(null, error);
            return;
          } 
 

          app.invitationEnabled = data.invitationEnabled;
          app.updatedAt = util.getCurrentTime();
          app.save(); 
          delete app.appPrivateKey;
          delete app.appSecret;
          callback(app); 

          break;

        case 'jwtEnabled':

          if(app.jwtEnabled == data.jwtEnabled || typeof(data.jwtEnabled) != "boolean"){
            callback(null, error);
            return;
          } 
 

          app.jwtEnabled = data.jwtEnabled;
          app.updatedAt = util.getCurrentTime();
          app.save(); 
          delete app.appPrivateKey;
          delete app.appSecret;
          callback(app); 

          break;

        case 'userNamesEnabled': 

          if(app.userNamesEnabled == data.userNamesEnabled || typeof(data.userNamesEnabled) != "boolean"){
            callback(null, error);
            return;
          } 
 

          app.userNamesEnabled = data.userNamesEnabled;
          app.updatedAt = util.getCurrentTime();
          app.save(); 
          delete app.appPrivateKey;
          delete app.appSecret;
          callback(app); 

          break;
        case 'anonLogin':
           
            if(app.anonymousLoginEnabled == data.anonymousLoginEnabled || typeof(data.anonymousLoginEnabled) != "boolean"){
              callback(null, error);
              return;
            } 

            app.anonymousLoginEnabled = data.anonymousLoginEnabled;
            app.updatedAt = util.getCurrentTime();
            app.save(); 
            delete app.appPrivateKey;
            delete app.appSecret;
            callback(app); 
  
            break;

        case 'signup':
           
            if(app.signupEnabled == data.signupEnabled || typeof(data.signupEnabled) != "boolean"){
              callback(null, error);
              return;
            } 
 

            app.signupEnabled = data.signupEnabled;
            app.updatedAt = util.getCurrentTime();
            app.save(); 
            delete app.appPrivateKey;
            delete app.appSecret;
            callback(app); 
  
            break;
          case 'signupFlow':
           
              if(app.signupFlow == data.signupFlow || (data.signupFlow != 'code' && data.signupFlow != 'link' && data.signupFlow != 'none')){
                callback(null, error);
                return;
              } 
   
              app.signupFlow = data.signupFlow;
              app.updatedAt = util.getCurrentTime();
              app.save(); 
              delete app.appPrivateKey;
              delete app.appSecret;
              callback(app); 
    
              break; 

        case 'twoFactorVerification': 

          if(data.twoFactorVerification == 'phone'){
            if(!data.TWILIOAccountSid || !data.TWILIOToken || !data.TWILIOPhoneNumber){
              error.message = "Invalid Twilio Account.";
              callback(null, error);
              return;
            } 

            app.TWILIOAccountSid = hashService.aesEncrypt(data.TWILIOAccountSid); 
            app.TWILIOToken = hashService.aesEncrypt(data.TWILIOToken);
            app.TWILIOPhoneNumber = hashService.aesEncrypt(data.TWILIOPhoneNumber);
           
          }  
          else if(data.twoFactorVerification == 'google' && data.googleAPP_NAME) app.googleAPP_NAME = data.googleAPP_NAME;
 


          app.twoFactorVerification = data.twoFactorVerification; 
          app.updatedAt = util.getCurrentTime();
          app.save(); 
          delete app.appPrivateKey;
          delete app.appSecret;
          callback(app); 

          break;

        case 'maxUsers':
           
          if(app.maxUsers == parseInt(data.maxUsers)){
            callback(null, error);
            return;
          } 

          if(!sub.developerPlanId){
            callback(null, error);
            return;
          }
 

          app.maxUsers = parseInt(data.maxUsers); 
          app.updatedAt = util.getCurrentTime();
          app.save(); 
          delete app.appPrivateKey;
          delete app.appSecret;
          callback(app); 

          break;

        case 'maxLoginAttempts':
           
          if(app.maxLoginAttempts == data.maxLoginAttempts){
            callback(null, error);
            return;
          }  

          app.maxLoginAttempts = data.maxLoginAttempts; 
          app.updatedAt = util.getCurrentTime();
          app.save(); 
          delete app.appPrivateKey;
          delete app.appSecret;
          callback(app); 

          break; 

        case 'realmAppId':
           
            if(app.realmAppId == data.realmAppId){
              callback(null, error);
              return;
            } 
   
  
            app.realmAppId = data.realmAppId; 
            app.updatedAt = util.getCurrentTime();
            app.save(); 
            delete app.appPrivateKey;
            delete app.appSecret;
            callback(app); 
  
            break; 
          case 'userJWTExpiration':
           
              if(app.userJWTExpiration == data.userJWTExpiration){
                callback(null, error);
                return;
              }  
    
              app.userJWTExpiration = data.userJWTExpiration; 
              app.updatedAt = util.getCurrentTime();
              app.save(); 
              delete app.appPrivateKey;
              delete app.appSecret;
              callback(app); 
    
              break;

        case 'passwordFilter':
         

          app.passwordFilter = data.passwordFilter; 
          app.updatedAt = util.getCurrentTime();
          app.save(); 
          delete app.appPrivateKey;
          delete app.appSecret;
          callback(app); 

          break; 

        case 'passwordSetting': 

          app.passwordMinLength = data.passwordMinLength; 
          app.passwordMinUpper = data.passwordMinUpper; 
          app.passwordMinLower = data.passwordMinLower; 
          app.passwordMinDigit = data.passwordMinDigit; 
          app.passwordMinSpecial = data.passwordMinSpecial; 

          app.updatedAt = util.getCurrentTime();
          app.save(); 
          delete app.appPrivateKey;
          delete app.appSecret;
          callback(app); 

          break; 

        case 'metaDataEmail':
         

          app.metaDataEmail = data.metaDataEmail; 
          app.updatedAt = util.getCurrentTime();
          app.save(); 
          delete app.appPrivateKey;
          delete app.appSecret;
          callback(app); 

          break; 
          case 'emailExtension':
         
            app.emailExtension = data.emailExtension; 
            app.updatedAt = util.getCurrentTime();
            app.save(); 
            delete app.appPrivateKey;
            delete app.appSecret;
            callback(app);  
  
  
            break; 
          case 'emailExtensionAPIKey':
           
            let encryptedKey = hashService.aesEncrypt(data.emailExtensionAPIKey); 
             
            app.emailExtensionAPIKey = encryptedKey;
            app.emailExtensionSenderEmail= data.emailExtensionSenderEmail;
            app.updatedAt = util.getCurrentTime();
            app.save(); 
            delete app.appPrivateKey;
            delete app.appSecret;
            callback(app);  
   
  
            break; 
          case 'appleLogin':
           
            if(app.appleLoginEnabled == data.appleLoginEnabled || typeof(data.appleLoginEnabled) != "boolean"){
             
              error.appleLoginEnabled = data.appleLoginEnabled;
              callback(null, error);
             
              return;
            } 

            app.appleLoginEnabled = data.appleLoginEnabled;
            app.updatedAt = util.getCurrentTime();
            app.save(); 
            delete app.appPrivateKey;
            delete app.appSecret;
            callback(app);  

            break;

        case 'appleBundleId':
           
            if(app.appleLoginEnabled && !data.appleBundleId || data.appleBundleId == ""){ 
              callback(null, error);
              return;
            } 

            app.appleBundleId = data.appleBundleId;
            app.updatedAt = util.getCurrentTime();
            app.save(); 
            delete app.appPrivateKey;
            delete app.appSecret;
            callback(app);  

            break;
        case 'googleLogin':
           
            if(app.googleLoginEnabled == data.googleLoginEnabled || typeof(data.googleLoginEnabled) != "boolean"){
             
              error.googleLoginEnabled = data.googleLoginEnabled;
              callback(null, error);
             
              return;
            } 

            app.googleLoginEnabled = data.googleLoginEnabled;
            app.updatedAt = util.getCurrentTime();
            app.save(); 
            delete app.appPrivateKey;
            delete app.appSecret;
            callback(app);  

            break;

        case 'googleClientId':
           
            if(app.googleLoginEnabled && !data.googleClientId || data.googleClientId == ""){ 
              callback(null, error);
              return;
            } 

            app.googleClientId = data.googleClientId;
            app.updatedAt = util.getCurrentTime();
            app.save(); 
            delete app.appPrivateKey;
            delete app.appSecret;
            callback(app);  

            break;
        default:
          callback(null, error);
        break;
      } 
    
  }



  async testEmailExtension(req, callback){ 
   
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: req.body.appId});

    if(!app ) {
      callback(null, error); 
      return;
    } 

    emailService.testExtensionService(app).then(result => { 
      callback(true); 
    })
    .catch(err => { 
      callback(null, err); 
    })
      
     
  }

  async testAppTwilio(req, callback){
    let error = {status: 'Fails', message: 'Invalid Data'};
     
    let data = req.body;
    
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: data.appId});

    if(!app) {
      callback(null, error); 
      return;
    } 
     
    twilioService.sendSMS(data, app, callback);


  }


  async addUser( data, callback) {
     

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: data.appId });
    
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    } 
    if(app.status != 'active') {
      callback(null, util.INTERNAL_STATUS_CODE.APP_IS_SUSPENDED);
      return;
    }  
    
    let _user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let user = await _user.findOne({ appId: data.appId, handle: data.handle });
    if (user) {
      let errorData = {status: 'Fails', message: 'User already registerred.'};
      callback(null, errorData);
      return; 
    }
  
    let hashedPassword = await hashService.generateHash(data.password);
    let item = {
      handle: data.handle,
      password: hashedPassword,
      appId: data.appId, 
      status: 'active',
      createdAt: util.getCurrentTime(),
      updatedAt: util.getCurrentTime()
    }; 

    
    user = new _user(item); 
    user.save();
    this.createSignup(item);

    callback(user);
  
     
  }


  async searchUser(data, callback) {  

    let _user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);

    let query = {
      appId: data.appId,
      $or : [ { handle: { $regex: '.*' + data.value + '.*' } },
              { userName: { $regex: '.*' + data.value + '.*' } }
            ]
    };

    if (data.hideAnonUser == "true"){
      query = {
        appId: data.appId,
        handle: { $not: { $regex: "^ANON_.*" }},
        $or : [ { handle: { $regex: '.*' + data.value + '.*' } },
                { userName: { $regex: '.*' + data.value + '.*' } }
              ]
      }
    }

    let users = await _user.find(query, userProjection).sort({handle: 'asc'});  
    callback(users);
  }




  async searchSignUp(data, callback) {  

    let model = mongoose.model(CONT.TABLE.SIGNUPS, SCHEMA.signup);
    let item = await model.find({appId: data.appId, handle:{ $regex: '.*' + data.value + '.*' }}, signupProjection).sort({handle: 'asc'});  
    callback(item);
  }



  async removeAppSignup(req, data, callback) {

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: data.appId });
    
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    } 
    if(app.status != 'active') {
      callback(null, util.INTERNAL_STATUS_CODE.APP_IS_SUSPENDED);
      return;
    } 


    let _signup = mongoose.model(CONT.TABLE.SIGNUPS, SCHEMA.signup); 
    _signup.findOneAndRemove({appId: data.appId, handle:data.handle}, function(err, res) {
      callback(res, err);
    }); 
      
    
  }

  
  async removeAppInvite(req, data, callback) {

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: data.appId });
    
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    } 
    if(app.status != 'active') {
      callback(null, util.INTERNAL_STATUS_CODE.APP_IS_SUSPENDED);
      return;
    } 


    let _invite = mongoose.model(CONT.TABLE.INVITES, SCHEMA.invite); 
    _invite.findOneAndRemove({appId: data.appId, handle:data.handle}, function(err, res) {
      callback(res, err);
    }); 
    
    
  }

  async createAppInvite(req, data, callback) { 
    
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let app = await _app.findOne({ appId: data.appId });
    
    if(!app) {
      callback(null, util.INTERNAL_STATUS_CODE.APP_NOT_FOUND);
      return;
    } 
    if(app.status != 'active') {
      callback(null, util.INTERNAL_STATUS_CODE.APP_IS_SUSPENDED);
      return;
    }  
    
    let _user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let user = await _user.findOne({ appId: data.appId, handle: data.handle });
    if (user) {
      callback(null, {message:"Handle already registerred."});
      return; 
    }
    req.appId = app.appId;
    req.body.senderUserId = 'superuser';
    appUserService.createInvite(req, app, {}, function(data){
      callback(data);
    });
    
    
    
  }

 

  async searchInvite(data, callback) {  

    let model = mongoose.model(CONT.TABLE.INVITES, SCHEMA.invite);
    let item = await model.find({appId: data.appId, handle:{ $regex: '.*' + data.value + '.*' }}, inviteProjection).sort({handle: 'asc'});  
    callback(item);
  }




  async removeUser(data, callback) {  

    let _user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    _user.findOneAndRemove({appId: data.appId, handle:data.handle}, function(err, res) {
      callback(res, err);
      if(res){
        let app = {
          appId: data.appId 
        };
        
      }  
    });

    let _signup = mongoose.model(CONT.TABLE.SIGNUPS, SCHEMA.signup);
    _signup.findOneAndRemove({appId: data.appId, handle:data.handle}, function(err, res) {
       
    });

    let _invite = mongoose.model(CONT.TABLE.INVITES, SCHEMA.invite);
    _invite.findOneAndRemove({appId: data.appId, handle:data.handle}, function(err, res) {
       
    });
    
  }




  createSignup(data){

    let metaData = {}; 
    if(data.metaData) metaData = JSON.parse(data.metaData); 
     
    let item = {
      handle: data.handle, 
      password: data.password, // already hashed
      appId: data.appId,
      metaData:metaData,
      status: 'active',
      code: 0,
      createdAt: util.getCurrentTime(),
      updatedAt: util.getCurrentTime(),
    };

    let _signupTbl = mongoose.model(CONT.TABLE.SIGNUPS, SCHEMA.signup); 
    let signupUser = new _signupTbl(item);
    signupUser.save();
  }


  async getAppLogs(params, callback) {  
    let appLogData = {};
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    var app = await _app.findOne({ appId: params.appId }); 
    if (!app) {
      callback(null);
      return; 
    } 

    let offset = params.offset ? parseInt(params.offset) : 0;
    offset = offset >= 0 ? offset : 0;
    
    let limit = params.limit ? parseInt(params.limit) : 25;
    limit = limit >= 25 ? limit : 25;

    offset = offset * limit;

    let query = {appId: params.appId};

    if(params.type && params.type != "all") query.logType = params.type;
    if(params.status && params.status != "all") query.status = params.status;

    let fromDate, toDate;

    if(params.fromDate != undefined && params.fromDate != ""  && params.toDate != undefined && params.toDate != ""){

      fromDate =  new Date(params.fromDate).toUTCString();
      toDate =  new Date(params.toDate).toUTCString();
      if(fromDate && toDate){ 
        query.createdAt = {
          $gte: fromDate,
          $lt: toDate
        }
      }

      if(toDate){
        query.createdAt = { 
          $lt: toDate
        }
      }

      if(fromDate){
        query.createdAt = {
          $gte: fromDate 
        }
      }


    }  
    else if(params.toDate ){
      toDate =  new Date(params.toDate).toUTCString();
      if(toDate){
        query.createdAt = { 
          $lt: toDate
        }
      }
      

    }
    else if(params.fromDate ){
      fromDate =  new Date(params.fromDate).toUTCString();
      if(fromDate){
        query.createdAt = {
          $gte: fromDate 
        }
      }
     
    }

    if(params.filterAction){ 
      let orQuery = []  
       
      if(params.filterAction != "all"){
        let filterAction = params.filterAction.split(",");  
        orQuery = [{action:{ $in: filterAction }}];

      }
        
      if(orQuery.length) query.$or = orQuery; 
       
    }
    

    let _logs = mongoose.model(CONT.TABLE.APP_LOGS, SCHEMA.applicationLogs);
    let logs = await _logs.find(query).sort({createdAt: 'desc'}).skip(offset).limit(limit);
    appLogData.totalLog = await this.countTable(_logs, query);
    appLogData.logs = logs;

    callback(appLogData);

  }



  async getAppStat(params, callback) { 

    let appData = {}; 
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    var app = await _app.findOne({ appId: params.appId });
    if (!app || app.status != "active") {
      callback(null);
      return; 
    }
    

    let offset = params.offset ? parseInt(params.offset) : 0;
    offset = offset >= 0 ? offset : 0;
    
    let limit = params.limit ? parseInt(params.limit) : 25;
    limit = limit >= 25 ? limit : 25;

    offset = offset * limit;

    if(params.target){

      if(params.target == CONT.TABLE.USERS){ 
        let _user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
        let query = {appId: params.appId};
        if (params.hideAnonUser == "true") query = {appId: params.appId, handle: {  $not: { $regex: "^ANON_.*" } }};

        appData.users = await _user.find(query, userProjection).sort({createdAt: 'desc'}).skip(offset).limit(limit);
        appData.totalUser = await this.countTable(_user, query);
        appData.totalAnonUser = await this.countTable(_user, {appId: params.appId, handle: {  $regex: "^ANON_.*"  }});
      }
      else if(params.target == CONT.TABLE.INVITES){ 
        let _invite = mongoose.model(CONT.TABLE.INVITES, SCHEMA.invite);
        appData.invites = await _invite.find({appId: params.appId}, inviteProjection).sort({createdAt: 'desc'}).skip(offset).limit(limit);
        appData.totalInvite = await this.countTable(_invite, {appId: params.appId}); 
      }
      else if(params.target == CONT.TABLE.SIGNUPS){ 
        let _signup = mongoose.model(CONT.TABLE.SIGNUPS, SCHEMA.signup);
        appData.signups = await _signup.find({appId: params.appId}, signupProjection).sort({createdAt: 'desc'}).skip(offset).limit(limit);
        appData.totalSignup = await this.countTable(_signup, {appId: params.appId}); 
      }

    }
    else{ 
      let _user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
      let query = {appId: params.appId};
      if (params.hideAnonUser == "true") query = {appId: params.appId, handle: {  $not: { $regex: "^ANON_.*" } }};
      appData.users = await _user.find(query, userProjection).sort({createdAt: 'desc'}).limit(limit);
      appData.totalUser = await this.countTable(_user, query);
      appData.totalAnonUser = await this.countTable(_user, {appId: params.appId, handle: {  $regex: "^ANON_.*"  }});

      let _invite = mongoose.model(CONT.TABLE.INVITES, SCHEMA.invite);
      appData.invites = await _invite.find({appId: params.appId}, inviteProjection).sort({createdAt: 'desc'}).limit(limit);
      appData.totalInvite = await this.countTable(_invite, {appId: params.appId}); 

      let _signup = mongoose.model(CONT.TABLE.SIGNUPS, SCHEMA.signup);
      appData.signups = await _signup.find({appId: params.appId}, signupProjection).sort({createdAt: 'desc'}).limit(limit);
      appData.totalSignup = await this.countTable(_signup, {appId: params.appId}); 

      
       
    }

    callback(appData);
  }


  countTable(collection, query){
    return new Promise((resolve, reject) => {
      collection.countDocuments(query, function(err, count){
        resolve(count);
      });
    });
  }


  async updateEmailTemplate(req, callback){
    let template = req.body;
    template.htmlTemplate = template.htmlTemplate.split('</p><p>').join('</p>\n<p>');
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    var app = await _app.findOne({ appId: template.appId });
    if (!app || app.status != "active" ) {
      callback(null);
      return; 
    }

    let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate);
    let emailTemplate = await _email.findOne({_id: template._id});
    if(emailTemplate){
      emailTemplate.replyTo = template.replyTo;
      emailTemplate.subject = template.subject;
      emailTemplate.htmlTemplate = template.htmlTemplate;

      if (template.localeLinkText){
        emailTemplate.localeLinkText = template.localeLinkText;
      }

      emailTemplate.updatedAt = util.getCurrentTime();
      emailTemplate.save();
    } 

    callback(emailTemplate)
  }

  async emailTemplates(params, callback) { 

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    var app = await _app.findOne({ appId: params.appId });
    if (!app || app.status != "active") {
      callback(null);
      return; 
    }

    let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate);
    let emailTemplates = await _email.find({appId: params.appId}); 
    let data = {
      "EN" : []
    };

    if (app.locales.length > 0){

      for (let index = 0; index < app.locales.length; index++) {
        const locale = app.locales[index];
        data[locale] = [];

        emailTemplates.forEach(element => {
          if (element.locale.toLowerCase() == locale.toLowerCase()){
            data[locale].push(element);
          }
        });

      }
    } 
 
    callback(data)
  }


  async updateAppMetaData(req, callback){

    let error = {status: 'Fails', message: 'Invalid Data'};
    
    let data = req.body;
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: data.appId });

    if(!app ) {
      callback(null, error); 
      return;
    }   

    let metaData = [];

    data.metaData.forEach(item => {
      metaData.push({
        id: item.id,
        path: item.path,
        required: item.required || false,
        fieldName: item.fieldName,
        canEdit: item.canEdit || false
      });
    });
    
    app.metaData = metaData;
    app.updatedAt = util.getCurrentTime();
    app.save();

    delete app.appPrivateKey;
    delete app.appSecret;
    callback(app);  
    
    
  }



  async updateAppInviteMetaData(req, callback){

    let error = {status: 'Fails', message: 'Invalid Data'}; 
    let data = req.body;
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: data.appId});

    if(!app ) {
      callback(null, error); 
      return;
    }  

    let metaDataInvite = [];

    data.metaDataInvite.forEach(item => {
      metaDataInvite.push({
        id: item.id,
        path: item.path,
        required: item.required || false,
        fieldName: item.fieldName
      });
    });
    
    app.metaDataInvite = metaDataInvite; 
    app.updatedAt = util.getCurrentTime();
    app.save();

    delete app.appPrivateKey;
    delete app.appSecret;
    callback(app);  

    
  }


  async resetApp(data, callback) {
    let appId = data.appId;

    let error = {status: 'fails', message: 'Invalid Data'}; 

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: appId});
  
    if(app){
      this.deleteAppData(appId, app, 'reset');
      callback(true);
    } 
    else callback(null, error); 
  

  }


  readCSVFile(path, appId){
    return new Promise((resolve, reject) => {
      let result = [];
      fs.createReadStream(path)
        .pipe(csv())
        .on('data', (data) => {
          if(data.appId) data.appId = appId; 
          result.push(data)
        })
        .on('end', () => { 
          resolve(result);
        });
    });
  }


  async createImportedApp(data, _app){

    return new Promise((resolve, reject) => { 

      let tempApp = data.tempApp;
      let importedApp = data.app; 
      importedApp.appId = tempApp.appId;
      importedApp.name = tempApp.name;
      importedApp.appToken = tempApp.appToken;
      
      importedApp.createdAt = tempApp.createdAt;
      importedApp.updatedAt = tempApp.updatedAt;
      importedApp.appData = {};
      
      if(importedApp.metaData && importedApp.metaData.length > 0){

      }
      else importedApp.metaData = []
      
      importedApp.appSecret = hashService.aesEncrypt(tempApp.appSecret);
      importedApp.appPublicKey = hashService.aesEncrypt(data.app.appPublicKey);
      importedApp.appPrivateKey = hashService.aesEncrypt(data.app.appPrivateKey);  

      if(importedApp.TWILIOAccountSid) importedApp.TWILIOAccountSid = hashService.aesEncrypt(importedApp.TWILIOAccountSid);
      if(importedApp.TWILIOToken) importedApp.TWILIOToken = hashService.aesEncrypt(importedApp.TWILIOToken);
      if(importedApp.TWILIOPhoneNumber) importedApp.TWILIOPhoneNumber = hashService.aesEncrypt(importedApp.TWILIOPhoneNumber);
      if(importedApp.emailExtensionAPIKey) importedApp.emailExtensionAPIKey = hashService.aesEncrypt(importedApp.emailExtensionAPIKey);


      _app.create(importedApp, function(error, doc){

        if(error) resolve({status: 'fails', message:'Database error for invalid table: ' + error.message });
        else resolve(doc);
      });
       
    });
   

  }



  async createTempoApp(data){

    return new Promise((resolve, reject) => {

      let appId = util.getRandomID();
      let key = new nrsa();
      key.generateKeyPair();
      let publicKey = key.exportKey('public');
      let privateKey = key.exportKey();
      let publicKey64 = Buffer.from(publicKey).toString('base64');
      let privateKey64 = Buffer.from(privateKey).toString('base64');  

      const appToken = util.generateAppToken({appId: appId}); 
      const appSecret =  util.generateAppSecretToken({appId: appId});

      let item =  {
        name: data.appName, 
        appId: appId,
        appToken: appToken,
        appSecret: appSecret, 
        appPublicKey: publicKey64, 
        appPrivateKey: privateKey64,
        handle: 'email',
        status:'active',
        invitationEnabled: true,
        signupEnabled: true, 
        metaDataEmail: true,
        jwtEnabled: true,
        twoFactorVerification:'none',
        createdAt: util.getCurrentTime(),
        updatedAt: util.getCurrentTime()
      };  
      resolve(item); 
    });
   

  }


  async importDatabase(req, res, callback){ 

    let that = this;
    let data = req.body;
    let file = req.file;  

    let error = {status: 'fails', message: 'Invalid Data'}; 

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ name: data.appName}); 
    if(app){
      error.message = `App '${data.appName}' already exists.`;
      callback(error); 
      return;
    }

    let tempApp = await this.createTempoApp(data);

    let location = `./${DIR}/${tempApp.appId}`; 
    let appId = tempApp.appId; 

    let appData = {
      app: {},
      users: [],
      signups: [],
      invites : [],
      emails: [],
      tempApp: tempApp
    };

    if (!fs.existsSync(location)){
      fs.mkdirSync(location);
    }
 
    let path = `./${location}/${file.originalname}`;
    let writeStream = fs.createWriteStream(path);
    writeStream.write(file.buffer, 'base64');
   
    writeStream.on('finish', async () => {
       

      zipper.unzip(path, async function(error, unzipped) {
 
        if(!error) {
          unzipped.save(location, async function() {

            // read files here

            let tableFile = ['user-collection.csv', 'signup-collection.csv', 'invite-collection.csv', 'email-template-collection.csv', 'app-collection.csv'];
            
            try {
              let found = true;
              for (let index = 0; index < tableFile.length; index++) {
                const tbl = tableFile[index];
                if (fs.existsSync(`${location}/${tbl}`)) {

                  let result = await that.readCSVFile(`${location}/${tbl}`, appId);

                  if(index == 0) appData.users = result; 
                  else if(index == 1) appData.signups = result;
                  else if(index == 2) appData.invites = result;
                  else if(index == 3) appData.emails = result;
                  else if(index == 4) appData.app = result[0];
                }
                else{
                  found = false;
                }
              } 

              if(!found){
                fs.rm(location, { recursive: true });
                callback(error); 
              }
              else{

                that.addDataToTable(appData, function(result){
                  fs.rm(location, { recursive: true }, function(){
                    
                  });
                  callback(result); 
                });
              }
             
            } catch(err) {

              fs.rm(location, { recursive: true }, function(){

              });
              callback(error); 
            }
            
          });
        }
        else {
          fs.rm(location, { recursive: true }, function(){

          });
          callback(false);
        }

      });

     
    });

    writeStream.on('error', () => {
      console.log('wrote all data to file error');
      fs.rm(location, { recursive: true }, function(){

      });
      callback(false);
    });
    
    // close the stream
    writeStream.end();
     
  }

  rollbackDatabase(newDocs, table){
    let ids = [];
    if(newDocs.length){

      newDocs.forEach(element => {
        ids.push(element._id.toString());
      });

      if(table){

        table.deleteMany({
          _id: {
            $in: ids
          }
        }, function(err, result) {
          if (err) {
            console.log(err)
          } else {
             
          }
        })
      } 

    }
    
    
  }


  async addDataToTable(data, callback){

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let _user = mongoose.model(CONT.TABLE.USERS, SCHEMA.user); 
    let _invite = mongoose.model(CONT.TABLE.INVITES, SCHEMA.invite); 
    let _signup = mongoose.model(CONT.TABLE.SIGNUPS, SCHEMA.signup);
    let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate);
 
    let newDocs = {};

    let result = await this.createImportedApp(data, _app); 
    if(result.status == 'fails'){ 
      callback(result);
      return;
    }
    newDocs.app = [result];

    result = await this.executeInsert(data.users, _user);
    if(result.status){ 
      callback(result);
      return;
    }
    newDocs.user = result;


    result = await this.executeInsert(data.invites, _invite);
    if(result.status){
      this.rollbackDatabase(newDocs.app, _app);
      this.rollbackDatabase(newDocs, _user);
      callback(result);
      return;
    }
    newDocs.invite = result;


    result = await this.executeInsert(data.signups, _signup);
    if(result.status){
      this.rollbackDatabase(newDocs.app, _app);
      this.rollbackDatabase(newDocs.user, _user);
      this.rollbackDatabase(newDocs.invite, _invite);
      callback(result);
      return;
    }
    newDocs.signup = result;

    result = await this.executeInsert(data.emails, _email);
    if(result.status){
      this.rollbackDatabase(newDocs.app, _app);
      this.rollbackDatabase(newDocs.user, _user);
      this.rollbackDatabase(newDocs.invite, _invite);
      this.rollbackDatabase(newDocs.signup, _signup);
      callback(result);
      return;
    }
    

    callback(newDocs.app[0]);
  }

  executeInsert(data, table){
    return new Promise((resolve, reject) => {
      let i = 0;
      let docs = []
      while (i <= data.length) {
        for (const key in data[i]) {
          if(data[i][key] === undefined || data[i][key] == "") delete data[i][key];
        }
        if(data[i] && data[i].appId) docs.push(data[i]);
        i++;
      }

      if(docs.length){
        table.insertMany(docs, function(error, insertedDocs) {
          if(error) resolve({status: 'fails', message: 'Database error for invalid table: ' +  error.message });
          else resolve(insertedDocs);
        });
      } 
      else resolve(docs); 
      

    });
    
  }




  async exportAppDatabase(req, res, callback){
    

    let data = req.query;
    let error = {status: 'Fails', message: 'Invalid Data'};  
   
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: data.appId });

    if(!app ) {
      callback(null, error); 
      return;
    } 

    let _users = mongoose.model(CONT.TABLE.USERS, SCHEMA.user);
    let users = await _users.find({ appId: data.appId });  

    let _signup = mongoose.model(CONT.TABLE.SIGNUPS, SCHEMA.signup);
    let signups = await _signup.find({ appId: data.appId });

    let _invite = mongoose.model(CONT.TABLE.INVITES, SCHEMA.invite);
    let invites = await _invite.find({ appId: data.appId });

    let _emails = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate);
    let emails = await _emails.find({ appId: data.appId });

    
    let appDir = `${DIR}/${data.appId}`;

    if (!fs.existsSync(appDir)){
        fs.mkdirSync(appDir);
    }


    let today = util.getCurrentDate();

    let appCol = `app-collection.csv`;
    let path = `${appDir}/${appCol}`; 

    const csvAppWriter = createCsvWriter({
      path: path,
      header: [ 
        {id: 'name', title: 'name'}, 
        {id: 'status', title: 'status'},
        {id: 'jwtEnabled', title: 'jwtEnabled'},
        {id: 'appPrivateKey', title: 'appPrivateKey'},
        {id: 'appPublicKey', title: 'appPublicKey'},
        {id: 'appToken', title: 'appToken'},
        {id: 'appSecret', title: 'appSecret'},
        {id: 'handle', title: 'handle'},
        {id: 'invitationEnabled', title: 'invitationEnabled'},
        {id: 'signupEnabled', title: 'signupEnabled'},
        {id: 'signupFlow', title: 'signupFlow'},
        {id: 'twoFactorVerification', title: 'twoFactorVerification'},
        {id: 'emailExtension', title: 'emailExtension'},
        {id: 'emailExtensionAPIKey', title: 'emailExtensionAPIKey'},
        {id: 'emailExtensionSenderEmail', title: 'emailExtensionSenderEmail'},
        {id: 'TWILIOAccountSid', title: 'TWILIOAccountSid'},
        {id: 'TWILIOToken', title: 'TWILIOToken'},
        {id: 'TWILIOPhoneNumber', title: 'TWILIOPhoneNumber'},
        {id: 'googleAppName', title: 'googleAppName'},
        {id: 'maxLoginAttempts', title: 'maxLoginAttempts'},
        {id: 'passwordFilter', title: 'passwordFilter'},
        {id: 'passwordMinLength', title: 'passwordMinLength'},
        {id: 'passwordMinUpper', title: 'passwordMinUpper'},
        {id: 'passwordMinLower', title: 'passwordMinLower'},
        {id: 'passwordMinDigit', title: 'passwordMinDigit'},
        {id: 'passwordMinSpecial', title: 'passwordMinSpecial'},
        {id: 'userJWTExpiration', title: 'userJWTExpiration'},
        {id: 'realmAppId', title: 'realmAppId'},
        {id: 'appData', title: 'appData'},
        {id: 'metaDataInvite', title: 'metaDataInvite'},
        {id: 'metaData', title: 'metaData'},
        {id: 'metaDataEmail', title: 'metaDataEmail'}, 
        {id: 'locales', title: 'locales'},
        {id: 'createdAt', title: 'createdAt'},
        {id: 'updatedAt', title: 'updatedAt'}
      ]
    });

    app.appPrivateKey = hashService.aesDecrypt(app.appPrivateKey);
    app.appPublicKey = hashService.aesDecrypt(app.appPublicKey);
    app.appSecret = hashService.aesDecrypt(app.appSecret);

    if(app.TWILIOAccountSid) app.TWILIOAccountSid = hashService.aesDecrypt(app.TWILIOAccountSid);
    if(app.TWILIOToken) app.TWILIOToken = hashService.aesDecrypt(app.TWILIOToken);
    if(app.TWILIOPhoneNumber) app.TWILIOPhoneNumber = hashService.aesDecrypt(app.TWILIOPhoneNumber);
    if(app.emailExtensionAPIKey) app.emailExtensionAPIKey = hashService.aesDecrypt(app.emailExtensionAPIKey);

    await csvAppWriter.writeRecords([app]);


    let userCollection = `user-collection.csv`;
    path = `${appDir}/${userCollection}`; 

    const csvUserWriter = createCsvWriter({
      path: path,
      header: [ 
        {id: 'handle', title: 'handle'},
        {id: 'password', title: 'password'},
        {id: 'status', title: 'status'},
        {id: 'appId', title: 'appId'},
        {id: 'twoFactorPhoneVerification', title: 'twoFactorPhoneVerification'},
        {id: 'twoFactorGoogleVerification', title: 'twoFactorGoogleVerification'},
        {id: 'googleSecretKey', title: 'googleSecretKey'},
        {id: 'twoFactorCode', title: 'twoFactorCode'},
        {id: 'phone', title: 'phone'},
        {id: 'phoneVerified', title: 'phoneVerified'},
        {id: 'phoneCode', title: 'phoneCode'},
        {id: 'metaData', title: 'metaData'},
        {id: 'lastLogin', title: 'lastLogin'},
        {id: 'locale', title: 'locale'},
        {id: 'createdAt', title: 'createdAt'},
        {id: 'updatedAt', title: 'updatedAt'}
      ]
    });

    await csvUserWriter.writeRecords(users);

    let signupCol = `signup-collection.csv`;

    path = `${appDir}/${signupCol}`; 

    const csvSignUpWriter = createCsvWriter({
      path: path,
      header: [ 
        {id: 'handle', title: 'handle'},
        {id: 'password', title: 'password'},
        {id: 'status', title: 'status'},
        {id: 'appId', title: 'appId'}, 
        {id: 'code', title: 'code'}, 
        {id: 'locale', title: 'locale'},
        {id: 'metaData', title: 'metaData'}, 
        {id: 'createdAt', title: 'createdAt'},
        {id: 'updatedAt', title: 'updatedAt'}
      ]
    });
    await csvSignUpWriter.writeRecords(signups);


    let inviteCol = `invite-collection.csv`;
    path = `${appDir}/${inviteCol}`; 
    const csvInviteWriter = createCsvWriter({
      path: path,
      header: [ 
        {id: 'handle', title: 'handle'},
        {id: 'senderHandle', title: 'senderHandle'},
        {id: 'senderUserId', title: 'senderUserId'},
        {id: 'code', title: 'code'},
        {id: 'status', title: 'status'},
        {id: 'appId', title: 'appId'}, 
        {id: 'metaData', title: 'metaData'}, 
        {id: 'createdAt', title: 'createdAt'},
        {id: 'updatedAt', title: 'updatedAt'}
      ]
    });
    await csvInviteWriter.writeRecords(invites);
   

    let emailTemplateCol = `email-template-collection.csv`;
    path = `${appDir}/${emailTemplateCol}`; 

    const csvEmailTemplateWriter = createCsvWriter({
      path: path,
      header: [ 
        {id: 'appId', title: 'appId'},
        {id: 'subject', title: 'subject'},
        {id: 'replyTo', title: 'replyTo'},
        {id: 'templateName', title: 'templateName'}, 
        {id: 'htmlTemplate', title: 'htmlTemplate'}, 
        {id: 'locale', title: 'locale'}, 
        {id: 'htmlTemplate', title: 'htmlTemplate'}, 
        {id: 'createdAt', title: 'createdAt'},
        {id: 'updatedAt', title: 'updatedAt'}
      ]
    });
    await csvEmailTemplateWriter.writeRecords(emails);


    let source = `${DIR}/${data.appId}.zip`;
    zipper.sync.zip(appDir).compress().save(source);

    console.log('The CSV file was written successfully')
    
     

    callback(true);
    
    res.setHeader('Content-Disposition', 'attachment; filename="' + data.appId + '"');
    res.setHeader('Content-Type', 'application/zip'); 
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With");  

    let stream = fs.createReadStream(source);
    stream.pipe(res);
    stream.on("error", err => console.log(err)); 
    stream.on("end", () => {
      fs.unlinkSync(source); 
      fs.rm(`${DIR}/${data.appId}`, { recursive: true }, function(res){
        console.log(res);
      });
    }); 
 
  }


 

 
  async patchAppLocales(callback){

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate);
    
    // add locale field to old emails
    await _email.updateMany({ $or: [ { locale: "" }, { locale: { $exists : false } } ] }, { $set: { locale: 'EN' } });

     // add locales field to old app
    await _app.updateMany({ $or: [ { locales: [] }, { locales: ['en'] }, { locales: { $exists : false } } ] }, { $set: { locales: ['EN'] } });
    let apps = await _app.find({}); 
    let appIds = [];

    let foundTemplates = await _email.find({ templateName: 'signUpLink'});
    if (foundTemplates.length > 0){
        appIds = foundTemplates.map(item => (item.appId)); 
    }
    

    for (let index = 0; index < apps.length; index++) {

        const app = apps[index];  
        

        if (appIds.indexOf(app.appId) < 0) {
            let signUpLink = {
                appId: app.appId,
                templateName: 'signUpLink',
                locale: 'EN',
                localeLinkText: 'LINK',
                subject: "Verify your account for %APP_NAME%",
                replyTo:'',
                htmlTemplate:"<p>Hello %HANDLE%,</p>\n<p>Please verify your email address: </p>\n<p>Please click this <b>%LINK%</b> to verify your sign up.</p>\n<p>If you didn’t ask to verify this address, you can ignore this email.</p>\n<p>Thanks,</p>\n<p>Your %APP_NAME% team</p>"
            };
            
            let template = new _email(signUpLink);  
            template.save(); 
        }
    }

        callback(true)
  }
 




}

const instance = new AppService()
module.exports = instance

 