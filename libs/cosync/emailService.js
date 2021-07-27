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
 
let sgMail = require('@sendgrid/mail');  

class EmailService {

    constructor() { 
        sgMail.setApiKey(global.__config.sendGrid.apiKey);
    }
  
    init() {
    }
    
    send(data, fileData) {
        return new Promise((resolve, reject) =>{
            let from = data.from;
            if(!from || from == "") from =  global.__config.noreplyEmail;
            const msg = {
                to: data.to,
                from: from,
                subject: data.subject,
                text: data.text,
                html: data.html
            };

            if(fileData){ 
                 
                let attachment = fileData.buffers.toString("base64");
                let option = {
                    content: attachment,
                    filename: fileData.filename,
                    type: "application/pdf",
                    disposition: "attachment"
                };

                if(fileData.type == 'image') option.type = "image/png";

                msg.attachments = [
                    option
                ]
            }  
            
            sgMail.send(msg, false, function(err, res){ 
                if(err) throw(err);
            });

        });
    }; 


    sendQR(data, fileData) {
        return new Promise((resolve, reject) =>{

            let from = data.from;
            if(!from || from == "") from =  global.__config.noreplyEmail;

            const msg = {
                to: data.to,
                from: from,
                subject: data.subject,
                text: data.text,
                html: data.html,
            };

            if(fileData){ 
                 
                
                let option = {
                    content: fileData.qrImage.toString("base64"),
                    filename: fileData.filename,
                    type: "image/png",
                    disposition: "attachment"
                }; 

                msg.attachments = [
                    option
                ]
            }  
            
            sgMail.send(msg, false, function(err, res){ 
                if(err) throw(err);
            });

        });
    }; 
}


const instance = new EmailService()
module.exports = instance