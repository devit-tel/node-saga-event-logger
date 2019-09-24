import { IEvent } from '../kafka';
import { TransactionStates } from '../constants/transaction';

export interface IStore {
  isHealthy(): boolean;
}

export interface IQuery {
  status: TransactionStates;
  workflowName: string;
  from: number;
  to: number;
}

export interface IEventDataStore extends IStore {
  get(transactionId: string): Promise<IEvent[]>;
  query(query: IQuery, limit: number, page: number): Promise<IEvent[]>;
  create(event: IEvent): Promise<IEvent>;
  bulkCreate(events: IEvent[]): Promise<IEvent[]>;
}

export class EventStore {
  client: IEventDataStore;

  setClient(client: IEventDataStore) {
    if (this.client) throw new Error('Already set client');
    this.client = client;
  }

  get(transactionId: string): Promise<IEvent[]> {
    return this.client.get(transactionId);
  }

  query(query: IQuery, limit: number, page: number): Promise<IEvent[]> {
    return this.client.query(query, limit, page);
  }

  create(workflowDefinition: IEvent): Promise<IEvent> {
    return this.client.create(workflowDefinition);
  }

  bulkCreate(workflowDefinition: IEvent[]): Promise<IEvent[]> {
    return this.client.bulkCreate(workflowDefinition);
  }
}

// This's global instance
export const eventStore = new EventStore();
