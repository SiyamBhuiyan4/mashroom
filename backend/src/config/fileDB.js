import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On Vercel, the filesystem is read-only except for '/tmp'. 
// We use '/tmp/data' as a writable database fallback to prevent 500 crashes!
const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? '/tmp/data' : path.join(__dirname, '../../data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const getFilePath = (collection) => path.join(DATA_DIR, `${collection}.json`);

// In-memory cache for ultra-fast synchronous operations
const memCache = {};

// Array to track all pending asynchronous cloud write promises
export const pendingWrites = [];

// --- ExtendsClass Cloud Database Sync Config ---
const CLOUD_BIN_URL = 'https://extendsclass.com/api/json-storage/bin/bbafaaa';

// Pre-defined known collections to ensure they are always initialized
const COLLECTIONS = [
  'adminsettings',
  'auditlogs',
  'chat_messages',
  'chat_threads',
  'group_messages',
  'mapnodes',
  'markers',
  'messages',
  'notifications',
  'orders',
  'products',
  'supportmessages',
  'transactions',
  'users'
];

let initPromise = null;

// Exported getter to allow other modules/middlewares to await initialization completion
export const getInitPromise = () => {
  if (!initPromise) {
    initPromise = initDB();
  }
  return initPromise;
};

// --- Initialization routine called on server boot ---
export const initDB = async () => {
  try {
    console.log('📡 Connecting to ExtendsClass Cloud Database for persistent storage...');
    
    // Initialize memCache with empty arrays for all collections by default to prevent undefined reads/writes
    for (const col of COLLECTIONS) {
      memCache[col] = [];
    }

    // Always fetch with cache-busting on serverless networks to avoid stale GET results!
    const cacheBuster = `?t=${Date.now()}`;
    const response = await fetch(`${CLOUD_BIN_URL}${cacheBuster}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (response.ok) {
      const dbData = await response.json();
      for (const key in dbData) {
        memCache[key] = dbData[key];
        // Mirror to local tmp directory so it acts as a secondary buffer
        fs.writeFileSync(getFilePath(key), JSON.stringify(dbData[key], null, 2));
      }
      console.log('✅ ExtendsClass cloud database preloaded successfully!');
    } else {
      console.log('⚠️ Could not load ExtendsClass database. Falling back to local files.');
      loadAllFromLocal();
    }
  } catch (err) {
    console.error('⚠️ ExtendsClass connection error. Defaulting to local storage.', err.message);
    loadAllFromLocal();
  }
};

// Fallback helper to populate cache from local files
const loadAllFromLocal = () => {
  const collections = [
    'adminsettings',
    'auditlogs',
    'chat_messages',
    'chat_threads',
    'group_messages',
    'mapnodes',
    'markers',
    'messages',
    'notifications',
    'orders',
    'products',
    'supportmessages',
    'transactions',
    'users'
  ];
  for (const col of collections) {
    readCollection(col);
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

  // 2. Persist to ExtendsClass Cloud Database asynchronously (tracked for middleware awaiting)
  const promise = fetch(CLOUD_BIN_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(memCache)
  }).catch(err => {
    console.error('⚠️ ExtendsClass Cloud save error:', err.message);
  });

  pendingWrites.push(promise);
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
