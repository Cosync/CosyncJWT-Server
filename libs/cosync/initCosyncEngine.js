'use strict'; 
let mongoose = require('mongoose');   
const CONT = require('../../config/constants');
const SCHEMA = require('../../config/schema');   
let util = require("../util"); 
let atob = require('atob'); 

class InitCosyncEngine {

    constructor() {
        
    }

    async create() {
        let _version = mongoose.model(CONT.TABLE.VERSIONS, SCHEMA.version);  
        let vesions = await _version.find({service: "CosyncEngine"}).sort({createdAt: 'desc'}); 
        if(!vesions[0]){

            let item = {
                "status" : "active", 
                "name" : "CosyncEngine",
                "service" : "CosyncEngine",
                "desc" : "Cosync Engine for Storage Solutions for AWS",
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

        if(data.projectId == "" || !data.projectId || 
            !data.realmDatabase || data.realmDatabase == "" || 
            !data.serviceId || data.serviceId == "" || 
            !data.s3Bucket || data.s3Bucket == "" || 
            !data.s3Region || data.s3Region == "" || 
            !data.publicKey || data.publicKey == "" || 
            !data.privateKey || data.privateKey == ""){
            callback(null, error); 
            return;
        }

        let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
        let app = await _app.findOne({ appId: data.appId });

        if(!app ) {
            callback(null, error); 
            return;
        }

        data.app = app;
        data.app.appRealmPublicKey = atob(app.appPublicKey); 
       
        let _version = mongoose.model(CONT.TABLE.VERSIONS, SCHEMA.version);  
        let vesions = await _version.find({service: "CosyncEngine"}).sort({createdAt: 'desc'});
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

        let cosyncEngine = require(`../cosyncEngine/${requestedVersion.versionNumber}/initVersion`);
        cosyncEngine.init(data, function(result, error){

            if(result){
                if(app.appData) app.appData = { CosyncEngineVersion:requestedVersion.versionNumber, CosyncJWTVersion: app.appData.CosyncJWTVersion}; 
                else app.appData = {CosyncEngineVersion:requestedVersion.versionNumber, CosyncJWTVersion: null};
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

        if(data.projectId == "" || !data.projectId ||  
            !data.serviceId || data.serviceId == "" || 
            !data.s3Bucket || data.s3Bucket == "" || 
            !data.s3Region || data.s3Region == "" || 
            !data.publicKey || data.publicKey == "" || 
            !data.privateKey || data.privateKey == ""){
            callback(null, error); 
            return;
        } 

        let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
        let app = await _app.findOne({ appId: data.appId});

        if(!app ) {
            callback(null, error); 
            return;
        }  

        data.app = app;
        data.app.appRealmPublicKey = atob(app.appPublicKey); 

        let _version = mongoose.model(CONT.TABLE.VERSIONS, SCHEMA.version);  
        let vesions = await _version.find({service: "CosyncEngine"}).sort({createdAt: 'desc'});  

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
       

        let cosyncEngine = require(`../cosyncEngine/${requestedVersion.versionNumber}/initVersion`);
        cosyncEngine.reinit(data, function(result, error){

            if(result){
                if(app.appData) app.appData = { CosyncEngineVersion:requestedVersion.versionNumber, CosyncJWTVersion: app.appData.CosyncJWTVersion}; 
                else app.appData = {CosyncEngineVersion:requestedVersion.versionNumber, CosyncJWTVersion: null};
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
  
        if(data.projectId == "" || !data.projectId ||  
        !data.serviceId || data.serviceId == "" || 
        !data.s3Bucket || data.s3Bucket == "" || 
        !data.s3Region || data.s3Region == "" || 
        !data.publicKey || data.publicKey == "" || 
        !data.privateKey || data.privateKey == ""){
        callback(null, error); 
        return;
    } 

        let _app = mongoose.model(CONT.TABLE.APPS, SCHEMA.application);
        let app = await _app.findOne({ appId: data.appId });

        if(!app ) {
            callback(null, error); 
            return;
        } 
        else if(!app.appData || !app.appData.CosyncEngineVersion || app.appData.CosyncEngineVersion == "") {
            callback(null, error); 
            return;
        } 

        data.app = app;
        data.app.appRealmPublicKey = atob(app.appPublicKey); 

        let cosyncEngine = require(`../cosyncEngine/${app.appData.CosyncEngineVersion}/initVersion`);
        cosyncEngine.remove(data, function(result, error){

            if(result){ 

                if(app.appData) app.appData = { CosyncEngineVersion:null, CosyncJWTVersion: app.appData.CosyncJWTVersion}; 
                else app.appData = {CosyncEngineVersion:null, CosyncJWTVersion: null};
                app.updatedAt = util.getCurrentTime();
                app.save();

                callback(app.appData);
                

            }
            else callback(result, error);
           
        });




    }
 

}



const instance = new InitCosyncEngine()
module.exports = instance