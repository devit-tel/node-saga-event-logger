import { Event } from '@melonade/melonade-declaration';
import * as R from 'ramda';
import { IAllEventWithId } from '../../kafka';
import { IEventDataStore, ITransactionEventPaginate } from '../../store';
import { ElasticsearchStore } from '../elasticsearch';

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
            tags.map((tag: string) => ({
              match: {
                'details.tags': {
                  query: tag,
                },
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
            must_not: [],
            should: [],
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
