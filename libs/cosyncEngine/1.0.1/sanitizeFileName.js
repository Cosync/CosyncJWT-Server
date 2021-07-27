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
 

exports = function(filePath, type){
    let ext = filePath.split('.').pop();
    type = type ? "-"+type : "";
    let time = Date.now();
    
    let path = filePath.split('\\ ').join('-'); 
    path = path.split('\\').join('');
    path = path.split(`.${ext}`).join(`${type}-${time}.${ext}`);
    path = path.split('---').join('-');
    path = path.split('--').join('-');

    return path;
};