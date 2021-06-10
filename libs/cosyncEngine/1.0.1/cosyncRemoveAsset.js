
////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Cosync, Inc. All Rights Reserved.
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
    const currentUser = context.user
    if(!id) return false;

    let assetId = BSON.ObjectId(id); 

    let asset = await collectionAsset.findOne({_id: assetId});

    if(!asset) return false; 
    else if(asset.uid != currentUser.id) return 'INVALID_PERMISION';
      
    const s3 = context.services.get("CosyncS3StorageService").s3("S3REGION");  

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

    collectionAsset.deleteOne({"_id":asset._id}); 
    collectionAssetUpload.deleteOne({"_id":asset._id});
    
    return true;
}