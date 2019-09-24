import * as dotenv from 'dotenv';
import { StoreType } from './constants/store';
import * as kafkaConstant from './constants/kafka';

dotenv.config();
const pickAndReplaceFromENV = (template: string) =>
  Object.keys(process.env).reduce((result: any, key: string) => {
    if (new RegExp(template).test(key)) {
      return {
        ...result,
        [key.replace(new RegExp(template), '')]: process.env[key],
      };
    }
    return result;
  }, {});

export const saga = {
  namespace: process.env['saga.namespace'] || 'node',
};

export const server = {
  enabled: process.env['server.enabled'] === 'true',
  port: +process.env['server.port'] || 8080,
  hostname: process.env['server.hostname'] || '127.0.0.1',
};

export const kafkaTopicName = {
  // Publish to specified task
  task: `${saga.namespace}.${kafkaConstant.PREFIX}.${kafkaConstant.TASK_TOPIC_NAME}`,
  // Publish to system task
  systemTask: `${saga.namespace}.${kafkaConstant.PREFIX}.${kafkaConstant.SYSTEM_TASK_TOPIC_NAME}`,
  // Publish to store event
  store: `${saga.namespace}.${kafkaConstant.PREFIX}.${kafkaConstant.STORE_TOPIC_NAME}`,
  // Subscriptions to update event
  event: `${saga.namespace}.${kafkaConstant.PREFIX}.${kafkaConstant.EVENT_TOPIC}`,
};

export const kafkaEventConsumer = {
  'enable.auto.commit': 'false',
  'group.id': 'saga-event-consumer',
  ...pickAndReplaceFromENV('^kafka\\.conf\\.'),
  ...pickAndReplaceFromENV('^consumer\\.kafka\\.conf\\.'),
};

export const eventStore = {
  type: StoreType.Elasticsearch,
  elasticsearchConfig: {
    index: `saga-${saga.namespace}-event`,
    config: pickAndReplaceFromENV('^event\\.elasticsearch\\.'),
  },
};
