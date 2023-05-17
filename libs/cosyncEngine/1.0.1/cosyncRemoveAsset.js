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
 
exports = async function cosyncRemoveAsset(id){ 
      
  
    const mongodb = context.services.get("mongodb-atlas"); 
    const collectionAsset = mongodb.db("DATABASE_NAME").collection("CosyncAsset");
    const collectionAssetUpload = mongodb.db("DATABASE_NAME").collection("CosyncAssetUpload");
    const currentUser = context.user
    if(!id) return false;

    let assetId = BSON.ObjectId(id); 

    let asset = await collectionAsset.findOne({_id: assetId});

    if(!asset) return false; 
    else if(asset.userId != currentUser.id) return 'INVALID_PERMISION';

    const bucketName = asset.expirationHours == 0 ? "AWS_PUBLIC_BUCKET_NAME" : "AWS_BUCKET_NAME";
    const bucketRegion = asset.expirationHours == 0 ? "AWS_PUBLIC_BUCKET_REGION" : "AWS_BUCKET_REGION";

    const AWS = require('aws-sdk');
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

    let deleteParams = {
        Bucket: bucketName,
        Delete: { Objects: [{ Key: asset.path } ]}
    }; 

    if(asset.contentType.indexOf('image') >= 0){

        const timestamp = asset.path.split('-').pop();
        const large = asset.path.split(timestamp).join(`large-${timestamp}`);
        const medium = asset.path.split(timestamp).join(`medium-${timestamp}`);
        const small = asset.path.split(timestamp).join(`small-${timestamp}`);

        deleteParams.Delete.Objects.push(...[{ Key: large }, { Key: medium }, { Key: small }] );
        
    }
    else if(asset.contentType.indexOf('video') >= 0 && asset.urlVideoPreview){ 
        
        const filenameSplit = asset.urlVideoPreview.split("?").shift();
        const urlVideoPreview = asset.userId +"/"+ filenameSplit.split(asset.userId).pop();
        const filenameSmall = urlVideoPreview.split("-videopreview-").join("-small-"); 
        const filenameMedium = filenameSmall.split("-small-").join("-medium-"); 
        const filenameLarge = filenameSmall.split("-small-").join("-large-");  

        deleteParams.Delete.Objects.push(...[{Key: urlVideoPreview}, { Key: filenameSmall }, { Key: filenameMedium }, { Key: filenameLarge }]) 

    } 

    await s3.deleteObjects(deleteParams).promise(); 
    collectionAsset.deleteOne({"_id":asset._id}); 
    collectionAssetUpload.deleteOne({"_id":asset._id});
    
    return id;
}