
let config = {
  serverName: 'JWTServer', 
  port: 3000,
  db: {
    name: "CosyncJWTServer",
    connectionString: 'mongodb://localhost:27017/CosyncJWTServer'
  } 
}

module.exports = config;