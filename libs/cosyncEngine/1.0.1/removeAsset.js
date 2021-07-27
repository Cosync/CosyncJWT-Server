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
 

exports = async function removeAsset(changeEvent){ 

    const mongodb = context.services.get("mongodb-atlas"); 
    const collectionAssetUpload = mongodb.db("DATABASE_NAME").collection("CosyncAssetUpload"); 
    const assetId = changeEvent.documentKey._id; 
    const s3 = context.services.get("CosyncS3StorageService").s3("S3REGION"); 
    const asset = await collectionAssetUpload.findOne({_id: assetId});

    await s3.DeleteObject({
        "Bucket": "S3BUCKET",
        "Key": asset.path 
    });   
    
    let timestamp = asset.path.split('-').pop();

    if(asset.contentType.indexOf('image') >= 0){
        
        let large = asset.path.split(timestamp).join(`large-${timestamp}`);
        let medium = asset.path.split(timestamp).join(`medium-${timestamp}`);
        let small = asset.path.split(timestamp).join(`small-${timestamp}`);

        s3.DeleteObject({
            "Bucket": "S3BUCKET",
            "Key": large
        }); 

        s3.DeleteObject({
            "Bucket": "S3BUCKET",
            "Key": medium
        }); 

        s3.DeleteObject({
            "Bucket": "S3BUCKET",
            "Key": small
        }); 
    }
    else if(asset.contentType.indexOf('video') >= 0 && asset.urlVideoPreview){ 
        
        let filenameSplit = asset.urlVideoPreview.split("?").shift();
        let urlVideoPreview = asset.uid +"/"+ filenameSplit.split(asset.uid).pop();  

        s3.DeleteObject({
            "Bucket": "S3BUCKET",
            "Key": urlVideoPreview
        }); 

    } 
    
    collectionAssetUpload.deleteOne({"_id":assetId});

}