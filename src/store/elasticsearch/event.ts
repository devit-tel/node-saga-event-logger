import { Event, State, Task } from '@melonade/melonade-declaration';
import * as bodybuilder from 'bodybuilder';
import * as R from 'ramda';
import { IAllEventWithId } from '../../kafka';
import {
  IEventDataStore,
  IHistogramCount,
  ITaskExecutionTime,
  ITransactionEventPaginate,
} from '../../store';
import { ElasticsearchStore } from '../elasticsearch';

const mapEsResponseToEvent = R.compose(
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
                type: 'object',
                enabled: false,
              },
            },
          },
          workflowId: {
            type: 'keyword',
          },
          taskPath: {
            type: 'object',
            enabled: false,
          },
          parent: {
            properties: {
              transactionId: {
                type: 'keyword',
              },
              taskId: {
                type: 'keyword',
              },
              taskType: {
                type: 'keyword',
              },
              depth: {
                type: 'long',
              },
            },
          },
          transactionDepth: {
            type: 'long',
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

const escapeQueryString = (text: string) =>
  text.replace(/(&&|\|\||!|\(|\)|{|}|\[|\]|\^|"|~|\*|\?|:)/gi, '\\$1');

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
      .catch(async (error: any) => {
        if ((error.message || '').includes('already exists')) {
          console.log('running elasticsearch migrate mapping');
          try {
            await this.client.indices.putMapping({
              index: index,
              type: 'event',
              body: ES_EVENTS_MAPPING,
            });
          } catch (error) {
            console.error(error.message);
          }
        } else {
          console.error(error.message);
        }
      });
  }

  getFalseEvents = async (
    fromTimestamp: number,
    toTimestamp: number,
  ): Promise<Event.AllEvent[]> => {
    const response = await this.client.search({
      index: this.index,
      type: 'event',
      body: bodybuilder()
        .filter('bool', b =>
          b
            .orFilter('bool')
            .notFilter('bool', nb =>
              nb
                .filter('match', 'details.status', State.TaskStates.Timeout)
                .filter('match', 'type', 'TASK'),
            )
            .notFilter('bool', nb =>
              nb
                .filter('match', 'details.status', State.TaskStates.AckTimeOut)
                .filter('match', 'type', 'TASK'),
            ),
        )
        .query('match', 'isError', true)
        .sort('timestamp', 'desc')
        .query('range', 'timestamp', {
          gte: fromTimestamp,
          lte: toTimestamp,
        })
        .from(0)
        .size(3000)
        .build(),
    });

    return mapEsResponseToEvent(response) as Event.AllEvent[];
  };

  getTaskExecuteime = async (
    fromTimestamp: number,
    toTimestamp: number,
  ): Promise<ITaskExecutionTime[]> => {
    const response = await this.client.search({
      index: this.index,
      type: 'event',
      size: 3000,
      body: bodybuilder()
        .query('match', 'type', 'TASK')
        .query('match', 'isError', false)
        .query('match', 'details.status', State.TaskStates.Completed)
        .query('match', 'details.type', Task.TaskTypes.Task)
        .query('range', 'timestamp', {
          gte: fromTimestamp,
          lte: toTimestamp,
        })
        .rawOption('script_fields', {
          executionTime: {
            script:
              "doc['details.endTime'].date.millis - doc['details.startTime'].date.millis",
          },
          taskName: {
            script: "doc['details.taskName']",
          },
          executedAt: {
            script: "doc['timestamp']",
          },
        })
        .sort('timestamp', 'desc')
        .build(),
    });
    return response.hits.hits.map(data => {
      return {
        taskName: R.pathOr('', ['fields', 'taskName', 0], data),
        executionTime: R.pathOr(0, ['fields', 'executionTime', 0], data),
        executedAt: R.pathOr(0, ['fields', 'executedAt', 0], data),
      };
    });
  };

  getTransactionDateHistogram = async (
    fromTimestamp: number,
    toTimestamp: number,
    statuses: State.TransactionStates[] = [State.TransactionStates.Running],
  ): Promise<IHistogramCount[]> => {
    const body = bodybuilder()
      .query('match', 'type', 'TRANSACTION')
      .query('match', 'isError', false)
      .query('range', 'timestamp', {
        gte: fromTimestamp,
        lte: toTimestamp,
      })
      .aggregation(
        'date_histogram',
        {
          field: 'timestamp',
          interval: 'hour',
          extended_bounds: {
            min: fromTimestamp,
            max: toTimestamp,
          },
        },
        'timestamp_hour',
      );

    body.query('bool', (builder: bodybuilder.QuerySubFilterBuilder) => {
      statuses.map((status: State.TransactionStates) =>
        builder.orQuery('match', 'details.status', status),
      );
      return builder;
    });

    const response = await this.client.search({
      index: this.index,
      type: 'event',
      size: 0,
      body: body.build(),
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
    statuses: State.TransactionStates[] = [State.TransactionStates.Running],
    workflowName?: string,
    workflowRev?: string,
  ): Promise<ITransactionEventPaginate> => {
    const body = bodybuilder()
      .query('match', 'type', 'TRANSACTION')
      .query('match', 'isError', false)
      .query('match', 'type', 'TRANSACTION')
      .query('range', 'timestamp', {
        gte: fromTimestamp,
        lte: toTimestamp,
      })
      .sort('timestamp', 'desc')
      .from(from)
      .size(size);

    for (const tag of tags) {
      body.query('match', 'details.tags', tag);
    }

    body.query('bool', (builder: bodybuilder.QuerySubFilterBuilder) => {
      statuses.map((status: State.TransactionStates) =>
        builder.orQuery('match', 'details.status', status),
      );
      return builder;
    });

    if (transactionId) {
      body.query('query_string', {
        default_field: 'transactionId',
        query: `*${escapeQueryString(transactionId)}*`,
      });
    }

    if (workflowName) {
      body.query('match', 'details.workflowDefinition.name', workflowName);
    }

    if (workflowRev) {
      body.query('match', 'details.workflowDefinition.rev', workflowRev);
    }

    const response = await this.client.search({
      index: this.index,
      type: 'event',
      body: body.build(),
    });

    return {
      total: response.hits.total,
      events: mapEsResponseToEvent(response) as Event.ITransactionEvent[],
    };
  };

  getTransactionData = async (
    transactionId: string,
  ): Promise<Event.AllEvent[]> => {
    const response = await this.client.search({
      index: this.index,
      type: 'event',
      body: bodybuilder()
        .query('match', 'transactionId', transactionId)
        .sort('timestamp', 'desc')
        .from(0)
        .size(3000)
        .build(),
    });

    return mapEsResponseToEvent(response) as Event.AllEvent[];
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
    if (resp.errors) {
      console.log(resp.errors);
      throw new Error('Fail to inserts');
    }
    return events;
  };
}
