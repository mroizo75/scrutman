// Real-time updates using Server-Sent Events and polling
export class RealtimeManager {
  private eventSource: EventSource | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private lastUpdateTime: number = Date.now();
  private isConnected = false;

  constructor(private eventId?: string) {
    this.connect();
  }

  private connect() {
    try {
      // Use Server-Sent Events for real-time updates
      const url = this.eventId 
        ? `/api/events/${this.eventId}/sse`
        : '/api/sse';
      
      this.eventSource = new EventSource(url);
      
      this.eventSource.onopen = () => {
        console.log('SSE connected');
        this.isConnected = true;
        // Clear polling if SSE works
        if (this.pollInterval) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        this.isConnected = false;
        
        // Retry connection after a delay instead of polling
        setTimeout(() => {
          if (!this.isConnected && this.eventSource?.readyState === EventSource.CLOSED) {
            console.log('🔄 Retrying SSE connection...');
            this.connect();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Error creating SSE:', error);
      // Retry instead of polling
      setTimeout(() => this.connect(), 5000);
    }
  }

  // Polling removed - we use only SSE for real-time updates

  private handleMessage(data: any) {
    const { type, payload } = data;
    const listeners = this.eventListeners.get(type);
    
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(payload);
        } catch (error) {
          console.error('Error in realtime event listener:', error);
        }
      });
    }
  }

  public subscribe(eventType: string, callback: Function) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(eventType);
        }
      }
    };
  }

  public isConnectionActive(): boolean {
    return this.isConnected && this.eventSource?.readyState === EventSource.OPEN;
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.eventListeners.clear();
    this.isConnected = false;
  }
}

// Event types
export const REALTIME_EVENTS = {
  CHECKIN_UPDATED: 'checkin_updated',
  TECHNICAL_UPDATED: 'technical_updated',
  PARTICIPANT_REGISTERED: 'participant_registered',
  EVENT_UPDATED: 'event_updated',
  STATS_UPDATED: 'stats_updated'
} as const;

// Broadcast function for server-side use
// Initialize global EventEmitter for SSE broadcasting
if (!global.eventEmitter) {
  const { EventEmitter } = require('events');
  global.eventEmitter = new EventEmitter();
  global.eventEmitter.setMaxListeners(100); // Support many concurrent connections
}

export async function broadcastUpdate(eventId: string, type: string, payload: any) {
  try {
    const update = {
      type,
      payload,
      timestamp: Date.now(),
      eventId
    };

    // Emit to SSE connections
    if (global.eventEmitter) {
      const eventName = `${eventId}:${type}`;
      global.eventEmitter.emit(eventName, update);
      console.log(`📡 Broadcasting ${type} update for event ${eventId} via SSE`);
    }

  } catch (error) {
    console.error('Error broadcasting update:', error);
  }
}
