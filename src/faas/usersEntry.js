const crudEndpointGenerator = require('./crudEndpoint.js');
const db = require('../data/index').users;
const checkACL = require('./acls').checkACL;

const KIND = 'users';
const options = {
  kind: KIND,
  summary: {
    trx: e => e,
  },
  acls: {
    list: (user, res) => checkACL(user, KIND, 'list', res),
    view: (user, res) => checkACL(user, KIND, 'view', res),
    upsert: (user, res) => checkACL(user, KIND, 'upsert', res),
    delete: (user, res) => checkACL(user, KIND, 'delete', res),
  },
};

module.exports = crudEndpointGenerator(db, options);
