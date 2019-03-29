const _ = require('lodash');
const targetsDB = require('../data/index.js').targets;

const EXECUTORS = {
  rest: require('./rest.js'),
};

class ProxyMethodHandler {
  constructor(executors = EXECUTORS) {
    this.executors = executors;
  }
  async execute(targetId, params) {
    const target = await targetsDB.get(targetId);
    let result, error;
    if (_.isNil(target)) {
      error = `Could not find target with id=${targetId}`;
    } else {
      switch (target.executor) {
        case 'REST': {
          result = await this.executors.rest.execute(target, params);
          break;
        }
        default: {
          error = `Could not find executor for id=${targetId} with executor=${
            target.executor
          }`;
        }
      }
    }
    return Promise.resolve([result, error]);
  }
}

const proxyMethodHandler = new ProxyMethodHandler();

proxyMethodHandler.ProxyMethodHandler = ProxyMethodHandler;

module.exports = proxyMethodHandler;
