from app.schemas import LiveVenueState, InfrastructureItem, ComplianceItem, StreamEvent

class LiveStateManager:
    def __init__(self):
        self._states = {}

    def get_state(self, venue_id: str, max_capacity: int) -> LiveVenueState:
        if venue_id not in self._states:
            self._states[venue_id] = LiveVenueState(
                venue_id=venue_id,
                current_capacity=0,
                max_capacity=max_capacity,
                premium_impact=0.0,
                infrastructure=[
                    InfrastructureItem(name="DOOR_ID_SCANNER [FRONT]", status="ACTIVE", detail="[742/HR]", is_degraded=False),
                    InfrastructureItem(name="GUESTLIST_SYNC [DICE.FM]", status="ACTIVE", detail="[REALTIME]", is_degraded=False),
                    InfrastructureItem(name="CAMERA_FEED_REAR", status="DEGRADED", detail="[12% LOSS]", is_degraded=True),
                ],
                compliance_queue=[]
            )
        return self._states[venue_id]

    def process_events(self, venue_id: str, events: list[StreamEvent]) -> None:
        if venue_id not in self._states:
            # Initialize with 0 for demo purposes if not seen yet
            self.get_state(venue_id, 800) 
            
        state = self._states[venue_id]
        
        for event in events:
            if event.event_type == "door_scan":
                scan_type = event.payload.get("scan_type")
                count = event.payload.get("count", 1)
                if scan_type == "entry":
                    state.current_capacity = min(state.current_capacity + count, state.max_capacity)
                elif scan_type == "exit":
                    state.current_capacity = max(state.current_capacity - count, 0)
            
            elif event.event_type == "camera_metadata":
                anomaly_score = event.payload.get("anomaly_score", 0.0)
                if anomaly_score > 0.4 and len(state.compliance_queue) < 3:
                    state.compliance_queue.append(ComplianceItem(
                        id=f"INCIDENT_{event.event_id[:6].upper()}",
                        title=f"ANOMALY_DETECTED_{event.payload.get('camera_id', 'UKN').upper()}",
                        description="Upload verified security footage to preserve claims defensibility.",
                        severity="URGENT"
                    ))
                    # Apply penalty for unresolved incident
                    state.premium_impact += 0.5

    def resolve_compliance_item(self, venue_id: str, item_id: str) -> bool:
        if venue_id not in self._states:
            return False
        
        state = self._states[venue_id]
        initial_length = len(state.compliance_queue)
        state.compliance_queue = [item for item in state.compliance_queue if item.id != item_id]
        
        if len(state.compliance_queue) < initial_length:
            # Remove the penalty
            state.premium_impact = max(0.0, state.premium_impact - 0.5)
            return True
        return False

live_state_manager = LiveStateManager()
