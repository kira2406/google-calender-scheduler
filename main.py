import os
import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

# Third-party imports
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
# CHANGED: Reverted to Service Account imports
from google.oauth2 import service_account
from googleapiclient.discovery import build
from dotenv import load_dotenv
from pydantic import BaseModel

# --- 1. Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CalendarToolServer")
load_dotenv()

app = FastAPI(title="Google Calendar Tools API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. Google Calendar Service ---
class GoogleCalendarService:
    SCOPES = ['https://www.googleapis.com/auth/calendar']

    def __init__(self):
        self.service = self._authenticate()

    def _authenticate(self):
        creds = None
        # Priority 1: Environment Variable (Render/Production)
        env_creds = os.environ.get("GOOGLE_CREDENTIALS_JSON")
        if env_creds:
            try:
                creds_info = json.loads(env_creds)
                
                # Sanity Check: Ensure it's a Service Account key
                if "type" in creds_info and creds_info["type"] != "service_account":
                    logger.error(f"Auth Error: Loaded JSON is type '{creds_info.get('type')}', expected 'service_account'.")
                
                creds = service_account.Credentials.from_service_account_info(
                    creds_info, scopes=self.SCOPES
                )
            except json.JSONDecodeError:
                logger.error("Auth Error: GOOGLE_CREDENTIALS_JSON environment variable contains invalid JSON.")
            except ValueError as e:
                logger.error(f"Auth Error (Env Var content): {e}")
            except Exception as e:
                logger.error(f"Auth Error (Env Var unknown): {e}")

        # Priority 2: Local File (Development)
        if not creds and os.path.exists('credentials.json'):
            try:
                creds = service_account.Credentials.from_service_account_file(
                    'credentials.json', scopes=self.SCOPES
                )
                logger.info("Successfully authenticated using 'credentials.json'")
            except Exception as e:
                 logger.error(f"Auth Error (File): {e}")
        
        if not creds:
            logger.warning("No valid Google Service Account credentials found. Tools will return errors.")
            return None
            
        return build('calendar', 'v3', credentials=creds)

    def list_events(self, start_iso: str, end_iso: str) -> str:
        """Checks for events within a specific time range."""
        if not self.service: return "Error: Calendar service unavailable."

        cal_id = os.environ.get("CALENDAR_ID", "primary")
        
        # if not start_iso.endswith('Z') and '+' not in start_iso: start_iso = f"{start_iso}Z"
        # if not end_iso.endswith('Z') and '+' not in end_iso: end_iso = f"{end_iso}Z"

        if not start_iso.endswith('Z') and '+' not in start_iso and not (len(start_iso) > 6 and start_iso[-6] == '-'): 
            start_iso = f"{start_iso}Z"
            
        if not end_iso.endswith('Z') and '+' not in end_iso and not (len(end_iso) > 6 and end_iso[-6] == '-'): 
            end_iso = f"{end_iso}Z"

        try:
            events_result = self.service.events().list(
                calendarId=cal_id, 
                timeMin=start_iso, 
                timeMax=end_iso,
                singleEvents=True, 
                orderBy='startTime'
            ).execute()
        except Exception as e:
            return f"Error querying calendar: {str(e)}"
        events = events_result.get('items', [])

        if not events:
            return "No conflicting events found. The slot is free."

        event_strings = []
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            summary = event.get('summary', 'Busy')
            event_strings.append(f"- {summary} at {start}")
        
        return "Busy at these times:\n" + "\n".join(event_strings)

    def create_event(self, name: str, date_time_str: str, title: Optional[str] = None) -> str:
        """Creates a calendar event."""
        if not self.service: return "Error: Calendar service unavailable."
        
        try:
            # 1. Clean and Parse Date
            dt_str_clean = date_time_str.replace('Z', '+00:00')
            start_time = datetime.fromisoformat(dt_str_clean)
            end_time = start_time + timedelta(minutes=60) 
            
            # 2. Construct Event Body
            event_summary = title if title else f"Meeting with {name}"
            event = {
                'summary': event_summary,
                'description': "Booked via Kushwanth's Voice Scheduler Agent.",
                'start': {'dateTime': start_time.isoformat(), 'timeZone': 'UTC'},
                'end': {'dateTime': end_time.isoformat(), 'timeZone': 'UTC'},
                # "attendees": [
                #                 {
                #                 "displayName": name,
                #                 }
                #             ],
            }
            
            # 3. Insert into Google Calendar
            cal_id = os.environ.get("CALENDAR_ID", "primary")
            result = self.service.events().insert(calendarId=cal_id, body=event).execute()
            
            return result.get('htmlLink')
            
        except Exception as e:
            logger.error(f"Booking Error: {e}")
            return f"Failed to book meeting: {str(e)}"

# Initialize Service
calendar_service = GoogleCalendarService()

# --- 3. Request Models (Input Validation) ---

class CheckAvailabilityRequest(BaseModel):
    start_time: str 
    end_time: str   

class BookMeetingRequest(BaseModel):
    name: str
    dateTime: str
    title: Optional[str] = None

# --- 4. HTTP Endpoints (The Tools) ---

@app.get("/")
async def health_check():
    return {"status": "active", "service": "Calendar Tools API"}

@app.post("/tools/check-availability")
async def check_availability(request: CheckAvailabilityRequest):
    """
    Tool 1: Check if the calendar is free at a specific time.
    """
    logger.info(f"Checking availability: {request.start_time} to {request.end_time}")
    
    result = calendar_service.list_events(request.start_time, request.end_time)
    return {"result": result}

@app.post("/tools/book-meeting")
async def book_meeting(request: BookMeetingRequest):
    """
    Tool 2: Book the actual meeting.
    """
    logger.info(f"Booking meeting for: {request.name} at {request.dateTime}")
    
    link = calendar_service.create_event(
        name=request.name, 
        date_time_str=request.dateTime, 
        title=request.title
    )
    
    if "Failed" in link or "Error" in link:
        return {"result": link, "status": "error"}
        
    return {"result": f"Success. Meeting booked. Link: {link}", "status": "success"}

# To run: uv run uvicorn main:app --reload