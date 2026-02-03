from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, Token, UserLogin, PasswordResetRequest, PasswordResetConfirm
from app.utils import get_current_active_user
from app.core.auth import (
    signup_user, 
    login_user, 
    get_user_info, 
    process_password_reset_request, 
    confirm_password_reset
)

router = APIRouter()


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """User registration endpoint"""
    success, error, token_data = signup_user(db, user_data.email, user_data.password)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    return token_data


@router.post("/login", response_model=Token)
async def login(request: Request, db: Session = Depends(get_db)):
    """
    User login endpoint.

    Supports BOTH:
    - JSON body: { "email": "...", "password": "..." }  (used by mobile/web app)
    - OAuth2 form: grant_type=password&username=...&password=... (used by Swagger / OAuth flows)
    """
    content_type = (request.headers.get("content-type") or "").lower()

    email = None
    password = None

    try:
        if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            form = await request.form()
            # OAuth2PasswordRequestForm uses "username" + "password"
            email = (form.get("username") or form.get("email") or "").strip()
            password = (form.get("password") or "").strip()
        else:
            payload = await request.json()
            # Accept either schema field names or common variants
            email = (payload.get("email") or payload.get("username") or "").strip()
            password = (payload.get("password") or "").strip()
    except Exception:
        # Let FastAPI return 400/422 for malformed body
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid login payload")

    if not email or not password:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Email/username and password are required")

    success, error, token_data = login_user(db, email, password)
    
    if not success:
        if error == "Inactive user":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error,
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return token_data



@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Request a password reset link.
    """
    success, message = process_password_reset_request(db, request.email)
    return {"message": message}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(request: PasswordResetConfirm, db: Session = Depends(get_db)):
    """
    Reset password using a valid token.
    """
    success, message = confirm_password_reset(db, request.token, request.new_password)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}


@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return get_user_info(current_user)
