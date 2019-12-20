import { Event, State } from '@melonade/melonade-declaration';
import * as bodybuilder from 'bodybuilder';
import * as R from 'ramda';
import { IAllEventWithId } from '../../kafka';
import {
  HistogramCount,
  IEventDataStore,
  ITransactionEventPaginate,
} from '../../store';
import { ElasticsearchStore } from '../elasticsearch';
import moment = require('moment');

const mapEsReponseToEvent = R.compose(
  R.map(R.prop('_source')),
  R.pathOr([], ['hits', 'hits']),
);

const ES_EVENTS_MAPPING = {
  event: {
    properties: {
      details: {
        properties: {
          ackTimeout: {
            type: 'date',
          },
          createTime: {
            type: 'date',
          },
          endTime: {
            type: 'date',
          },
          input: {
            type: 'object',
            enabled: false,
          },
          isRetried: {
            type: 'boolean',
          },
          logs: {
            type: 'text',
          },
          output: {
            type: 'object',
            enabled: false,
          },
          parallelTasks: {
            type: 'object',
            enabled: false,
          },
          retries: {
            type: 'long',
          },
          retryDelay: {
            type: 'long',
          },
          startTime: {
            type: 'date',
          },
          status: {
            type: 'keyword',
          },
          tags: {
            type: 'keyword',
          },
          taskId: {
            type: 'keyword',
          },
          taskName: {
            type: 'keyword',
          },
          taskReferenceName: {
            type: 'keyword',
          },
          timeout: {
            type: 'long',
          },
          transactionId: {
            type: 'keyword',
          },
          type: {
            type: 'keyword',
          },
          workflowDefinition: {
            properties: {
              description: {
                type: 'text',
              },
              failureStrategy: {
                type: 'keyword',
              },
              name: {
                type: 'keyword',
              },
              outputParameters: {
                type: 'object',
                enabled: false,
              },
              rev: {
                type: 'keyword',
              },
              tasks: {
                properties: {
                  ackTimeout: {
                    type: 'long',
                  },
                  inputParameters: {
                    type: 'object',
                    enabled: false,
                  },
                  name: {
                    type: 'keyword',
                  },
                  parallelTasks: {
                    properties: {
                      ackTimeout: {
                        type: 'long',
                      },
                      inputParameters: {
                        type: 'object',
                        enabled: false,
                      },
                      name: {
                        type: 'keyword',
                      },
                      retry: {
                        properties: {
                          delay: {
                            type: 'long',
                          },
                          limit: {
                            type: 'long',
                          },
                        },
                      },
                      taskReferenceName: {
                        type: 'keyword',
                      },
                      timeout: {
                        type: 'long',
                      },
                      type: {
                        type: 'keyword',
                      },
                    },
                  },
                  retry: {
                    properties: {
                      delay: {
                        type: 'long',
                      },
                      limit: {
                        type: 'long',
                      },
                    },
                  },
                  taskReferenceName: {
                    type: 'keyword',
                  },
                  timeout: {
                    type: 'long',
                  },
                  type: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
          workflowId: {
            type: 'keyword',
          },
        },
      },
      isError: {
        type: 'boolean',
      },
      timestamp: {
        type: 'date',
      },
      transactionId: {
        type: 'keyword',
      },
      type: {
        type: 'keyword',
      },
    },
  },
};

export class EventElasticsearchStore extends ElasticsearchStore
  implements IEventDataStore {
  index: string;
  constructor(config: any, index: string) {
    super(config);
    this.index = index;
    this.client.indices
      .create({
        index: index,
        body: {
          mappings: ES_EVENTS_MAPPING,
        },
      })
      .catch((error: any) => console.log(error.message));
  }

  getWeeklyTransactionsByStatus = async (
    status: State.TransactionStates = State.TransactionStates.Running,
    now?: number | Date,
  ): Promise<HistogramCount[]> => {
    const response = await this.client.search({
      index: this.index,
      type: 'event',
      size: 0,
      body: bodybuilder()
        .query('match', 'type', 'TRANSACTION')
        .query('match', 'isError', false)
        .query('match', 'details.status', status)
        .query('range', 'timestamp', {
          gte: moment(now).startOf('week'),
          lte: moment(now).endOf('week'),
        })
        .aggregation(
          'date_histogram',
          {
            field: 'timestamp',
            interval: 'hour',
          },
          'timestamp_hour',
        )
        .build(),
    });

    return response.aggregations['timestamp_hour'].buckets.map((data: any) => ({
      date: data.key,
      count: data.doc_count,
    }));
  };

  listTransaction = async (
    fromTimestamp: number,
    toTimestamp: number,
    transactionId?: string,
    tags: string[] = [],
    from: number = 0,
    size: number = 100,
  ): Promise<ITransactionEventPaginate> => {
    const query = {
      query: {
        bool: {
          must: [
            { match: { type: 'TRANSACTION' } },
            { match: { isError: false } },
            { match: { 'details.status': State.TransactionStates.Running } },
            transactionId
              ? {
                  query_string: {
                    default_field: 'transactionId',
                    query: `*${transactionId}*`,
                  },
                }
              : undefined,
            {
              range: {
                timestamp: {
                  gte: fromTimestamp,
                  lte: toTimestamp,
                },
              },
            },
            ...tags.map((tag: string) => ({
              match: {
                'details.tags': tag,
              },
            })),
          ].filter((query: any) => !!query),
        },
      },
      from,
      size,
      sort: [
        {
          timestamp: {
            order: 'desc',
          },
        },
      ],
    };

    const response = await this.client.search({
      index: this.index,
      type: 'event',
      body: query,
    });

    return {
      total: response.hits.total,
      events: mapEsReponseToEvent(response) as Event.ITransactionEvent[],
    };
  };

  getTransactionData = async (
    transactionId: string,
  ): Promise<Event.AllEvent[]> => {
    const response = await this.client.search({
      index: this.index,
      type: 'event',
      body: {
        query: {
          bool: {
            must: [{ match: { transactionId } }],
          },
        },
        from: 0,
        size: 1000,
        sort: [
          {
            timestamp: {
              order: 'desc',
            },
          },
        ],
        aggs: {},
      },
    });

    return mapEsReponseToEvent(response) as Event.AllEvent[];
  };

  create = async (event: Event.AllEvent): Promise<Event.AllEvent> => {
    await this.client.index({
      index: this.index,
      type: 'event',
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
            _type: 'event',
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
