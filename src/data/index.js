const env = process.env.NODE_ENV || 'dev';

let db;

switch (env) {
  case 'dev': {
    console.log(`Using local database for env='${env}'`);
    db = require('./localDataStore');
    break;
  }
  case 'mock':
  default: {
    db = require('./memDataStore');
    break;
  }
}

module.exports = db;
