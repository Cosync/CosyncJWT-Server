'use strict';
 
 
let mongoose = require('mongoose');   
const CONT = require('../../config/constants');
const SCHEMA = require('../../config/schema');   
let util = require("../util"); 



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

        let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
        let app = await _app.findOne({ appId: data.appId });

        if(!app ) {
            callback(null, error); 
            return;
        }  

       
        let _version = mongoose.model(CONT.TABLE.VERSIONS, SCHEMA.version);  
        let vesions = await _version.find({service: "CosyncJWT"}).sort({createdAt: 'desc'}); 
        
        let requestedVersion;

        if(req.body.version){

            vesions.forEach(element => {
                if(req.body.version == element.versionNumber) requestedVersion = element;
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
        cosyncJWT.init(req, function(result, error){ 

            if(result){
                if(app.appData) app.appData = { CosyncJWTVersion:requestedVersion.versionNumber, CosyncEngineVersion: app.appData.CosyncEngineVersion};
                else app.appData = {CosyncJWTVersion:requestedVersion.versionNumber, CosyncEngineVersion: null};
                app.updatedAt = util.getCurrentTime();
                app.realmAppId = req.body.realmAppId;
                app.save();

                callback(app.appData);
               
            }
            else callback(result, error);

            
           
        });

    }
 


    async reinit(req, callback) { 

        
        let error = {status: 'Fails', message: 'Invalid Data'};
        let data = req.body;
        let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
        let app = await _app.findOne({ appId: data.appId });

        if(!app ) {
            callback(null, error); 
            return;
        }  

        let _version = mongoose.model(CONT.TABLE.VERSIONS, SCHEMA.version);  
        let vesions = await _version.find({service: "CosyncJWT"}).sort({createdAt: 'desc'}); 
       
        let requestedVersion;

        if(req.body.version){

            vesions.forEach(element => {
                if(req.body.version == element.versionNumber) requestedVersion = element;
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
        cosyncJWT.reinit(req, function(result, error){

            

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
        cosyncJWT.remove(req, function(result, error){
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