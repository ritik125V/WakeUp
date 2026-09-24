import mongoose from 'mongoose';

export const connectMongoDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn('⚠️ [MongoDB]: MONGO_URI is not defined in environment variables.');
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ [MongoDB]: Connected successfully to MongoDB.');
    const { UserModel } = await import('../models/User.js');
    
    // Clean up any legacy duplicate email records
    const users = await UserModel.find().sort({ createdAt: 1 }).lean();
    const seenEmails = new Set<string>();
    const duplicateIds: string[] = [];

    for (const u of users) {
      const lowerEmail = (u.email || '').toLowerCase().trim();
      if (seenEmails.has(lowerEmail)) {
        duplicateIds.push(u._id.toString());
      } else {
        seenEmails.add(lowerEmail);
      }
    }

    if (duplicateIds.length > 0) {
      console.warn(`🧹 [MongoDB]: Cleaning up ${duplicateIds.length} duplicate user record(s)...`);
      await UserModel.deleteMany({ _id: { $in: duplicateIds } });
    }

    await UserModel.syncIndexes();
  } catch (error) {
    console.error('❌ [MongoDB]: Connection error:', error);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ [MongoDB]: Disconnected from MongoDB.');
});
