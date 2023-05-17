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
 * Updated at: May, 2023
 * For questions about this license, you may write to mailto:info@cosync.io
*/
 
exports = async function countUserS3DirectorySize(path, bucketName, bucketRegion){ 

    const AWS = require('aws-sdk');
   
    const config = {
        accessKeyId: context.values.get("CosyncAWSAccessKey"),
        secretAccessKey: context.values.get("CosyncAWSSecretAccessKey"),
        region: bucketRegion
    };
    AWS.config.update(config);  
    
    const s3 = new AWS.S3({
        signatureVersion: 'v4',
        params: { Bucket: bucketName },
    });

    const listParams = {
        Bucket: bucketName,
        Prefix: path, // ex. path/to/folder
    };

    let counter = 0;
    const listedObjects = await s3.listObjects(listParams).promise();
    if (listedObjects.Contents.length === 0) return counter; 
    
    listedObjects.Contents.forEach((item) => {
        counter += item['Size'];
    });

    return counter;
 
}