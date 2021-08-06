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

let crypto = require('crypto');
const bcrypt = require('bcrypt');
const saltRounds = 10; 
const CIPHER_ALGORITHM = 'aes-256-ctr';

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


    aesEncrypt(plaintext){

        if(!global.__config.encryptKey) return plaintext;

        if(!plaintext) return null;
        
        let sha256 = crypto.createHash('sha256');
        sha256.update(global.__config.encryptKey);
        
        let iv = crypto.randomBytes(16);
        let cipher = crypto.createCipheriv(CIPHER_ALGORITHM, sha256.digest(), iv);

        let ciphertext = cipher.update(Buffer.from(plaintext));
        let encrypted = Buffer.concat([iv, ciphertext, cipher.final()]).toString('base64');

        return encrypted;
        
    }

    aesDecrypt(encrypted){
        
        if(!global.__config.encryptKey) return encrypted;

        if(!encrypted || encrypted == "") return null;

        var sha256 = crypto.createHash('sha256');
        sha256.update(global.__config.encryptKey);
         
        var input = Buffer.from(encrypted, 'base64');

        if (input.length < 17) {
            
            return null;
        }

        // Initialization Vector
        var iv = input.slice(0, 16);
        var decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, sha256.digest(), iv);

        var ciphertext = input.slice(16);
        var plaintext = decipher.update(ciphertext) + decipher.final();

        return plaintext;
    }
 
}


const instance = new HashService()
module.exports = instance