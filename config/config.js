
let config = {
  serverName: 'JWTServer', 
  serverPort: 3000,
  db: {
    name: "CosyncJWTServer",
    connectionString: 'mongodb://localhost:27017/CosyncJWTServer',
    //connectionString: 'mongodb+srv://cosyncjwt:C0SyncJWTP@sSk3y2021@clusterlocal.nqbxf.mongodb.net/CosyncJWTServerDatabase?retryWrites=true&w=majority'
  } 
}

module.exports = config;