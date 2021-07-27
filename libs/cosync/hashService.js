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

const bcrypt = require('bcrypt');
const saltRounds = 10; 

class HashService {

    constructor() {
         
    } 
    
    generateHash(plaintextPassword) {
        return new Promise((resolve, reject) => {
            bcrypt.hash(plaintextPassword, saltRounds, function(err, hash) {
                if(hash) resolve(hash);
                else reject(err);
            });
        });
    }; 


    validateHash(plaintextPassword, hash){
        return new Promise((resolve, reject) => {
            bcrypt.compare(plaintextPassword, hash, function(err, res) {
                if(res) resolve(true);
                else resolve(false);
            });
        });
    }
 
}


const instance = new HashService()
module.exports = instance