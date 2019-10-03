import { KafkaConsumer } from 'node-rdkafka';
import { Kafka } from '@melonade/melonade-declaration';
import * as config from '../config';
import { jsonTryParse } from '../utils/common';
import { AllEvent } from '@melonade/melonade-declaration/build/event';

export interface IAllEventWithId {
  _id: string;
  event: AllEvent;
}

export const consumerEventClient = new KafkaConsumer(
  config.kafkaEventConfig.config,
  config.kafkaEventConfig.topic,
);

consumerEventClient.setDefaultConsumeTimeout(100);
consumerEventClient.connect();
consumerEventClient.on('ready', () => {
  console.log('Consumer Event kafka are ready');
  consumerEventClient.subscribe([config.kafkaTopicName.store]);
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
