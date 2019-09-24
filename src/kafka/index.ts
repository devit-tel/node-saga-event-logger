import { KafkaConsumer } from 'node-rdkafka';
import * as config from '../config';
import { jsonTryParse } from '../utils/common';

export interface kafkaConsumerMessage {
  value: Buffer;
  size: number;
  key: string;
  topic: string;
  offset: number;
  partition: number;
}

export interface IEvent {
  transactionId: string;
  type: 'TRANSACTION' | 'WORKFLOW' | 'TASK' | 'SYSTEM';
  details?: any;
  timestamp: number;
  isError: boolean;
  error?: string;
}

export const consumerEventClient = new KafkaConsumer(
  config.kafkaEventConsumer,
  {},
);

consumerEventClient.setDefaultConsumeTimeout(1);
consumerEventClient.connect();
consumerEventClient.on('ready', () => {
  console.log('Consumer Event kafka are ready');
  consumerEventClient.subscribe([config.kafkaTopicName.store]);
});

export const poll = (
  consumer: KafkaConsumer,
  messageNumber: number = 100,
): Promise<any[]> =>
  new Promise((resolve: Function, reject: Function) => {
    consumer.consume(
      messageNumber,
      (error: Error, messages: kafkaConsumerMessage[]) => {
        if (error) return reject(error);
        resolve(
          messages.map((message: kafkaConsumerMessage) =>
            jsonTryParse(message.value.toString(), {}),
          ),
        );
      },
    );
  });
