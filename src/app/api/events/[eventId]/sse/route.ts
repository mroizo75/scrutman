import { NextRequest } from "next/server";
import { cookies } from "next/headers";

// Extend global type
declare global {
  var sseConnections: Map<string, Set<Function>> | undefined;
  var eventEmitter: any;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return new Response("Unauthorized", { status: 401 });
    }

    const user = JSON.parse(userData.value);
    const resolvedParams = await params;

    // Only authorized users can get real-time updates
    if (!['CLUBADMIN', 'SUPERADMIN', 'RACE_OFFICIAL', 'TECHNICAL_INSPECTOR', 'WEIGHT_CONTROLLER'].includes(user.role)) {
      return new Response("Forbidden", { status: 403 });
    }

    // Create Server-Sent Events stream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const data = `data: ${JSON.stringify({ type: 'connected', eventId: resolvedParams.eventId })}\n\n`;
        controller.enqueue(new TextEncoder().encode(data));

        // Set up event listener for this specific event
        const eventKey = `event-${resolvedParams.eventId}`;
        
        const handleUpdate = (update: any) => {
          try {
            const message = `data: ${JSON.stringify(update)}\n\n`;
            controller.enqueue(new TextEncoder().encode(message));
          } catch (error) {
            console.error('Error sending SSE update:', error);
          }
        };

        // Store the handler for cleanup
        if (!global.sseConnections) {
          global.sseConnections = new Map();
        }
        
        if (!global.sseConnections.has(eventKey)) {
          global.sseConnections.set(eventKey, new Set());
        }
        
        global.sseConnections.get(eventKey)?.add(handleUpdate);

        // Listen for updates from the realtime system
        if (global.eventEmitter) {
          // Listen for all event types for this event
          const events = ['checkin_updated', 'technical_updated', 'weight_updated', 'participant_registered'];
          
          events.forEach(eventType => {
            const eventName = `${resolvedParams.eventId}:${eventType}`;
            global.eventEmitter.on(eventName, handleUpdate);
          });

          // Cleanup on disconnect
          request.signal.addEventListener('abort', () => {
            events.forEach(eventType => {
              const eventName = `${resolvedParams.eventId}:${eventType}`;
              global.eventEmitter.removeListener(eventName, handleUpdate);
            });
            
            if (global.sseConnections?.has(eventKey)) {
              global.sseConnections.get(eventKey)?.delete(handleUpdate);
              if (global.sseConnections.get(eventKey)?.size === 0) {
                global.sseConnections.delete(eventKey);
              }
            }
            
            controller.close();
          });
        }

        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            const ping = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`;
            controller.enqueue(new TextEncoder().encode(ping));
          } catch (error) {
            clearInterval(heartbeat);
          }
        }, 30000);

        // Cleanup heartbeat on disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (error) {
    console.error('Error setting up SSE:', error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
