from typing import Any

from fastapi import BackgroundTasks, WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(
        self,
        websocket: WebSocket
    ):
        await websocket.accept()

        self.active_connections.append(
            websocket
        )

    def disconnect(
        self,
        websocket: WebSocket
    ):
        if websocket in self.active_connections:
            self.active_connections.remove(
                websocket
            )

    async def broadcast(
        self,
        message: dict[str, Any]
    ):
        disconnected = []

        for connection in self.active_connections.copy():
            try:
                await connection.send_json(
                    message
                )
            except Exception:
                disconnected.append(
                    connection
                )

        for connection in disconnected:
            self.disconnect(connection)


manager = ConnectionManager()


def queue_realtime_update(
    background_tasks: BackgroundTasks,
    event_type: str,
    session_id: int | None = None,
):
    message = {
        "type": event_type,
    }

    if session_id is not None:
        message["session_id"] = session_id

    background_tasks.add_task(
        manager.broadcast,
        message,
    )