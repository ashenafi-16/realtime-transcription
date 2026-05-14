import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.websocket import router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Real-Time Transcription API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the websocket route 
app.include_router(router)


@app.get("/")
def root():
    return {"status": "Transcription server is running"}


@app.get("/health")
def health():
    return {"status": "ok"}