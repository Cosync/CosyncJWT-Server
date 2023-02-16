
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

exports = async function cosyncArchiveAsset(id){
  
    const mongodb = context.services.get("mongodb-atlas"); 
    const collectionAsset = mongodb.db("DATABASE_NAME").collection("CosyncAsset");
    const currentUser = context.user
    if(!id) return false;

    let assetId = BSON.ObjectId(id); 

    let asset = await collectionAsset.findOne({_id: assetId});

    if(!asset) return false; 
    else if(asset.userId != currentUser.id) return 'INVALID_PERMISION'; 

    let update = {
        updatedAt : new Date(),
        status: 'archived'
    }

    collectionAsset.updateOne({ "_id": asset._id }, { "$set": update });  
    
    return true;
}