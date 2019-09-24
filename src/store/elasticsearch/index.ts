import { IStore } from '..';
import * as elasticsearch from 'elasticsearch';

export class ElasticsearchStore implements IStore {
  client: elasticsearch.Client;

  constructor(config: any) {
    this.client = new elasticsearch.Client(config);
  }

  isHealthy(): boolean {
    return true;
  }
}
