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

let request = require("request");
let mongoose = require('mongoose');   
let hashService  = require('../../cosync/hashService');
let atob = require('atob'); 
const CONT = require('../../../config/constants');
const SCHEMA = require('../../../config/schema');  
let REALM_API_URL = "https://realm.mongodb.com/api/admin/v3.0"; 


class InitVersion {

    constructor() {

    } 

    

    async init(data, callback){

        let error = {status: 'Fails', message: 'Invalid Data'}; 
      
        let that = this;

        let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
        let cosyncApp = await _app.findOne({ appId: data.appId }); 
        data.app = cosyncApp;
        data.app.appPublicKey = hashService.aesDecrypt(cosyncApp.appPublicKey);
        data.app.appRealmPublicKey = atob(data.app.appPublicKey); 

        this.mongodbRealmlogin(data, async function(token){
                
            let app = await that.getApplications(data, token.access_token);

            if(!app || app.status == 'fails'){ 
                if(app) callback(null, app); 
                else callback(null, error); 
                return;
            }
            else if(app && app.status == 'no_result'){ 
                callback(null, app);
                return;
            }

            let secret = await that.getSecret(data, token.access_token, app);

            if(secret) {

                error.status = "Duplicate";
                error.message = `Your MongoDB Realm JWT Secret is already existed: (${secret.name})`;
                callback(null, error); 
                return;
            }

            let newsecret = await that.createSecret(data, token.access_token, app);
            if(newsecret.error) {
                error.message = newsecret.error;
                callback(null, error); 
                return;
            }
            let result = await that.createJWTAuthProvider(data, token.access_token, app);
            if(!result) callback(null, error); 
            else if(result.error == "auth provider with name 'custom-token' already exists") {
                that.deleteJWTAuthProvider(data, token.access_token, app, async function(){
                    let auth = await that.createJWTAuthProvider(data, token.access_token, app);
                    if(auth.error){
                        error.message = newsecret.error;
                        callback(null, error); 
                    }
                    else callback(auth); 
                });
                
            }
            else if(result.error){
                error.message = result.error;
                callback(null, error); 
            }
            else callback(result); 

        });


    }

  


    getSecret(data, token, realmApp){
        return new Promise((resolve, reject) => {

            const options = {
                method: 'GET',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps/${realmApp._id}/secrets`,
                headers: {
                    "content-type": "application/json", 
                    "Authorization": `Bearer ${token}`
                } 
            }  

            request(options, async function(error, response, body){  
                let data = JSON.parse(body);
                let oldSecret;
                for (let index = 0; index < data.length; index++) {
                    const element = data[index];
                    if(element.name == 'CosyncJWTPublicKey') oldSecret = element;
                }
                resolve(oldSecret);
            })

        });
    }



    updateSecret(data, token, realmApp){
        return new Promise((resolve, reject) => {   

            const options = {
                method: 'GET',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps/${realmApp._id}/secrets`,
                headers: {
                    "content-type": "application/json", 
                    "Authorization": `Bearer ${token}`
                } 
            }  

            request(options, async function(error, response, body){  
                let dataSecret = JSON.parse(body);
                let oldSecret;
                for (let index = 0; index < dataSecret.length; index++) {
                    const element = dataSecret[index];
                    if(element.name == 'CosyncJWTPublicKey') oldSecret = element;
                }
                
                let updateSecret = {
                    "name":"CosyncJWTPublicKey",
                    "value": data.app.appRealmPublicKey
                }
                const updateOptions = {
                    method: 'PUT',
                    url: `${REALM_API_URL}/groups/${data.projectId}/apps/${realmApp._id}/secrets/${oldSecret._id}`,
                    headers: {
                        "content-type": "application/json", 
                        "Authorization": `Bearer ${token}`
                    },
                    body:JSON.stringify(updateSecret) 

                };

                request(updateOptions, async function(error, response, body){  
                    if(response.statusCode >= 200 && response.statusCode <= 290 || !error) resolve(true);
                    else resolve(false)
                })

            })

        });
    }


