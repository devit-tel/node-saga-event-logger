import { Kafka } from '@melonade/melonade-declaration';
import { AllEvent } from '@melonade/melonade-declaration/build/event';
import { AdminClient, KafkaConsumer } from 'node-rdkafka';
import * as config from '../config';
import { jsonTryParse } from '../utils/common';

export interface IAllEventWithId {
  _id: string;
  event: AllEvent;
}

export const adminClient = AdminClient.create(config.kafkaAdminConfig);

export const consumerEventClient = new KafkaConsumer(
  config.kafkaEventConfig.config,
  config.kafkaEventConfig.topic,
);

consumerEventClient.setDefaultConsumeTimeout(100);
consumerEventClient.connect();
consumerEventClient.on('ready', async () => {
  console.log('Consumer Event kafka are ready');
  try {
    await createTopic(config.kafkaTopicName.event, 20, 1);
  } catch (error) {
    console.warn(
      `Create topic "${
        config.kafkaTopicName.store
      }" error: ${error.toString()}`,
    );
  } finally {
    consumerEventClient.subscribe([config.kafkaTopicName.store]);
  }
});

export const createTopic = (
  tipicName: string,
  numPartitions: number = 10,
  replicationFactor: number = 1,
  config?: any,
): Promise<any> =>
  new Promise((resolve: Function, reject: Function) => {
    adminClient.createTopic(
      {
        topic: tipicName,
        num_partitions: numPartitions,
        replication_factor: replicationFactor,
        config: {
          'cleanup.policy': 'compact',
          'compression.type': 'snappy',
          'delete.retention.ms': '86400000',
          'file.delete.delay.ms': '60000',
          ...config,
        },
      },
      (error: Error, data: any) => {
        if (error) return reject(error);
        resolve(data);
      },
    );
  });

export const poll = (
  consumer: KafkaConsumer,
  messageNumber: number = 100,
): Promise<IAllEventWithId[]> =>
  new Promise((resolve: Function, reject: Function) => {
    consumer.consume(
      messageNumber,
      (error: Error, messages: Kafka.kafkaConsumerMessage[]) => {
        if (error) return reject(error);
        resolve(
          messages.map((message: Kafka.kafkaConsumerMessage) => {
            return {
              _id: `${message.topic}-${message.partition}-${message.offset}`,
              event: jsonTryParse(message.value.toString(), {}),
            };
          }),
        );
      },
    );
  });
