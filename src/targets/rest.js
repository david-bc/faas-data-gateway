const _ = require('lodash');
const axios = require('axios');

axios.interceptors.response.use(
  response => {
    return response;
  },
  function(error) {
    console.error(`REST delegate error: ${error.response.status}`);
    return Promise.resolve(error.response);
  },
);

function applyTemplateField(req, path, params) {
  let val = _.get(req, path);
  if (_.isString(val) && /<%=/g.test(val)) {
    val = _.template(val)(params);
    try {
      val = JSON.parse(val);
    } catch (e) {}
    _.set(req, path, val);
  }
}

function applyTemplateToMap(req, path, params) {
  const col = _.get(req, path) || {};
  Object.keys(col).forEach(key =>
    applyTemplateField(req, `${path}.${key}`, params),
  );
}

class RestDatasource {
  constructor(net = axios) {
    this.net = net;
  }
  execute(target, params) {
    const req = _.cloneDeep(target.req);
    applyTemplateField(req, 'url', params);
    applyTemplateField(req, 'body', params);
    applyTemplateToMap(req, 'headers', params);
    applyTemplateToMap(req, 'params', params); // query params
    return this.net(req).then(res => ({
      status: res.status,
      // TODO: headers: res.headers,
      // TODO: include other fields
      data: res.data,
    }));
  }
}

const rest = new RestDatasource();

rest.RestDatasource = RestDatasource;

module.exports = rest;
