const _ = require('lodash');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const NodeCache = require('node-cache');

const ttlSeconds = 5;
const cache = new NodeCache({
  stdTTL: ttlSeconds,
  checkperiod: ttlSeconds * 0.2,
  useClones: false,
});

const client = jwksClient({
  jwksUri: process.env.JWKS_DOMAIN,
  requestHeaders: {}, // Optional
});

const validation = JSON.parse(process.env.JWT_VALIDATION);
const validationKeys = [];
Object.keys(validation).forEach(k => {
  validation[k] = new RegExp(validation[k], 'i');
  validationKeys.push(k);
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (!_.isNil(err)) {
      console.error(err);
    } else {
      var signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    }
  });
}

module.exports = {
  auth0: {
    getUser: token => {
      return new Promise((res, rej) => {
        if (_.isNil(token)) {
          return rej(new Error('Missing auth header'));
        }
        let cachedJwtResult = cache.get(token);
        if (!_.isNil(cachedJwtResult)) {
          if (!_.isNil(cachedJwtResult.err)) {
            return rej(cachedJwtResult.err);
          }
          return res(cachedJwtResult.decoded);
        }
        jwt.verify(token, getKey, {}, function(err, decoded) {
          if (!_.isNil(err)) {
            console.error(err);
            cache.set(token, { err, decoded });
            rej(err);
          } else {
            let path, value, pattern;
            for (let i in validationKeys) {
              path = validationKeys[i];
              value = _.get(decoded, path);
              pattern = validation[path];
              if (!pattern.test(value)) {
                console.log(
                  `APPSEC: @ENTRY user validation failed for "${value}" with mismatch at \`${path}\` => ${pattern} (${JSON.stringify(
                    decoded,
                  )})`,
                );
                err = new Error(
                  `Vser validation failed for "${value}" with mismatch at \`${path}\` => ${pattern}`,
                );
                cache.set(token, { err, decoded });
                rej(err);
                return;
              }
            }
            cache.set(token, { decoded });
            res(decoded);
          }
        });
      });
    },
  },
};
