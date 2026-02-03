# How to use:

# List/Preview (Safe Mode): Run the script as-is. It will show you what would be deleted.
# bash
# cat postgres_clear.py | docker-compose exec -T backend python
# Delete: Open the file, change DELETE_MODE = True, and run correctly.

import sys
from sqlalchemy import text
from app.database import SessionLocal
from app.models import User, UserProfile, UserImage, WardrobeItem, WardrobeImage, Recommendation

# --- CONFIGURATION ---
USER_EMAIL = "suvommobiletest@gmail.com"  # <--- REPLACE THIS
DELETE_MODE = True  # Set to True to actually delete data

def main():
    db = SessionLocal()
    try:
        # 1. Find User
        print(f"\n🔍 Searching for user: {USER_EMAIL}")
        user = db.query(User).filter(User.email == USER_EMAIL).first()
        
        if not user:
            print(f"❌ User not found!")
            return

        user_id = user.id
        print(f"✅ Found User ID: {user_id}")

        # 2. Count Related Data
        profile_count = db.query(UserProfile).filter(UserProfile.user_id == user_id).count()
        user_img_count = db.query(UserImage).filter(UserImage.user_id == user_id).count()
        wardrobe_count = db.query(WardrobeItem).filter(WardrobeItem.user_id == user_id).count()
        rec_count = db.query(Recommendation).filter(Recommendation.user_id == user_id).count()
        
        # Count wardrobe images (more complex join)
        wardrobe_img_count = db.execute(text(
            "SELECT COUNT(*) FROM wardrobe_images WHERE wardrobe_item_id IN (SELECT id FROM wardrobe_items WHERE user_id = :uid)"
        ), {"uid": user_id}).scalar()

        print("\n📊 Data Summary:")
        print(f"  - User Profiles: {profile_count}")
        print(f"  - User Images:   {user_img_count}")
        print(f"  - Wardrobe Items:{wardrobe_count}")
        print(f"  - Wardrobe Imgs: {wardrobe_img_count}")
        print(f"  - Recs:          {rec_count}")

        # --- DELETION LOGIC ---
        if DELETE_MODE:
            print("\n⚠️  DELETING DATA...")
            try:
                # 1. Delete Wardrobe Images
                db.execute(text("DELETE FROM wardrobe_images WHERE wardrobe_item_id IN (SELECT id FROM wardrobe_items WHERE user_id = :uid)"), {"uid": user_id})
                print("  - Deleted Wardrobe Images")

                # 2. Delete Wardrobe Items
                db.execute(text("DELETE FROM wardrobe_items WHERE user_id = :uid"), {"uid": user_id})
                print("  - Deleted Wardrobe Items")

                # 3. Delete User Profile Images
                db.execute(text("DELETE FROM user_images WHERE user_id = :uid"), {"uid": user_id})
                print("  - Deleted User Profile Images")

                # 4. Delete User Profile Data
                db.execute(text("DELETE FROM user_profiles WHERE user_id = :uid"), {"uid": user_id})
                print("  - Deleted User Profiles")

                # 5. Delete Recommendations
                db.execute(text("DELETE FROM recommendations WHERE user_id = :uid"), {"uid": user_id})
                print("  - Deleted Recommendations")

                # # 6. Delete User
                # db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": user_id})
                # print("  - Deleted User Account")

                db.commit()
                print("\n✅ DELETION COMPLETE")
            
            except Exception as e:
                print(f"\n❌ Error during deletion: {e}")
                db.rollback()
        else:
            print("\nℹ️  DELETE_MODE is False. No data was deleted.")
            print("    Set DELETE_MODE = True in the script to enable deletion.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
