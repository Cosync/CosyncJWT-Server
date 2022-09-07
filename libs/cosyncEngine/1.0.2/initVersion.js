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
let REALM_API_URL = "https://realm.mongodb.com/api/admin/v3.0";
let fs = require('fs');
 

const AWS_S3_SECRET_KEY_NAME = "CosyncAWSSecretAccessKey";
const AWS_S3_KEY_NAME = "CosyncAWSAccessKey";

let deployList = [
    {
        func:{
            name: 'CosyncAssetUpload',
            path: 'assetUpload.js',
            private: true
        },
        trigger:{
            name: 'CosyncAssetUploadTrigger',
            collection: "CosyncAssetUpload",
            operation_types: ['INSERT', 'UPDATE', 'REPLACE'],
            type: "DATABASE" 
        }
    }, 
    {
        func:{
            name: 'CosyncRefreshAsset',
            path: 'CosyncRefreshAsset.js',
            private: false
        } 
    },

    {
        func:{
            name: 'CosyncRemoveAssetTriggerFunc',
            path: 'removeAsset.js',
            private: true
        },
        trigger:{
            name: 'CosyncRemoveAssetTrigger',
            collection: "CosyncAsset",
            operation_types: ['DELETE'],
            type: "DATABASE" 
        }
    },
    {
        func:{
            name: 'CosyncRemoveAsset',
            path: 'cosyncRemoveAsset.js',
            private: false
        } 
    },
    {
        func:{
            name: 'CosyncArchiveAsset',
            path: 'cosyncArchiveAsset.js',
            private: false
        } 
    }, 
    {
        func:{
            name: 'CosyncSanitizeFileName',
            path: 'sanitizeFileName.js',
            private: true
        }
    },
    {
        func:{
            name: 'CosyncCreatePresignedURL',
            path: 'createPresignedURL.js',
            private: true
        }, 
    } 
];


class InitVersion {

    constructor() {
    }
  
    async init(data, callback) {

        let error = {status: 'Fails', message: 'Invalid Data'};  
        
      
        let that = this;

        this.mongodbRealmlogin(data, async function(loginResult){
                
            let app = await that.getApplications(data, loginResult.access_token);
            if(!app || app.status == 'fails'){ 
                if(app) callback(null, app); 
                else callback(null, error); 
                return;
            }
            else if(app && app.status == 'no_result'){ 
                callback(null, app);
                return;
            }

            let secret = await that.getCosyncSecret(data, loginResult.access_token, app);

            if(secret) {
                error.status = "Duplicate"
                error.message = `Your MongoDB Realm Cosync Engine Secret is already existed: (${secret.name})`;
                callback(null, error); 
                return;
            }

            let newsecret = await that.createSecret(AWS_S3_SECRET_KEY_NAME, data.awsSecretAccessKey, loginResult.access_token, app);
            if(newsecret.error) {
                error.message = newsecret.error;
                callback(null, error); 
                return;
            } 
            
            let newKey = await that.createSecret(AWS_S3_KEY_NAME, data.awsAccessKey, loginResult.access_token, app);
            if(newKey.error) {
                error.message = newKey.error;
                callback(null, error); 
                return;
            } 

            that.deployFunctionAndTrigger(data, loginResult.access_token, app, async function(result){
                if(result.status == false) {

                    that.clearEngineAsync(data, loginResult.access_token, app);  
                    callback(null, result); 
                    
                }
                else callback(result); 
            }); 

        });

    }

    async deployFunctionAndTrigger(realmConfig, token, app, callback){
            
            for (let index = 0; index < deployList.length; index++) {
                let item = deployList[index];
                
                let content = await this.readFileContent(`./libs/cosyncEngine/1.0.1/${item.func.path}`); 
                
                content = content.split('DATABASE_NAME').join(realmConfig.realmDatabase);  
                content = content.split('AWS_BUCKET_NAME').join(realmConfig.s3Bucket);
                content = content.split('AWS_BUCKET_REGION').join(realmConfig.s3Region);
                content = content.split('APP_SECRET').join(realmConfig.app.appSecret);
                content = content.split('COSYNC_API_URL').join(global.__config.apiurl);
                item.func.source = content;
        
                let deploy = await this.createFunction(realmConfig, token, item, app); 
                if(deploy.status == false){
                    callback(deploy);
                    return;
                }
            } 
        
    }


