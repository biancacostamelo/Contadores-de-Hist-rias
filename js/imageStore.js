'use strict';

const IMAGE_DB_CONFIG = Object.freeze({
  NAME: 'writersCommunityImages',
  STORE_NAME: 'images',
});

class ImageStore {
  constructor() {
    this._db = null;
  }

  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IMAGE_DB_CONFIG.NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(IMAGE_DB_CONFIG.STORE_NAME, {
          keyPath: 'id',
        });
      };
      request.onsuccess = () => {
        this._db = request.result;
        resolve(this._db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async save(file) {
    await this.open();
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const base64 =
      typeof file === 'string' ? file : await convertToBase64(file);
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(IMAGE_DB_CONFIG.STORE_NAME, 'readwrite');
      const store = tx.objectStore(IMAGE_DB_CONFIG.STORE_NAME);
      const req = store.put({ id, data: base64 });
      req.onsuccess = () => resolve(id);
      req.onerror = () => reject(req.error);
    });
  }

  async load(id) {
    if (!id) return null;
    await this.open();
    return new Promise((resolve) => {
      const store = this._db
        .transaction(IMAGE_DB_CONFIG.STORE_NAME)
        .objectStore(IMAGE_DB_CONFIG.STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request?.result?.data || null);
      request.onerror = () => resolve(null);
    });
  }

  async remove(id) {
    if (!id) return;
    await this.open();
    return new Promise((resolve) => {
      const store = this._db
        .transaction(IMAGE_DB_CONFIG.STORE_NAME, 'readwrite')
        .objectStore(IMAGE_DB_CONFIG.STORE_NAME);
      store.delete(id);
      resolve();
    });
  }
}

function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

if (typeof window !== 'undefined') {
  window.ImageStore = ImageStore;
  window.convertToBase64 = convertToBase64;
}
