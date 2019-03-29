const _ = require('lodash');
const uuid = require('uuid');
const axios = require('axios');

const targetsDB = require('../data/index').targets;

const TAGGING = {
  cluster: id => `database.es.cluster.${id}`,
  index: id => `database.es.index.${id}`,
  data: id => `database.es.data.${id}`,
};

const BASE_REQUEST = {
  tags: [],
  title: 'NONE',
  description: '',
  executor: 'REST',
  kind: 'es',
  req: {
    method: 'GET',
    url: 'http://localhost:9200/',
    params: {},
    headers: {
      Accept: 'application/json',
    },
  },
};

async function upsertMergedByUrl(db, newTarget) {
  let oldTarget = await db.list(1, 0, { req: newTarget.req });
  oldTarget = oldTarget.content[0];
  if (!_.isNil(oldTarget)) {
    const tagsSet = {};
    oldTarget.tags.forEach(t => (tagsSet[t] = true));
    newTarget.tags.forEach(t => (tagsSet[t] = true));
    newTarget = _.merge({}, oldTarget, newTarget, {
      id: oldTarget.id,
      tags: Object.keys(tagsSet),
    });
  } else {
    newTarget = _.merge({ id: uuid() }, BASE_REQUEST, newTarget);
  }
  await db.save(newTarget);
  return newTarget.id;
}

class ElasticsearchDatasource {
  constructor(net = axios, db = targetsDB) {
    this.net = net;
    this.db = db;
  }
  async _initClusterEndpoints(url, baseTags) {
    let clusterName = 'UNKNOWN';
    const ids = [];

    const infoResponse = await this.net({ url });
    clusterName = infoResponse.data.cluster_name;
    const tags = [TAGGING.cluster(clusterName), ...baseTags];

    ids.push(
      await upsertMergedByUrl(this.db, {
        id: ids[0],
        tags,
        title: `${clusterName} - Cluster Info`,
        req: { url },
      }),
    );
    ids.push(
      await upsertMergedByUrl(this.db, {
        id: ids[1],
        tags,
        title: `${clusterName} - Cluster Stats`,
        req: { url: `${url}/_stats` },
      }),
    );
    ids.push(
      await upsertMergedByUrl(this.db, {
        id: ids[2],
        tags,
        title: `${clusterName} - List Indices`,
        req: { url: `${url}/_cat/indices` },
      }),
    );
    return [clusterName, ids];
  }
  async upsert(baseUrl, baseTags) {
    const targetIds = [];
    const [clusterName, clusterIds] = await this._initClusterEndpoints(
      baseUrl,
      baseTags,
    );
    clusterIds.forEach(id => targetIds.push(id));
    return Promise.resolve(targetIds);
  }
}

const es = new ElasticsearchDatasource();

es.ElasticsearchDatasource = ElasticsearchDatasource;

module.exports = es;
