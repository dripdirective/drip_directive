#!/usr/bin/env python3
"""

Clear user data by email

Usage:
    python scripts/clear_user_data.py user@example.com              # Clear ALL data
    python scripts/clear_user_data.py user@example.com --images     # Clear only user images
    python scripts/clear_user_data.py user@example.com --wardrobe   # Clear only wardrobe
    python scripts/clear_user_data.py user@example.com --recommendations  # Clear recommendations
    python scripts/clear_user_data.py user@example.com --profile    # Clear profile only
    python scripts/clear_user_data.py user@example.com --dry-run    # Show what would be deleted

Options:
    --all              Delete everything including user account (default if no option)
    --images           Delete user images only
    --wardrobe         Delete wardrobe items and images only
    --recommendations  Delete recommendations and generated images only
    --profile          Delete user profile only
    --dry-run          Preview what would be deleted without actually deleting
    --force            Skip confirmation prompt
"""

import sys
import os
import json
import argparse
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app.models import User, UserProfile, UserImage, WardrobeItem, WardrobeImage, Recommendation
from app.config import settings


def delete_file(file_path: str, base_dir: str, dry_run: bool = False) -> bool:
    """Delete a file from disk"""
    if not file_path:
        return False
    
    # Handle relative paths
    if not os.path.isabs(file_path):
        full_path = os.path.join(base_dir, file_path)
    else:
        full_path = file_path
    
    if os.path.exists(full_path):
        if dry_run:
            print(f"      [DRY-RUN] Would delete: {full_path}")
        else:
            try:
                os.remove(full_path)
                print(f"      ✓ Deleted: {full_path}")
                return True
            except Exception as e:
                print(f"      ✗ Failed to delete {full_path}: {e}")
    return False


def get_user_by_email(db: Session, email: str) -> User:
    """Find user by email"""
    return db.query(User).filter(User.email == email).first()


def clear_user_images(db: Session, user: User, base_dir: str, dry_run: bool = False) -> dict:
    """Clear user images"""
    stats = {"db_records": 0, "files": 0}
    
    images = db.query(UserImage).filter(UserImage.user_id == user.id).all()
    
    if not images:
        print("   No user images found")
        return stats
    
    print(f"   Found {len(images)} user images")
    
    for image in images:
        # Delete file
        if delete_file(image.image_path, base_dir, dry_run):
            stats["files"] += 1
        
        # Delete DB record
        if not dry_run:
            db.delete(image)
        stats["db_records"] += 1
    
    if not dry_run:
        db.commit()
    
    return stats


def clear_wardrobe(db: Session, user: User, base_dir: str, dry_run: bool = False) -> dict:
    """Clear wardrobe items and images"""
    stats = {"items": 0, "images": 0, "files": 0}
    
    wardrobe_items = db.query(WardrobeItem).filter(WardrobeItem.user_id == user.id).all()
    
    if not wardrobe_items:
        print("   No wardrobe items found")
        return stats
    
    print(f"   Found {len(wardrobe_items)} wardrobe items")
    
    for item in wardrobe_items:
        # Get and delete wardrobe images
        wardrobe_images = db.query(WardrobeImage).filter(
            WardrobeImage.wardrobe_item_id == item.id
        ).all()
        
        for img in wardrobe_images:
            if delete_file(img.image_path, base_dir, dry_run):
                stats["files"] += 1
            
            if not dry_run:
                db.delete(img)
            stats["images"] += 1
        
        # Delete wardrobe item
        if not dry_run:
            db.delete(item)
        stats["items"] += 1
    
    if not dry_run:
        db.commit()
    
    return stats


def clear_recommendations(db: Session, user: User, base_dir: str, dry_run: bool = False) -> dict:
    """Clear recommendations and generated images"""
    stats = {"recommendations": 0, "files": 0}
    
    recommendations = db.query(Recommendation).filter(Recommendation.user_id == user.id).all()
    
    if not recommendations:
        print("   No recommendations found")
        return stats
    
    print(f"   Found {len(recommendations)} recommendations")
    
    for rec in recommendations:
        # Delete generated images
        if rec.generated_images:
            try:
                images = json.loads(rec.generated_images)
                if isinstance(images, list):
                    for img_path in images:
                        if delete_file(img_path, base_dir, dry_run):
                            stats["files"] += 1
            except json.JSONDecodeError:
                pass
        
        # Delete DB record
        if not dry_run:
            db.delete(rec)
        stats["recommendations"] += 1
    
    if not dry_run:
        db.commit()
    
    return stats


def clear_profile(db: Session, user: User, dry_run: bool = False) -> dict:
    """Clear user profile"""
    stats = {"profiles": 0}
    
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    
    if not profile:
        print("   No profile found")
        return stats
    
    print("   Found user profile")
    
    if not dry_run:
        db.delete(profile)
        db.commit()
    stats["profiles"] += 1
    
    return stats


