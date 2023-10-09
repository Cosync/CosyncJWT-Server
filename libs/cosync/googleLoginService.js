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

const {OAuth2Client} = require('google-auth-library'); 
const oAuth2Client = new OAuth2Client();

class GoogleLoginService {

    constructor() {
  
    }

    async verifyToken(data, callback) {
        try { 
            let error = {status:"false", message: "invalid token"};  
            
            const result = await oAuth2Client.verifyIdToken({
                idToken: data.idToken,
                audience: data.googleClientId
            });

            if (result.payload && result.payload['aud'] == data.googleClientId){
                //console.log(`Token is verified`);
                callback(result.payload)
            }
            else {
                //console.log(`Invalid Token`);
                callback(false, error)
                return
            }

        } catch (error) { 
            callback(false, error) 
        }

    }
  
}


const instance = new GoogleLoginService()
module.exports = instance