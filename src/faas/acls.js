const _ = require('lodash');

function checkACL(user, kind, op, res) {
  for (let i in user.roles) {
    if (_.get(user.roles[i], `permissions.${kind}.${op}`)) {
      return true;
    }
  }
  console.log(
    `APPSEC: ${user.email} cannot ${op} ${kind}: ${JSON.stringify(user.roles)}`,
  );
  res.status(403).send({ error: `${user.email} cannot ${op} ${kind}` });
  return false;
}

module.exports = {
  checkACL,
};
