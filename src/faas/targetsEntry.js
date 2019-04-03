const _ = require('lodash');
const crudEndpointGenerator = require('./crudEndpoint.js');
const db = require('../data/index').targets;
const checkACL = require('./acls').checkACL;

const KIND = 'targets';
const options = {
  kind: KIND,
  summary: {
    trx: e =>
      _.pick(e, ['id', 'title', 'description', 'tags', 'executionRoles']),
  },
  acls: {
    list: () => true,
    view: (user, res) => checkACL(user, KIND, 'view', res),
    upsert: (user, res) => checkACL(user, KIND, 'upsert', res),
    delete: (user, res) => checkACL(user, KIND, 'delete', res),
  },
};

module.exports = crudEndpointGenerator(db, options);
