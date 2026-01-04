# Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (free tier works)
- Render account (free tier works)

---

## Backend Deployment (Render)

### 1. Push Code to GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Deploy on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `hero-dash-backend` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   
5. Add Environment Variables:
   - Click **Advanced** → **Add Environment Variable**
   - Add: `DATABASE_URL` = `sqlite:///./hero_dash.db`
   - Add: `ALLOWED_ORIGINS` = `https://your-frontend-name.vercel.app,http://localhost:5173`
   - (You'll update the ALLOWED_ORIGINS after deploying frontend)

6. Click **Create Web Service**

7. Wait for deployment (5-10 minutes)

8. Copy your backend URL: `https://your-backend-name.onrender.com`

### Notes:
- Free tier spins down after inactivity (takes ~1 minute to wake up)
- Database will reset on each deployment (SQLite is ephemeral on Render)
- For persistent data, upgrade to paid plan or use PostgreSQL

---

## Frontend Deployment (Vercel)

### 1. Create Environment File
In `frontend/` directory, create `.env.production`:
```
VITE_API_URL=https://your-backend-name.onrender.com
```
Replace with your actual Render backend URL from above.

### 2. Deploy on Vercel

#### Option A: Using Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to frontend
cd frontend

# Deploy
vercel --prod
```

#### Option B: Using Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   
5. Add Environment Variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-backend-name.onrender.com`

6. Click **Deploy**

7. Your app will be live at: `https://your-project-name.vercel.app`

### 3. Update Backend CORS

Go back to Render:
1. Navigate to your backend service
2. Go to **Environment** tab
3. Update `ALLOWED_ORIGINS` to include your Vercel URL:
   ```
   https://your-project-name.vercel.app,http://localhost:5173
   ```
4. Save and wait for automatic redeploy

---

## Testing Deployment

1. Visit your Vercel frontend URL
2. Click "Start Game" and enter username
3. Check browser console for API connection
4. Play game and verify backend communication

### Troubleshooting:
- **CORS errors**: Verify `ALLOWED_ORIGINS` includes your Vercel URL
- **Backend not responding**: Free tier may be spinning up (wait ~1 min)
- **API errors**: Check Render logs in dashboard

---

## Local Development Setup

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Backend
```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Important Notes

### Free Tier Limitations:
- **Render**: 750 hours/month, spins down after 15 min inactivity
- **Vercel**: Unlimited deployments, 100GB bandwidth/month

### Database Persistence:
- Current setup uses SQLite (ephemeral on Render)
- For production, consider:
  - Render PostgreSQL (free tier available)
  - Update `database.py` connection string
  - Add `psycopg2-binary` to requirements.txt

### Performance:
- First request may be slow (backend waking up)
- Consider upgrading to paid plan for always-on service
- Use environment variable caching on Vercel

---

## Future Improvements

1. **Database**: Migrate to PostgreSQL for persistence
2. **CDN**: Use Vercel Edge Network for static assets
3. **Monitoring**: Add error tracking (Sentry, LogRocket)
4. **Analytics**: Track user sessions and performance
5. **CI/CD**: Automated tests before deployment

---

## Support

- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- FastAPI Deployment: https://fastapi.tiangolo.com/deployment/
