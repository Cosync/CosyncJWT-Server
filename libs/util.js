 
const uuidv4 = require('uuid/v4')
const jwt = require('jsonwebtoken');  
const fs = require('fs');   
const cert = fs.readFileSync(global.privateKey, 'utf8'); 
const serverPrivateKey = { key: cert, passphrase: global.__passKey }; 
 

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
	INVALID_SERVER_TOKEN:{code:400, message:"invalid server token"},
	 
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
 

exports.generateAccessToken = function(item, scope){
    const payload = {
      handle: item.handle,
      appId: item.appId,
      scope: scope ? scope : 'user'
    };
    const accessToken = jwt.sign(payload, serverPrivateKey, { algorithm: 'RS256' });
    return accessToken;
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
		console.log(error);
	}
}
 
 
  
