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
    const assetCollection = mongodb.db("DATABASE_NAME").collection("CosyncAsset");
    const docId = changeEvent.documentKey._id; 
    const data = changeEvent.fullDocument;
     
    if(data.status == 'uploaded') { 
        collection.updateOne({ "_id": docId },{ "$set": {status: 'completed'} });  
        assetCollection.updateOne({ "_id": docId }, { "$set": {status: 'active'} });
        return;  
    } 
    else if(data.status != 'pending' || data.writeUrl || data.writeUrlSmall || data.writeUrlMedium || data.writeUrlLarge) return;  

    try {
        
        
        let contentType = data.contentType;

        let bucketLocation = `${data.uid}/${data.path}`;
        
        if(data.path.split("/").pop() == data.uid) bucketLocation = data.path;
        
        bucketLocation = await context.functions.execute("CosyncSanitizeFileName", bucketLocation); 

        let mainFile = await context.functions.execute("CosyncCreatePresignedURL", bucketLocation, data); 

        let updateData = {
            "status": "initialized",
            "writeUrl" : mainFile.writeUrl, 
            "path": mainFile.path,
            "updatedAt": new Date()
        }; 
        

        let assetData = { 
            _id: docId,
            _partition: data.assetPartition || data._partition,
            path: mainFile.path,
            expirationHours: data.expirationHours, 
            contentType: data.contentType,
            caption: data.caption || "",
            containerId : data.containerId || "",
            size: data.size || 0,
            duration: data.duration || 0,
            color: data.color || "#000000",
            xRes: data.xRes || 0,
            yRes: data.yRes || 0, 
            status: 'pending',
            uid: data.uid,  
            url: mainFile.readUrl,
            createdAt: new Date(),
            updatedAt: new Date()
        }; 

        if(mainFile.expiration){
            updateData.expiration = mainFile.expiration;
            assetData.expiration = updateData.expiration;
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
                assetData.urlVideoPreview = previewImage.readUrl;

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

            assetData.urlSmall = small.readUrl;
            updateData.writeUrlSmall = small.writeUrl;

            assetData.urlMedium = medium.readUrl;
            updateData.writeUrlMedium = medium.writeUrl;

            assetData.urlLarge = large.readUrl;
            updateData.writeUrlLarge = large.writeUrl;  
            
        } 
        
        const update = { "$set": updateData };  
        collection.updateOne({ "_id": docId }, update); 
        assetCollection.insertOne(assetData); 

    } catch (error) {
        const update = { "$set": {status: 'error'} };  
        collection.updateOne({ "_id": docId }, update); 
    }

    

}