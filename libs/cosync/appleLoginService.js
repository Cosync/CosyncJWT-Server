'use strict';


/**
 * Copyright 2023 Cosync, Inc. All Rights Reserved.
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
 * © 2023, Cosync, Inc. All Rights Reserved.
 * 
 * @author Tola VOEUNG
 * 
 * @Editor Tola VOEUNG  
 * For questions about this license, you may write to mailto:info@cosync.io
*/
 
  
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");  
const APPLE_BASE_URL = "https://appleid.apple.com";
const JWKS_APPLE_URI = "/auth/keys";
const client = jwksClient({
    cache: true,
    jwksUri: `${APPLE_BASE_URL}${JWKS_APPLE_URI}`,
});
 

class AppleLoginService {

    constructor() {
  
    }

    async getApplePublicKey(kid) {
        return new Promise((resolve, reject) => { 

            client.getSigningKey(kid, (error, result) => {
                
                if (error) {
                    console.error(error)
                    reject(error)
                }
                else {
                    let key = result.getPublicKey(); 
                    resolve(key)
                }
            
            });
        });
    }

    async verifyToken(data, callback){  

        const appleAppId = data.appleBundleId; 

        let error = {status:"false", message: "invalid token"}; 
        try {
            const decoded = jwt.decode(data.idToken, { complete: true });
            const { kid, alg } = decoded.header;
            const applePublicKey = await this.getApplePublicKey(kid);

            const jwtClaims = jwt.verify(data.idToken, applePublicKey, {algorithms: [alg]});
        
            if (jwtClaims?.iss !== APPLE_BASE_URL || jwtClaims?.aud !== appleAppId)  callback(null, error) 
            else callback(jwtClaims)
            

        } catch (err) {
            console.error(`jwt.verify error: ${err}`)
            callback(null, err)
            return
        }
    
    } 


    verifyTokenAsync(data){
        return new Promise((resolve, reject) => { 
            this.verifyToken(data, function(res, err){
                resolve(res)
            })
        })
    }
 
}


const instance = new AppleLoginService()
module.exports = instance