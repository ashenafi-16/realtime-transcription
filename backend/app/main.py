from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.websocket import router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# register the websocket route 
app.include_router(router)

@app.get("/")
def root():
    return {"status": "Transcription server is running"}