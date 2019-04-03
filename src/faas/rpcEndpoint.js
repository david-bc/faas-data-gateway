const _ = require('lodash');
const proxyMethodHandler = require('../targets/proxyMethodHandler.js');
const datasourceUpsertHandler = require('../targets/datasourceUpsertHandler.js');
const auth = require('../auth/index.js').auth0;

const ERRORS = {
  PARSE_ERROR: -32700, // Parse error: Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.
  INVALID_REQUEST: -32600, // Invalid Request: The JSON sent is not a valid Request object.
  METHOD_NOT_FOUND: -32601, // Method not found: The method does not exist / is not available.
  INVALID_PARAMS: -32602, // Invalid params: Invalid method parameter(s).
  INTERNAL_ERROR: -32603, // Internal error: Internal JSON - RPC error.
  // - 32000 to - 32099	Server error	Reserved for implementation - defined server - errors.
};

module.exports = async (req, res) => {
  // validate body
  const { body } = req;
  const { method = null, params = {}, id = 0 } = body;
  let result, error;

  const user = await auth.validateUser(req, res);
  if (_.isNil(user)) {
    return;
  }

  switch (method) {
    case 'proxy': {
      [result, error] = await proxyMethodHandler.execute(
        user,
        params.targetId,
        params.params,
      );
      break;
    }
    case 'datasource.upsert': {
      // TODO: RBAC

      [result, error] = await datasourceUpsertHandler.upsert(params);
      break;
    }
    default: {
      error = {
        code: ERRORS.METHOD_NOT_FOUND,
        message: `Method not found`,
        data: { method },
      };
    }
  }
  res.status(200).send({
    jsonrpc: '2.0',
    result,
    error,
    id,
  });
};
