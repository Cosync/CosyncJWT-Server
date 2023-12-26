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
 
exports = async function cosyncRefreshAsset(id){
   
    const mongodb = context.services.get("mongodb-atlas"); 
    const collectionAsset = mongodb.db("DATABASE_NAME").collection("CosyncAsset"); 

    if(!id) return false;
    let assetIds = [];
    try {
        if(id.indexOf(",") >=0){
        
            let ids = id.split(",");
            ids.forEach(item => {
                assetIds.push(BSON.ObjectId(item))
            }); 
        }
        else {
            assetIds.push(BSON.ObjectId(id))
        }
    } catch (error) {
        return false
    } 

    let assets = await collectionAsset.find({_id: {$in: assetIds } }).toArray();

    if(assets.length == 0) return false;
     
    let updatedAssetList = [];
 
    for (let index = 0; index < assets.length; index++) {
        const asset = assets[index]; 
 

        try {

            let updatedAsset = { 
                userId: asset.userId,
                expirationHours:asset.expirationHours,
                contentType:asset.contentType,
                expiration:asset.expiration,
                urlVideoPreview :asset.urlVideoPreview,
                status:asset.status,
                size: asset.size,
                createdAt:asset.createdAt,
                updatedAt: asset.createdAt
            };

            let assetURL = await context.functions.execute("CosyncGetAssetUrl", asset.path, asset.contentType, asset.expirationHours); 
            if(assetURL.error){
                return false;
            }

            updatedAsset.url = assetURL.url 

            if (assetURL.expiration) updatedAsset.expiration = assetURL.expiration;
            if (assetURL.urlVideoPreview) updatedAsset.urlVideoPreview = assetURL.urlVideoPreview;

            if(assetURL.urlSmall){ 
                updatedAsset.expiration = assetURL.expiration; 
                updatedAsset.urlSmall = assetURL.urlSmall
                updatedAsset.urlMedium = assetURL.urlMedium
                updatedAsset.urlLarge = assetURL.urlLarge  
            }

            updatedAsset.updatedAt = new Date();

            collectionAsset.updateOne({ "_id": asset._id }, { "$set": updatedAsset });  
            updatedAsset._id = asset._id;
            updatedAssetList.push(updatedAsset)
            

        } catch (error) {
            return false;
        } 

    }

    return JSON.stringify(updatedAssetList);
}