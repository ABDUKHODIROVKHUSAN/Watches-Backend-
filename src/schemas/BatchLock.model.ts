import { Schema } from 'mongoose';

const BatchLockSchema = new Schema(
	{
		key: {
			type: String,
			required: true,
			unique: true,
		},
		ownerId: {
			type: String,
			required: true,
		},
		expiresAt: {
			type: Date,
			required: true,
		},
	},
	{ timestamps: true, collection: 'batch_locks' },
);

BatchLockSchema.index({ key: 1 }, { unique: true });
BatchLockSchema.index({ expiresAt: 1 });

export default BatchLockSchema;