    readFileContent(path){
        return new Promise((resolve, reject) =>{
            fs.readFile(path.trim(), 'utf8', function (err, content) { 
                if (err){
                    resolve({message:"Invalid file, ", data:err});
                    console.log('readFileContent err ', err)
                } 
                else resolve(content);
            });
        });
    }

 
 

    createFunction(realmConfig, token, data, app){

        return new Promise((resolve, reject) => {   

            let funcConfig = {
                "can_evaluate":{}, 
                "name": data.func.name,
                "private": data.func.private,
                "source": data.func.source
            };
            
            const options = {
                method: 'POST',
                url: `${REALM_API_URL}/groups/${realmConfig.projectId}/apps/${app._id}/functions`,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: funcConfig,
                json: true  // JSON stringifies the body automatically
            }

            let that = this;

            request(options, function(error, response, body){
            
                if(response.statusCode == 201){

                    if(data.trigger && data.trigger.type == 'DATABASE'){
                        that.createTrigger(realmConfig, token, data, app , body, function(result, error) {
                            if(result && result.name) resolve({status: true, message: 'Function is deployed successfully.'});
                            else resolve({status: false, message: error});
                        });
                    }
                    else if(data.trigger && data.trigger.type == 'AUTHENTICATION'){
                        that.createAuthenticationTrigger(realmConfig, token, data, app , body, function(result, error) {
                            if(result && result.name) resolve({status: true, message: 'Function is deployed successfully.'});
                            else resolve({status: false, message: error});
                        });
                    }
                    else resolve({status: true, message: 'Function is deployed successfully.'});

                    
                } 
                else {
                    if(body) resolve({status: false, message: `MongoDB Realm Function: ${body.error}`}); 
                    else resolve({status: false, message: `Whoop! Something went wrong! MongoDB Realm status code: ${response.statusCode}, message: ${response.statusMessage}`}); 

                    
                }
            })
        })
    }



    createTrigger(realmConfig, token, data, app, func, callback){

        let triggerConfig = {
            
            "name": data.trigger.name,
            "type": "DATABASE",
            "function_id": func._id, 
            "disabled": false,
            "config": {
                "operation_types": [
                    "INSERT"
                ],
                "full_document": true,
                "database": realmConfig.realmDatabase,
                "collection": data.trigger.collection,
                "service_id": realmConfig.serviceId,
                
            } 
        }
        if(data.trigger.operation_types) triggerConfig.config.operation_types = data.trigger.operation_types;

        const options = {
            method: 'POST',
            url: `${REALM_API_URL}/groups/${realmConfig.projectId}/apps/${app._id}/triggers`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: triggerConfig,
            json: true  // JSON stringifies the body automatically
        }

        request(options, function(error, response, body){ 
            if(body && body.name) callback(body);
            else if(body && body.error) callback(null, `MongoDB Realm Trigger: ${body.error}`);
            else callback(null);
        })
    }


    createAuthenticationTrigger(realmConfig, token, data, app, func, callback){

        let triggerConfig = {
            
            "name": data.trigger.name,
            "type": "AUTHENTICATION",
            "function_id": func._id, 
            "disabled": false,
            "config": data.trigger.config
        }
    
        const options = {
            method: 'POST',
            url: `${REALM_API_URL}/groups/${realmConfig.projectId}/apps/${app._id}/triggers`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: triggerConfig,
            json: true  // JSON stringifies the body automatically
        }

        request(options, function(error, response, body){ 
            if(body && body.name) callback(body);
            else  if(body && body.error) callback(null, `MongoDB Realm Trigger: ${body.error}`);
            else callback(null);
        })
    }



