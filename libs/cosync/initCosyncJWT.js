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
 
 
let mongoose = require('mongoose');   
const CONT = require('../../config/constants');
const SCHEMA = require('../../config/schema');   
let util = require("../util"); 
let atob = require('atob'); 
let hashService  = require('./hashService');

class InitCosyncJWT {

    constructor() { 
    }

    async create() {

        let _version = mongoose.model(CONT.TABLE.VERSIONS, SCHEMA.version);  
        let vesions = await _version.find({service: "CosyncJWT"}).sort({createdAt: 'desc'}); 
        
        if(!vesions[0]){

            let item = {
                "name" : "CosyncJWT",
                "service" : "CosyncJWT",
                "status" : "active", 
                "desc" : "Cosync JWT for JWT Authentication Solutions",
                "versionNumber" : "1.0.1",
                "createdAt": util.getCurrentTime(),
                "updatedAt": util.getCurrentTime()
            }
            let version = new _version(item); 
            version.save();
        }

    }


  
    
    async init(req, callback) {
        let error = {status: 'Fails', message: 'Invalid Data'};

        let data = req.body; 

        if(data.projectId == "" || !data.projectId || !data.publicKey || data.publicKey == "" || !data.privateKey || data.privateKey == ""){
            callback(null, error); 
            return;
        } 

        let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
        let app = await _app.findOne({ appId: data.appId });

        if(!app ) {
            callback(null, error); 
            return;
        }
       
        let _version = mongoose.model(CONT.TABLE.VERSIONS, SCHEMA.version);  
        let vesions = await _version.find({service: "CosyncJWT"}).sort({createdAt: 'desc'}); 
        
        let requestedVersion;

        if(data.version){

            vesions.forEach(element => {
                if(data.version == element.versionNumber) requestedVersion = element;
            });

           
            if(!requestedVersion){
                callback(null, error); 
                return;
            } 
            else if(requestedVersion.status != 'active'){
                error.message = `This version ${requestedVersion.versionNumber} is ${requestedVersion.status}`;
                callback(null, error); 
                return;
            } 
        }
        else requestedVersion = vesions[0] || { versionNumber: '1.0.1'};

        let cosyncJWT = require(`../cosyncJWT/${requestedVersion.versionNumber}/initVersion`);
        cosyncJWT.init(data, function(result, error){ 

            if(result){
                if(app.appData) app.appData = { CosyncJWTVersion:requestedVersion.versionNumber, CosyncEngineVersion: app.appData.CosyncEngineVersion};
                else app.appData = {CosyncJWTVersion:requestedVersion.versionNumber, CosyncEngineVersion: null};
                app.updatedAt = util.getCurrentTime(); 
                app.save();

                callback(app.appData);
               
            }
            else callback(result, error);

            
           
        });

    }
 


    async reinit(req, callback) { 
        
        let error = {status: 'Fails', message: 'Invalid Data'};
        let data = req.body;

        if(data.projectId == "" || !data.projectId || !data.publicKey || data.publicKey == "" || !data.privateKey || data.privateKey == ""){
            callback(null, error); 
            return;
        } 
        
        let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
        let app = await _app.findOne({ appId: data.appId });

        if(!app ) {
            callback(null, error); 
            return;
        }  
        
        let _version = mongoose.model(CONT.TABLE.VERSIONS, SCHEMA.version);  
        let vesions = await _version.find({service: "CosyncJWT"}).sort({createdAt: 'desc'}); 
       
        let requestedVersion;

        if(data.version){

            vesions.forEach(element => {
                if(data.version == element.versionNumber) requestedVersion = element;
            });

           
            if(!requestedVersion){
                callback(null, error); 
                return;
            } 
            else if(requestedVersion.status != 'active'){
                error.message = `This version ${requestedVersion.versionNumber} is ${requestedVersion.status}`;
                callback(null, error); 
                return;
            } 
        }
        else requestedVersion = vesions[0] || {versionNumber: '1.0.1'};
       

        let cosyncJWT = require(`../cosyncJWT/${requestedVersion.versionNumber}/initVersion`);
        cosyncJWT.reinit(data, function(result, error){

            if(result){
                if(app.appData) app.appData = { CosyncJWTVersion:requestedVersion.versionNumber, CosyncEngineVersion: app.appData.CosyncEngineVersion};
                else app.appData = {CosyncJWTVersion:requestedVersion.versionNumber, CosyncEngineVersion: null};
                 
                app.updatedAt = util.getCurrentTime();
                app.save();

                callback(app.appData);
                
                
            }
            else callback(result, error);
           
        });
    }

        


    async remove(req, callback) {  

        let error = {status: 'Fails', message: 'Invalid Data'};
        let data = req.body; 

        if(data.projectId == "" || !data.projectId || !data.publicKey || data.publicKey == "" || !data.privateKey || data.privateKey == ""){
            callback(null, error); 
            return;
        } 

        let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
        let app = await _app.findOne({ appId: data.appId });

        if(!app) {
            callback(null, error); 
            return;
        } 
        else if(!app.appData || !app.appData.CosyncJWTVersion || app.appData.CosyncJWTVersion == "") {
            callback(null, error); 
            return;
        } 

        let cosyncJWT = require(`../cosyncJWT/${app.appData.CosyncJWTVersion}/initVersion`);
        cosyncJWT.remove(data, function(result, error){
            if(result){
                
                if(app.appData) app.appData = { CosyncJWTVersion:null, CosyncEngineVersion: app.appData.CosyncEngineVersion};
                else app.appData = {CosyncJWTVersion:null, CosyncEngineVersion: null};

                app.updatedAt = util.getCurrentTime();
                app.save();
                callback(app.appData);
            }
            else callback(result, error);
        });
    }


}


const instance = new InitCosyncJWT()
module.exports = instance