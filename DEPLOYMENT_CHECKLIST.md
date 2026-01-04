# Quick Deployment Checklist

## Before Deployment
- [ ] All code committed to GitHub
- [ ] `.env` files not committed (check .gitignore)
- [ ] Backend dependencies in requirements.txt
- [ ] Frontend builds successfully (`npm run build`)

## Backend (Render)
- [ ] Create Render account
- [ ] Deploy web service from GitHub
- [ ] Configure build/start commands
- [ ] Add environment variable: `ALLOWED_ORIGINS`
- [ ] Copy backend URL

## Frontend (Vercel)  
- [ ] Create Vercel account
- [ ] Deploy from GitHub or use Vercel CLI
- [ ] Add environment variable: `VITE_API_URL` (your Render URL)
- [ ] Copy frontend URL

## Final Steps
- [ ] Update backend `ALLOWED_ORIGINS` with Vercel URL
- [ ] Test deployment (visit Vercel URL)
- [ ] Verify API calls work (check browser console)
- [ ] Play game to confirm full functionality

## URLs to Save
- Backend: `https://__________.onrender.com`
- Frontend: `https://__________.vercel.app`

## Common Issues
1. **CORS Error**: Check backend `ALLOWED_ORIGINS` includes frontend URL
2. **Backend Timeout**: Free tier spins down - wait ~60 seconds
3. **Build Failed**: Check logs in Render/Vercel dashboard
4. **API Not Found**: Verify `VITE_API_URL` is set correctly in Vercel
