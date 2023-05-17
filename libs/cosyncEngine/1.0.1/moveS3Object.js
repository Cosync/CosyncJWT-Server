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
 

exports = async function moveS3Object(asset){ 
 
    const AWS = require('aws-sdk');

    const bucketRegion = asset.path.indexOf("public/") >= 0 ? "AWS_PUBLIC_BUCKET_REGION" :  "AWS_BUCKET_REGION"
    const targetBucketName = source.indexOf("public/") >= 0 ? "AWS_PUBLIC_BUCKET_NAME" : "AWS_BUCKET_NAME"
    const sourceBucketName = source.indexOf("public/") >= 0 ? "AWS_PUBLIC_BUCKET_NAME" : "AWS_BUCKET_NAME"
    
    const config = {
        accessKeyId: context.values.get("CosyncAWSAccessKey"),
        secretAccessKey: context.values.get("CosyncAWSSecretAccessKey"),
        region: bucketRegion,
    };

    AWS.config.update(config);

    const s3 = new AWS.S3({
        signatureVersion: 'v4',
        params: { Bucket: targetBucketName },
    }); 
     
    const filePath = asset.path.indexOf("public/") >= 0 ? asset.path.split("public/").pop() : "public/"+asset.path;

    let newPaths = {
        path: filePath 
    };

    const copyParams = {
        Bucket: targetBucketName,
        CopySource: asset.path,
        Key: filePath
    }; 

    await s3.copyObject(copyParams).promise(); 

    await s3.deleteObject({
        "Bucket": sourceBucketName,
        "Key": asset.path 
    }).promise(); 

    let timestamp = asset.path.split('-').pop();

    if(asset.contentType.indexOf('image') >= 0){
        
        const large = asset.path.split(timestamp).join(`large-${timestamp}`);
        const newLarge = large.indexOf("public/") >= 0 ? large.split("public/").pop() : "public/"+large;

        let medium = asset.path.split(timestamp).join(`medium-${timestamp}`);
        const newMedium = medium.indexOf("public/") >= 0 ? medium.split("public/").pop() : "public/"+medium;

        let small = asset.path.split(timestamp).join(`small-${timestamp}`);
        const newSmall = small.indexOf("public/") >= 0 ? small.split("public/").pop() : "public/"+small;

        newPaths.small = newSmall;
        newPaths.medium = newMedium;
        newPaths.large = newLarge;

        await s3.copyObject({
            Bucket: targetBucketName,
            CopySource: large,
            Key: newLarge
        }).promise();  

        await s3.copyObject({
            Bucket: targetBucketName,
            CopySource: medium,
            Key: newMedium
        }).promise();  

        await s3.copyObject({
            Bucket: targetBucketName,
            CopySource: small,
            Key: newSmall
        }).promise(); 

        let deleteParams = {
            Bucket: sourceBucketName,
            Delete: { Objects: [{ Key: large }, { Key: medium }, { Key: small }] },
        };

        await s3.deleteObjects(deleteParams).promise(); 


    }
    else if(asset.contentType.indexOf('video') >= 0 && asset.urlVideoPreview){ 
        
        const filenameSplit = asset.urlVideoPreview.split("?").shift();
        const urlVideoPreview = filenameSplit.indexOf("public/") >= 0 ? "public/"+ filenameSplit.split("public/").pop() : asset.userId +"/"+ filenameSplit.split(asset.userId).pop();  
        const urlVideoPreviewNew = urlVideoPreview.indexOf("public/") >= 0 ? urlVideoPreview.split("public/").pop() : "public/"+urlVideoPreview;

        const large = urlVideoPreview.split("-videopreview-").join("-large-");  
        const newLarge = large.indexOf("public/") >= 0 ? large.split("public/").pop() : "public/"+large;

        const medium = urlVideoPreview.split("-videopreview-").join("-medium-"); 
        const newMedium = medium.indexOf("public/") >= 0 ? medium.split("public/").pop() : "public/"+medium;
       
        const small = urlVideoPreview.split("-videopreview-").join("-small-"); 
        const newSmall = small.indexOf("public/") >= 0 ? small.split("public/").pop() : "public/"+small;

        newPaths.urlVideoPreview = urlVideoPreviewNew;
        newPaths.small = newSmall;
        newPaths.medium = newMedium;
        newPaths.large = newLarge;

        await s3.copyObject({
            Bucket: targetBucketName,
            CopySource: urlVideoPreview,
            Key: urlVideoPreviewNew
        }).promise();  

        await s3.copyObject({
            Bucket: targetBucketName,
            CopySource: small,
            Key: newSmall
        }).promise(); 

        await s3.copyObject({
            Bucket: targetBucketName,
            CopySource: medium,
            Key: newMedium
        }).promise(); 

        await s3.copyObject({
            Bucket: targetBucketName,
            CopySource: large,
            Key: newLarge
        }).promise(); 
 
        let deleteParams = {
            Bucket: sourceBucketName,
            Delete: { Objects: [{ Key: large }, { Key: medium }, { Key: small }, {Key: urlVideoPreview}] },
        };
        await s3.deleteObjects(deleteParams).promise(); 
         
    } 
    
    return newPaths

}