# Personal Statement Writing Tool

This is a full-stack application for generating personal statements using Google Gemini AI. The application is split into:
- **Backend**: FastAPI server (deployed on Render)
- **Frontend**: React app (deployed on Netlify)

## Project Structure

```
Personal-Statement-Write/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   ├── Procfile           # Render deployment configuration
│   └── .env.example       # Environment variables template
├── frontend/              # React frontend
│   ├── public/            # Static files
│   ├── src/               # React components
│   ├── package.json       # Node.js dependencies
│   └── netlify.toml       # Netlify deployment configuration
├── psw.py                 # Original Streamlit application (legacy)
└── requirements.txt       # Original dependencies (legacy)
```

## Deployment Instructions

### Backend (Render)

1. **Push to GitHub**: Push this repository to GitHub.

2. **Create Render Service**:
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Backend**:
   - Name: `personal-statement-backend` (or your preferred name)
   - Root Directory: `backend`
   - Runtime: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Plan: Free

4. **Environment Variables**:
   - No required environment variables (API key is provided by users via frontend)
   - Optional: You can set `CORS_ORIGINS` to restrict access

5. **Deploy**: Click "Create Web Service"

6. **Note the URL**: After deployment, copy the URL (e.g., `https://personal-statement-backend.onrender.com`)

### Frontend (Netlify)

1. **Configure Environment Variable**:
   - In the frontend directory, update the `API_BASE_URL` in `App.js` or set it as environment variable:
     - Open `frontend/src/App.js`
     - Line 7: Update `const API_BASE_URL` to your Render backend URL

2. **Push Changes**: Commit and push the changes to GitHub.

3. **Deploy to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Select the repository

4. **Configure Build Settings**:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `build`
   - Click "Show advanced" → "New variable"
     - Name: `REACT_APP_API_URL`
     - Value: `https://your-render-backend.onrender.com` (your actual backend URL)

5. **Deploy site**: Click "Deploy site"

6. **Note the URL**: After deployment, copy your Netlify app URL

## Local Development

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### Backend (FastAPI)

- `POST /api/generate` - Generate personal statement sections
  - Accepts multipart form data with files and parameters
  - Returns generated Chinese text for selected modules

- `POST /api/translate` - Translate Chinese content to English
  - Accepts JSON with text and spelling preference
  - Returns translated English text

- `POST /api/edit` - Edit content based on annotations
  - Accepts JSON with text and language flag
  - Returns edited text with changes highlighted

- `POST /api/generate-word` - Generate Word document
  - Accepts JSON with content and header
  - Returns .docx file for download

- `POST /api/generate-header` - Generate Chinese/English headers
  - Accepts form data with target school name
  - Returns formatted headers

## Features

### From Original Streamlit App:

1. **File Upload Support**:
   - Resume/material (PDF/DOCX)
   - Transcript (PDF/Images)
   - Curriculum screenshots (Images)

2. **AI-Powered Generation**:
   - 5 modules: Motivation, Academic Background, Internship, Why School, Career Goal
   - Uses Google Gemini AI models
   - Industry trend analysis for Motivation module

3. **Editing & Translation**:
   - Chinese draft editing with annotation support
   - Professional English translation with anti-AI styling
   - British/American spelling preference

4. **Export Functionality**:
   - Chinese and English Word document generation
   - Custom headers with school/major information

## Notes

1. **API Key Security**: Users must provide their own Google Gemini API key via the frontend. The key is sent to the backend for API calls but is not stored.

2. **CORS Configuration**: The backend is configured to allow requests from any origin (`*`). For production, consider restricting this to your Netlify domain.

3. **File Size Limits**: Render's free tier has limits on request size and file uploads. Large files may need to be compressed.

4. **Rate Limiting**: Consider implementing rate limiting on the backend if you expect high traffic.

## Troubleshooting

### Backend Issues
- Check Render logs for errors
- Ensure all dependencies are in `requirements.txt`
- Verify CORS settings if frontend can't connect

### Frontend Issues
- Check browser console for errors
- Verify `REACT_APP_API_URL` environment variable is set
- Ensure backend is running and accessible

### API Key Issues
- Users must obtain a Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- The key must have access to the Gemini models

## License

This project is for educational/personal use. Users are responsible for complying with Google's API terms of service.