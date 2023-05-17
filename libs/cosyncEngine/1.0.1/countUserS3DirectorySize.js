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
 
exports = async function countUserS3DirectorySize(){ 

    const activeUser = context.user;
    let count1 = await context.functions.execute("CosyncCountS3DirectorySize", `public/${activeUser.id}`, "AWS_PUBLIC_BUCKET_NAME", "AWS_PUBLIC_BUCKET_REGION");
    let count2 = await context.functions.execute("CosyncCountS3DirectorySize", activeUser.id, "AWS_BUCKET_NAME", "AWS_BUCKET_REGION");
    return count1 + count2 
}