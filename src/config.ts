import { Kafka } from '@melonade/melonade-declaration';
import * as dotenv from 'dotenv';

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

export const melonade = {
  namespace: process.env['melonade.namespace'] || 'default',
};

export const server = {
  enabled: process.env['server.enabled'] === 'true',
  port: +process.env['server.port'] || 8080,
  hostname: process.env['server.hostname'] || '127.0.0.1',
};

export const kafkaTopicName = {
  // Publish to specified task
  task: `${Kafka.topicPrefix}.${melonade.namespace}.${Kafka.topicSuffix.task}`,
  // Publish to store event
  store: `${Kafka.topicPrefix}.${melonade.namespace}.${Kafka.topicSuffix.store}`,
  // Subscriptions to update event
  event: `${Kafka.topicPrefix}.${melonade.namespace}.${Kafka.topicSuffix.event}`,
  // Subscriptions to command
  command: `${Kafka.topicPrefix}.${melonade.namespace}.${Kafka.topicSuffix.command}`,
};

export const kafkaTopic = {
  num_partitions: +process.env['topic.kafka.num_partitions'] || 10,
  replication_factor: +process.env['topic.kafka.replication_factor'] || 1,
};

export const kafkaAdminConfig = {
  ...pickAndReplaceFromENV('^kafka\\.conf\\.'),
  ...pickAndReplaceFromENV('^admin\\.kafka\\.conf\\.'),
};

export const kafkaEventConfig = {
  config: {
    'enable.auto.commit': 'false',
    'group.id': `melonade-${melonade.namespace}-event`,
    ...pickAndReplaceFromENV('^kafka\\.conf\\.'),
    ...pickAndReplaceFromENV('^event\\.kafka\\.conf\\.'),
  },
  topic: {
    'auto.offset.reset': 'earliest',
    ...pickAndReplaceFromENV('^kafka\\.topic-conf\\.'),
    ...pickAndReplaceFromENV('^event\\.kafka\\.topic-conf\\.'),
  },
};

export const eventStore = {
  type: process.env['event-store.type'],
  elasticsearchConfig: {
    index: `melonade-${melonade.namespace}-event`,
    config: pickAndReplaceFromENV('^event-store\\.elasticsearch\\.'),
  },
};
