import mongoose from 'mongoose';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB Connection
const connectMongoDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/velora';
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
};

// PostgreSQL Connection
const postgresUri = process.env.POSTGRES_URI || 'postgres://user:pass@localhost:5432/velora';
export const sequelize = new Sequelize(postgresUri, {
  logging: false,
});

const connectPostgres = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL');
  } catch (err) {
    console.error('PostgreSQL connection error:', err);
  }
};

export const connectDatabases = async () => {
  await connectMongoDB();
  await connectPostgres();
};
