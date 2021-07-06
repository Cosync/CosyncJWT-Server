'use strict';
const mongoose = require('mongoose');  
const nrsa = require('node-rsa');  
const util = require('../util'); 
const CONT = require('../../config/constants');
const SCHEMA = require('../../config/schema');  
const twilioService = require('../twilioService');

const appProjection = {
  __v: false,
  _id: false
  
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
      const appSecret =  util.generateAppSecretToken({appId: appId});

      let item =  {
        name: data.name, 
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
        jwtEnabled: data.jwtEnabled || false,
        twoFactorVerification:'none',
        createdAt: util.getCurrentTime(),
        updatedAt: util.getCurrentTime()
      };  

      let app = new _app(item); 
      app.save();

      callback(app); 
      this.createAppEmailTemplate(app);
    }
    
  }



  async getApp( appId, callback) { 
 
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: appId }, appProjection); 
    callback(app);
  }

  async getApps(callback) {

    let _apps = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
  
    let apps = await _apps.find({}); 
    callback(apps); 
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
    if(params.name){
      if(params.case == "true") apps = await _apps.find({name: params.name}, appProjection).sort({createdAt: 'desc'}); 
      else apps = await _apps.find( { "name" : { $regex : new RegExp(params.name, "i") } }, appProjection).sort({createdAt: 'desc'});
    }
    else apps = await _apps.find({}, appProjection).sort({createdAt: 'desc'}); 
     
    callback(apps); 
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

    
    let _reset = mongoose.model(CONT.TABLE.RESET_PASSWORDS, SCHEMA.resetPassword);
    _reset.deleteMany({ "appId": id }, function (err) {}); 

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



  async createAppEmailTemplate(app){
    let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate);
    
    let signUp = {
      appId: app.appId,
      templateName: 'signUp',
      subject: "Verify your email for %APP_NAME%",
      replyTo:'',
      htmlTemplate:"<p>Hello %HANDLE%,</p>\n<p>Please verify your email address: </p>\n<p><b>%CODE%</b></p>\n<p>If you didn’t ask to verify this address, you can ignore this email.</p>\n<p>Thanks,</p>\n<p>Your %APP_NAME% team</p>"
    }

    let template = new _email(signUp); 
    template.save();


    let clickThrough = {
      appId: app.appId,
      templateName: 'clickThrough',
      subject: "clickThrough",
      replyTo:'',
      htmlTemplate:"<p>Hello %HANDLE%,</p>\n<p>You have successfully signup.</p>\n<p><b>Please login to %APP_NAME% Application</b></p>\n<p>Thanks,</p>\n<p>Your %APP_NAME% team</p>"
    } 

    template = new _email(clickThrough); 
    template.save(); 



    let resetPassword = {
      appId: app.appId,
      templateName: 'resetPassword',
      subject: "Reset your password for %APP_NAME%",
      replyTo:'',
      htmlTemplate:"<p>Hello %HANDLE%,</p>\n<p>Here is your code to reset your %APP_NAME% password for your %HANDLE% account.</p>\n<p><b>%CODE%</b></p>\n<p>If you didn’t ask to reset your password, you can ignore this email.</p>\n<p>Thanks,</p>\n<p>Your %APP_NAME% team</p>"
    } 

    template = new _email(resetPassword); 
    template.save(); 

    let invite = {
      appId: app.appId,
      templateName: 'invite',
      subject: "Account invitation for %APP_NAME%",
      replyTo:'',
      htmlTemplate:"<p>Hello %HANDLE%,</p>\n<p>Someone has invited your %HANDLE%!.</p>\n<p>Here is your register key: <b>%CODE%</b></p>\n<p> If you don't recognize the %APP_NAME% account, you can ignore this email.</p>\n<p>Thanks,</p>\n<p>Your %APP_NAME% team</p>"
    } 

    template = new _email(invite); 
    template.save();


    let qrCode = {
      appId: app.appId,
      templateName: 'qrCode',
      subject: "QR Code for login two step verification of %APP_NAME%",
      replyTo:'',
      htmlTemplate:"<p>Hello %HANDLE%,</p>\n<p>You have asked for Two Factor Login Verification QR Code for %HANDLE%!.</p>\n<p>Plase scan the QR code or enter the secret key in Google Authenticato</p>\n<p>Here is your secret key: <b>%CODE%</b></p>\n<p> If you don't recognize the %APP_NAME% account, you can ignore this email.</p>\n<p>Thanks,</p>\n<p>Your %APP_NAME% team</p>"
    } 

    template = new _email(qrCode); 
    template.save();

    let sms = {
      appId: app.appId,
      templateName: 'sms',
      subject: "SMS for login two step verification of %APP_NAME%",
      replyTo:'',
      htmlTemplate:"%CODE% is your verification code for %APP_NAME%."
    } 

    template = new _email(sms); 
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

            app.TWILIOAccountSid = data.TWILIOAccountSid; 
            app.TWILIOToken = data.TWILIOToken;
            app.TWILIOPhoneNumber = data.TWILIOPhoneNumber;
           
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

        default:
          callback(null, error);
        break;
      } 
    
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
    let that = this;

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
  
    let item = {
      handle: data.handle,
      password: data.password,
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
    let users = await _user.find({appId: data.appId, handle:{ $regex: '.*' + data.value + '.*' }}, userProjection).sort({handle: 'asc'});  
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


    let _invite = mongoose.model(CONT.TABLE.SIGNUPS, SCHEMA.signup); 
    _invite.findOneAndRemove({appId: data.appId, handle:data.handle}, function(err, res) {
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
    appUserService.createInvite(req, app, function(data){
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
      password: data.password,
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
        appData.users = await _user.find({appId: params.appId}, userProjection).sort({createdAt: 'desc'}).skip(offset).limit(limit);
        appData.totalUser = await this.countTable(_user, {appId: params.appId});
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
      appData.users = await _user.find({appId: params.appId}, userProjection).sort({createdAt: 'desc'}).limit(limit);
      appData.totalUser = await this.countTable(_user, {appId: params.appId});

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
      emailTemplate.updatedAt = util.getCurrentTime();
      emailTemplate.save();
    } 

    callback(emailTemplate)
  }

  async emailTemplates(req, callback) { 

    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application); 
    var app = await _app.findOne({ appId: req.query.appId });
    if (!app || app.status != "active") {
      callback(null);
      return; 
    }

    let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate);
    let emailTemplates = await _email.find({appId: req.query.appId}); 
    let data = {};
    emailTemplates.forEach(element => {
      data[element.templateName] = element;
    });
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
    
    app.metaData = data.metaData; 
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
    
    app.metaDataInvite = data.metaDataInvite; 
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

 

 
 




}

const instance = new AppService()
module.exports = instance

 