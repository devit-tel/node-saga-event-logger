import { IEvent, poll, consumerEventClient } from './kafka';
import { eventStore } from './store';

const retryBulkCreate = async (
  events: IEvent[],
  retries: number,
  deley: number,
) => {
  try {
    await eventStore.bulkCreate(events);
  } catch (error) {
    if (retries > 0) {
      setTimeout(() => {
        console.warn(`Retrying bulk create ${retries} times`);
        retryBulkCreate(events, retries--, deley);
      }, deley);
    } else {
      console.error(`Cannot retry`);
      console.error(JSON.stringify(events));
    }
  }
};

export const executor = async () => {
  try {
    const events: IEvent[] = await poll(consumerEventClient, 200);
    if (events.length) {
      await retryBulkCreate(events, Number.MAX_VALUE, 5000);
      console.log(`Inserted ${events.length} rows`);
      consumerEventClient.commit();
    }
  } catch (error) {
    // Handle error here
    console.log(error);
  } finally {
    setImmediate(executor);
  }
};
