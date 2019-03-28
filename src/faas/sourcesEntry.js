const crudEndpointGenerator = require('./crudEndpoint.js');
const db = require('../data/index').sources;

module.exports = crudEndpointGenerator(db);
