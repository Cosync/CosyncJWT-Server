
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
 * © 2020, Cosync, Inc. All Rights Reserved.
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

    let assetId = BSON.ObjectId(id);
    let asset = await collectionAsset.findOne({_id: assetId});  

    if(!asset || asset.status != 'active') return false;
    else if(!asset.expirationHours || asset.expirationHours == 0) return asset;

    const s3 = context.services.get("CosyncS3StorageService").s3("S3REGION");  
    
    let expReadTime;
    let millisecondInHour = 3600000;
    let millisecondInDay = 86400000;
    let millisecondInWeek = 604800000; 
    
    expReadTime = asset.expirationHours ? ( parseFloat(asset.expirationHours) * millisecondInHour ) : millisecondInDay;
    expReadTime = expReadTime > millisecondInWeek ? millisecondInWeek : expReadTime; 

    try {  
        
        asset.url = await s3.PresignURL({
            "Bucket": "S3BUCKET",
            "Key": asset.path,
            "Method": "GET", 
            "ExpirationMS": parseInt(expReadTime),
            "ContentType": asset.contentType
        });   

        asset.expiration = new Date();
        asset.expiration.setMilliseconds(asset.expiration.getMilliseconds() + expReadTime);


        if(asset.contentType.indexOf('image') >= 0 || asset.contentType.indexOf('video') >= 0){

            let filenameSmall; 

            if(asset.contentType.indexOf("video") >=0){

                if(asset.urlVideoPreview){

                    let filenameSplit = asset.urlVideoPreview.split("?").shift();
                    let urlVideoPreview = asset.uid +"/"+ filenameSplit.split(asset.uid).pop();  
                    
                    
                    asset.urlVideoPreview = await s3.PresignURL({
                        "Bucket": "S3BUCKET",
                        "Key": urlVideoPreview,
                        "Method": "GET", 
                        "ExpirationMS": parseInt(expReadTime),
                        "ContentType": asset.contentType
                    });
        
                    filenameSmall = urlVideoPreview.split("-videopreview-").join("-small-");
                }
            }
            else{
                let filenameSplit = asset.path.split("-");
                filenameSplit.splice(filenameSplit.length - 1, 0, 'small'); 
                filenameSmall = filenameSplit.toString();
                filenameSmall = filenameSmall.split(",").join("-");
            }

            if(filenameSmall){ 
            
                asset.urlSmall = await s3.PresignURL({
                    "Bucket": "S3BUCKET",
                    "Key": filenameSmall,
                    "Method": "GET", 
                    "ExpirationMS": parseInt(expReadTime),
                    "ContentType": asset.contentType
                }); 

                let filenameMedium = filenameSmall.split("-small-").join("-medium-"); 
                asset.urlMedium = await s3.PresignURL({
                    "Bucket": "S3BUCKET",
                    "Key": filenameMedium,
                    "Method": "GET", 
                    "ExpirationMS": parseInt(expReadTime),
                    "ContentType": asset.contentType
                }); 

                let filenameLarge = filenameSmall.split("-small-").join("-large-");  
                asset.urlLarge = await s3.PresignURL({
                    "Bucket": "S3BUCKET",
                    "Key": filenameLarge,
                    "Method": "GET", 
                    "ExpirationMS": parseInt(expReadTime),
                    "ContentType": asset.contentType
                }); 
            }
        } 

    } catch (error) {
        return false;
    }

    asset.updatedAt = new Date();
    collectionAsset.updateOne({ "_id": assetId }, { "$set": asset });  
    
    return asset;
}