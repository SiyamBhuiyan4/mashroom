import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On Vercel, the filesystem is read-only except for '/tmp'. 
// We use '/tmp/data' as a writable database fallback to prevent 500 crashes!
const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? '/tmp/data' : path.join(__dirname, '../../data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const getFilePath = (collection) => path.join(DATA_DIR, `${collection}.json`);

// --- Cloud MongoDB Atlas Sync Schema ---
const CollectionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  data: { type: Array, default: [] }
}, { timestamps: true });

const CollectionModel = mongoose.models.Collection || mongoose.model('Collection', CollectionSchema);

// In-memory cache for ultra-fast synchronous operations
const memCache = {};

// --- Initialization routine called on server boot ---
export const initDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.log('📁 MONGO_URI not found. Using purely offline local JSON database.');
    return;
  }

  try {
    console.log('📡 Connecting to Cloud MongoDB Atlas for fileDB persistent storage...');
    // Connect to MongoDB Atlas (if not already connected) with a fast 2-second timeout!
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000
      });
    }
    console.log('✅ Connected to MongoDB Atlas. Preloading collections into cache...');

    const docs = await CollectionModel.find({});
    for (const doc of docs) {
      memCache[doc.name] = doc.data;
    }
    console.log(`✅ Preloaded ${docs.length} database tables from cloud storage into RAM.`);
  } catch (err) {
    console.error('⚠️ Could not connect to cloud database. Defaulting to local JSON files.', err.message);
  }
};

const readCollection = (collection) => {
  // 1. If loaded in cache, serve from cache instantly
  if (memCache[collection]) {
    return memCache[collection];
  }

  // 2. Otherwise fall back to local json file
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]');
    memCache[collection] = [];
    return [];
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    memCache[collection] = data;
    return data;
  } catch {
    memCache[collection] = [];
    return [];
  }
};

const writeCollection = (collection, data) => {
  // Update cache immediately
  memCache[collection] = data;

  // 1. Persist locally in background (non-blocking)
  fs.writeFile(getFilePath(collection), JSON.stringify(data, null, 2), () => {});

  // 2. Persist to MongoDB Atlas cloud in background asynchronously
  if (mongoose.connection.readyState === 1) {
    CollectionModel.findOneAndUpdate(
      { name: collection },
      { name: collection, data: data },
      { upsert: true, new: true }
    ).catch(err => {
      console.error(`⚠️ Cloud save error for table [${collection}]:`, err.message);
    });
  }
};

const generateId = () => Date.now().toString() + Math.random().toString(36).slice(2, 7);

export const db = {
  findAll: (col) => readCollection(col),

  findById: (col, id) => readCollection(col).find(i => i._id === id) || null,

  findOne: (col, query) => {
    const data = readCollection(col);
    return data.find(item => Object.entries(query).every(([k, v]) => item[k] === v)) || null;
  },

  find: (col, query = {}) => {
    const data = readCollection(col);
    if (!Object.keys(query).length) return data;
    return data.filter(item => Object.entries(query).every(([k, v]) => item[k] === v));
  },

  create: (col, doc) => {
    const data = readCollection(col);
    const newDoc = { _id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...doc };
    data.push(newDoc);
    writeCollection(col, data);
    return newDoc;
  },

  updateById: (col, id, updates) => {
    const data = readCollection(col);
    const idx = data.findIndex(i => i._id === id);
    if (idx === -1) return null;
    data[idx] = { ...data[idx], ...updates, updatedAt: new Date().toISOString() };
    writeCollection(col, data);
    return data[idx];
  },

  updateOne: (col, query, updates) => {
    const data = readCollection(col);
    const idx = data.findIndex(item => Object.entries(query).every(([k, v]) => item[k] === v));
    if (idx === -1) return null;
    data[idx] = { ...data[idx], ...updates, updatedAt: new Date().toISOString() };
    writeCollection(col, data);
    return data[idx];
  },

  deleteById: (col, id) => {
    let data = readCollection(col);
    const item = data.find(i => i._id === id);
    writeCollection(col, data.filter(i => i._id !== id));
    return item;
  },

  count: (col, query = {}) => {
    const data = readCollection(col);
    if (!Object.keys(query).length) return data.length;
    return data.filter(item => Object.entries(query).every(([k, v]) => item[k] === v)).length;
  }
};
