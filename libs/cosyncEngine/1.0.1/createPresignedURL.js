
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
 
exports = async function createPresignedURL(filename, data){ 
      
    const s3 = context.services.get("CosyncS3StorageService").s3("S3REGION");  
    
    let readUrl, expReadTime, expiration;
    let millisecondInHour = 3600000;
    let millisecondInDay = 86400000;
    let millisecondInWeek = 604800000;

    if(data.expirationHours === 0){

        filename = "public/"+filename; 
        readUrl = "https://S3BUCKET.s3.amazonaws.com/"+filename; 
    } 
    else{
       
        expReadTime = data.expirationHours ? ( parseFloat(data.expirationHours) * millisecondInHour ) : millisecondInDay;
        expReadTime = expReadTime > millisecondInWeek ? millisecondInWeek : expReadTime;

        readUrl = await s3.PresignURL({
            "Bucket": "S3BUCKET",
            "Key": filename, 
            "Method": "GET", 
            "ExpirationMS": parseInt(expReadTime),
            "ContentType": data.contentType
        });   

        expiration = new Date();
        expiration.setMilliseconds(expiration.getMilliseconds() + expReadTime);

    } 
   

    const writeUrl = await s3.PresignURL({
        "Bucket": "S3BUCKET",
        "Key": filename, 
        "Method": "PUT", 
        "ExpirationMS": millisecondInDay,
        "ContentType": data.contentType
    });  
 
    return { readUrl: readUrl,  writeUrl: writeUrl, path: filename, expiration: expiration};
}