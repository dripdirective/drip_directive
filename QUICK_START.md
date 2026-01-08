# 🚀 Quick Start Guide

Get Dripdirective running in under 10 minutes!

## Prerequisites

- Python 3.8+ installed
- Node.js 14+ installed
- OpenAI or Google AI API key

## Step 1: Clone & Configure (2 minutes)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/drip_directive.git
cd drip_directive

# Create environment file
cp .env.example .env

# Edit .env and add your API key
# Required: Add either OPENAI_API_KEY or GOOGLE_API_KEY
nano .env
```

## Step 2: Start Backend (3 minutes)

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server
python run.py
```

✅ Backend running at: http://localhost:8000
📚 API Docs at: http://localhost:8000/docs

## Step 3: Start Frontend (3 minutes)

Open a new terminal:

```bash
# Navigate to frontend
cd drip_directive/frontend

# Install dependencies
npm install --legacy-peer-deps
npx expo install react-dom@18.2.0 @expo/webpack-config@^19.0.0

# Start app
npm start
```

Press **'w'** to open in web browser

✅ Frontend running at: http://localhost:19006

## Step 4: Use the App (2 minutes)

1. **Sign Up**: Create account with email/password
2. **Profile**: Add your measurements and preferences
3. **Upload**: Add your photos and wardrobe items
4. **Process**: Click "Process with AI"
5. **Recommendations**: Get outfit suggestions!

## 🎉 That's it!

You're now running Dripdirective locally!

## Need Help?

- Check the [full README](README.md) for detailed instructions
- See [troubleshooting guide](README.md#-troubleshooting) for common issues
- Open an [issue](https://github.com/YOUR_USERNAME/drip_directive/issues) if stuck

## Next Steps

- Explore the API at http://localhost:8000/docs
- Read [CONTRIBUTING.md](CONTRIBUTING.md) to contribute
- Star the repo if you find it useful! ⭐
