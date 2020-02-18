import { Event, State } from '@melonade/melonade-declaration';
import { IAllEventWithId } from '../kafka';

export enum StoreType {
  MongoDB = 'MONGODB',
  Elasticsearch = 'ELASTICSEARCH',
}

export interface IHistogramCount {
  date: number | Date;
  count: number;
}

export interface ITaskExecutionTime {
  executionTime: number;
  taskName: string;
  executedAt: number | Date | string;
}

export interface IStore {
  isHealthy(): boolean;
}

export interface ITransactionEventPaginate {
  total: number;
  events: Event.ITransactionEvent[];
}

export interface IEventDataStore extends IStore {
  getFalseEvents(
    fromTimestamp: number,
    toTimestamp: number,
  ): Promise<Event.AllEvent[]>;
  getTaskExecuteime(
    fromTimestamp: number,
    toTimestamp: number,
  ): Promise<ITaskExecutionTime[]>;
  getTransactionDateHistogram(
    fromTimestamp: number,
    toTimestamp: number,
    statuses: State.TransactionStates[],
  ): Promise<IHistogramCount[]>;
  getTransactionData(transactionId: string): Promise<Event.AllEvent[]>;
  getTransactionEvents(
    fromTimestamp: number,
    toTimestamp: number,
    transactionId?: string,
    tags?: string[],
    from?: number,
    size?: number,
    statuses?: State.TransactionStates[],
  ): Promise<ITransactionEventPaginate>;
  create(event: Event.AllEvent): Promise<Event.AllEvent>;
  bulkCreate(events: IAllEventWithId[]): Promise<any[]>;
}

export class EventStore {
  client: IEventDataStore;

  setClient(client: IEventDataStore) {
    if (this.client) throw new Error('Already set client');
    this.client = client;
  }
  getFalseEvents = (
    fromTimestamp: number,
    toTimestamp: number,
  ): Promise<Event.AllEvent[]> => {
    return this.client.getFalseEvents(fromTimestamp, toTimestamp);
  };

  getTaskExecuteime(
    fromTimestamp: number,
    toTimestamp: number,
  ): Promise<ITaskExecutionTime[]> {
    return this.client.getTaskExecuteime(fromTimestamp, toTimestamp);
  }

  getTransactionDateHistogram(
    fromTimestamp: number,
    toTimestamp: number,
    statuses?: State.TransactionStates[],
  ): Promise<IHistogramCount[]> {
    return this.client.getTransactionDateHistogram(
      fromTimestamp,
      toTimestamp,
      statuses,
    );
  }

  getTransactionEvents(transactionId: string): Promise<Event.AllEvent[]> {
    return this.client.getTransactionData(transactionId);
  }

  listTransaction(
    fromTimestamp: number,
    toTimestamp: number,
    transactionId?: string,
    tags: string[] = [],
    from?: number,
    size?: number,
    statuses?: State.TransactionStates[],
  ): Promise<ITransactionEventPaginate> {
    return this.client.getTransactionEvents(
      fromTimestamp || 0,
      toTimestamp || Date.now(),
      transactionId,
      tags,
      from,
      size,
      statuses,
    );
  }

  create(events: Event.AllEvent): Promise<Event.AllEvent> {
    return this.client.create(events);
  }

  bulkCreate(events: IAllEventWithId[]): Promise<any[]> {
    return this.client.bulkCreate(events);
  }
}

// This's global instance
export const eventStore = new EventStore();
