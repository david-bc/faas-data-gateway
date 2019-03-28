const crudEndpointGenerator = require('./crudEndpoint.js');
const db = require('../data/index').users;

module.exports = crudEndpointGenerator(db);
