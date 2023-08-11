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

let Twilio = require('twilio');
let util = require('../util');  
let hashService = require('./hashService');
let mongoose = require('mongoose'); 
const CONT = require('../../config/constants');
const SCHEMA = require('../../config/schema');  

class TwilioService {

    constructor() {
         
    } 
    

    async sendSMS(user, app, callback){
        try { 
            // Download the helper library from https://www.twilio.com/docs/node/install
            // Your Account Sid and Auth Token from twilio.com/console
            // DANGER! This is insecure. See http://twil.io/secure
            
            const accountSid = hashService.aesDecrypt(app.TWILIOAccountSid);
            const authToken = hashService.aesDecrypt(app.TWILIOToken);
            const sender = hashService.aesDecrypt(app.TWILIOPhoneNumber);

            const client = new Twilio(accountSid, authToken);
            if(!client){
                callback(false, util.INTERNAL_STATUS_CODE.INTERNAL_SERVER_ERROR);
                return;
            }

            let twoFactorCode = util.getRandomNumber();
            let userLocale = user.locale ? user.locale : "EN";
            let _email = mongoose.model(CONT.TABLE.EMAIL_TEMPLATES, SCHEMA.emailTemplate); 
            let template = await _email.findOne({appId: app.appId, templateName: 'sms', locale : userLocale.toUpperCase() }); 

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
            console.log("Twilio Errors: ", error)
            callback(false, util.INTERNAL_STATUS_CODE.INTERNAL_SERVER_ERROR);
            return;
        }

    }
        
}


const instance = new TwilioService()
module.exports = instance