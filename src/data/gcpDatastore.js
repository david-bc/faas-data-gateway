const _ = require('lodash');
const uuid = require('uuid');
const sha1 = require('crypto-js/sha1');
const { Datastore } = require('@google-cloud/datastore');
const NodeCache = require('node-cache');

// TODO: Your Google Cloud Platform project ID
const projectId = 'platform-architecture-poc';

// Creates a client
const datastore = new Datastore({
  projectId: projectId,
});

const cacheGen = ttlSeconds =>
  new NodeCache({
    stdTTL: ttlSeconds,
    checkperiod: ttlSeconds * 0.2,
    useClones: false,
  });
const NOOP_CACHE = {
  get: () => null,
  set: () => null,
};

const ROLE_KIND = 'Roles';
const TARGET_KIND = 'Target';
const USER_KIND = 'User';

class GcpCollectionStore {
  constructor(kind, cache = NOOP_CACHE) {
    this.kind = kind;
    // TODO: flush cache
    this.cache = cache;
  }
  async list(options = {}) {
    const { limit = 10, offset, filter } = options;

    const cacheKey = sha1(JSON.stringify({ limit, offset, filter })).toString();
    let response = this.cache.get(cacheKey);

    if (_.isNil(response)) {
      // TODO: filter
      const query = datastore
        .createQuery(this.kind)
        .limit(limit)
        .offset(offset);
      const [content] = await datastore.runQuery(query);
      const [keys] = await datastore.runQuery(
        datastore.createQuery(this.kind).select('__key__'),
      );
      response = {
        content,
        total: keys.length,
        limit,
        offset,
        filter,
      };
      this.cache.set(cacheKey, response);
    }

    return Promise.resolve(response);
  }
  async get(id) {
    let entity = this.cache.get(id);
    if (_.isNil(entity)) {
      const entities = await datastore.get(datastore.key([this.kind, id]));
      entity = _.head(entities);
      this.cache.set(id, entity);
    }
    return entity;
  }
  async save(data) {
    let { id } = data;
    data.collection = this.kind;
    if (_.isNil(id)) {
      id = uuid();
      data.id = id;
    }
    await datastore.upsert({
      key: datastore.key([this.kind, data.id]),
      data,
    });
    this.cache.set(data.id, data);
    return Promise.resolve(data);
  }
  async delete(id) {
    const existing = await this.get(id);
    if (!_.isNil(existing)) {
      await datastore.delete(datastore.key([this.kind, id]));
    }
    return Promise.resolve(existing);
  }
}

module.exports = {
  roles: new GcpCollectionStore(
    ROLE_KIND,
    cacheGen(process.env.CACHE_DB_ROLE || 600),
  ),
  targets: new GcpCollectionStore(TARGET_KIND),
  users: new GcpCollectionStore(
    USER_KIND,
    cacheGen(process.env.CACHE_DB_USER || 15),
  ),
};
