// Cache management module
export class CacheManager {
    constructor() {
        this.memoryCache = new Map();
        this.dbName = 'FinanceAppCache';
        this.dbVersion = 1;
        this.db = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Initialize IndexedDB
            await this.initIndexedDB();
            
            // Load critical data from IndexedDB to memory
            await this.loadCriticalDataToMemory();
            
            this.isInitialized = true;
            console.log('CacheManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize CacheManager:', error);
            // Fallback to memory-only cache
            this.isInitialized = true;
        }
    }

    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('cache')) {
                    const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
                    cacheStore.createIndex('expiry', 'expiry', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('transactions')) {
                    const transactionsStore = db.createObjectStore('transactions', { keyPath: 'key' });
                    transactionsStore.createIndex('expiry', 'expiry', { unique: false });
                }
            };
        });
    }

    async loadCriticalDataToMemory() {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction(['cache'], 'readonly');
            const store = transaction.objectStore('cache');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const items = request.result;
                items.forEach(item => {
                    if (item.expiry > Date.now()) {
                        this.memoryCache.set(item.key, {
                            data: item.data,
                            timestamp: item.timestamp,
                            expiry: item.expiry
                        });
                    }
                });
            };
        } catch (error) {
            console.error('Error loading critical data to memory:', error);
        }
    }

    async get(key) {
        // Check memory cache first
        if (this.memoryCache.has(key)) {
            const cached = this.memoryCache.get(key);
            if (cached.expiry > Date.now()) {
                return cached.data;
            } else {
                this.memoryCache.delete(key);
            }
        }

        // Check IndexedDB if available
        if (this.db) {
            try {
                const data = await this.getFromIndexedDB(key);
                if (data) {
                    // Add to memory cache
                    this.memoryCache.set(key, {
                        data: data.data,
                        timestamp: data.timestamp,
                        expiry: data.expiry
                    });
                    return data.data;
                }
            } catch (error) {
                console.error('Error reading from IndexedDB:', error);
            }
        }

        return null;
    }

    async set(key, data, ttl = 300000) { // Default 5 minutes
        const timestamp = Date.now();
        const expiry = timestamp + ttl;
        
        const cacheItem = {
            data,
            timestamp,
            expiry
        };

        // Store in memory cache
        this.memoryCache.set(key, cacheItem);

        // Store in IndexedDB if available
        if (this.db) {
            try {
                await this.setToIndexedDB(key, cacheItem);
            } catch (error) {
                console.error('Error writing to IndexedDB:', error);
            }
        }
    }

    async getFromIndexedDB(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readonly');
            const store = transaction.objectStore('cache');
            const request = store.get(key);
            
            request.onsuccess = () => {
                const result = request.result;
                if (result && result.expiry > Date.now()) {
                    resolve(result);
                } else {
                    resolve(null);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    async setToIndexedDB(key, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const request = store.put({ key, ...data });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async delete(key) {
        // Remove from memory cache
        this.memoryCache.delete(key);

        // Remove from IndexedDB if available
        if (this.db) {
            try {
                await this.deleteFromIndexedDB(key);
            } catch (error) {
                console.error('Error deleting from IndexedDB:', error);
            }
        }
    }

    async deleteFromIndexedDB(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clear() {
        // Clear memory cache
        this.memoryCache.clear();

        // Clear IndexedDB if available
        if (this.db) {
            try {
                await this.clearIndexedDB();
            } catch (error) {
                console.error('Error clearing IndexedDB:', error);
            }
        }
    }

    async clearIndexedDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async cleanup() {
        const now = Date.now();
        
        // Cleanup memory cache
        for (const [key, value] of this.memoryCache.entries()) {
            if (value.expiry <= now) {
                this.memoryCache.delete(key);
            }
        }

        // Cleanup IndexedDB if available
        if (this.db) {
            try {
                await this.cleanupIndexedDB(now);
            } catch (error) {
                console.error('Error cleaning up IndexedDB:', error);
            }
        }
    }

    async cleanupIndexedDB(now) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const index = store.index('expiry');
            const request = index.openCursor(IDBKeyRange.upperBound(now));
            
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    // Cache statistics
    getStats() {
        return {
            memoryCacheSize: this.memoryCache.size,
            isIndexedDBAvailable: !!this.db,
            isInitialized: this.isInitialized
        };
    }

    // Preload critical data
    async preloadCriticalData(keys) {
        const promises = keys.map(key => this.get(key));
        return Promise.allSettled(promises);
    }

    // Batch operations
    async batchGet(keys) {
        const results = new Map();
        const promises = keys.map(async key => {
            const data = await this.get(key);
            if (data) {
                results.set(key, data);
            }
        });
        
        await Promise.all(promises);
        return results;
    }

    async batchSet(items) {
        const promises = items.map(({ key, data, ttl }) => this.set(key, data, ttl));
        return Promise.allSettled(promises);
    }

    // Cache warming for common queries
    async warmCache(commonQueries) {
        const promises = commonQueries.map(async query => {
            try {
                const response = await fetch(query.url);
                if (response.ok) {
                    const data = await response.json();
                    await this.set(query.key, data, query.ttl || 300000);
                }
            } catch (error) {
                console.error(`Error warming cache for ${query.key}:`, error);
            }
        });
        
        return Promise.allSettled(promises);
    }
} 