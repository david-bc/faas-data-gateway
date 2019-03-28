const _ = require('lodash');

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
module.exports = db => async (req, res) => {
  const { method, query, url, body } = req;
  const parts = url.split(/\//g);
  parts.shift();
  parts.shift();
  const subRoute = parts.shift();
  let payload = null;
  let status = 200;
  switch (method) {
    case 'GET': {
      if (_.isNil(subRoute)) {
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
      } else {
        payload = await db.get(subRoute);
        status = _.isNil(payload) ? 404 : 200;
      }
      break;
    }
    case 'POST': {
      if (!_.isNil(subRoute)) {
        body.id = subRoute;
      }
      payload = await db.save(body);
      status = 201;
      break;
    }
    case 'DELETE': {
      payload = await db.delete(subRoute);
      status = _.isNil(payload) ? 404 : 200;
      break;
    }
  }
  res.status(status).send(payload);
};
