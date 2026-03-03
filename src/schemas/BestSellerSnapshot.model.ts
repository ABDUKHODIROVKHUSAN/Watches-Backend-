import { Schema } from 'mongoose';

const BestSellerSnapshotSchema = new Schema(
	{
		jobName: {
			type: String,
			required: true,
		},
		windowStart: {
			type: Date,
			required: true,
		},
		windowEnd: {
			type: Date,
			required: true,
		},
		generatedAt: {
			type: Date,
			required: true,
		},
		watchId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Watch',
		},
		watchTitle: {
			type: String,
			required: true,
		},
		watchBrand: {
			type: String,
			required: true,
		},
		rank: {
			type: Number,
			required: true,
		},
		score: {
			type: Number,
			required: true,
		},
		signals: {
			views: { type: Number, default: 0 },
			likes: { type: Number, default: 0 },
			orders: { type: Number, default: 0 },
		},
		weights: {
			views: { type: Number, required: true },
			likes: { type: Number, required: true },
			orders: { type: Number, required: true },
		},
	},
	{ timestamps: true, collection: 'best_seller_snapshots' },
);

BestSellerSnapshotSchema.index({ windowStart: 1, windowEnd: 1, watchId: 1 }, { unique: true });
BestSellerSnapshotSchema.index({ jobName: 1, windowEnd: -1, rank: 1 });

export default BestSellerSnapshotSchema;
