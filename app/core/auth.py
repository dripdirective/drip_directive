"""
Authentication business logic.
"""
from datetime import timedelta
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session

from app.models import User
from app.utils import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    create_reset_token,
    verify_reset_token
)
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


def process_password_reset_request(db: Session, email: str) -> Tuple[bool, str]:
    """
    Process a password reset request.
    Generates a token and 'sends' it (logs to console for POC).
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # For security, don't reveal if email exists, but return success
        # "If this email is registered, you will receive instructions..."
        return True, "If your email is registered, you will receive a reset link."
    
    token = create_reset_token(email)
    
    # In a real app, send email here. For POC, log to console.
    print(f"\n{'='*60}")
    print(f"🔐 PASSWORD RESET REQUEST")
    print(f"   User: {email}")
    print(f"   Token: {token}")
    print(f"   Reset Link (Simulated): https://app.dripdirective.com/reset-password?token={token}")
    print(f"{'='*60}\n")
    
    return True, "Password reset link has been sent to your email."


def confirm_password_reset(db: Session, token: str, new_password: str) -> Tuple[bool, str]:
    """
    Confirm password reset with token and new password.
    """
    email = verify_reset_token(token)
    if not email:
        return False, "Invalid or expired reset token"
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False, "User not found"
    
    # Update password
    user.hashed_password = get_password_hash(new_password)
    db.commit()
    
    return True, "Password updated successfully"

