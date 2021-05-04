
var config = {
    apiurl:"http://localhost:3000/",
    webbaseurl:"http://localhost:4200/",
    allowOriginDomain: "http://localhost:4200",
    db: {
      name: "CosyncJWT",
      connectionString: 'mongodb://localhost:27017/CosyncJWT'
    },
    storage : { 
      azureStorage:{
        "containerName":"assets-dev",
        "connString":"DefaultEndpointsProtocol=https;AccountName=cosyncjwtasset;AccountKey=yc+cNOpIMYJ/qeoa+cLjaDyfTfzh6UeYzzp4r/qh2NwcbLc7XA4gXTB+Oi7LRiaKij8dpK76DXN+L52TRpKBmA==;EndpointSuffix=core.windows.net"
      }
    },
    sendGrid : {
        apiKey: "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"
    },
    braintree : {
      environment:'sandbox',
      merchantId: 'f3gwz3xzcfy37xnz',
      publicKey: '96zgg4s7yk7ncdvp',
      privateKey: '34c819aac3e207dbedd2ed2cbbacfc03'
    },
    adminEmail:'tola@cosync.io',
    noreplyEmail:'noreply@cosync.io',
    companyName : "Cosync Inc Local",
    freeCommercialAppUser:5000,
    commercialAppUserPrice: 0.001,
    freePlanAppLimitted:20,
    freeDevelopmentAppUser:50,
    developerSessionExpiredTime: 0.4

}

module.exports = config;