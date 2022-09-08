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

exports = async function assetUpload(changeEvent){

    const mongodb = context.services.get("mongodb-atlas");
    const collection = mongodb.db("DATABASE_NAME").collection("CosyncAssetUpload");
    const collectionAsset = mongodb.db("DATABASE_NAME").collection("CosyncAsset");
    const docId = changeEvent.documentKey._id; 
    const data = changeEvent.fullDocument;
     
    if(data.status == 'uploaded') { // upload asset is finished  

        let asset = { 
            _id: docId,
            path: data.path,
            sessionId: data.sessionId,
            expirationHours: data.expirationHours, 
            expiration: data.expiration,
            contentType: data.contentType,
            caption: data.caption || "", 
            size: data.size || 0,
            duration: data.duration,
            color: data.color || "#000000",
            xRes: data.xRes || 0,
            yRes: data.yRes || 0,  
            status : 'active',
            userId: data.userId,  
            url: data.url,
            urlSmall: data.urlSmall,
            urlMedium: data.urlMedium,
            urlLarge: data.urlLarge,
            urlVideoPreview: data.urlVideoPreview,
            createdAt: new Date(),
            updatedAt: new Date()
        }; 

        if(data.expirationHours == 0 && data.contentType.indexOf('video')>= 0) asset.urlVideoPreview = data.url;

        // create asset object in asset table
        collectionAsset.updateOne({ "_id": docId }, asset,  { upsert: true });  
        
        collection.updateOne({ "_id": docId },{ "$set": {status: 'completed'} });  

        
    } 
    else if(data.status != 'pending' || data.writeUrl || data.writeUrlSmall || data.writeUrlMedium || data.writeUrlLarge){
        // nothing here
    }
    else{ // request upload asset
        
        try {
            
            let contentType = data.contentType;

            let bucketLocation = `${data.uid}/${data.filePath}`;
            
            if(data.filePath.split("/").pop() == data.userId) bucketLocation = data.filePath;
            bucketLocation = await context.functions.execute("CosyncSanitizeFileName", bucketLocation); 

            let mainFile = await context.functions.execute("CosyncCreatePresignedURL", bucketLocation, data); 

            let updateData = {
                "status": "initialized",
                "writeUrl" : mainFile.writeUrl, 
                "url" : mainFile.readUrl, 
                "path": mainFile.path,
                "updatedAt": new Date()
            }; 
    
            if(mainFile.expiration){
                updateData.expiration = mainFile.expiration; 
            }

            if(contentType.indexOf("image") >=0 || contentType.indexOf("video") >=0){
                
                let filenameSplit = bucketLocation.split("-");
            
                let filenameSmall;

                if(contentType.indexOf("video") >=0 ){ 
                    
                    filenameSplit.splice(filenameSplit.length - 1, 0, 'videopreview'); 

                    let urlVideoPreview = filenameSplit.toString(); 
                    urlVideoPreview = urlVideoPreview.split(",").join("-");

                    let newPath = urlVideoPreview.split(".");
                    newPath[newPath.length - 1] = '.png';

                    let previewImagePath = newPath.toString(); 
                    previewImagePath = previewImagePath.split(",").join("-"); 
                    
                    let imageThumb = {
                        expirationHours: data.expirationHours,
                        contentType: 'image/png', 
                    };
                    
                    let previewImage = await context.functions.execute("CosyncCreatePresignedURL", previewImagePath, imageThumb); 

                    updateData.writeUrlVideoPreview = previewImage.writeUrl;
                    updateData.urlVideoPreview = previewImage.readUrl;

                    filenameSmall = previewImagePath.split("-videopreview-").join("-small-"); 
                }
                else{

                    filenameSplit.splice(filenameSplit.length - 1, 0, 'small'); 
                    filenameSmall = filenameSplit.toString();
                    filenameSmall = filenameSmall.split(",").join("-");
                }  

                let small = await context.functions.execute("CosyncCreatePresignedURL", filenameSmall, data);

                let filenameMedium = filenameSmall.split("-small-").join("-medium-"); 
                let medium = await context.functions.execute("CosyncCreatePresignedURL", filenameMedium, data);

                let filenameLarge = filenameSmall.split("-small-").join("-large-");  
                let large = await context.functions.execute("CosyncCreatePresignedURL", filenameLarge, data); 

                
                updateData.writeUrlSmall = small.writeUrl;
                updateData.urlSmall = small.readUrl;
            
                updateData.writeUrlMedium = medium.writeUrl;
                updateData.urlMedium = medium.readUrl;
                
                updateData.writeUrlLarge = large.writeUrl;  
                updateData.urlLarge = large.readUrl;  
            } 
            
            const update = { "$set": updateData };  
            collection.updateOne({ "_id": docId }, update);

        } catch (error) {
            const update = { "$set": {status: 'error'} };  
            collection.updateOne({ "_id": docId }, update); 
        }
    }
}