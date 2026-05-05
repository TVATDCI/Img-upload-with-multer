import mongoose from 'mongoose';

const albumSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Album name is required'],
      trim: true,
      minlength: 1,
      maxlength: 100,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    coverImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image',
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// unique index is already defined on the name field above

albumSchema.statics.listWithImageCounts = function () {
  return this.aggregate([
    {
      $lookup: {
        from: 'images',
        localField: '_id',
        foreignField: 'album',
        as: 'images',
      },
    },
    {
      $lookup: {
        from: 'images',
        localField: 'coverImage',
        foreignField: '_id',
        as: 'coverImageDoc',
      },
    },
    {
      $addFields: {
        imageCount: { $size: '$images' },
        coverImage: {
          $cond: [{ $gt: [{ $size: '$coverImageDoc' }, 0] }, '$coverImage', null],
        },
      },
    },
    {
      $project: {
        images: 0,
        coverImageDoc: 0,
      },
    },
    {
      $sort: {
        createdAt: -1,
        _id: -1,
      },
    },
  ]);
};

const Album = mongoose.model('Album', albumSchema);

export default Album;
