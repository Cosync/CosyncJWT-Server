'use strict';
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
 * 
 * For questions about this license, you may write to mailto:info@cosync.io
*/
 
exports = async function removeS3File(path, contentType, expirationHours){ 

   
    const bucketName = expirationHours == 0 ? "AWS_PUBLIC_BUCKET_NAME" : "AWS_BUCKET_NAME";
    const bucketRegion = expirationHours == 0 ? "AWS_PUBLIC_BUCKET_REGION" : "AWS_BUCKET_REGION";

    const AWS = require('aws-sdk');
    const config = {
        accessKeyId: context.values.get("CosyncAWSAccessKey"),
        secretAccessKey: context.values.get("CosyncAWSSecretAccessKey"),
        region: bucketRegion,
    };
    AWS.config.update(config);

    const s3 = new AWS.S3({
        signatureVersion: 'v4',
        params: { Bucket: bucketName },
    });
    
    try { 

        let deleteObjectParams = {
            Bucket: bucketName,
            Delete: { Objects: [] }
        };
      
        deleteObjectParams.Delete.Objects.push({Key: path}); 
        
        let contentId = path.split('-').pop(); 

        if(contentType.indexOf('image') >= 0){
            
            let filenameLarge = path.split(contentId).join(`large-${contentId}`);
            let filenameMedium = path.split(contentId).join(`medium-${contentId}`);
            let filenameSmall = path.split(contentId).join(`small-${contentId}`);

            deleteObjectParams.Delete.Objects.push({Key: filenameSmall});
            deleteObjectParams.Delete.Objects.push({Key: filenameMedium});
            deleteObjectParams.Delete.Objects.push({Key: filenameLarge}); 

            
        }
        else if(contentType.indexOf('video') >= 0 ){ 
            
            let filenameSplit = path.split("-");
            filenameSplit.splice(filenameSplit.length - 1, 0, 'videopreview'); 

            let urlVideoPreview = filenameSplit.toString(); 
            urlVideoPreview = urlVideoPreview.split(",").join("-");

            let newPath = urlVideoPreview.split(".");
            newPath[newPath.length - 1] = '.png';

            let previewImagePath = newPath.toString(); 
            previewImagePath = previewImagePath.split(",").join("-");  

            deleteObjectParams.Delete.Objects.push({Key: previewImagePath});

            let filenameSmall = previewImagePath.split("-videopreview-").join("-small-"); 
            let filenameMedium = filenameSmall.split("-small-").join("-medium-"); 
            let filenameLarge = filenameSmall.split("-small-").join("-large-");  

            deleteObjectParams.Delete.Objects.push({Key: filenameSmall});
            deleteObjectParams.Delete.Objects.push({Key: filenameMedium});
            deleteObjectParams.Delete.Objects.push({Key: filenameLarge}); 

            
        } 
        
        await s3.deleteObjects(deleteObjectParams).promise();
        
        return true;
        
    } catch (error) {
        return false
    }
}