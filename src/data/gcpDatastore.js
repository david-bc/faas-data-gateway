const _ = require('lodash');
const uuid = require('uuid');
const { Datastore } = require('@google-cloud/datastore');

// TODO: Your Google Cloud Platform project ID
const projectId = 'platform-architecture-poc';

// Creates a client
const datastore = new Datastore({
  projectId: projectId,
});

const TARGET_KIND = 'Target';
const USER_KIND = 'User';

class GcpCollectionStore {
  constructor(kind) {
    this.kind = kind;
  }
  async list(options = {}) {
    const { limit = 10, offset, filter = () => true } = options;
    // TODO: limit, offset, filter
    const query = datastore
      .createQuery(this.kind)
      .limit(limit)
      .offset(offset);
    const [content] = await datastore.runQuery(query);
    const [keys] = await datastore.runQuery(
      datastore.createQuery(this.kind).select('__key__'),
    );
    return Promise.resolve({
      content,
      total: keys.length, // TODO: total count
      limit,
      offset,
      filter,
    });
  }
  async get(id) {
    const entities = await datastore.get(datastore.key([this.kind, id]));
    return _.head(entities);
  }
  async save(data) {
    let { id } = data;
    data.kind = this.kind;
    if (_.isNil(id)) {
      id = uuid();
      data.id = id;
    }
    await datastore.upsert({
      key: datastore.key([this.kind, data.id]),
      data,
    });
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
  targets: new GcpCollectionStore(TARGET_KIND),
  users: new GcpCollectionStore(USER_KIND),
};
