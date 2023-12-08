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


exports = async function cosyncInitAsset(filePath, expirationHours, contentType){ 
    
    const currentUser = context.user;
    
    let returnedData = {
        "statusCode": 403
    };
    
    if(!filePath || !contentType) {
        return JSON.stringify(returnedData);
    }


    try { 

        let bucketLocation = `${currentUser.id}/${filePath}`;
        if(filePath.split("/").pop() == currentUser.id) bucketLocation = filePath;
        let moddedPath = await context.functions.execute("CosyncSanitizeFileName", bucketLocation); 
        bucketLocation = moddedPath.path;

        let mainFile = await context.functions.execute("CosyncCreatePresignedURL", bucketLocation, contentType, expirationHours); 
        if (mainFile.error){
            if (mainFile.error.code == "CredentialsError") returnedData.statusCode = 401;
            else returnedData.statusCode = 402;
            return JSON.stringify(returnedData);
        } 

        returnedData = {
            "statusCode": 200, 
            "contentId": moddedPath.contentId,
            "writeUrls": {
                "writeUrl" : mainFile.writeUrl,  
            }
        };  

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
               
                let previewImage = await context.functions.execute("CosyncCreatePresignedURL", previewImagePath, 'image/png', expirationHours);
                returnedData.writeUrls.writeUrlVideoPreview = previewImage.writeUrl;
                filenameSmall = previewImagePath.split("-videopreview-").join("-small-"); 
            }
            else{

                filenameSplit.splice(filenameSplit.length - 1, 0, 'small'); 
                filenameSmall = filenameSplit.toString();
                filenameSmall = filenameSmall.split(",").join("-");
            }  

            let small = await context.functions.execute("CosyncCreatePresignedURL", filenameSmall, contentType, expirationHours);
            let filenameMedium = filenameSmall.split("-small-").join("-medium-"); 
            let medium = await context.functions.execute("CosyncCreatePresignedURL", filenameMedium, contentType, expirationHours);

            let filenameLarge = filenameSmall.split("-small-").join("-large-");  
            let large = await context.functions.execute("CosyncCreatePresignedURL", filenameLarge, contentType, expirationHours); 
 
            returnedData.writeUrls.writeUrlLarge = large.writeUrl;
            returnedData.writeUrls.writeUrlMedium = medium.writeUrl;
            returnedData.writeUrls.writeUrlSmall = small.writeUrl; 
        }  

        return JSON.stringify(returnedData);

    } catch (error) {
        return JSON.stringify(returnedData);
    }

}