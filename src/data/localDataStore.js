const _ = require('lodash');
const uuid = require('uuid');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('data/db.json');
const db = low(adapter);

const ROLES = 'roles';
const TARGETS = 'targets';
const USERS = 'users';

db.defaults({ [ROLES]: [], [TARGETS]: [], [USERS]: [] }).write();

class LocalCollectionStore {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }
  list(options = {}) {
    const { limit = 10, offset = 0, filter = () => true } = options;
    return Promise.resolve({
      content: db
        .get(this.collectionName)
        .filter(filter)
        .drop(offset)
        .take(limit)
        .value(),
      total: db
        .get(this.collectionName)
        .filter(filter)
        .size()
        .value(),
      limit,
      offset,
      filter,
    });
  }
  _byId(id) {
    return db
      .get(this.collectionName)
      .find({ id })
      .defaultTo(null)
      .value();
  }
  get(id) {
    return Promise.resolve(this._byId(id));
  }
  save(source) {
    let { id } = source;
    if (_.isNil(id)) {
      id = uuid();
      source.id = id;
    }
    const datum = this._byId(id);
    if (!_.isNil(datum)) {
      source = _.merge({}, datum, source);
      db.get(this.collectionName)
        .remove({ id })
        .write();
    }
    db.get(this.collectionName)
      .push(source)
      .write();
    return Promise.resolve(source);
  }
  delete(id) {
    const existing = this._byId(id);
    if (!_.isNil(existing)) {
      db.get(this.collectionName)
        .remove({ id })
        .write();
    }
    return Promise.resolve(existing);
  }
}

module.exports = {
  roles: new LocalCollectionStore(ROLES),
  targets: new LocalCollectionStore(TARGETS),
  users: new LocalCollectionStore(USERS),
};
