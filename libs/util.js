 
const uuidv4 = require('uuid/v4')
const jwt = require('jsonwebtoken');  
const fs = require('fs');   
const cert = fs.readFileSync(global.privateKey, 'utf8'); 
const serverPrivateKey = { key: cert, passphrase: global.__passKey }; 
const _ = require('lodash'); 

function setHeader(res){
	res.setHeader("Content-Type", "application/json; charset=UTF-8");
	res.setHeader( "Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	res.setHeader("X-Powered-By", "Cosync, Inc.");
	return res;
}


exports.responseFormat = function(res, result, statusCode) { 
	
	res = setHeader(res); 
    let bodyResult = JSON.stringify(result);
	res.setHeader("Content-Length", Buffer.byteLength(bodyResult));
	statusCode = statusCode || 200;
	if( typeof result == 'number') result = result.toString();
	res.status(statusCode).send(result); 
}

exports.HTTP_STATUS_CODE = {
	OK:200,
	NO_CONTENT:204, 

	BAD_REQUEST: 400,
	UNAUTHORIZED:401, 
	FORBIDDEN:403,
	NOT_FOUND:404,

	INTERNAL_SERVER_ERROR: 501
  
};


exports.INTERNAL_STATUS_CODE = {
	INVALID_ADMIN_TOKEN:{code:400, message:"invalid admin token"},
	INVALID_APP_TOKEN:{code:400, message:"invalid app token"},
	APP_NOT_FOUND:{code:401, message:"app no longer exist"},
	APP_IS_SUSPENDED:{code:402, message:"app is suspended"},
	MISSING_PARAM:{code:403, message:"missing parameter"},
	USER_IS_SUSPENDED:{code:404, message:"user account is suspended"},
	INVALID_ACCESS_TOKEN:{code:405, message:"invalid access token"},
	APP_ISNOT_INVITATBLE:{code:406, message:"app does not support invitaion"},
	APP_ISNOT_SIGNUPABLE:{code:407, message:"app does not support signup"},
	APP_NO_GOOGLE_TWO_FACTOR:{code:408, message:"app does not support google two-factor verification"},
	APP_NO_PHONE_TWO_FACTOR:{code:409, message:"app does not support phone two-factor verification"},
	USER_NO_VERIFIED_PHONE:{code:410, message:"user does not have verified phone number"},
	SIGNUP_CODE_EXPRIRED:{code:411, message:"signup code expired."},
	PHONE_NUMBER_ALREADY_IN_USE:{code:412, message:"phone number already in use"},
	ACCESS_TOKEN_EXPRIRED:{code:501, message:"access token expired"},
	INTERNAL_SERVER_ERROR:{code:500, message:"internal server error"}, 
	INVALID_CREDENTIALS:{code:600, message:"invalid login credentials"},
	HANDLE_ALREADY_REGISTERED:{code:601, message:"handle already registered"},
	INVALID_DATA:{code:602, message:"invalid data"},
	EMAIL_NOT_EXIST:{code:603, message:"email does not exist"},
	INVALID_METADATA:{code:604, message:"invalid metadata"}
};


exports.getCurrentTime = function() { 
	let now = new Date().toUTCString(); 
	return now;
}
 

exports.getCurrentHour = function() { 
	let now = new Date().getUTCHours();  
	return now;
}


exports.getCurrentMonth = function() { 
	let now = new Date().getMonth();
	return now;
}
 

exports.daysInMonth = function() { 
	let now = new Date();  
	return new Date(now.getFullYear, now.getMonth, 0).getDate();
}
 

exports.getCurrentDate = function() { 
	let now = new Date().toUTCString(); 
	let today = new Date(now);
	return today.getFullYear() +'-'+ (today.getMonth() + 1) +'-'+ today.getDate();
}
 

exports.getRandomID = function() { 
	let id = uuidv4();
	id = id.split("-").join("");
	return id;
} 


exports.generateAppUserId = function(user, app) { 
	let uid = uuidv4();
	return uid.split("-").join("");
	 
} 

exports.getRandomNumber = function() { 
	// return 6 digits
	return Math.floor(Math.random()*899999+100000);
} 
 


exports.generateAuthJWTToken = function(user, app){

	let metaData = user.metaData || {}; 

	let payload = {
		aud: app.realmAppId,
		sub: user.handle,
		exp: getTimestamp(app.userJWTExpiration)
	}; 

	if(app.metaDataEmail)  payload.email = user.handle;

	let finalMetaData = {};
	
	for (let index = 0; index < app.metaData.length; index++) {
		const field = app.metaData[index];  
		if(field){ 
			if(field.fieldName == 'email'){ 
				_.set(finalMetaData, field.path, user.handle);
				delete payload.email;
			}

			let value = _.get(metaData, field.path);
			if(field.required && !value){ 
				return null;
			}
			else if(value) _.set(finalMetaData, field.path, value);
		}
	}; 

	for (let index = 0; index < app.metaDataInvite.length; index++) {
		const field = app.metaDataInvite[index];  
		if(field){ 
			let value = _.get(metaData, field.path);
			if(value) _.set(finalMetaData, field.path, value);
		}
	}; 

	for (const key in finalMetaData) {
		if(finalMetaData[key] !== undefined) payload[key] = finalMetaData[key]; 
	} 

	 
	let _privateKey = Buffer.from(app.appPrivateKey, 'base64'); 
	let appPrivateKey = _privateKey.toString('utf8'); 
	return jwt.sign(payload, appPrivateKey, { algorithm: 'RS256' });  

}


function getTimestamp(hour){
	hour = hour ? hour : 1; 
	let plusMiliSecond = hour * (1000*60*60);
	let timestamp = Date.now() + plusMiliSecond;
	let timeInSeconds = Math.floor(timestamp/1000); 
	return timeInSeconds;
}

exports.generateAccessToken = function(item, scope){
    const payload = {
      handle: item.handle,
      appId: item.appId,
      scope: scope ? scope : 'user'
    };
    const accessToken = jwt.sign(payload, serverPrivateKey, { algorithm: 'RS256' });
    return accessToken;
}
 

exports.generateSignToken = function(data, app){

    const payload = {
      handle: data.handle,
      uid: data.uid,
      appId: data.appId,
      code: data.code,
      metaData: data.metaData ? JSON.stringify(data.metaData, null, 10) : "" 
    };

    if(data.senderHandle)  payload.senderHandle = data.senderHandle;
    if(data.senderUserId)  payload.senderUserId = data.senderUserId; 
     
    let _privateKey = Buffer.from(app.appPrivateKey, 'base64');
    let appPrivateKey = _privateKey.toString('utf8'); 
    const token = jwt.sign(payload, appPrivateKey, { algorithm: 'RS256' });
    return token;
}




exports.generateSigninToken = function(item){
    const payload = {
      handle: item.handle,
      appId: item.appId,
      userId: item.uid
    };
    const accessToken = jwt.sign(payload, serverPrivateKey, { algorithm: 'RS256' });
    return accessToken;
}


exports.generateAppToken = function(item){
    const payload = { 
      appId: item.appId,
      scope: 'app'
    };
    const token = jwt.sign(payload, serverPrivateKey, { algorithm: 'RS256' });
    return token;
}
   

exports.generateAppSecretToken = function(item){
    const payload = { 
      appId: item.appId,
      scope: 'appSecret'
    };
    const token = jwt.sign(payload, serverPrivateKey, { algorithm: 'RS256' });
    return token;
}
   

exports.generateServerSecretToken = function(){
	try { 
		
		const payload = {
			name: global.__config.serverName,
			scope: 'server'
		};
		const accessToken = jwt.sign(payload, serverPrivateKey, { algorithm: 'RS256' });

		return accessToken;
	} catch (error) {
		 
		return null;
	}
}
 
 
  
