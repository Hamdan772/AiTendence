# Deploying AiTendence to Vercel

This guide explains how to deploy AiTendence to Vercel with MongoDB.

## Prerequisites

1. **Vercel Account** - Sign up at https://vercel.com
2. **MongoDB Atlas Account** - Sign up at https://www.mongodb.com/cloud/atlas
3. **GitHub Account** - For connecting your repository to Vercel

## Step 1: Set Up MongoDB

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Create a database user with a password
4. Get your connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password
   - Replace `myFirstDatabase` with `aitendence`

Example: `mongodb+srv://user:password@cluster0.mongodb.net/aitendence?retryWrites=true&w=majority`

## Step 2: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/aitendence.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Select your GitHub repository
4. Click "Import"
5. Under "Environment Variables", add:
   - `MONGODB_URI`: Your MongoDB connection string from Step 1
   - `SESSION_SECRET`: A random secret (generate one: `openssl rand -hex 32`)
6. Click "Deploy"

## Step 4: Configure Environment Variables (Vercel Dashboard)

1. Go to your project settings in Vercel
2. Click "Environment Variables"
3. Add:
   - `MONGODB_URI` (Production, Preview, Development)
   - `SESSION_SECRET` (Production, Preview, Development)
4. Redeploy after adding variables

## Step 5: First Setup

1. Visit your Vercel deployment URL
2. You should see the login/setup page
3. Set up your admin account

## Troubleshooting

### "Failed to connect to MongoDB"
- Check your `MONGODB_URI` in Vercel environment variables
- Ensure your IP address is whitelisted in MongoDB Atlas (use 0.0.0.0/0 for development)

### "Module not found: mongoose"
- Run `npm install` locally and commit `package-lock.json`
- Trigger a redeploy on Vercel

### Database errors
- Check MongoDB Atlas connection string
- Verify database user password doesn't have special characters (or URL-encode them)

## Local Development

To run locally with MongoDB:

1. Update `.env`:
```
MONGODB_URI=mongodb://localhost:27017/aitendence
SESSION_SECRET=dev-secret
```

2. Make sure MongoDB is running locally
3. Run `npm install && npm run dev`

## Database Migration (Optional)

If migrating from SQLite to MongoDB, the current routes need to be updated to work with Mongoose queries. This is a work in progress.

Currently, the app uses a compatibility layer in `api/index.js` that simulates the SQLite interface with MongoDB.

## Support

For issues, check:
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- GitHub Issues
