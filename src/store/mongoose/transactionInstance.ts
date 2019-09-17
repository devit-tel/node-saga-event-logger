import * as mongoose from 'mongoose';
import { MongooseStore } from '.';
import { ITransaction } from '../../transaction';
import { ITransactionInstanceStore } from '..';
import {
  TransactionPrevStates,
  TransactionStates,
} from '../../constants/transaction';
import { ITransactionUpdate } from '../../state';

const transacationSchema = new mongoose.Schema(
  {
    transactionId: {
      index: true,
      unique: true,
      type: String,
    },
    status: {
      type: String,
      index: true,
    },
    input: mongoose.Schema.Types.Mixed,
    output: mongoose.Schema.Types.Mixed,
    createTime: Number,
    endTime: Number,
    workflowDefinition: mongoose.Schema.Types.Mixed,
  },
  {
    toObject: {
      virtuals: true,
    },
    toJSON: {
      virtuals: true,
    },
  },
);

export class TransactionInstanceMongoseStore extends MongooseStore
  implements ITransactionInstanceStore {
  constructor(uri: string, mongoOption: mongoose.ConnectionOptions) {
    super(uri, mongoOption, 'transaction-instance', transacationSchema);
  }

  get = async (transactionId: string): Promise<ITransaction> => {
    return this.model
      .findOne({ transactionId })
      .lean({ virtuals: true })
      .exec();
  };

  create = async (transactionData: ITransaction): Promise<ITransaction> => {
    return {
      ...transactionData,
      ...(await this.model.create(transactionData)).toObject(),
    };
  };

  update = async (
    transactionUpdate: ITransactionUpdate,
  ): Promise<ITransaction> => {
    return this.model
      .findOneAndUpdate(
        {
          transactionId: transactionUpdate.transactionId,
          status: TransactionPrevStates[transactionUpdate.status],
        },
        {
          status: transactionUpdate.status,
          output: transactionUpdate.output,
          endTime: [
            TransactionStates.Completed,
            TransactionStates.Failed,
          ].includes(transactionUpdate.status)
            ? Date.now()
            : null,
        },
        {
          new: true,
        },
      )
      .lean({ virtuals: true })
      .exec();
  };
}
