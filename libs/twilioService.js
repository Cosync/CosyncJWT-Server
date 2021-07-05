'use strict'; 

let Twilio = require('twilio');
let util = require('./util');  
 
let mongoose = require('mongoose'); 
const CONT = require('../config/constants.js');
const SCHEMA = require('../config/schema.js');

class TwilioService {

    constructor() {
         
    } 
    

    async sendSMS(user, app, callback){
        try { 
            // Download the helper library from https://www.twilio.com/docs/node/install
            // Your Account Sid and Auth Token from twilio.com/console
            // DANGER! This is insecure. See http://twil.io/secure
            const accountSid = app.TWILIOAccountSid;
            const authToken = app.TWILIOToken;
            const sender = app.TWILIOPhoneNumber;
            const client = new Twilio(accountSid, authToken);
            if(!client){
                callback(false, util.INTERNAL_STATUS_CODE.INTERNAL_SERVER_ERROR);
                return;
            }

            let twoFactorCode = util.getRandomNumber();

            let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate); 
            let template = await _email.findOne({appId: app.appId, templateName: 'sms' }); 

            user.handle = user.handle ? user.handle : `${app.name} developer`
            let message = template.htmlTemplate.split('%CODE%').join(twoFactorCode);
            message = message.split('%APP_NAME%').join(app.name);
            message = message.split('%HANDLE%').join(user.handle);

            client.messages.create({body: message, from: sender, to: user.phone})
                .then(res => {
                    callback({twoFactorCode:twoFactorCode});
                })
                .catch(err => {
                    callback(false, err);
                });
        } catch (error) {
            
            callback(false, util.INTERNAL_STATUS_CODE.INTERNAL_SERVER_ERROR);
            return;
        }

    }
        
}


const instance = new TwilioService()
module.exports = instance