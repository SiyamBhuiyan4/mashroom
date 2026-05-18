import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');

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

const preload = async () => {
  const masterDb = {};

  for (const col of collections) {
    const filePath = path.join(DATA_DIR, `${col}.json`);
    if (fs.existsSync(filePath)) {
      try {
        masterDb[col] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        console.log(`Loaded collection [${col}] with ${masterDb[col].length} items.`);
      } catch (err) {
        masterDb[col] = [];
      }
    } else {
      masterDb[col] = [];
    }
  }

  try {
    console.log('☁️ Uploading master database to ExtendsClass Cloud Storage (bin: bbafaaa)...');
    const response = await fetch('https://extendsclass.com/api/json-storage/bin/bbafaaa', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(masterDb)
    });
    
    if (response.ok) {
      console.log('✅ Cloud database successfully seeded with all local data!');
    } else {
      console.error('❌ Cloud upload failed with status:', response.status);
    }
  } catch (err) {
    console.error('❌ Cloud upload failed:', err.message);
  }
};

preload();
