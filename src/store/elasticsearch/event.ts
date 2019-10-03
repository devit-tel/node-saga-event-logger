// import * as R from 'ramda';
import { Event } from '@melonade/melonade-declaration';
import { ElasticsearchStore } from '../elasticsearch';
import { IEventDataStore, IQuery } from '../../store';
import { IAllEventWithId } from '../../kafka';

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

  get = async (transactionId: string): Promise<Event.AllEvent[]> => {
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
  ): Promise<Event.AllEvent[]> => {
    console.log(query, limit, page);
    return [];
  };

  create = async (event: Event.AllEvent): Promise<Event.AllEvent> => {
    await this.client.index({
      index: this.index,
      type: 'response',
      body: event,
    });

    return event;
  };

  bulkCreate = async (events: IAllEventWithId[]): Promise<any> => {
    const resp = await this.client.bulk({
      body: events.reduce((result: any[], event: IAllEventWithId) => {
        const { _id, event: eventData } = event;
        result.push({
          index: {
            _index: this.index,
            _type: 'response',
            _id,
          },
        });
        result.push(eventData);
        return result;
      }, []),
    });
    if (resp.errors) throw new Error('Fail to inserts');
    return events;
  };
}
