"""
User profile business logic.
"""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models import User, UserProfile


def get_user_profile(db: Session, user_id: int) -> Optional[UserProfile]:
    """Get user profile by user ID"""
    return db.query(UserProfile).filter(UserProfile.user_id == user_id).first()


def create_user_profile(
    db: Session,
    user_id: int,
    profile_data: Dict[str, Any]
) -> UserProfile:
    """
    Create a new user profile.
    
    Args:
        db: Database session
        user_id: User ID
        profile_data: Profile data dictionary
    
    Returns:
        Created UserProfile instance
    """
    new_profile = UserProfile(
        user_id=user_id,
        **profile_data
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    return new_profile


def update_user_profile(
    db: Session,
    user_id: int,
    profile_data: Dict[str, Any]
) -> UserProfile:
    """
    Update user profile, creating it if it doesn't exist.
    
    Args:
        db: Database session
        user_id: User ID
        profile_data: Profile data dictionary
    
    Returns:
        Updated UserProfile instance
    """
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    
    if not profile:
        # Create profile if it doesn't exist
        profile = UserProfile(user_id=user_id)
        db.add(profile)
    
    # Update fields
    for field, value in profile_data.items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    return profile


def profile_exists(db: Session, user_id: int) -> bool:
    """Check if user profile exists"""
    return db.query(UserProfile).filter(UserProfile.user_id == user_id).first() is not None

