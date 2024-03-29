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
 
const fs = require('fs');
 

let util = require('../util'); 
const CONT = require('../../config/constants');
const SCHEMA = require('../../config/schema');
let _error = {status:"Fails", message:"Invalid Data"};
 

 
class AppLogsService {

  constructor() {

  }

  init() {
     
  }

  
  getLastLog(appId, action){
    return new Promise((resolve, reject) => {
      let _table = mongoose.model(CONT.TABLE.APP_LOGS, SCHEMA.applicationLogs);
      _table.findOne({ appId: appId, action: action }, {},  { sort: { 'createdAt' : -1 }, limit: 1 } ,function(err, app){
        resolve(app)
      });
    });
  }


  async addUserLog(appId, handle, action, value, status) {
    
    let __table = mongoose.model(CONT.TABLE.APP_LOGS, SCHEMA.applicationLogs);
    let data = {
      appId: appId,
      handle: handle,
      logType: "user",
      action: action,
      value: value || 'NULL',
      status: status || "success",
      createdAt: util.getCurrentTime()
    };

    let log = new __table(data); 
    log.save();

  } 

  async addLog(appId, action, value, status, logType) {
    
    let __table = mongoose.model(CONT.TABLE.APP_LOGS, SCHEMA.applicationLogs);
    
    let data = {
      appId: appId,
      action: action,
      value: value || "none",
      logType: logType || "app",
      status: status || "success",
      createdAt: util.getCurrentTime()
    };

    let log = new __table(data); 
    log.save();

  } 


  async getLog(appId, action, value, callback) {

    return new Promise((resolve, reject) => {
      let __table = mongoose.model(CONT.TABLE.APP_LOGS, SCHEMA.applicationLogs);
      let query = {
        appId: appId 
      };

      if(action) query.action = action;
      if(value) query.value = action; 
      
      __table.find(query, function(err, logs){ 
        if(callback) callback(logs);
        resolve(logs);
      }); 

    });

  }

  countAppsActiveDayPromise(appIds, startDate){
    return new Promise((resolve, reject) => {
      this.countAppsActiveDay(appIds, startDate, function(data){
        resolve(data);
      })
    });
  }


  async countAppsActiveDay(appIds, startDate, callback) {

      let dict = {};

      for (let index = 0; index < appIds.length; index++) {
        if(!dict[appIds[index]]) dict[appIds[index]] = {};
        dict[appIds[index]].acitveDay = 0; 
      }

      let __appLogtable = mongoose.model(CONT.TABLE.APP_LOGS, SCHEMA.applicationLogs);
      let query = {
        appId: {$in:appIds},
        action: 'status',
        createdAt: {
          $gte: startDate,
          $lte: util.getNextMonth(startDate, 1)
        }
      }; 
      
      let logs = await __appLogtable.find(query).sort({createdAt: 'asc'}); 
      
      if(logs && logs.length){
        let start;
        let current;
        for (let index = 0; logs < logs.length; index++) {
          current = logs[index];
          
          if(start && start.value == 'active') dict[current.appId].acitveDay += util.getDayBetween(start.createdAt, current.createdAt);

          start = current;
          
        } 
      }

      callback(dict);
      

    
  }
 

}

const instance = new AppLogsService()
module.exports = instance

 