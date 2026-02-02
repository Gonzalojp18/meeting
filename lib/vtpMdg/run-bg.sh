#!/bin/bash
# Start the simulator in background mode (detached)
# It will automatically restart unless explicitly stopped.

echo "Starting VTP Simulator in background..."
docker-compose up -d --build

echo ""
echo "Simulator is running."
echo "Dashboard: http://localhost:2026"
echo "To stop: ./stop.sh"
