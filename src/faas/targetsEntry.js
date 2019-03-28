const crudEndpointGenerator = require('./crudEndpoint.js');
const db = require('../data/index').targets;

module.exports = crudEndpointGenerator(db);
