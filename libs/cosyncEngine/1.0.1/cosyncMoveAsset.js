'use strict';

const path = require("path");

////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Cosync, Inc. All Rights Reserved.
// For questions about this license, you may write to mailto:info@cosync.io
//
//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Cosync, Inc., either version 3 of the License, or
//(at your option) any later version.
//
//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//GNU General Public License for more details.
//
//You should have received a copy of the GNU General Public License
//along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
////////////////////////////////////////////////////////////////////////////

/**
 * © 2023, Cosync, Inc. All Rights Reserved.
 * 
 * @author Tola VOEUNG
 * 
 * @Editor Tola VOEUNG  
 * Updated at: Feb, 2023
 * For questions about this license, you may write to mailto:info@cosync.io
*/
 
exports = async function cosyncMoveAsset(id){ 

    const mongodb = context.services.get("mongodb-atlas"); 
    const collectionAsset = mongodb.db("DATABASE_NAME").collection("CosyncAsset"); 

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

    for (let index = 0; index < assets.length; index++) {
        const asset = assets[index]; 
        if(asset.userId != currentUser.id) return 'INVALID_PERMISION';
        
        let paths = await context.functions.execute("MoveS3Object", asset);
        if (paths && paths.path){
            // get new paths
        }
    }


 
}