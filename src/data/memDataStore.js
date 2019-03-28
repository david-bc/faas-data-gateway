const _ = require('lodash');
const uuid = require('uuid');
const low = require('lowdb');
const Memory = require('lowdb/adapters/Memory');

const adapter = new Memory();
const db = low(adapter);

const SOURCES = 'sources';
const TARGETS = 'targets';
const USERS = 'users';

db.defaults({ [SOURCES]: [], [TARGETS]: [], [USERS]: [] }).write();

class LocalCollectionStore {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }
  list(options = {}) {
    const { limit = 10, offset = 0, filter } = options;
    return Promise.resolve({
      content: db
        .get(this.collectionName)
        .drop(offset)
        .take(limit)
        .value(),
      total: db
        .get(this.collectionName)
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
  sources: new LocalCollectionStore(SOURCES),
  targets: new LocalCollectionStore(TARGETS),
  users: new LocalCollectionStore(USERS),
};
