import { State, Event } from '@melonade/melonade-declaration';
import { IAllEventWithId } from '../kafka';

export enum StoreType {
  MongoDB = 'MONGODB',
  Elasticsearch = 'ELASTICSEARCH',
}

export interface IStore {
  isHealthy(): boolean;
}

export interface IQuery {
  status: State.TransactionStates;
  workflowName: string;
  from: number;
  to: number;
}

export interface IEventDataStore extends IStore {
  getTransactionData(transactionId: string): Promise<Event.AllEvent[]>;
  listTransaction(
    statuses: State.TransactionStates[],
    fromTimestamp: number,
    toTimestamp: number,
    from?: number,
    size?: number,
  ): Promise<Event.ITransactionEvent[]>;
  query(query: IQuery, limit: number, page: number): Promise<Event.AllEvent[]>;
  create(event: Event.AllEvent): Promise<Event.AllEvent>;
  bulkCreate(events: IAllEventWithId[]): Promise<any[]>;
}

export class EventStore {
  client: IEventDataStore;

  setClient(client: IEventDataStore) {
    if (this.client) throw new Error('Already set client');
    this.client = client;
  }

  getTransactionData(transactionId: string): Promise<Event.AllEvent[]> {
    return this.client.getTransactionData(transactionId);
  }

  query(query: IQuery, limit: number, page: number): Promise<Event.AllEvent[]> {
    return this.client.query(query, limit, page);
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
