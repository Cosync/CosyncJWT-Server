'use strict';
 
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