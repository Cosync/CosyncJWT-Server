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
 * Updated at: Sep, 2022
 * For questions about this license, you may write to mailto:info@cosync.io
*/
 
exports = async function createPresignedURL(path, contentType, expirationHours){ 
    
    const AWS = require('aws-sdk');
    expirationHours = expirationHours || 0;
    contentType = contentType || "image/png";
    const bucketName = expirationHours == 0 ? "AWS_PUBLIC_BUCKET_NAME" : "AWS_BUCKET_NAME";
    const bucketRegion = expirationHours == 0 ? "AWS_PUBLIC_BUCKET_REGION" : "AWS_BUCKET_REGION";

    try { 
        const config = {
            accessKeyId: context.values.get("CosyncAWSAccessKey"),
            secretAccessKey: context.values.get("CosyncAWSSecretAccessKey"),
            region: bucketRegion,
        };
        AWS.config.update(config);
   
        const s3 = new AWS.S3({
            signatureVersion: 'v4',
            params: { Bucket: bucketRegion },
        });

        let readUrl, expReadTime, expiration;
        let secondInHour = 3600;
        let secondInDay = 86400;
        let secondInWeek = 604800;
        
        let params = {
            Bucket: bucketName,
            Key: path,
            Expires: secondInDay // 1 day
        };
    
        if(expirationHours === 0 || !expirationHours){

            params.Key = "public/"+path; 
            readUrl = `https://${bucketName}.s3.amazonaws.com/${params.Key}`; 
        } 
        else{
        
            expReadTime = expirationHours ? ( parseFloat(expirationHours) * secondInHour ) : secondInDay;
            expReadTime = expReadTime > secondInWeek ? secondInWeek : expReadTime;

            params.Expires = parseInt(expReadTime)
            readUrl =  await s3.getSignedUrlPromise('getObject', params); 

            expiration = new Date();
            expiration.setSeconds(expiration.getSeconds() + expReadTime);
            
        }

        params.ContentType = contentType;
        params.Expires = secondInDay;
        const writeUrl = await s3.getSignedUrlPromise('putObject', params); 
    
        return { readUrl: readUrl,  writeUrl: writeUrl, path: params.Key, expiration: expiration};

    } catch (error) {
        return { error: error};
    }
}