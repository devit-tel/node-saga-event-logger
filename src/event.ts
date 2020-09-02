import { consumerEventClient, IAllEventWithId, poll } from './kafka';
import { eventStore } from './store';
import { sleep } from './utils/common';

const retryBulkCreate = async (
  events: IAllEventWithId[],
  retries: number,
  delay: number,
) => {
  try {
    await eventStore.bulkCreate(events);
  } catch (error) {
    console.warn('Bulk error', error);
    if (retries > 0) {
      setTimeout(() => {
        console.warn(`Retrying bulk create ${retries} times`);
        retryBulkCreate(events, retries--, delay);
      }, delay);
    } else {
      console.error(`Cannot retry`);
      console.error(JSON.stringify(events));
    }
  }
};

export const executor = async () => {
  while (true) {
    try {
      const events: IAllEventWithId[] = await poll(consumerEventClient, 200);
      if (events.length) {
        await retryBulkCreate(events, Number.MAX_VALUE, 10000);
        console.log(`Inserted ${events.length} rows`);
        consumerEventClient.commit();
      }
    } catch (error) {
      // Handle error here
      console.warn(error);
      await sleep(1000);
    }
  }
};
