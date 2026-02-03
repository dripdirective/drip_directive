/**
 * Upload Queue Manager
 * Handles sequential uploads with retry logic, progress tracking, and error recovery
 *
 * Note: React Native doesn't reliably provide Node's `events` module.
 * This file uses a tiny in-file event emitter to avoid extra deps.
 */

class TinyEmitter {
  constructor() {
    this._listeners = new Map();
  }

  on(event, fn) {
    const arr = this._listeners.get(event) || [];
    arr.push(fn);
    this._listeners.set(event, arr);
    return this;
  }

  removeListener(event, fn) {
    const arr = this._listeners.get(event) || [];
    this._listeners.set(event, arr.filter((f) => f !== fn));
    return this;
  }

  removeAllListeners(event) {
    if (event) this._listeners.delete(event);
    else this._listeners.clear();
    return this;
  }

  emit(event, ...args) {
    const arr = this._listeners.get(event) || [];
    // Clone to avoid mutation during emit
    for (const fn of [...arr]) {
      try {
        fn(...args);
      } catch (e) {
        // Never let listener errors break queue processing
        console.error(`Listener error for event "${event}"`, e);
      }
    }
    return arr.length > 0;
  }
}

class UploadQueue extends TinyEmitter {
  constructor(options = {}) {
    super();
    
    this.queue = [];
    this.processing = false;
    this.activeUploads = new Map();
    
    // Configuration
    this.maxRetries = options.maxRetries || 3;
    this.maxConcurrent = options.maxConcurrent || 2;
    this.retryDelay = options.retryDelay || 1000; // ms
    this.timeout = options.timeout || 60000; // 60 seconds
    
    // Stats
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      retried: 0,
    };
  }

  /**
   * Generate unique ID for upload item
   */
  generateId() {
    return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Add item to upload queue
   * 
   * @param {object} item - Upload item
   * @param {string} item.uri - Image URI
   * @param {string} item.type - Upload type ('user_image' or 'wardrobe')
   * @param {object} item.metadata - Additional metadata
   * @returns {string} Upload ID
   */
  add(item) {
    const id = this.generateId();
    
    const queueItem = {
      id,
      uri: item.uri,
      type: item.type || 'user_image',
      metadata: item.metadata || {},
      retries: 0,
      status: 'pending',
      error: null,
      progress: 0,
      addedAt: Date.now(),
      uploadFn: item.uploadFn, // Upload function provided by caller
    };

    this.queue.push(queueItem);
    this.stats.total++;

    console.log(`📥 Added to queue: ${id} (${this.queue.length} in queue)`);
    this.emit('added', queueItem);

    // Start processing if not already running
    this.process();

    return id;
  }

  /**
   * Process upload queue
   */
  async process() {
    if (this.processing) {
      return;
    }

    this.processing = true;
    this.emit('processingStarted');

    try {
      while (this.queue.length > 0) {
        // Get next batch of items
        const batch = this.queue.splice(0, this.maxConcurrent);
        
        console.log(`🔄 Processing batch of ${batch.length} items`);

        // Process batch concurrently
        await Promise.allSettled(
          batch.map(item => this.uploadItem(item))
        );
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.processing = false;
      this.emit('processingComplete', this.stats);
      console.log('✅ Queue processing complete', this.stats);
    }
  }

  /**
   * Upload single item with retry logic
   */
  async uploadItem(item) {
    this.activeUploads.set(item.id, item);
    item.status = 'uploading';
    this.emit('uploadStarted', item);

    console.log(`📤 Uploading ${item.id} (attempt ${item.retries + 1}/${this.maxRetries + 1})`);

    try {
      // Call the upload function provided by caller
      const result = await this.executeWithTimeout(
        item.uploadFn(item.uri, item.type, (progress) => {
          item.progress = progress;
          this.emit('uploadProgress', { id: item.id, progress });
        }),
        this.timeout
      );

      // Upload successful
      item.status = 'completed';
      item.result = result;
      this.stats.completed++;
      
      console.log(`✅ Upload completed: ${item.id}`);
      this.emit('uploadComplete', item);
      
      return result;

    } catch (error) {
      console.error(`❌ Upload failed: ${item.id}`, error);
      item.error = error;

      // Retry logic
      if (item.retries < this.maxRetries && this.shouldRetry(error)) {
        item.retries++;
        this.stats.retried++;
        
        console.log(`🔄 Retrying ${item.id} (${item.retries}/${this.maxRetries})`);
        
        // Add back to queue with delay
        await this.delay(this.retryDelay * item.retries);
        this.queue.push(item);
        
        this.emit('uploadRetry', item);
      } else {
        // Max retries exceeded or non-retryable error
        item.status = 'failed';
        this.stats.failed++;
        
        console.log(`💔 Upload permanently failed: ${item.id}`);
        this.emit('uploadFailed', item);
      }

      throw error;
    } finally {
      this.activeUploads.delete(item.id);
    }
  }

  /**
   * Execute function with timeout
   */
  async executeWithTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), timeout)
      )
    ]);
  }

  /**
   * Determine if error should trigger retry
   */
  shouldRetry(error) {
    // Network errors should be retried
    if (error.message?.includes('Network')) return true;
    if (error.message?.includes('timeout')) return true;
    if (error.message?.includes('ECONNREFUSED')) return true;
    
    // 5xx server errors should be retried
    if (error.response?.status >= 500) return true;
    
    // 429 Too Many Requests should be retried
    if (error.response?.status === 429) return true;
    
    // Don't retry client errors (4xx except 429)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return false;
    }
    
    return true;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cancel all uploads
   */
  cancelAll() {
    console.log('🛑 Cancelling all uploads');
    this.queue = [];
    this.activeUploads.clear();
    this.processing = false;
    this.emit('cancelled');
  }

  /**
   * Cancel specific upload
   */
  cancel(id) {
    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      const item = this.queue.splice(index, 1)[0];
      item.status = 'cancelled';
      this.emit('uploadCancelled', item);
      console.log(`🛑 Cancelled upload: ${id}`);
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      processing: this.processing,
      queueLength: this.queue.length,
      activeUploads: this.activeUploads.size,
      stats: { ...this.stats },
    };
  }

  /**
   * Clear completed items from stats
   */
  clearStats() {
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      retried: 0,
    };
    this.emit('statsCleared');
  }

  /**
   * Get pending items
   */
  getPendingItems() {
    return [...this.queue];
  }

  /**
   * Get active uploads
   */
  getActiveUploads() {
    return Array.from(this.activeUploads.values());
  }
}

// Export singleton instance
export const uploadQueue = new UploadQueue({
  maxRetries: 3,
  maxConcurrent: 2,
  retryDelay: 2000,
  timeout: 60000,
});

export default UploadQueue;
