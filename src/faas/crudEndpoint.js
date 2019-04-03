const _ = require('lodash');
const auth = require('../auth/index.js').auth0;

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
module.exports = (db, options) => {
  const { kind, acls, summary = {} } = options;
  const {
    list: checkListAcl,
    view: checkViewAcl,
    upsert: checkUpsertAcl,
    delete: checkDeleteAcl,
  } = acls;
  const { trx: summaryTrx = e => e } = summary;
  return async (req, res) => {
    const { method, query, url, body } = req;

    const enrichUserRoles = true;
    const user = await auth.validateUser(req, res, enrichUserRoles);
    if (_.isNil(user)) {
      return;
    }

    const parts = url.split(/\//g);
    parts.shift();
    parts.shift();
    const subRoute = parts.shift();
    let payload = null;
    let status = 200;
    switch (method) {
      case 'GET': {
        if (_.isNil(subRoute) || subRoute.length === 0) {
          if (!checkListAcl(user, res)) {
            return;
          }
          const { limit, offset } = query;
          let filter = query.filter;
          if (_.isString(filter)) {
            filter = JSON.parse(filter);
          }
          payload = await db.list({
            limit,
            offset,
            filter,
          });
          payload.content = payload.content.map(summaryTrx);
        } else {
          if (!checkViewAcl(user, res)) {
            return;
          }
          payload = await db.get(subRoute);
          status = _.isNil(payload) ? 404 : 200;
        }
        break;
      }
      case 'POST': {
        if (!checkUpsertAcl(user, res)) {
          return;
        }
        if (!_.isNil(subRoute)) {
          body.id = subRoute;
        }
        payload = await db.save(body);
        status = 201;
        break;
      }
      case 'DELETE': {
        if (!checkDeleteAcl(user, res)) {
          return;
        }
        payload = await db.delete(subRoute);
        status = _.isNil(payload) ? 404 : 200;
        break;
      }
    }
    res.status(status).send(payload);
  };
};
