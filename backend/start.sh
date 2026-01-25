#!/bin/bash
# Start script for Render deployment

# Install dependencies if needed
pip install -r requirements.txt

# Start the FastAPI app
exec uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4