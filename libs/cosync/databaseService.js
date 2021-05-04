var mongoose = require('mongoose');
var config = global.__config;
class mongooseService {

    constructor(){
        
    }

    async init(callback) {

        var options = {
            useNewUrlParser: true,
            useUnifiedTopology: true ,
            useFindAndModify: false
        }

        if (config.db.user)
        {
            options.auth = {};
            options.auth.user = config.db.user;
        }
        if (config.db.password)
        {
            options.auth.password = config.db.password;
        }
        mongoose.set('useCreateIndex', true);
        // Database Name
        mongoose.connect(config.db.connectionString, options)
        .then(() => {
            console.log('Connecting to database is successful')
            callback(true);
        })
        .catch((err) => {
            console.error(err)
        });
    }

    close() {
        client.close();
    }
}

const instance = new mongooseService()
module.exports = instance