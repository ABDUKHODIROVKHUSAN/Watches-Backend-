import { Schema } from 'mongoose';

const BestSellerDisplayStateSchema = new Schema(
	{
		jobName: {
			type: String,
			required: true,
			unique: true,
		},
		snapshotWindowStart: {
			type: Date,
			required: true,
		},
		snapshotWindowEnd: {
			type: Date,
			required: true,
		},
		rotationSlot: {
			type: Number,
			required: true,
		},
		poolSize: {
			type: Number,
			required: true,
		},
		displayWatchIds: {
			type: [Schema.Types.ObjectId],
			required: true,
			default: [],
			ref: 'Watch',
		},
		generatedAt: {
			type: Date,
			required: true,
		},
	},
	{ timestamps: true, collection: 'best_seller_display_states' },
);

BestSellerDisplayStateSchema.index({ jobName: 1 }, { unique: true });
BestSellerDisplayStateSchema.index({ snapshotWindowEnd: -1, generatedAt: -1 });

export default BestSellerDisplayStateSchema;
