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
 * © 2021, Cosync, Inc. All Rights Reserved.
 * 
 * @author Tola VOEUNG
 * 
 * @Editor Tola VOEUNG  
 * For questions about this license, you may write to mailto:info@cosync.io
*/
 

exports = async function removeAsset(changeEvent){ 

    const mongodb = context.services.get("mongodb-atlas"); 
    const collectionAsset = mongodb.db("DATABASE_NAME").collection("CosyncAsset");  
    const { updateDescription, fullDocument } = changeEvent;  
    const assetId = changeEvent.documentKey._id;
    let assetStatus, refCount;

    if(updateDescription){

        const updatedFields = Object.keys(updateDescription.updatedFields);
        assetStatus = updatedFields.some(field =>
            field.match(/status/)
        );

        refCount = updatedFields.some(field =>
            field.match(/refCount/)
        );
       
    }

    if (!assetStatus && !refCount ) return;
    if (fullDocument.status != "deleted" && fullDocument.refCount != 0) return;

    const asset = await collectionAsset.findOne({_id: assetId});
    if(!asset) return false; 
    
    await context.functions.execute("CosyncRemoveS3File",  asset.expirationHours == 0 ? "public/" + asset.path : asset.path, asset.contentType, asset.expirationHours); 
    collectionAsset.deleteOne({"_id":assetId});
     
}