const axios = require('axios');

class RestDatasource {
  constructor(net = axios) {
    this.net = net;
  }
  execute(target, params) {
    console.log(target.req);
    return this.net(target.req).then(res => res.data);
  }
}

const rest = new RestDatasource();

rest.RestDatasource = RestDatasource;

module.exports = rest;
