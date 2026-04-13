import mongoose from "mongoose";

declare global {
  // This cache avoids creating a new DB connection on every hot reload in development.
  // It improves reliability and prevents "too many connections" issues with Atlas.
  // eslint-disable-next-line no-var
  var __mongooseConnection: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

const cached =
  global.__mongooseConnection ||
  (global.__mongooseConnection = { conn: null, promise: null });

export const connectToDatabase = async () => {
  // This function intentionally reads env vars at runtime so Next build can complete
  // even when local secrets are not yet configured.
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI in environment variables.");
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    // We do not force dbName here because Atlas URIs already include the intended DB.
    // Forcing a different DB name can make existing data appear "wiped" to the UI.
    cached.promise = mongoose.connect(mongoUri, {
      autoIndex: true,
      autoCreate: true,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};
