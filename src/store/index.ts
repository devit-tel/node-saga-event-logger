import { Event, State } from '@melonade/melonade-declaration';
import { IAllEventWithId } from '../kafka';

export enum StoreType {
  MongoDB = 'MONGODB',
  Elasticsearch = 'ELASTICSEARCH',
}

export interface HistogramCount {
  date: number | Date;
  count: number;
}

export interface TaskExecutionTime {
  executionTime: number;
  taskName: string;
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
  ): Promise<TaskExecutionTime[]>;
  getTransactionDateHistogram(
    fromTimestamp: number,
    toTimestamp: number,
    status: State.TransactionStates,
  ): Promise<HistogramCount[]>;
  getTransactionData(transactionId: string): Promise<Event.AllEvent[]>;
  getTraansactionEvents(
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
  ): Promise<TaskExecutionTime[]> {
    return this.client.getTaskExecuteime(fromTimestamp, toTimestamp);
  }

  getTransactionDateHistogram(
    fromTimestamp: number,
    toTimestamp: number,
    status?: State.TransactionStates,
  ): Promise<HistogramCount[]> {
    return this.client.getTransactionDateHistogram(
      fromTimestamp,
      toTimestamp,
      status,
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
    return this.client.getTraansactionEvents(
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
