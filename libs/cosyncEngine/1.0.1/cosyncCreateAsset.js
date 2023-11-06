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
 
exports = async function cosyncCreateAsset(filePath, contentId, contentType, expirationHours, size, duration, color, xRes, yRes, caption, extra){
    
    const mongodb = context.services.get("mongodb-atlas"); 
    const collectionAsset = mongodb.db("DATABASE_NAME").collection("CosyncAsset"); 
    const currentUser = context.user;

    let returnedData = {
        "statusCode": 403
    };

    if(!contentId || !filePath || !contentType) {
        return JSON.stringify(returnedData);
    }

    let bucketLocation = `${currentUser.id}/${filePath}`;
    if(filePath.split("/").pop() == currentUser.id) bucketLocation = filePath;

    let moddedPath = await context.functions.execute("CosyncSanitizeFileName", bucketLocation, contentId); 
  
    let assetURL = await context.functions.execute("CosyncGetAssetUrl", moddedPath.path, contentType, expirationHours); 
    if (assetURL.error){
        if (assetURL.error.code == "CredentialsError") returnedData.statusCode = 401;
        else returnedData.statusCode = 402;
        
        return JSON.stringify(returnedData);
    } 


    let cosyncAsset = {
        _id: BSON.ObjectId(),
        userId: currentUser.id, 
        extra: extra,
        path: moddedPath.path,
        expirationHours: expirationHours,
        expiration: assetURL.expiration,
        contentType: contentType,
        size: size,
        duration: duration,
        color: color,
        xRes: xRes,
        yRes: yRes,
        caption: caption,
        url: assetURL.readUrl,
        urlVideoPreview: assetURL.urlVideoPreview,
        urlSmall: assetURL.urlSmall,
        urlMedium: assetURL.urlMedium,
        urlLarge: assetURL.urlLarge,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
    };

    returnedData.statusCode = 200;
    returnedData.asset = cosyncAsset

    // It is the responsibility of the caller to commit the asset
    return JSON.stringify(returnedData);
}