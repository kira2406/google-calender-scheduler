# Iris AI: Voice-Powered Scheduling Assistant

Iris is a professional AI scheduling assistant that allows users to book meetings on Google Calendar using natural voice conversations. Built with Retell AI for low-latency voice processing and FastAPI for backend logic, Clara can check real-time availability and sync events instantly.

## 🚀 Features

- **Real-time Voice Interaction:** Low-latency conversation powered by Retell AI.

- **Google Calendar Integration:** Automated availability checking and event booking.

- **Dynamic Frontend:** Modern React interface with real-time audio visualizers and status indicators.

- **Secure Backend:** FastAPI server handling tool-calling logic and secure API token generation.

- **Docker Ready:** Fully containerized for easy deployment to Cloud Run, Render, or Railway.

## 🛠️ Tech Stack

- Frontend: React, Vite, Tailwind CSS, Lucide Icons, Retell Client JS SDK.

- Backend: Python, FastAPI, Uvicorn.

- APIs: Retell AI (Voice & LLM), Google Calendar API (Events).

- DevOps: Docker, NVM (Node Version Manager).

## 📋 Prerequisites

- Node.js: v20+ (LTS recommended)

- Python: 3.12+

- Retell AI Account: Access to API Keys and an Agent ID.

- Google Cloud Project: Enabled Calendar API and a Service Account JSON key.

## ☁️ Google Cloud Configuration

To allow Clara to manage your calendar, you need to set up a Service Account and obtain a credentials JSON.

1. Create a Project & Enable API

    1. Go to the [Google Cloud Console](https://console.cloud.google.com/).

    2. Create a new project (e.g., "Iris-AI-Scheduler").

    3. Search for "Google Calendar API" in the search bar and click Enable.

2. Create a Service Account

    1. Navigate to APIs & Services > Credentials.

    2. Click + Create Credentials and select Service Account.

    3. Name it "iris-scheduler" and click Create and Continue.

    4. (Optional) Grant the role "Owner" or "Editor" and click Done.

3. Generate the Credentials JSON

    1. Click on your newly created service account in the list.

    2. Go to the Keys tab.

    3. Click Add Key > Create New Key.

    4. Select JSON and click Create. This will download a file (e.g., `credentials.json`) to your computer.

4. Setup Environment Variable

    Open the downloaded `credentials.json`, copy the entire contents, and paste it as a single line (or stringified JSON) into your backend `.env` file as `GOOGLE_CREDENTIALS_JSON.`

5. Share Your Calendar (CRITICAL)

    1. Copy the Service Account Email (e.g., `iris-scheduler@your-project.iam.gserviceaccount.com`).

    2. Open your Google Calendar.

    3. Find the calendar you want to use, click the three dots ⋮, and select Settings and sharing.

    4. Scroll to Share with specific people or groups.

    5. Click + Add people and paste the Service Account Email.

    6. Set permissions to Make changes to events and save.

## ⚙️ Setup & Installation

1. **Backend Setup (Python)**

    1. Navigate to the backend directory and set up a virtual environment:
        ```bash
        python -m venv venv
        source venv/bin/activate  # On Windows: venv\Scripts\activate
        pip install -r requirements.txt
        ```


    2. Create a .env file in the root of the backend folder:

        To use the existing agent, set `RETELL_AGENT_ID = agent_8d053d1c0e14f57bb799563ce4`

        ```
        RETELL_API_KEY=your_retell_api_key
        RETELL_AGENT_ID=your_agent_id
        GOOGLE_CREDENTIALS_JSON='{"type": "service_account", ...}'
        CALENDAR_ID=primary
        ```




2. **Frontend Setup (React/Vite)**

    1. Navigate to the frontend directory and install dependencies:

    ```bash
    cd frontend
    npm install
    ```


    2. Create a .env file:

    ```bash
    VITE_API_BASE_URL=http://localhost:8000/
    ```


3. 🚀 Running the Application

    **Development Mode**

    1. Start the Backend:

    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8080 --reload
    ```


    2. Start the Frontend:

    ```bash
    npm run dev
    ```


    **Docker Deployment**

    Build and run the entire stack using the provided Dockerfile:

    ```bash
    docker build -t iris-ai .
    docker run -p 8080:8080 -e PORT=8080 iris-ai
    ```

## 🤖 Retell AI Configuration

To make the assistant work, you must configure your Agent in the Retell AI Dashboard with the following custom tools:

**Tool 1**: `check_availability`

    Method: POST

    URL: `https://your-backend-url.com/tools/check-availability`

    Arguments: `start_time` (ISO), `end_time` (ISO)

**Tool 2**: `book_meeting`

    Method: POST

    URL: `https://your-backend-url.com/tools/book-meeting`

    Arguments: `name`, `dateTime` (ISO), `title`

## 📂 Project Structure

```bash
├── clara-backend/
│   ├── main.py            # FastAPI Application & Tool Logic
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Secrets (Retell & Google)
├── clara-frontend/
│   ├── src/
│   │   ├── App.jsx        # Main React Voice Interface
│   │   ├── config.js      # API URL configuration
│   │   └── index.css      # Tailwind & Global Styles
│   ├── package.json
│   └── vite.config.js     # Proxy & Build settings
├── Dockerfile             # Production container config
└── .gitignore             # Git exclusion rules
```


## 🔐 Security Note

Environment Variables: Never commit your .env or credentials.json files.

CORS: The backend is configured to allow origins (*). In production, restrict this to your specific frontend domain.

Service Account: Ensure your Google Service Account has "Writer" access to the specific Google Calendar ID being used.

## 📄 License

MIT License - See LICENSE for details.