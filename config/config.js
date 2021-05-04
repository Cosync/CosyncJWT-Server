
let config = {
    apiurl:"http://localhost:3000/",
    webbaseurl:"http://localhost:4200/",
    allowOriginDomain: "http://localhost:4200",
    db: {
      name: "CosyncJWTServer",
      connectionString: 'mongodb://localhost:27017/CosyncJWTServer'
    } 
}

module.exports = config;