    createSecret(name, value, token, app){
        return new Promise((resolve, reject) => {  

            let item ={
                "name": name,
                "value": value
            };

            const options = {
                method: 'POST',
                url: `${REALM_API_URL}/groups/${realmConfig.projectId}/apps/${app._id}/secrets`,
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



    getCosyncSecret(realmConfig, token, app){
        return new Promise((resolve, reject) => {   

            const options = {
                method: 'GET',
                url: `${REALM_API_URL}/groups/${realmConfig.projectId}/apps/${app._id}/secrets`,
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
                    if(element.name == AWS_S3_SECRET_KEY_NAME ){
                        oldSecret = element; 
                    } 
                    else if(element.name == AWS_S3_KEY_NAME ){
                        oldSecret = element; 
                    } 
                }

                resolve(oldSecret);
            })

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
                        resolve({status:'fails' ,message: response.statusMessage, statusCode: response.statusCode });
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
                        resolve({status:'no_result', message: "MongoDB Realm app is not found", statusCode: response.statusCode })
                    } 


                } catch (error) {
                    resolve(null)
                    return;
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

            request(options2, async function(error, response, result){ 
                callback(result);
            })
        })
        
    }

    async clearEngineAsync(data, token, app){
        return new Promise((resolve, reject) => {   
            this.clearEngine(data, token, app, function(res){
                resolve(res);
            })
        });
    }

    async clearEngine(realmConfig, token, app, callback){
        
        let triggers = await this.getAllTriggers(realmConfig, token, app);
        for (let index = 0; index < triggers.length; index++) {
            const trigger = triggers[index];

            let cTrigger = null;
            deployList.forEach(element => {
                if(element.trigger && element.trigger.name == trigger.name) cTrigger = trigger;
            });

            if(cTrigger){
                await this.deleteTrigger(realmConfig, token, app, cTrigger);
                await this.deleteFunction(realmConfig, token, app, cTrigger.function_id);
            }
        }

        let functions = await this.getAllCosyncFunctions(realmConfig, token, app);
        let oldFunc;
        for (let index = 0; index < functions.length; index++) {
            const func = functions[index];
            oldFunc = null;
            deployList.forEach(element => {
                if(element.func.name == func.name) oldFunc = func;
            });

            if( oldFunc) await this.deleteFunction(realmConfig, token, app, oldFunc._id);
        }
 

        let secrets = await this.getAllSecrets(realmConfig, token, app); 
        for (let index = 0; index < secrets.length; index++) {
            const secret = secrets[index];
            if(secret.name == AWS_S3_SECRET_KEY_NAME)  await this.removeSecret(realmConfig, token, app, secret);
            else if(secret.name == AWS_S3_KEY_NAME)  await this.removeSecret(realmConfig, token, app, secret);
        } 
       

        callback(true)
    }




    async reinit(data, callback) {

        let error = {status: 'Fails', message: 'Invalid Data'};  
        
        let that = this;

        this.mongodbRealmlogin(data, async function(loginResult){
                
            let app = await that.getApplications(data, loginResult.access_token);

            if(!app || app.status == 'fails'){ 
                if(app) callback(null, app); 
                else callback(null, error); 
                return;
            }
            else if(app && app.status == 'no_result'){ 
                callback(null, app);
                return;
            }

            await that.clearEngineAsync(data, loginResult.access_token, app);

            let newsecret = await that.createSecret(AWS_S3_SECRET_KEY_NAME, data.awsSecretAccessKey, loginResult.access_token, app);
            if(newsecret.error) {
                error.message = newsecret.error;
                callback(null, error); 
                return;
            }

            let newKey = await that.createSecret(AWS_S3_KEY_NAME, data.awsAccessKey, loginResult.access_token, app);
            if(newKey.error) {
                error.message = newKey.error;
                callback(null, error); 
                return;
            }

            that.deployFunctionAndTrigger(data, loginResult.access_token, app, function(result){
                if(result.status == false) {

                    that.clearEngineAsync(data, loginResult.access_token, app);

                    error.message = newsecret.error;
                    callback(null, error); 
                    
                }
                else callback(result); 
            }); 

        });

    }



    async remove(req, callback) {

        let error = {status: 'Fails', message: 'Invalid Data'}; 
        let that = this;

        this.mongodbRealmlogin(data, async function(loginResult){
                
            let app = await that.getApplications(data, loginResult.access_token);

            if(!app || app.status == 'fails'){ 

                if(app) callback(null, app); 
                else callback(null, error); 
                
            }
            else if(app && app.status == 'no_result'){
                callback(app); 
            }
            else{
                let result = await that.clearEngineAsync(data, loginResult.access_token, app); 
                callback(result); 
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


    updateSecret(data, token, app){
        return new Promise((resolve, reject) => {   
            let that = this;
            const options = {
                method: 'GET',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps/${app._id}/secrets`,
                headers: {
                    "content-type": "application/json", 
                    "Authorization": `Bearer ${token}`
                } 
            }  

            request(options, async function(error, response, body){  
                let dataSecret = JSON.parse(body);
                let oldCosyncAWSSecretAccessKey, oldCosyncAWSAccessKey;

                for (let index = 0; index < dataSecret.length; index++) {
                    const element = dataSecret[index];
                    if(element.name == AWS_S3_SECRET_KEY_NAME) oldCosyncAWSSecretAccessKey = element;
                    else if(element.name == AWS_S3_KEY_NAME) oldCosyncAWSAccessKey = element;
                } 

                that.updateSecretKeyValue(AWS_S3_SECRET_KEY_NAME, data.awsSecretAccessKey, token, oldCosyncAWSSecretAccessKey._id).then(res => {
                    if (res) {
                        that.updateSecretKeyValue(AWS_S3_KEY_NAME, data.awsAccessKey, token, oldCosyncAWSAccessKey._id).then(result => {
                            resolve(result)
                        })
                    }
                    else resolve(res)
                })
                
            })

        });
    }


    updateSecretKeyValue(name, value, token, secretId){
        return new Promise((resolve, reject) => {  

            let updateValue = {
                "name": name,
                "value": value
            }
             
            const updateOptions = {
                method: 'PUT',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps/${app._id}/secrets/${secretId}`,
                headers: {
                    "content-type": "application/json", 
                    "Authorization": `Bearer ${token}`
                },
                body:JSON.stringify(updateValue) 

            };

            request(updateOptions, async function(error, response, body){  
                if(response.statusCode >= 200 && response.statusCode <= 290 || !error) resolve(true);
                else resolve(false)
            })

        })
    }
 


    getAllTriggers(data, token, app){
        return new Promise((resolve, reject) => {   
            const options = {
                method: 'GET',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps/${app._id}/triggers`,
                headers: {
                    "content-type": "application/json", 
                    "Authorization": `Bearer ${token}`
                },
                json: true 
            }; 
            request(options, async function(error, response, triggers){  
                resolve(triggers);
            });
        });
    }


 

    deleteTrigger(data, token, app, trigger){
        return new Promise((resolve, reject) => {   
            const options = {
                method: 'DELETE',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps/${app._id}/triggers/${trigger._id}`,
                headers: {
                    "content-type": "application/json", 
                    "Authorization": `Bearer ${token}`
                } 
            }  

            request(options, async function(error, response, body){ 
                resolve()
            });
        }); 
    }

    deleteFunction(data, token, app, function_id){
        return new Promise((resolve, reject) => {   
            const options = {
                method: 'DELETE',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps/${app._id}/functions/${function_id}`,
                headers: {
                    "content-type": "application/json", 
                    "Authorization": `Bearer ${token}`
                } 
            }  

            request(options, async function(error, response, body){
                resolve()
            });
        }); 

    }


    getAllCosyncFunctions(data, token, app){

        return new Promise((resolve, reject) => {   
            const options = {
                method: 'GET',
                url: `${REALM_API_URL}/groups/${data.projectId}/apps/${app._id}/functions`,
                headers: {
                    "content-type": "application/json", 
                    "Authorization": `Bearer ${token}`
                },
                json: true
            };

            
            request(options, async function(error, response, functions){  
                resolve(functions)
            });
        });
    }


}



const instance = new InitVersion()
module.exports = instance