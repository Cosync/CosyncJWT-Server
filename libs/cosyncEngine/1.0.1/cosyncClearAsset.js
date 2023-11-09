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
 

exports = async function cosyncClearAsset(filePath, contentType, expirationHours, contentId){ 

    const currentUser = context.user;
    
    let returnedData = {
        "statusCode": 403
    };
    
    if(!filePath || !contentId || !contentType) {
        return JSON.stringify(returnedData);
    }


    try { 

        let bucketLocation = `${currentUser.id}/${filePath}`;
        if(filePath.split("/").pop() == currentUser.id) bucketLocation = filePath;
        let moddedPath = await context.functions.execute("CosyncSanitizeFileName", bucketLocation, contentId); 
        bucketLocation = moddedPath.path;  

        await context.functions.execute("CosyncRemoveS3File", bucketLocation, contentType, expirationHours); 
          
        returnedData.statusCode = 200;

        return JSON.stringify(returnedData);

    } catch (error) {
        return JSON.stringify(returnedData);
    }


}