    createSecret(data, token, realmApp){
        return new Promise((resolve, reject) => {  

            let item ={
                "name":"CosyncJWTPublicKey",
                "value": data.app.appRealmPublicKey
            };

            const options = {
                method: 'POST',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps/${realmApp._id}/secrets`,
                headers: {
                    "content-type": "application/json", 
                    "Authorization": `Bearer ${token}`
                },
                body:JSON.stringify(item) 
            } 


            request(options, async function(error, response, body){  
                let data = JSON.parse(body);
                resolve(data)
            })

        });
    }


    getJWTAuthProvider(data, token, app){
        return new Promise((resolve, reject) => { 
            const options = {
                method: 'GET',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps/${app._id}/auth_providers`,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                } 
            } 

            request(options, async function(error, response, body){
                let result = JSON.parse(body);
                let auth;
                result.forEach(element => {
                    if(element.type == "custom-token") auth = element;
                });
                resolve(auth);
            });
        });
    }

    async deleteJWTAuthProvider(data, token, app, callback){ 

        let auth = await this.getJWTAuthProvider(data, token, app);
        if(auth){ 
        
            let updateAuth = await this.disableJWTProvider(data, token, app, auth); 
            if(updateAuth.error){
                callback(null, updateAuth.error);
                return;
            }

            let deleteAuth = await this.deleteJWTProvider(data, token, app, auth); 
            if(deleteAuth.error){
                callback(null, deleteAuth.error);
                return;
            } 

            callback(true); 
        }
        else callback(false, 'Auth does not exit'); 

    }



    disableJWTProvider(data, token, app, auth){
        return new Promise((resolve, reject) => { 
            let authData = {
                "name": "custom-token",
                "type": "custom-token",
                "disabled": true
            };
        
            const optionsUpdate = {
                method: 'patch',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps/${app._id}/auth_providers/${auth._id}`,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify(authData) 
            };
        
            this.httpRequestService(optionsUpdate).then(result => {
                resolve(result);
            });
        
        });
    } 

    deleteJWTProvider(data, token, app, auth){
        return new Promise((resolve, reject) => { 
            const optionsDelete = {
                method: 'DELETE',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps/${app._id}/auth_providers/${auth._id}`,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            };

            this.httpRequestService(optionsDelete).then(result => {
                resolve(result);
            });

        });
    } 

    httpRequestService(options){
        return new Promise((resolve, reject) => { 
            request(options, async function(error, response, body){ 
                if(response.statusCode > 300) resolve({error:body, response:response});
                else resolve({body:body, response:response});
            });

        });
    }

    createJWTAuthProvider(data, token, app){ 
        return new Promise((resolve, reject) => { 
            let metaData = {
                "name": "custom-token",
                "type": "custom-token",
                "disabled": false,
                "config": { 
                    "signingAlgorithm": "RS256",
                    "useJWKURI": false
                },
                "secret_config": {
                    "signingKeys": [
                        "CosyncJWTPublicKey"
                    ]
                },
                
            };

            let metadata_fields = [];

            if(data.app.metaData && data.app.metaData.length > 0  && data.app.metaData[0].path){

                let emailFieldName;
                data.app.metaData.forEach(field => {

                    if(field.path){ 
                        let metaField = {
                            "required": field.required,
                            "name": field.path,
                            "field_name": field.fieldName
                        };
                    
                        metadata_fields.push(metaField);

                        if(field.fieldName == "email") emailFieldName = true;
                    }
                });

                if(!emailFieldName){ 
        
                    metadata_fields.push({
                        "required": false,
                        "name": "email",
                        "field_name": 'email'
                    });
                }
            
            }
            else{
                let metaField = {
                    "required": false,
                    "name": "email",
                    "field_name": 'email'
                };

                metadata_fields.push(metaField);
            } 
            
            metaData.metadata_fields = metadata_fields; 

            const options = {
                method: 'POST',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps/${app._id}/auth_providers`,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(metaData) 
            } 

            request(options, async function(error, response, body){
                let result; 
                
                try {
                    result = JSON.parse(body);
                } catch (error) {
                    resolve(null);
                    return;
                }

                resolve(result);
            });
        });
    }


    getApplications(data, token){

        return new Promise((resolve, reject) => { 
            const options = {
                method: 'GET',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps`,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            };

            request(options, function(error, response, body){
                let result;
                try {
                    if(response.statusCode >= 200 && response.statusCode <= 205 ) result = JSON.parse(body);
                    else{
                        resolve({status:'fails' ,message: response.statusMessage, statusCode: response.statusCode })
                        return;
                    }
                    
                } catch (error) {
                    resolve(null)
                    return;
                }

                if(result && result.length){
                    let app;
                    result.forEach(item => { 
                        if(item.client_app_id == data.app.realmAppId ) app = item;
                    }); 
                    if(app) resolve(app); 
                    else resolve({status:'no_result', message: "MongoDB Realm app is not found" })
                }
                else{
                    resolve(null);
                } 
            })
        })
    }


    mongodbRealmlogin(data, callback){
        
        const options = {
            method: 'POST',
            url: `${REALM_API_URL}/auth/providers/mongodb-cloud/login`,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: {
                "username": data.publicKey, 
                "apiKey": data.privateKey
            },
            json: true  // JSON stringifies the body automatically
        }
        
        request(options, function(error, response, body){
            // Handle success response data 

            const options2 = {
                method: 'POST',
                url: `${REALM_API_URL}/auth/session`,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${body.refresh_token}`
                },
                json: true  // JSON stringifies the body automatically
            };

                request(options2, async function(error, response, token){ 
                callback(token);
            })
        })
        
    }


    async reinit(data,  callback){

        let error = {status: 'Fails', message: 'Invalid Data'};  
        
        let that = this;

        let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
        let cosyncApp = await _app.findOne({ appId: data.appId }); 
        data.app = cosyncApp;
        data.app.appPublicKey = hashService.aesDecrypt(cosyncApp.appPublicKey);
        data.app.appRealmPublicKey = atob(data.app.appPublicKey); 

        this.mongodbRealmlogin(data, async function(token){
                
            let app = await that.getApplications(data, token.access_token);
            if(!app || app.status == 'fails'){ 
                if(app) callback(null, app); 
                else callback(null, error); 
                return;
            }
            else if(app && app.status == 'no_result'){ 
                callback(null, app);
                return;
            }

            let secret = await that.updateSecret(data, token.access_token, app);

            if(!secret) {
                
                callback(null, error); 
                return;
            } 
            
            that.deleteJWTAuthProvider(data, token.access_token, app, async function(result, err){
                // if(result){
                //     let res = await that.createJWTAuthProvider(data, token.access_token, app); 
                //     callback(res);  
                // }  
                // else{
                //     error.message = err;
                //     callback(null, error);
                // } 

                let res = await that.createJWTAuthProvider(data, token.access_token, app); 
                callback(res);  

            }); 
        });

    }


    async clearEngine(realmConfig, token, app, callback){
        
        let error = {status: 'Fails', message: 'Invalid Data'};
        let that = this;
        this.deleteJWTAuthProvider(realmConfig, token, app, async function(result, err){ 

            if(result){
                let secrets = await that.getAllSecrets(realmConfig, token, app); 

                for (let index = 0; index < secrets.length; index++) {
                    const secret = secrets[index];
                    if(secret.name == 'CosyncJWTPublicKey')  await that.removeSecret(realmConfig, token, app, secret);
                }   

                callback(true);
            }
            else{
                error.message = err;
                callback(null, error);
            } 
        }); 

        
    }



    getAllSecrets(data, token, app){
        return new Promise((resolve, reject) => {   

            const options = {
                method: 'GET',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps/${app._id}/secrets`,
                headers: {
                    "content-type": "application/json", 
                    "Authorization": `Bearer ${token}`
                },
                json: true
            }  

            request(options, async function(error, response, dataSecret){  
                
                resolve(dataSecret); 

            })

        });
    }


    removeSecret(data, token, app, secret){
        return new Promise((resolve, reject) => {   

            const removeOptions = {
                method: 'DELETE',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps/${app._id}/secrets/${secret._id}`,
                headers: {
                    "content-type": "application/json", 
                    "Authorization": `Bearer ${token}`
                } 
            };

            request(removeOptions, async function(error, response, body){  
                resolve(true);
            });
             

        });
    }


    async remove(data, callback){

        let error = {status: 'Fails', message: 'Invalid Data'}; 
       
        let that = this;

        let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
        let cosyncApp = await _app.findOne({ appId: data.appId }); 
        data.app = cosyncApp;
        data.app.appPublicKey = hashService.aesDecrypt(cosyncApp.appPublicKey);
        data.app.appRealmPublicKey = atob(data.app.appPublicKey); 
        
        this.mongodbRealmlogin(data, async function(token){
                
            let app = await that.getApplications(data, token.access_token);

            if(!app || app.status == 'fails'){ 
                if(app) callback(null, app); 
                else callback(null, error); 
                return;
            }
            else if(app && app.status == 'no_result'){ 
                callback(null, app);
                return;
            }
            
            that.clearEngine(data, token.access_token, app, function(result, err){
                if(result){
                     
                    callback(result);
                } 
                else{
                    error.message = err;
                    callback(null, error);
                } 
            }); 
        });

    }


}


const instance = new InitVersion()
module.exports = instance