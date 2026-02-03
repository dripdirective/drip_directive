# How to use:

# List/Preview (Safe Mode): Run the script as-is. It will show you what would be deleted.
# bash
# cat chroma_db_clear.py | docker-compose exec -T backend python
# Delete: Open the file, change DELETE_MODE = True, and run correctly.


import chromadb
from app.config import settings
# Connect to ChromaDB
client = chromadb.PersistentClient(path=settings.CHROMADB_PATH)
# User email to clear
user_email = "suvommobiletest@gmail.com"  # <--- REPLACE THIS
# Generate prefix (logic from vector_store.py)
prefix = settings.CHROMADB_COLLECTION_PREFIX
user_prefix = user_email.split('@')[0]
user_prefix = "".join(c if c.isalnum() or c in "_-" else "_" for c in user_prefix)



# --- CONFIGURATION ---
DELETE_MODE = True  # Set to True to actually delete data

# --- IDENTIFY TARGETS ---
target_collections = []
base_types = ["user_profiles", "wardrobe_items", "recommendations"]
for c_type in base_types:
    target_collections.append(f"{prefix}_{user_prefix}_{c_type}")

# --- LIST ALL COLLECTIONS ---
print("\n📊 Existing Collections (All Users):")
existing_names = []
try:
    all_collections = client.list_collections()
    for col in all_collections:
        print(f"  - {col.name}")
        existing_names.append(col.name)
except Exception as e:
    print(f"Error listing collections: {e}")

# --- MATCH TARGETS ---
print(f"\n🎯 Targeted for deletion (User: {user_email}):")
found_targets = []
for target in target_collections:
    if target in existing_names:
        print(f"  - {target} ✅ (Found)")
        found_targets.append(target)
    else:
        print(f"  - {target} ❌ (Not Found)")

# --- DELETION LOGIC ---
if DELETE_MODE:
    if not found_targets:
        print("\n⚠️  No collections found to delete for this user.")
    else:
        print("\n⚠️  DELETING TARGETED COLLECTIONS...")
        for name in found_targets:
            try:
                client.delete_collection(name)
                print(f"Deleted: {name}")
            except Exception as e:
                print(f"Error deleting {name}: {e}")
        print("\n✅ Deletion Complete")
else:
    print("\nℹ️  DELETE_MODE is False. No collections were deleted.")
    print("    Set DELETE_MODE = True in the script to enable deletion.")