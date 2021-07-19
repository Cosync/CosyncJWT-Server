'use strict';
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