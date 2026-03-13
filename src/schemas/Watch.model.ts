import { Schema } from 'mongoose';
import { WatchBrand, WatchStatus, WatchType } from '../libs/enums/watch.enum';

const WatchSchema = new Schema(
	{
		watchType: {
			type: String,
			enum: WatchType,
			required: true,
		},

		watchStatus: {
			type: String,
			enum: WatchStatus,
			default: WatchStatus.ACTIVE,
		},

		watchBrand: {
			type: String,
			enum: WatchBrand,
			required: true,
		},

		watchTitle: {
			type: String,
			required: true,
		},

		watchTitleI18n: {
			en: { type: String },
			ko: { type: String },
			uz: { type: String },
		},

		watchPrice: {
			type: Number,
			required: true,
		},

		watchImages: {
			type: [String],
			required: true,
		},

		watchDesc: {
			type: String,
		},

		watchDescI18n: {
			en: { type: String },
			ko: { type: String },
			uz: { type: String },
		},

		strapMaterial: {
			type: String,
		},

		caseMaterial: {
			type: String,
		},

		dialColor: {
			type: String,
		},

		strapColor: {
			type: String,
		},

		watchBarter: {
			type: Boolean,
			default: false,
		},

		watchRent: {
			type: Boolean,
			default: false,
		},

		watchBestSeller: {
			type: Boolean,
			default: false,
		},

		watchViews: {
			type: Number,
			default: 0,
		},

		watchLikes: {
			type: Number,
			default: 0,
		},

		watchComments: {
			type: Number,
			default: 0,
		},

		watchRank: {
			type: Number,
			default: 0,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		soldAt: {
			type: Date,
		},

		deletedAt: {
			type: Date,
		},

		manufacturedAt: {
			type: Date,
		},
	},
	{ timestamps: true, collection: 'watches' },
);

WatchSchema.index({ watchType: 1, watchBrand: 1, watchTitle: 1, watchPrice: 1 }, { unique: true });

export default WatchSchema;
