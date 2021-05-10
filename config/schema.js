let mongoose = require('mongoose');
let mongooseSchema = mongoose.Schema;
 
module.exports.application = new mongooseSchema({
  appId: {
    required: true,
    type: String,
    comment: 'appid of the app.',
    index: true 
  },
  name: {
      required: true,
      type: String,
      comment: 'Name of the app.',
      index: true 
  }, 
  status: {
    required: true,
    type: String,
    default: "active",
    comment: 'status of app acitve/suspended.',
    index: true 
  }, 
  jwtEnabled: {
    default: false,
    type: Boolean,
    comment: 'Allow app jwt',
    index: true 
  }, 
  appPrivateKey: String,
  appPublicKey: String,
  appToken: String, 
  appSecret: String, 
  type: {
      default: "development",
      type: String,
      comment: 'development (dev) or commercial (pro) app.',
      index: true 
  },
  handle: {
    default: "email",
    type: String,
    comment: 'handle type for app user to login into the app.',
    index: true 
  },
  invitationEnabled: {
    default: true,
    type: Boolean,
    comment: 'Allow app invitation',
    index: true 
  },
  signupEnabled: {
    default: true,
    type: Boolean,
    comment: 'Allow app signup',
    index: true 
  },
  signupFlow: {
    default: 'code',
    type: String,
    comment: 'set signup flow to code or link',
    index: true 
  }, 
  twoFactorVerification: {
    default: "none",
    type: String,
    comment: "two factor login verification 'none', 'optional', or 'mandatory' ",
    index: true 
  },
  TWILIOAccountSid: { 
    type: String,
    comment: "Twilio accnout sid for 2 step verification." 
  },
  TWILIOToken: { 
    type: String,
    comment: "Twilio token for 2 step verification " 
  },
  TWILIOPhoneNumber: { 
    type: String,
    comment: "Twilio phone number for sending sms code 2 step verification " 
  },
  googleAppName:String,
  maxUsers: { 
    type: Number,
    default: 0,
    comment: "maximum number of users for a commercial application ",
    index: true 
  },
  maxLoginAttempts: { 
    type: String,
    comment: "maximum number of login attempts on a user before status is set to locked if set to zero, there is no maximum ",
    index: true 
  },
  passwordFilter: { 
    type: Boolean,
    default: false
  },
  passwordMinLength: { 
    type: Number,
    default: 5
  },
  passwordMinUpper: { 
    type: Number,
    default: 0
  },
  passwordMinLower: { 
    type: Number,
    default: 0
  },
  passwordMinDigit: { 
    type: Number,
    default: 0
  },
  passwordMinSpecial: { 
    type: Number,
    default: 0
  },
  userJWTExpiration: { 
    type: Number,
    default: 24
  },
  realmAppId: { 
    type: String,
    comment: "MongoDB Realm App Id",
    index: true 
  },
  appData: { 
    type: Object,
    comment: "application data (set by the application), existence means app was initialized ", 
  },
  metaDataInvite: { 
    type: Array,
    comment: "app invite meta data (array of metaDataField object)", 
  },
  metaData: { 
    type: Array,
    comment: "jwt authentication meta data (array of metaDataField object)", 
  }, 
  metaDataEmail: Boolean,
  createdAt: { 
      type: Date,
      default: new Date().toUTCString()
  },
  updatedAt: { 
      type: Date,
      default: new Date().toUTCString()
  }

});
 

module.exports.invite = new mongooseSchema({
    handle: {
      required: true,
      type: String,
      index: true 
    },
    appId: {
      required: true,
      type: String,
      index: true 
    },
    senderHandle: {
      required: true,
      type: String,
      index: true 
    }, 
    senderUserId: {
      required: true,
      type: String,
      index: true 
    }, 
    metaData: { 
      type: Object,
      comment: "metaData data (set by the application) ", 
    },
     
    code: {
      required: true,
      type: Number,
      index: true 
    }, 
    status: {
      type: String,
      default: 'pending',
      index: true 
    },  
    createdAt: { 
      type: Date,
      default: new Date().toUTCString()
    },
    updatedAt: { 
      type: Date,
      default: new Date().toUTCString()
    }

});
 

module.exports.signup = new mongooseSchema({ 
    appId: {
      required: true,
      type: String,
      index: true 
    },
    handle: {
      required: true,
      type: String,
      index: true 
    },
    password: {
      required: true,
      type: String,
      comment: 'password of the user.',
      index: true 
    },  
    code: {
      required: true,
      type: Number,
      index: true 
    }, 
    metaData: { 
      type: Object,
      comment: "meta data (set by the application) ", 
    }, 
    status: {
      type: String,
      default: 'pending',
      index: true 
    }, 
    createdAt: { 
      type: Date,
      default: new Date().toUTCString()
    },
    updatedAt: { 
      type: Date,
      default: new Date().toUTCString()
    }
});

module.exports.user = new mongooseSchema({  
     
    handle: {
      required: true,
      type: String,
      comment: 'handle of the user.',
      index: true 
    },
    password: {
      required: true,
      type: String,
      comment: 'password of the user.',
      index: true 
    },  
    appId: {
      required: true,
      type: String,
      index: true 
    }, 
    status: {
      required: true,
      type: String,
      index: true,
      default: 'active'
    },
    twoFactorPhoneVerification: {
      type: Boolean, 
      index: true , 
      comment: 'two factor for Phone verification',
    },
    twoFactorGoogleVerification: {
      type: Boolean, 
      index: true , 
      comment: 'two factor for Google verification.',
    },
    googleSecretKey: {
      type: String, 
      index: true ,
      comment: 'two factor with Google Authenticator.',
    },
    twoFactorCode: {
      type: String, 
      index: true ,
      comment: 'two factor with Twilio SMS.',
    },
    phone: {
      type: String, 
      index: true ,
      comment: 'Phone number +123456789 ',
    },
    phoneCode: {
      type: Number, 
      index: true ,
      comment: 'to verify code when add/update phone.',
    },
    phoneVerified: {
      type: Boolean, 
      index: true ,
      comment: 'TRUE when is verify.',
    },
    
    metaData: { 
      type: Object
    }, 
    lastLogin: { 
      type: Date
    },
    createdAt: { 
      type: Date,
      default: new Date().toUTCString()
    },
    updatedAt: { 
      type: Date,
      default: new Date().toUTCString()
    }
});
  
  
    

module.exports.resetPassword = new mongooseSchema({  
  handle: {
    required: true,
    type: String,
    index: true 
  },
  code: {
    required: true,
    type: Number,
    index: true 
  }, 
  appId: {
    required: true,
    type: String,
    index: true 
  },
  status: {
    type: String,
    default: 'pending',
    index: true 
  }, 
  createdAt: { 
    type: Date,
    default: new Date().toUTCString()
  },
  updatedAt: { 
    type: Date,
    default: new Date().toUTCString()
  }
});

 



module.exports.emailTemplate = new mongooseSchema({
  appId: { 
    type: String,
    required: true,
    index: true 
  },
  templateName: {
    required: true,
    type: String,
    index: true 
  }, 
  subject: {
    required: true,
    type: String,
    index: true 
  },  
  replyTo: { 
    type: String,
    index: true 
  },  
  htmlTemplate: {
    required: true,
    type: String,
    index: true 
  },  
  createdAt: { 
    type: Date,
    default: new Date().toUTCString()
  },
  updatedAt: { 
    type: Date,
    default: new Date().toUTCString()
  }
  
});