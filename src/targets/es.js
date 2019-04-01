const _ = require('lodash');
const uuid = require('uuid');
const sha1 = require('crypto-js/sha1');
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
  inputs: [],
};

async function upsertMergedByUrl(db, newTarget) {
  newTarget = _.merge({}, BASE_REQUEST, newTarget);
  newTarget.id = sha1(JSON.stringify(newTarget.req)).toString();

  let oldTarget = await db.get(newTarget.id);

  if (!_.isNil(oldTarget)) {
    const tagsSet = {};
    oldTarget.tags.forEach(t => (tagsSet[t] = true));
    newTarget.tags.forEach(t => (tagsSet[t] = true));
    newTarget = _.merge({}, oldTarget, newTarget, {
      id: oldTarget.id,
      tags: Object.keys(tagsSet),
    });
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
        tags,
        title: `${clusterName} - Cluster Info`,
        req: { url },
      }),
    );
    ids.push(
      await upsertMergedByUrl(this.db, {
        tags,
        title: `${clusterName} - Cluster Stats`,
        req: { url: `${url}/_stats` },
      }),
    );
    ids.push(
      await upsertMergedByUrl(this.db, {
        tags,
        title: `${clusterName} - List Indices`,
        req: { url: `${url}/_cat/indices` },
      }),
    );
    ids.push(
      await upsertMergedByUrl(this.db, {
        tags,
        title: `${clusterName} - Create Index`,
        req: { url: `${url}/<%= indexName %>`, method: 'PUT' },
        inputs: [{ title: 'Index Name', kind: 'string', required: true }],
      }),
    );
    return [clusterName, ids];
  }
  async _initIndexEndpoints(url, baseTags, clusterName) {
    const ids = [];

    const indexRes = await this.net({
      url: `${url}/_cat/indices`,
      headers: {
        Accept: 'application/json',
      },
    });
    const indices = indexRes.data;

    for (let i in indices) {
      const ind = indices[i];
      const indexName = ind.index;
      const tags = [
        TAGGING.cluster(clusterName),
        TAGGING.index(indexName),
        ...baseTags,
      ];
      ids.push(
        await upsertMergedByUrl(this.db, {
          tags,
          title: `${indexName} - ${clusterName} - Index Stats`,
          req: { url: `${url}/${indexName}/_stats` },
        }),
      );
      ids.push(
        await upsertMergedByUrl(this.db, {
          tags,
          title: `${indexName} - ${clusterName} - Index Mapping`,
          req: { url: `${url}/${indexName}/_mapping` },
        }),
      );
      ids.push(
        await upsertMergedByUrl(this.db, {
          tags,
          title: `${indexName} - ${clusterName} - Update Index Mapping`,
          req: {
            url: `${url}/${indexName}/_mapping/_doc`,
            method: 'PUT',
            body: '<%= rawMapping %>',
          },
          inputs: [{ title: 'Mapping', kind: 'json', required: true }],
        }),
      );
      const [documentTargetIds] = await this._initDocumentEndpoints(
        url,
        tags,
        clusterName,
        indexName,
      );
      documentTargetIds.forEach(id => ids.push(id));
    }

    return [ids];
  }
  async _initDocumentEndpoints(url, baseIndexTags, clusterName, indexName) {
    const ids = [];

    const tags = [TAGGING.data(indexName), ...baseIndexTags];
    ids.push(
      await upsertMergedByUrl(this.db, {
        tags,
        title: `${indexName} - ${clusterName} - Get Document by ID`,
        req: { url: `${url}/${indexName}/_doc/<%= documentId %>` },
        inputs: [{ title: 'Document ID', kind: 'string', required: true }],
      }),
    );
    ids.push(
      await upsertMergedByUrl(this.db, {
        tags,
        title: `${indexName} - ${clusterName} - Search Documents`,
        req: {
          url: `${url}/${indexName}/_search`,
          method: 'POST',
          body: '<%= rawQuery %>',
        },
        inputs: [{ title: 'Query', kind: 'json', required: true }],
      }),
    );

    return [ids];
  }
  async upsert(baseUrl, baseTags) {
    const targetIds = [];
    const [clusterName, clusterIds] = await this._initClusterEndpoints(
      baseUrl,
      baseTags,
    );
    clusterIds.forEach(id => targetIds.push(id));

    const [indexIds] = await this._initIndexEndpoints(
      baseUrl,
      baseTags,
      clusterName,
    );
    indexIds.forEach(id => targetIds.push(id));
    return Promise.resolve(targetIds);
  }
}

const es = new ElasticsearchDatasource();

es.ElasticsearchDatasource = ElasticsearchDatasource;

module.exports = es;
