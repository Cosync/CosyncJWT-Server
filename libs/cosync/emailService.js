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
const appLogService = require('./appLogsService');
const {Client} = require('@sendgrid/client');
let hashService = require('./hashService');



let emailServiceTestTemplate = `
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
                   
               <span ><font color="#FFFFFF">Test CosyncJWT email extension service.</font></span>

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
                                        <span >Application Name: <a href="#">%APP_NAME%</a></span>
                                      </div>
                                      <br>
                                      <div style="font-family:'Segoe UI',Tahoma,sans-serif;font-size:14px;color:#333;font-weight:bold">
                                        <span>Send Grid Email Service is working</span>
                                      </div>
                                      <br>
                                      <br>

                                       <div style="font-family:'Segoe UI',Tahoma,sans-serif;font-size:14px;color:#333">
                                       Sincerely,
                                       </div>
                                       <div style="font-family:'Segoe UI',Tahoma,sans-serif;font-size:14px;font-style:italic;color:#333">
                                       The Cosync team
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

class EmailService {

    constructor() { 
        sgMail.setApiKey(global.__config.sendGrid.apiKey);
    }
  
    init() {
    }
    


    sendAppMail(data, fileData, app) {

        return new Promise((resolve, reject) =>{
            try { 
                const sgClient = new Client(); 
                let emailExtensionAPIKey = hashService.aesDecrypt(app.emailExtensionAPIKey); 
                sgClient.setApiKey(emailExtensionAPIKey);

                let from = data.from;
                if(!from || from == "") from =  app.emailExtensionSenderEmail;

                const emailContent = {
                    "content": [
                        {
                        "type": "text/html",
                        "value": data.html
                        }
                    ],
                    "from": {
                        "email": from,
                        "name": app.name
                    },
                    "personalizations": [
                        {
                        "subject": data.subject,
                        "to": [
                            {
                                "email": data.to 
                            }
                        ]
                        }
                    ],
                    "reply_to": {
                        "email": from, 
                    },
                    "subject":  data.subject
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

                    emailContent.attachments = [
                        option
                    ]
                } 

                let that = this;

                let request = {}  
                request.body = emailContent;
                request.method = 'POST';
                request.url = '/v3/mail/send';

                sgClient.request(request).then(([response, body]) => {
                    // console.log(response.statusCode);
                    // console.log(response.body);
                    resolve(true)
                }).catch(err => {

                    console.log(err);
                    let message = JSON.stringify(err); 
                    let error = {
                        handle : data.to,
                        message: message
                    };

                    if(err.response.body.errors)  error.message = JSON.stringify(err.response.body.errors[0])

                    appLogService.addLog(app.appId, 'sendEmail', JSON.stringify(error), "error"); 

                    resolve(false)
                })
                
            } catch (err) {
                resolve(false)
                console.log(error);     
                
                let error = {
                    handle : data.to,
                    message: JSON.stringify(err)
                };
                appLogService.addLog(app.appId, 'sendEmail', JSON.stringify(error), "error"); 

            }

             

        });
    }

    testExtensionService(app){
        return new Promise((resolve, reject) =>{
            try { 
                const sgClient = new Client(); 
                let emailExtensionAPIKey = hashService.aesDecrypt(app.emailExtensionAPIKey); 
                sgClient.setApiKey(emailExtensionAPIKey);

                let tml = emailServiceTestTemplate.split('%APP_NAME%').join(app.name); 
                tml = tml.split('%APP_NAME%').join(app.name); 

                let from =  app.emailExtensionSenderEmail;

                const emailContent = {
                    "content": [
                        {
                        "type": "text/html",
                        "value": tml
                        }
                    ],
                    "from": {
                        "email": from,
                        "name": app.name
                    },
                    "personalizations": [
                        {
                        "subject": "Test CosyncJWT Email Extension",
                        "to": [
                            {
                                "email": app.emailExtensionSenderEmail
                            }
                        ]
                        }
                    ],
                    "reply_to": {
                        "email": from, 
                    },
                    "subject":  "Test CosyncJWT Email Extension"
                }; 

                let that = this;

                let request = {}  
                request.body = emailContent;
                request.method = 'POST';
                request.url = '/v3/mail/send';

                sgClient.request(request).then(([response, body]) => {
                    appLogService.addLog(app.appId, 'testExtensionService', true);  
                    resolve(true)
                }).catch(err => {
                    console.log(err.response.body.errors);

                    let message = JSON.stringify(err); 

                    let error = {
                        handle : app.emailExtensionSenderEmail,
                        message: message
                    };

                    if(err.response.body.errors)  error.message = JSON.stringify(err.response.body.errors[0])

                    appLogService.addLog(app.appId, 'testExtensionService', JSON.stringify(error), "error");  
                   
                     
                    if(err.response.body.errors) reject(err.response.body.errors[0])
                    else reject(message)
                })
                
            } catch (error) {
                console.log(error);       
            }

             

        });
    }

    
    send(data, fileData, app) {
        return new Promise((resolve, reject) =>{
            app = app ? app : { appId: "undefined"};

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
                if(err) { 
                    
                    let message = JSON.stringify(err);
                    let error = {
                        handle : data.to,
                        message: message
                    };
                    if(err.response.body.errors)  error.message = JSON.stringify(err.response.body.errors[0])
                     
                    console.log(error);

                    appLogService.addLog(app.appId, 'sendEmail', JSON.stringify(error), "error"); 
                    resolve(false)
                }
                else resolve(true)
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