const _ = require('lodash');
const targetsDB = require('../data/index.js').targets;

const EXECUTORS = {
  rest: require('./rest.js'),
};

class ProxyMethodHandler {
  constructor(executors = EXECUTORS) {
    this.executors = executors;
  }
  async execute(user, targetId, params) {
    const target = await targetsDB.get(targetId);
    let result, error;
    if (_.isNil(target)) {
      error = `Could not find target with id=${targetId}`;
    } else {
      let hasRole = false;
      for (let i = 0; i < user.roles.length && !hasRole; i++) {
        hasRole = target.executionRoles.includes(user.roles[i]);
      }

      if (hasRole) {
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
      } else {
        error = `user does not have appropriate roles`;
      }
    }
    return Promise.resolve([result, error]);
  }
}

const proxyMethodHandler = new ProxyMethodHandler();

proxyMethodHandler.ProxyMethodHandler = ProxyMethodHandler;

module.exports = proxyMethodHandler;
