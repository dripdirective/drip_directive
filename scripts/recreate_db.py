#!/usr/bin/env python3
"""Script to recreate the database with updated schema"""
from app.database import engine, Base
from app.models import *  # Import all models

print("Dropping all existing tables...")
Base.metadata.drop_all(bind=engine)

print("Creating all tables with updated schema...")
Base.metadata.create_all(bind=engine)

print("✅ Database recreated successfully!")
print("Note: All existing data has been deleted.")

