# Free Cloud Deployment Guide

## Step 1: MongoDB Atlas (Free Database)

1. Go to https://www.mongodb.com/atlas → **Try Free** (no credit card)
2. Sign up with Google or email
3. Create a **Free M0 Cluster** (choose AWS, any region)
4. In **Database Access** → Add New User:
   - Username: `hms_admin`
   - Password: (create a strong one, save it)
   - Built-in Role: `Read and write to any database`
5. In **Network Access** → Add IP → `0.0.0.0/0` (Allow All)
6. Click **Connect** → **Drivers** → Copy the connection string
   - Replace `<password>` with your password
   - Replace `myFirstDatabase` with `hospital_management`

## Step 2: GitHub (Upload Code)

1. Go to https://github.com → Sign up / Login
2. Click **+** → **New repository** → Name: `hospital-management`
3. Keep **Public**, don't initialize
4. In your terminal (VS Code or Command Prompt):
```
cd "D:\full app"
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/hospital-management.git
git branch -M main
git push -u origin main
```

## Step 3: Render.com (Free Backend)

1. Go to https://render.com → **Sign Up** (GitHub login)
2. Click **New +** → **Web Service**
3. Connect your GitHub → Select `hospital-management`
4. Fill:
   - **Name:** `hospital-management-api`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** **Free**
5. Add **Environment Variables:**
   - `PORT` = `5000`
   - `MONGODB_URI` = (the Atlas URI from Step 1)
   - `JWT_SECRET` = (any random string, e.g. `mySecretKey123`)
   - `JWT_EXPIRE` = `30d`
   - `CLIENT_URL` = (will add after Step 4)
6. Click **Create Web Service** → Wait 2-3 mins for deploy
7. Once deployed, copy the URL like `https://hospital-management-api.onrender.com`
8. Go to your Render dashboard → Environment → update `CLIENT_URL` = your frontend URL from Step 4

## Step 4: Vercel (Free Frontend)

1. Go to https://vercel.com → **Sign Up** (GitHub login)
2. Click **Add New** → **Project**
3. Select `hospital-management` repo
4. Configure:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist`
5. Add **Environment Variable:**
   - `VITE_API_URL` = `https://hospital-management-api.onrender.com/api`
6. Click **Deploy** → Wait ~2 mins
7. Copy your frontend URL: `https://hospital-management.vercel.app`

## Step 5: Update CORS

Go to Render dashboard → your service → Environment and **add/update**:
- `CLIENT_URL` = `https://hospital-management.vercel.app`

Then click **Manual Deploy** → **Clear Build Cache & Deploy**

## Done!

| Service | URL |
|---------|-----|
| Frontend | https://hospital-management.vercel.app |
| Backend API | https://hospital-management-api.onrender.com |
| Database | MongoDB Atlas (free M0 cluster) |

**Admin Login:** `admin@hospital.com` / `admin123`

## Troubleshooting

- **Frontend shows blank page** → Check browser console for API errors
- **Backend not responding** → Check Render logs (dashboard → service → Logs)
- **Database error** → Verify MongoDB Atlas IP whitelist has `0.0.0.0/0`
- **CORS error** → Ensure `CLIENT_URL` is set correctly in Render env vars
