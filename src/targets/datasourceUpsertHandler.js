const tagging = require('./tagging');

const DATASOURCES = {
  es: require('./es.js'),
};

class DatasourceUpsertHandler {
  constructor(datasources = DATASOURCES) {
    this.datasources = datasources;
  }
  async upsert(params) {
    let result, error;
    switch (params.kind) {
      case 'es': {
        const { baseUrl, env, owner, customTags = [] } = params;
        const baseTags = [
          tagging.env(env),
          tagging.owner(owner),
          ...customTags,
        ];
        result = await this.datasources.es.upsert(baseUrl, baseTags);
        break;
      }
      default: {
        error = `Could not datasource with kind=${params.kind}`;
      }
    }
    return [result, error];
  }
}

const datasourceUpsertHandler = new DatasourceUpsertHandler();

datasourceUpsertHandler.DatasourceUpsertHandler = DatasourceUpsertHandler;

module.exports = datasourceUpsertHandler;
