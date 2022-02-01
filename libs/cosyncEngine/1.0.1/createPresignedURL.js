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
 
exports = async function createPresignedURL(path, data){ 
      
    const s3 = context.services.get("CosyncS3StorageService").s3("S3REGION");  
    
    let readUrl, expReadTime, expiration;
    let millisecondInHour = 3600000;
    let millisecondInDay = 86400000;
    let millisecondInWeek = 604800000;

    if(data.expirationHours === 0 || !data.expirationHours){

        path = "public/"+path; 
        readUrl = "https://S3BUCKET.s3.amazonaws.com/"+path; 
    } 
    else{
       
        expReadTime = data.expirationHours ? ( parseFloat(data.expirationHours) * millisecondInHour ) : millisecondInDay;
        expReadTime = expReadTime > millisecondInWeek ? millisecondInWeek : expReadTime;

        readUrl = await s3.PresignURL({
            "Bucket": "S3BUCKET",
            "Key": path, 
            "Method": "GET", 
            "ExpirationMS": parseInt(expReadTime),
            "ContentType": data.contentType
        });   

        expiration = new Date();
        expiration.setMilliseconds(expiration.getMilliseconds() + expReadTime);

    } 
   

    const writeUrl = await s3.PresignURL({
        "Bucket": "S3BUCKET",
        "Key": path, 
        "Method": "PUT", 
        "ExpirationMS": millisecondInDay,
        "ContentType": data.contentType
    });  
 
    return { readUrl: readUrl,  writeUrl: writeUrl, path: path, expiration: expiration};
}