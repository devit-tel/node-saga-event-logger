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

export interface IStore {
  isHealthy(): boolean;
}

export interface ITransactionEventPaginate {
  total: number;
  events: Event.ITransactionEvent[];
}

export interface IEventDataStore extends IStore {
  getWeeklyTransactionsByStatus(
    status: State.TransactionStates,
    now?: number | Date,
  ): Promise<HistogramCount[]>;
  getTransactionData(transactionId: string): Promise<Event.AllEvent[]>;
  listTransaction(
    fromTimestamp: number,
    toTimestamp: number,
    transactionId?: string,
    tags?: string[],
    from?: number,
    size?: number,
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

  getWeeklyTransactionsByStatus(
    status?: State.TransactionStates,
    now?: number | Date,
  ): Promise<HistogramCount[]> {
    return this.client.getWeeklyTransactionsByStatus(status, now);
  }

  getTransactionData(transactionId: string): Promise<Event.AllEvent[]> {
    return this.client.getTransactionData(transactionId);
  }

  listTransaction(
    fromTimestamp: number,
    toTimestamp: number,
    transactionId?: string,
    tags: string[] = [],
    from?: number,
    size?: number,
  ): Promise<ITransactionEventPaginate> {
    return this.client.listTransaction(
      fromTimestamp || 0,
      toTimestamp || Date.now(),
      transactionId,
      tags,
      from,
      size,
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
