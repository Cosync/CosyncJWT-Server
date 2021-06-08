

'use strict';

const stream = require('stream'); 
let authenticator = require('authenticator');
const QRCode = require('qrcode'); 

class AuthenticatorService {

    constructor() {
        
    }

    generateAppUserKey(user, callback){

        let formattedKey = authenticator.generateKey();
        let url = authenticator.generateTotpUri(formattedKey, user.handle, global.__config.companyName, 'SHA1', 6, 30);
        QRCode.toDataURL(url, (err, dataURL) => {
            callback({QRDataImage:dataURL, tfaURL: url, googleSecretKey:formattedKey, handle: user.handle});
        });
        
    }

    generateAppUserKeyQRImage(user, app, callback){

        let formattedKey = authenticator.generateKey();
        let authenticatorName = app.googleAppName || app.name;
        let url = authenticator.generateTotpUri(formattedKey, user.handle, authenticatorName , 'SHA1', 6, 30);
        let buffers = [];
        let dataURL; 
         
        const writable = new stream.Writable({  
            write: function(chunk, encoding, next) {  
              buffers.push(chunk) 
               
              next(); 
            } 
        });  

        writable.on('finish', () => {
            let image = Buffer.concat(buffers);
            callback({imageBuffer: image, QRDataImage:dataURL, tfaURL: url, googleSecretKey:formattedKey, handle: user.handle});
        });  


        QRCode.toDataURL(url, (err, qrURL) => {
            dataURL = qrURL;
            QRCode.toFileStream(writable, url);
        });

        
        
    }

    generateAdminKey(user, callback){

        let formattedKey = authenticator.generateKey();

        let url = authenticator.generateTotpUri(formattedKey, user.email, global.__config.companyName + ' ADMIN', 'SHA1', 6, 30);
        QRCode.toDataURL(url, (err, dataURL) => {
            callback({QRDataImage:dataURL, tfaURL: url, googleSecretKey:formattedKey, email: user.email});
        }); 
        
    }

    generateQRImage(res, url){
        res.setHeader('content-type','image/png');
        QRCode.toFileStream(res, url);
    }

    generateKey(user, callback){

        let formattedKey = authenticator.generateKey();
        // "acqo ua72 d3yf a4e5 uorx ztkh j2xl 3wiz" 

        // var formattedToken = authenticator.generateToken(formattedKey);
        // // "957 124" 
        // let ver = authenticator.verifyToken(formattedKey, formattedToken);
        // // { delta: 0 }

        let url = authenticator.generateTotpUri(formattedKey, user.email, global.__config.companyName, 'SHA1', 6, 30);
        QRCode.toDataURL(url, (err, dataURL) => {
            callback({QRDataImage:dataURL, tfaURL: url, googleSecretKey:formattedKey, email: user.email});
        });
        
    } 

    verifyCode(user, code){ 
        let result = authenticator.verifyToken(user.googleSecretKey, code);
        return result;
    }
    
}

const instance = new AuthenticatorService()
module.exports = instance