import os
import time
import uuid
import httpx
import random
import logging
from datetime import datetime, timezone

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

API_URL = os.getenv("API_URL", "http://127.0.0.1:8002")
VENUE_ID = os.getenv("VENUE_ID", "elsewhere-brooklyn")
ENDPOINT = f"{API_URL}/api/venues/{VENUE_ID}/events/stream"

EVENT_TYPES = ["pos_transaction", "door_scan", "camera_metadata"]

def generate_event():
    event_type = random.choice(EVENT_TYPES)
    timestamp = datetime.now(timezone.utc).isoformat()
    event_id = str(uuid.uuid4())
    
    payload = {}
    if event_type == "pos_transaction":
        payload = {
            "amount": round(random.uniform(5.0, 150.0), 2),
            "item_count": random.randint(1, 10),
            "terminal_id": f"term_{random.randint(1, 20)}",
            "category": random.choice(["bar", "merch", "coat_check"])
        }
    elif event_type == "door_scan":
        payload = {
            "door_id": f"door_{random.randint(1, 5)}",
            "scan_type": random.choice(["entry", "exit"]),
            "count": random.randint(1, 3),
            "ticket_type": random.choice(["GA", "VIP", "Staff"])
        }
    elif event_type == "camera_metadata":
        # Temporarily high anomaly rate (50%) for demonstration
        is_anomaly = random.random() < 0.50
        payload = {
            "camera_id": f"cam_{random.randint(1, 10)}",
            "occupancy": random.randint(0, 500),
            "crowd_density": round(random.uniform(0.1, 1.0), 2),
            "anomaly_score": round(random.uniform(0.45, 0.95), 2) if is_anomaly else round(random.uniform(0.0, 0.1), 2)
        }
    
    return {
        "event_id": event_id,
        "event_type": event_type,
        "timestamp": timestamp,
        "payload": payload
    }

def main():
    logger.info(f"Starting stream simulator for venue: {VENUE_ID}")
    logger.info(f"Target endpoint: {ENDPOINT}")
    
    with httpx.Client(timeout=10.0) as client:
        while True:
            try:
                # Generate a batch of 1-5 events
                num_events = random.randint(1, 5)
                events = [generate_event() for _ in range(num_events)]
                
                # Send the batch
                response = client.post(ENDPOINT, json=events)
                response.raise_for_status()
                
                logger.info(f"Successfully sent {num_events} events: {response.json().get('message')}")
                
            except httpx.ConnectError:
                logger.error(f"Failed to connect to {API_URL}. Is the backend running?")
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error occurred: {e.response.status_code} - {e.response.text}")
            except Exception as e:
                logger.error(f"An unexpected error occurred: {e}")
            
            # Wait 2-5 seconds
            wait_time = random.uniform(2, 5)
            time.sleep(wait_time)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("\nSimulator stopped by user")
