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
let config = global.__config;

class mongooseService {

    constructor(){
        
    }

    async init(callback) {

        let options = {
            useNewUrlParser: true,
            useUnifiedTopology: true ,
            useFindAndModify: false
        }

        if (config.db.user)
        {
            options.auth = {};
            options.auth.user = config.db.user;
        }
        if (config.db.password)
        {
            options.auth.password = config.db.password;
        }
        mongoose.set('useCreateIndex', true);
        // Database Name
        mongoose.connect(config.db.connectionString, options)
        .then(() => {
            console.log('Connecting to database is successful')
            callback(true);
        })
        .catch((err) => { 
            callback(false, err); 
        });
    }

    close() {
        client.close();
    }
}

const instance = new mongooseService()
module.exports = instance