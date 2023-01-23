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
    else if(asset.uid != currentUser.id) return 'INVALID_PERMISION';

    const AWS = require('aws-sdk');
    const config = {
        accessKeyId: context.values.get("CosyncAWSAccessKey"),
        secretAccessKey: context.values.get("CosyncAWSSecretAccessKey"),
        region: "AWS_BUCKET_REGION",
    };
    AWS.config.update(config);

    const s3 = new AWS.S3({
        signatureVersion: 'v4',
        params: { Bucket: "AWS_BUCKET_NAME" },
    });

    await s3.deleteObject({
        "Bucket": "AWS_BUCKET_NAME",
        "Key": asset.path 
    }).promise();
    
    
    let timestamp = asset.path.split('-').pop();

    if(asset.contentType.indexOf('image') >= 0){
        
        let large = asset.path.split(timestamp).join(`large-${timestamp}`);
        let medium = asset.path.split(timestamp).join(`medium-${timestamp}`);
        let small = asset.path.split(timestamp).join(`small-${timestamp}`);

        s3.deleteObject({
            "Bucket": "AWS_BUCKET_NAME",
            "Key": large
        }); 

        s3.deleteObject({
            "Bucket": "AWS_BUCKET_NAME",
            "Key": medium
        }); 

        s3.deleteObject({
            "Bucket": "AWS_BUCKET_NAME",
            "Key": small
        }); 
    }
    else if(asset.contentType.indexOf('video') >= 0 && asset.urlVideoPreview){ 
        
        let filenameSplit = asset.urlVideoPreview.split("?").shift();
        let urlVideoPreview = asset.uid +"/"+ filenameSplit.split(asset.uid).pop();  

        s3.deleteObject({
            "Bucket": "AWS_BUCKET_NAME",
            "Key": urlVideoPreview
        }); 

        let filenameSmall = urlVideoPreview.split("-videopreview-").join("-small-"); 
        let filenameMedium = filenameSmall.split("-small-").join("-medium-"); 
        let filenameLarge = filenameSmall.split("-small-").join("-large-");  

        s3.deleteObject({
            "Bucket": "AWS_BUCKET_NAME",
            "Key": filenameSmall
        });
        
        s3.deleteObject({
            "Bucket": "AWS_BUCKET_NAME",
            "Key": filenameMedium
        });

        s3.deleteObject({
            "Bucket": "AWS_BUCKET_NAME",
            "Key": filenameLarge
        });

    } 

    collectionAsset.deleteOne({"_id":asset._id}); 
    collectionAssetUpload.deleteOne({"_id":asset._id});
    
    return id;
}