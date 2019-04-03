const _ = require('lodash');
const auth = require('../auth/index.js').auth0;
const withAuth = require('../auth/index.js').withAuth;

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
  const authOptions = { enrichUserRoles: true };
  return withAuth(async (req, res) => {
    const { method, query, url, body } = req;

    const parts = url.split(/\//g);
    parts.shift();
    parts.shift();
    const subRoute = parts.shift();
    let payload = null;
    let status = 200;
    switch (method) {
      case 'GET': {
        if (_.isNil(subRoute) || subRoute.length === 0) {
          if (!checkListAcl(req.user, res)) {
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
          if (!checkViewAcl(req.user, res)) {
            return;
          }
          payload = await db.get(subRoute);
          status = _.isNil(payload) ? 404 : 200;
        }
        break;
      }
      case 'POST': {
        if (!checkUpsertAcl(req.user, res)) {
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
        if (!checkDeleteAcl(req.user, res)) {
          return;
        }
        payload = await db.delete(subRoute);
        status = _.isNil(payload) ? 404 : 200;
        break;
      }
    }
    res.status(status).send(payload);
  }, authOptions);
};
