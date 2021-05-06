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
    }
    
  }



  async getApp( appId, callback) { 
 
    let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let app = await _app.findOne({ appId: appId }, appProjection); 
    callback(app);
  }

  async getApps(callback) {

    let _apps = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
    let apps = await _apps.find({}, appProjection).sort({createdAt: 'desc'}); 
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
   
  async editAppName(data, callback) { 
   
      let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
      let app = await _app.findOne({ name: data.name});

      if (!app) {
        app = await _app.findOne({ appId: data.appId });
        if(!app) callback(null, `App ID '${data.appId}' is not found.`); 
        else{ 
          app.name = data.name;
          app.updatedAt = util.getCurrentTime();
          app.save(); 
          callback(app); 
        }
      } 
      else callback(null, `App '${data.name}' already exists.`);
     
  }       

}

const instance = new AppService()
module.exports = instance

 