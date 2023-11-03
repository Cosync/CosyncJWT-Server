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
 
exports = async function cosyncGetAssetUrl(path, contentType, expirationHours){ 
 
        
    
    const AWS = require('aws-sdk');
    const bucketName = expirationHours == 0 ? "AWS_PUBLIC_BUCKET_NAME" : "AWS_BUCKET_NAME";
    const bucketRegion = expirationHours == 0 ? "AWS_PUBLIC_BUCKET_REGION" : "AWS_BUCKET_REGION";

    const config = {
        accessKeyId: context.values.get("CosyncAWSAccessKey"),
        secretAccessKey: context.values.get("CosyncAWSSecretAccessKey"),
        region: bucketRegion,
    };
    AWS.config.update(config);

    const s3 = new AWS.S3({
        signatureVersion: 'v4',
        params: { Bucket: bucketName },
    });

    let assetURL = { 
        url: null,
        urlSmall: null,
        urlMedium: null,
        urlLarge: null,
        expiration: null
    };  

    if (!expirationHours || expirationHours == 0){

        let baseURL = `https://${bucketName}.s3.amazonaws.com/public`;
        assetURL.url = `${baseURL}/${path}`;

        if(contentType.indexOf('image') >= 0 || contentType.indexOf('video') >= 0){
            let filenameSplit = path.split("-"); 
            let filenameSmall;  
            if(contentType.indexOf("video") >=0){ 

                filenameSplit.splice(filenameSplit.length - 1, 0, 'videopreview');  
                let urlVideoPreview = filenameSplit.toString(); 
                urlVideoPreview = urlVideoPreview.split(",").join("-");

                let newPath = urlVideoPreview.split(".");
                newPath[newPath.length - 1] = '.png';

                let previewImagePath = newPath.toString(); 
                previewImagePath = previewImagePath.split(",").join("-");  
                assetURL.urlVideoPreview = `${baseURL}/${previewImagePath}`;  

                filenameSmall = previewImagePath.split("-videopreview-").join("-small-");

            }
            else{
            
                filenameSplit.splice(filenameSplit.length - 1, 0, 'small'); 
                filenameSmall = filenameSplit.toString();
                filenameSmall = filenameSmall.split(",").join("-");
            }

            assetURL.urlSmall = `${baseURL}/${filenameSmall}`;  

            let filenameMedium = filenameSmall.split("-small-").join("-medium-");  
            assetURL.urlMedium = `${baseURL}/${filenameMedium}`;

            let filenameLarge = filenameSmall.split("-small-").join("-large-");  
            assetURL.urlLarge = `${baseURL}/${filenameLarge}`;
        }

        return assetURL;
    }   

    let secondInHour = 3600;
    let secondInDay = 86400;
    let secondInWeek = 604800; 

    let expReadTime = expirationHours ? ( parseFloat(expirationHours) * secondInHour ) : secondInDay;
    expReadTime = expReadTime > secondInWeek ? secondInWeek : expReadTime;

    assetURL.expiration = new Date();
    const timeInMillis = expReadTime * 1000;
    assetURL.expiration.setTime(assetURL.expiration.getTime() + timeInMillis);
    
    let params = {
        Bucket: bucketName,
        Key: path,
        Expires: parseInt(expReadTime)
    }; 

    try { 

        assetURL.url = await s3.getSignedUrlPromise('getObject', params); 

        if(contentType.indexOf('image') >= 0 || contentType.indexOf('video') >= 0){

            let filenameSplit = path.split("-");

            let filenameSmall; 

            if(contentType.indexOf("video") >=0){
                
                filenameSplit.splice(filenameSplit.length - 1, 0, 'videopreview'); 

                let urlVideoPreview = filenameSplit.toString(); 
                urlVideoPreview = urlVideoPreview.split(",").join("-");

                let newPath = urlVideoPreview.split(".");
                newPath[newPath.length - 1] = '.png';

                let previewImagePath = newPath.toString(); 
                previewImagePath = previewImagePath.split(",").join("-"); 
                
                params.Key = previewImagePath;
                assetURL.urlVideoPreview = await s3.getSignedUrlPromise('getObject', params); 

            }
            else{
                
                filenameSplit.splice(filenameSplit.length - 1, 0, 'small'); 
                filenameSmall = filenameSplit.toString();
                filenameSmall = filenameSmall.split(",").join("-");
            }

            if(filenameSmall){ 
            
                params.Key = filenameSmall;
                assetURL.urlSmall = await s3.getSignedUrlPromise('getObject', params);   

                let filenameMedium = filenameSmall.split("-small-").join("-medium-");  
                params.Key = filenameMedium;
                assetURL.urlMedium = await s3.getSignedUrlPromise('getObject', params);   

                let filenameLarge = filenameSmall.split("-small-").join("-large-");  
                params.Key = filenameLarge;
                assetURL.urlLarge = await s3.getSignedUrlPromise('getObject', params);   
            
            }
        }
            
        return assetURL;

    } catch (error) {
        return { error: error};
    }  
    
}