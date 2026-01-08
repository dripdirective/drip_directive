# Dripdirective - AI-Powered Fashion Recommendation System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)
[![React Native](https://img.shields.io/badge/React_Native-0.72+-blue.svg)](https://reactnative.dev/)

A complete full-stack application for personalized fashion recommendations. The system uses AI/LLM to analyze user images and wardrobe items, then provides personalized outfit recommendations with intelligent vector-based search and virtual try-on capabilities.

## ✨ Features

- 🔐 **User Authentication**: Secure JWT-based authentication
- 👤 **Profile Management**: Detailed user profiles with body measurements and preferences
- 📸 **Image Upload**: Upload user photos and wardrobe items
- 🤖 **AI Processing**: Advanced AI analysis using OpenAI or Google AI
- 🔍 **Vector Search**: Semantic search using ChromaDB for intelligent recommendations
- 👗 **Smart Recommendations**: Context-aware outfit suggestions based on occasion and style
- 🎨 **Modern UI**: Beautiful React Native web interface with Expo

## Quick Start

### Backend (5 minutes)

```bash
# 1. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the server
python run.py
```

Backend will be available at `http://localhost:8000`

### Frontend (5 minutes)

```bash
# 1. Navigate to frontend directory (CRITICAL: must be in frontend folder!)
cd frontend

# 2. Verify you're in the right place (should show package.json)
ls package.json

# 3. Install dependencies
npm install --legacy-peer-deps

# 4. Install web dependencies (required for web support)
npx expo install react-dom@18.2.0 @expo/webpack-config@^19.0.0

# 5. Start the app
npm start
# Press 'w' to open in web browser
```

**⚠️ IMPORTANT:** 
- All npm commands MUST be run from the `frontend/` directory
- If you get "package.json not found" or "ENOENT" error, you're in the wrong directory
- The `package.json` file is located in `frontend/`, NOT in the root project directory
- Always check: `pwd` should show `/path/to/style_me/frontend` before running npm commands

**That's it!** See detailed instructions below for more information.

## 📋 Prerequisites

- **Python 3.8+** - [Download](https://www.python.org/downloads/)
- **Node.js 14+** - [Download](https://nodejs.org/)
- **OpenAI API Key** or **Google AI API Key** - [Get OpenAI Key](https://platform.openai.com/api-keys) | [Get Google Key](https://makersuite.google.com/app/apikey)

## 🛠 Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.8+)
- **Database**: SQLite (SQLAlchemy ORM)
- **Authentication**: JWT tokens with bcrypt
- **AI/LLM**: OpenAI GPT-4 / Google Gemini
- **Vector Search**: ChromaDB with embeddings
- **Image Processing**: Pillow

### Frontend
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation
- **HTTP Client**: Axios
- **Platform**: Web, iOS, Android support

## Project Structure

```
style_me/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── database.py          # Database configuration
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── config.py            # Application configuration
│   ├── utils.py             # Utility functions (auth, etc.)
│   ├── ai_service.py        # AI/LLM service (placeholder)
│   └── routers/
│       ├── __init__.py
│       ├── auth.py          # Authentication endpoints
│       ├── users.py         # User profile endpoints
│       ├── images.py        # User image endpoints
│       ├── wardrobe.py      # Wardrobe endpoints
│       ├── ai_processing.py # AI processing endpoints
│       └── recommendations.py # Recommendation endpoints
├── requirements.txt
├── README.md
└── .gitignore
```

## Database Schema

### Tables

1. **users**: User accounts
2. **user_profiles**: User profile information
3. **user_images**: User uploaded images (front, back, side, close-up)
4. **wardrobe_items**: Wardrobe items with metadata
5. **wardrobe_images**: Images associated with wardrobe items (original and cropped)
6. **recommendations**: Generated outfit recommendations

## 🚀 Quick Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/drip_directive.git
cd drip_directive
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API keys
# Required: OPENAI_API_KEY or GOOGLE_API_KEY
nano .env
```

### 3. Backend Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python run.py
```

Backend will be available at `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

### 4. Frontend Setup

```bash
# Navigate to frontend (MUST be in frontend folder)
cd frontend

# Install dependencies
npm install --legacy-peer-deps
npx expo install react-dom@18.2.0 @expo/webpack-config@^19.0.0

# Start the app
npm start
# Press 'w' to open in web browser
```

Frontend will be available at `http://localhost:19006`

## 📖 Usage

1. **Sign Up**: Create a new account with email and password
2. **Complete Profile**: Add your body measurements and style preferences
3. **Upload Photos**: Add your front, back, and side photos
4. **Add Wardrobe**: Upload photos of your clothing items
5. **Process Images**: Let AI analyze your photos and wardrobe
6. **Get Recommendations**: Ask for outfit suggestions for any occasion!

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key Endpoints

- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/users/profile` - Create/update profile
- `POST /api/images/upload` - Upload user images
- `POST /api/wardrobe/upload` - Upload wardrobe items
- `POST /api/ai/process-user-images` - Process user photos with AI
- `POST /api/ai/process-all-wardrobe` - Process wardrobe with AI
- `POST /api/recommendations/generate` - Get outfit recommendations

## 🏗 Project Structure

```
drip_directive/
├── app/                      # Backend application
│   ├── ai_providers/         # AI provider implementations (OpenAI, Google)
│   ├── core/                 # Core business logic
│   │   ├── ai_processing.py  # AI processing tasks
│   │   ├── recommendations.py # Recommendation engine
│   │   ├── vector_search.py  # Vector similarity search
│   │   └── vector_store.py   # ChromaDB integration
│   ├── routers/              # API route handlers
│   ├── ai_prompts.py         # AI prompt templates
│   ├── ai_service.py         # AI service layer
│   ├── config.py             # Configuration
│   ├── database.py           # Database setup
│   ├── main.py               # FastAPI application
│   ├── models.py             # SQLAlchemy models
│   └── schemas.py            # Pydantic schemas
├── frontend/                 # React Native frontend
│   ├── screens/              # App screens
│   ├── services/             # API services
│   ├── context/              # React context
│   └── config/               # Frontend config
├── scripts/                  # Utility scripts
├── uploads/                  # User uploads (gitignored)
├── chroma_data/              # Vector database (gitignored)
├── docs/                     # Documentation
├── requirements.txt          # Python dependencies
├── run.py                    # Backend entry point
└── README.md                 # This file
```

## 🔧 Troubleshooting

### Backend Issues

| Problem | Solution |
|---------|----------|
| Port already in use | Use different port: `uvicorn app.main:app --reload --port 8001` |
| Module not found | Activate venv: `source venv/bin/activate` and reinstall |
| Database errors | Delete `style_me.db` and restart server |
| Missing API key | Add `OPENAI_API_KEY` or `GOOGLE_API_KEY` to `.env` |

### Frontend Issues

| Problem | Solution |
|---------|----------|
| package.json not found | Make sure you're in `frontend/` directory |
| Dependency conflicts | Use `npm install --legacy-peer-deps` |
| Expo web dependencies missing | Run `npx expo install react-dom@18.2.0 @expo/webpack-config@^19.0.0` |
| Cannot connect to API | Check backend is running and `API_BASE_URL` in `config/api.js` |

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🚀 Deployment

See [docs/AWS_DEPLOYMENT_PLAN.md](docs/AWS_DEPLOYMENT_PLAN.md) and [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md) for detailed deployment instructions.

### Quick Deployment Tips

- Use environment variables for all sensitive data
- Set a strong `SECRET_KEY` in production
- Use PostgreSQL instead of SQLite for production
- Configure CORS properly for your domain
- Use a reverse proxy (Nginx) for the backend
- Enable HTTPS with SSL certificates

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- FastAPI for the amazing web framework
- OpenAI and Google for AI capabilities
- ChromaDB for vector search
- React Native and Expo for cross-platform development

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/drip_directive/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/drip_directive/discussions)

## 🌟 Star History

If you find this project useful, please consider giving it a star ⭐

---

Made with ❤️ by the Dripdirective Team

## 📋 Detailed API Endpoints

### Authentication

#### 1. User Signup
**POST** `/api/auth/signup`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** `201 Created`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error Responses:**
- `400 Bad Request`: Email already registered

---

#### 2. User Login
**POST** `/api/auth/login`

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error Responses:**
- `401 Unauthorized`: Incorrect email or password
- `400 Bad Request`: Inactive user

---

#### 3. Get Current User
**GET** `/api/auth/me`

Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "is_active": true
}
```

---

### User Profile

#### 4. Get User Profile
**GET** `/api/users/profile`

Get the current user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "user_id": 1,
  "name": "John Doe",
  "height": 175.5,
  "weight": 70.0,
  "body_type": "athletic",
  "face_tone": "medium",
  "state": "California",
  "city": "San Francisco",
  "additional_info": "Prefers casual wear",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Error Responses:**
- `404 Not Found`: Profile not found

---

#### 5. Create User Profile
**POST** `/api/users/profile`

Create a new user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "John Doe",
  "height": 175.5,
  "weight": 70.0,
  "body_type": "athletic",
  "face_tone": "medium",
  "state": "California",
  "city": "San Francisco",
  "additional_info": "Prefers casual wear"
}
```

**Body Type Options:** `slim`, `athletic`, `average`, `curvy`, `plus_size`

**Face Tone Options:** `fair`, `medium`, `olive`, `dark`, `deep`

**Response:** `201 Created`
```json
{
  "id": 1,
  "user_id": 1,
  "name": "John Doe",
  "height": 175.5,
  "weight": 70.0,
  "body_type": "athletic",
  "face_tone": "medium",
  "state": "California",
  "city": "San Francisco",
  "additional_info": "Prefers casual wear",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": null
}
```

**Error Responses:**
- `400 Bad Request`: Profile already exists

---

#### 6. Update User Profile
**PUT** `/api/users/profile`

Update the current user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:** (All fields optional)
```json
{
  "name": "John Doe Updated",
  "height": 176.0,
  "weight": 71.0,
  "body_type": "athletic",
  "face_tone": "medium",
  "state": "California",
  "city": "Los Angeles"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "user_id": 1,
  "name": "John Doe Updated",
  "height": 176.0,
  "weight": 71.0,
  "body_type": "athletic",
  "face_tone": "medium",
  "state": "California",
  "city": "Los Angeles",
  "additional_info": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-02T00:00:00Z"
}
```

---

### User Images

#### 7. Upload User Image
**POST** `/api/images/upload`

Upload a user image (front, back, side, or close-up).

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
- `image_type`: `front` | `back` | `side` | `close_up`
- `file`: Image file (JPEG, PNG, etc.)

**Response:** `201 Created`
```json
{
  "id": 1,
  "user_id": 1,
  "image_type": "front",
  "image_path": "uploads/user_images/user_1_front_1.jpg",
  "ai_metadata": null,
  "processing_status": "pending",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": null
}
```

**Processing Status Options:** `pending`, `processing`, `completed`, `failed`

---

#### 8. Get All User Images
**GET** `/api/images/`

Get all images uploaded by the current user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "user_id": 1,
    "image_type": "front",
    "image_path": "uploads/user_images/user_1_front_1.jpg",
    "ai_metadata": "{\"body_measurements\": {...}}",
    "processing_status": "completed",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:05:00Z"
  }
]
```

---

#### 9. Get User Image
**GET** `/api/images/{image_id}`

Get a specific user image by ID.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "user_id": 1,
  "image_type": "front",
  "image_path": "uploads/user_images/user_1_front_1.jpg",
  "ai_metadata": "{\"body_measurements\": {...}}",
  "processing_status": "completed",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:05:00Z"
}
```

**Error Responses:**
- `404 Not Found`: Image not found

---

#### 10. Delete User Image
**DELETE** `/api/images/{image_id}`

Delete a user image.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `204 No Content`

**Error Responses:**
- `404 Not Found`: Image not found

---

### Wardrobe

#### 11. Upload Wardrobe Image
**POST** `/api/wardrobe/upload`

Upload a wardrobe image (may contain single or multiple dresses).

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
- `file`: Image file (JPEG, PNG, etc.)

**Response:** `201 Created`
```json
{
  "id": 1,
  "user_id": 1,
  "dress_type": null,
  "style": null,
  "color": null,
  "brand": null,
  "size": null,
  "ai_metadata": null,
  "processing_status": "pending",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": null
}
```

---

#### 12. Get All Wardrobe Items
**GET** `/api/wardrobe/items`

Get all wardrobe items with their images.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "user_id": 1,
    "dress_type": "shirt",
    "style": "casual",
    "color": "blue",
    "brand": null,
    "size": "M",
    "ai_metadata": "{\"pattern\": \"solid\", ...}",
    "processing_status": "completed",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:10:00Z",
    "images": [
      {
        "id": 1,
        "wardrobe_item_id": 1,
        "image_path": "uploads/wardrobe_images/user_1_wardrobe_1.jpg",
        "image_type": "front",
        "is_original": true,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
]
```

**Dress Type Options:** `shirt`, `t_shirt`, `pants`, `jeans`, `shorts`, `dress`, `skirt`, `jacket`, `coat`, `suit`, `blazer`, `sweater`, `hoodie`, `other`

**Style Options:** `casual`, `formal`, `business`, `sporty`, `elegant`, `bohemian`, `vintage`, `modern`, `classic`, `other`

---

#### 13. Get Wardrobe Item
**GET** `/api/wardrobe/items/{item_id}`

Get a specific wardrobe item with its images.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "user_id": 1,
  "dress_type": "shirt",
  "style": "casual",
  "color": "blue",
  "brand": null,
  "size": "M",
  "ai_metadata": "{\"pattern\": \"solid\", ...}",
  "processing_status": "completed",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:10:00Z",
  "images": [
    {
      "id": 1,
      "wardrobe_item_id": 1,
      "image_path": "uploads/wardrobe_images/user_1_wardrobe_1.jpg",
      "image_type": "front",
      "is_original": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Error Responses:**
- `404 Not Found`: Wardrobe item not found

---

#### 14. Delete Wardrobe Item
**DELETE** `/api/wardrobe/items/{item_id}`

Delete a wardrobe item and all its associated images.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `204 No Content`

**Error Responses:**
- `404 Not Found`: Wardrobe item not found

---

### AI Processing

#### 15. Process User Images
**POST** `/api/ai/process-user-images`

Trigger AI processing for all pending user images. This will analyze user images and generate metadata.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "status": "processing",
  "message": "Processing 4 user image(s)",
  "task_id": null
}
```

**Error Responses:**
- `400 Bad Request`: No pending images to process

**Note:** Processing runs as a background task. Check image status using GET `/api/images/` endpoint.

---

#### 16. Process Wardrobe Item
**POST** `/api/ai/process-wardrobe/{wardrobe_item_id}`

Trigger AI processing for a specific wardrobe item. This will segregate, crop individual dresses, group same dress together, and generate metadata.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "status": "processing",
  "message": "Processing wardrobe item 1",
  "task_id": null
}
```

**Error Responses:**
- `404 Not Found`: Wardrobe item not found
- `400 Bad Request`: Wardrobe item is already being processed

**Note:** Processing runs as a background task. Check item status using GET `/api/wardrobe/items/{item_id}` endpoint.

---

#### 17. Process All Wardrobe Items
**POST** `/api/ai/process-all-wardrobe`

Trigger AI processing for all pending wardrobe items.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "status": "processing",
  "message": "Processing 5 wardrobe item(s)",
  "task_id": null
}
```

**Error Responses:**
- `400 Bad Request`: No pending wardrobe items to process

---

### Recommendations

#### 18. Generate Recommendations
**POST** `/api/recommendations/generate`

Generate outfit recommendations based on user query. AI will suggest 2-3 outfit combinations with try-on images.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "query": "casual recommendation",
  "recommendation_type": "casual"
}
```

**Query Examples:**
- `"casual recommendation"`
- `"business attire"`
- `"wedding guest outfit"`
- `"summer casual look with blue shirt"`

**Recommendation Type Options:** `casual`, `business`, `wedding`, `formal`, `custom` (optional)

**Response:** `200 OK`
```json
{
  "status": "processing",
  "message": "Generating recommendations. This may take a few minutes.",
  "task_id": null
}
```

**Error Responses:**
- `400 Bad Request`: User images must be processed first
- `400 Bad Request`: Wardrobe items must be processed first

**Note:** Recommendation generation runs as a background task. Use GET `/api/recommendations/` to retrieve results.

---

#### 19. Get All Recommendations
**GET** `/api/recommendations/`

Get all recommendations for the current user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `limit` (optional): Number of results to return (default: 10)

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "user_id": 1,
    "query": "casual recommendation",
    "recommendation_type": "casual",
    "generated_images": "[\"uploads/generated/user_1_outfit_1_tryon.jpg\", \"uploads/generated/user_1_outfit_2_tryon.jpg\"]",
    "wardrobe_item_ids": "[[1, 2], [1, 3]]",
    "ai_metadata": "{\"recommended_outfits\": [...], ...}",
    "created_at": "2024-01-01T00:15:00Z"
  }
]
```

---

#### 20. Get Recommendation
**GET** `/api/recommendations/{recommendation_id}`

Get a specific recommendation by ID.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "user_id": 1,
  "query": "casual recommendation",
  "recommendation_type": "casual",
  "generated_images": "[\"uploads/generated/user_1_outfit_1_tryon.jpg\", \"uploads/generated/user_1_outfit_2_tryon.jpg\"]",
  "wardrobe_item_ids": "[[1, 2], [1, 3]]",
  "ai_metadata": "{\"recommended_outfits\": [{\"outfit_id\": 1, \"wardrobe_item_ids\": [1, 2], \"description\": \"Casual blue shirt with black pants\", \"occasion\": \"casual\", \"confidence_score\": 0.85}, ...]}",
  "created_at": "2024-01-01T00:15:00Z"
}
```

**Error Responses:**
- `404 Not Found`: Recommendation not found


