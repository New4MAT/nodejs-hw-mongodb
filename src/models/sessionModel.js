import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    accessToken: {
      type: String,
      required: [true, 'Access token is required'],
    },
    refreshToken: {
      type: String,
      required: [true, 'Refresh token is required'],
      unique: true,
    },
    accessTokenValidUntil: {
      type: Date,
      required: [true, 'Access token expiry is required'],
    },
    refreshTokenValidUntil: {
      type: Date,
      required: [true, 'Refresh token expiry is required'],
    },
  },
  {
    timestamps: true,
  },
);

export const Session = mongoose.model('Session', sessionSchema);
