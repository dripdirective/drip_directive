"""
Authentication business logic.
"""
from datetime import timedelta
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session

from app.models import User
from app.utils import verify_password, get_password_hash, create_access_token
from app.config import settings


def signup_user(
    db: Session,
    email: str,
    password: str
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Register a new user.
    
    Returns:
        Tuple of (success, error_message, token_data)
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        return False, "Email already registered", None
    
    # Create new user
    hashed_password = get_password_hash(password)
    new_user = User(
        email=email,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.email}, expires_delta=access_token_expires
    )
    
    return True, "", {"access_token": access_token, "token_type": "bearer"}


def login_user(
    db: Session,
    email: str,
    password: str
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Authenticate a user and return token.
    
    Returns:
        Tuple of (success, error_message, token_data)
    """
    user = db.query(User).filter(User.email == email).first()
    
    if not user or not verify_password(password, user.hashed_password):
        return False, "Incorrect email or password", None
    
    if not user.is_active:
        return False, "Inactive user", None
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return True, "", {"access_token": access_token, "token_type": "bearer"}


def get_user_info(user: User) -> Dict[str, Any]:
    """Get user information dictionary"""
    return {
        "id": user.id,
        "email": user.email,
        "is_active": user.is_active
    }

