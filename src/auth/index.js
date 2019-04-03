const _ = require('lodash');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const NodeCache = require('node-cache');
const DB = require('../data/index.js');
const userDb = DB.users;
const roleDb = DB.roles;

const ttlSeconds = process.env.CACHE_JWT_VERIFIER || 3600; // 1 hour
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

class Auth0Verifier {
  constructor() {}
  async validateUser(req, res, enrichUserRoles = false) {
    const { headers } = req;
    const authHeader = headers.authorization;
    let user;

    try {
      user = await this.getUser(authHeader, enrichUserRoles);
    } catch (err) {
      console.error(err);
      res.status(500).send({ error: err.message });
      return;
    }
    return user;
  }
  async getUser(token, enrichUserRoles = false) {
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
      jwt.verify(token, getKey, {}, async function(err, decoded) {
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

          decoded = {
            id: decoded.email,
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture,
            roles: [],
          };
          let dbUser = await userDb.get(decoded.email);
          if (_.isNil(dbUser)) {
            await userDb.save(decoded);
          } else {
            if (enrichUserRoles) {
              dbUser.roles = await Promise.all(
                dbUser.roles.map(id => roleDb.get(id)),
              );
            }
            decoded = _.merge({}, decoded, dbUser);
          }
          cache.set(token, { decoded });
          res(decoded);
        }
      });
    });
  }
}

module.exports = {
  auth0: new Auth0Verifier(),
};