def clear_all(db: Session, user: User, base_dir: str, dry_run: bool = False) -> dict:
    """Clear all user data including the user account"""
    all_stats = {}
    
    print("\n📷 Clearing user images...")
    all_stats["images"] = clear_user_images(db, user, base_dir, dry_run)
    
    print("\n👔 Clearing wardrobe...")
    all_stats["wardrobe"] = clear_wardrobe(db, user, base_dir, dry_run)
    
    print("\n💡 Clearing recommendations...")
    all_stats["recommendations"] = clear_recommendations(db, user, base_dir, dry_run)
    
    print("\n👤 Clearing profile...")
    all_stats["profile"] = clear_profile(db, user, dry_run)
    
    print("\n🗑️ Deleting user account...")
    if not dry_run:
        db.delete(user)
        db.commit()
        print(f"   ✓ Deleted user: {user.email}")
    else:
        print(f"   [DRY-RUN] Would delete user: {user.email}")
    all_stats["user_deleted"] = True
    
    return all_stats


def main():
    parser = argparse.ArgumentParser(
        description="Clear user data by email",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python scripts/clear_user_data.py user@example.com --dry-run
    python scripts/clear_user_data.py user@example.com --images
    python scripts/clear_user_data.py user@example.com --wardrobe --recommendations
    python scripts/clear_user_data.py user@example.com --all --force
        """
    )
    
    parser.add_argument("email", help="User email address")
    parser.add_argument("--all", action="store_true", help="Delete everything including user account")
    parser.add_argument("--images", action="store_true", help="Delete user images only")
    parser.add_argument("--wardrobe", action="store_true", help="Delete wardrobe items only")
    parser.add_argument("--recommendations", action="store_true", help="Delete recommendations only")
    parser.add_argument("--profile", action="store_true", help="Delete profile only")
    parser.add_argument("--dry-run", action="store_true", help="Preview without deleting")
    parser.add_argument("--force", "-f", action="store_true", help="Skip confirmation")
    
    args = parser.parse_args()
    
    # If no specific option, default to --all
    no_option = not any([args.images, args.wardrobe, args.recommendations, args.profile, args.all])
    if no_option:
        args.all = True
    
    # Get base directory
    base_dir = settings.BASE_DIR
    
    print(f"\n{'='*60}")
    print("User Data Cleanup Tool")
    print(f"{'='*60}")
    print(f"Email: {args.email}")
    print(f"Base Dir: {base_dir}")
    print(f"Mode: {'DRY-RUN (no changes)' if args.dry_run else 'LIVE (will delete)'}")
    print(f"{'='*60}")
    
    # Connect to database
    db = SessionLocal()
    
    try:
        # Find user
        user = get_user_by_email(db, args.email)
        
        if not user:
            print(f"\n❌ User not found: {args.email}")
            print("\nExisting users:")
            users = db.query(User).limit(10).all()
            for u in users:
                print(f"   - {u.email}")
            sys.exit(1)
        
        print(f"\n✓ Found user: {user.email} (ID: {user.id})")
        print(f"  Created: {user.created_at}")
        
        # Show what will be deleted
        print("\nData to be cleared:")
        if args.all:
            print("  ✓ ALL data (including user account)")
        else:
            if args.images:
                print("  ✓ User images")
            if args.wardrobe:
                print("  ✓ Wardrobe items")
            if args.recommendations:
                print("  ✓ Recommendations")
            if args.profile:
                print("  ✓ Profile")
        
        # Confirmation
        if not args.force and not args.dry_run:
            print("\n⚠️  This action cannot be undone!")
            confirm = input("Type 'yes' to confirm: ")
            if confirm.lower() != "yes":
                print("Cancelled.")
                sys.exit(0)
        
        # Execute
        print("\n" + "="*60)
        
        if args.all:
            stats = clear_all(db, user, base_dir, args.dry_run)
        else:
            stats = {}
            if args.images:
                print("\n📷 Clearing user images...")
                stats["images"] = clear_user_images(db, user, base_dir, args.dry_run)
            if args.wardrobe:
                print("\n👔 Clearing wardrobe...")
                stats["wardrobe"] = clear_wardrobe(db, user, base_dir, args.dry_run)
            if args.recommendations:
                print("\n💡 Clearing recommendations...")
                stats["recommendations"] = clear_recommendations(db, user, base_dir, args.dry_run)
            if args.profile:
                print("\n👤 Clearing profile...")
                stats["profile"] = clear_profile(db, user, args.dry_run)
        
        # Summary
        print("\n" + "="*60)
        print("Summary:")
        print(json.dumps(stats, indent=2))
        
        if args.dry_run:
            print("\n🔍 DRY-RUN complete. No changes were made.")
            print("   Run without --dry-run to actually delete.")
        else:
            print("\n✅ Cleanup complete!")
        
    finally:
        db.close()


if __name__ == "__main__":
    main()

