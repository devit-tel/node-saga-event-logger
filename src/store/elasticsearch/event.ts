// import * as R from 'ramda';
import { ElasticsearchStore } from '../elasticsearch';
import { IEventDataStore, IQuery } from '../../store';
import { IEvent } from '../../kafka';

// const mapEsReponseToEvent = R.compose(
//   R.map(R.prop('_source')),
//   R.pathOr([], ['hits', 'hits']),
// );

export class EventElasticsearchStore extends ElasticsearchStore
  implements IEventDataStore {
  index: string;
  constructor(config: any, index: string) {
    super(config);
    this.index = index;
  }

  get = async (transactionId: string): Promise<IEvent[]> => {
    // const response = await this.client.search({
    //   index: this.index,
    //   type: 'response',
    //   body: {
    //     from: 0,
    //     size: 1,
    //     query: {
    //       match_phrase: {
    //         transactionId,
    //       },
    //     },
    //   },
    // });

    // return mapEsReponseToEvent(response);
    console.log(transactionId);
    return [];
  };

  query = async (
    query: IQuery,
    limit: number,
    page: number,
  ): Promise<IEvent[]> => {
    console.log(query, limit, page);
    return [];
  };

  create = async (event: IEvent): Promise<IEvent> => {
    await this.client.index({
      index: this.index,
      type: 'response',
      body: event,
    });

    return event;
  };

  bulkCreate = async (events: IEvent[]): Promise<IEvent[]> => {
    await this.client.bulk({
      body: events.reduce((result: any[], event: IEvent) => {
        const { _id, ...eventData } = event
        result.push({
          index: {
            _index: this.index,
            _type: 'response',
            _id
          },
        });
        result.push(eventData);
        return result;
      }, []),
    });
    return events;
  };
}
