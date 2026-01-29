from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class BodyType(str, enum.Enum):
    SLIM = "slim"
    ATHLETIC = "athletic"
    AVERAGE = "average"
    CURVY = "curvy"
    PLUS_SIZE = "plus_size"


class FaceTone(str, enum.Enum):
    FAIR = "fair"
    MEDIUM = "medium"
    OLIVE = "olive"
    DARK = "dark"
    DEEP = "deep"


class ImageType(str, enum.Enum):
    FRONT = "front"
    BACK = "back"
    SIDE = "side"
    CLOSE_UP = "close_up"
    USER_IMAGE = "user_image"  # Generic user image


class DressType(str, enum.Enum):
    SHIRT = "shirt"
    T_SHIRT = "t_shirt"
    PANTS = "pants"
    JEANS = "jeans"
    SHORTS = "shorts"
    DRESS = "dress"
    SKIRT = "skirt"
    JACKET = "jacket"
    COAT = "coat"
    SUIT = "suit"
    BLAZER = "blazer"
    SWEATER = "sweater"
    HOODIE = "hoodie"
    OTHER = "other"


class DressStyle(str, enum.Enum):
    CASUAL = "casual"
    FORMAL = "formal"
    BUSINESS = "business"
    SPORTY = "sporty"
    ELEGANT = "elegant"
    BOHEMIAN = "bohemian"
    VINTAGE = "vintage"
    MODERN = "modern"
    CLASSIC = "classic"
    OTHER = "other"


class ProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    images = relationship("UserImage", back_populates="user")
    wardrobe_items = relationship("WardrobeItem", back_populates="user")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String, nullable=True)
    gender = Column(String, nullable=True)  # male/female/non-binary/unknown (AI-derived or user-provided)
    height = Column(Float, nullable=True)  # in cm
    weight = Column(Float, nullable=True)  # in kg
    body_type = Column(SQLEnum(BodyType), nullable=True)
    face_tone = Column(SQLEnum(FaceTone), nullable=True)
    state = Column(String, nullable=True)
    country = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    additional_info = Column(Text, nullable=True)
    # Vector-based recommendation fields
    profile_summary_text = Column(Text, nullable=True)  # Rich AI-generated description
    profile_embedding = Column(Text, nullable=True)  # JSON array of floats (use pgvector in Postgres)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="profile")


class UserImage(Base):
    __tablename__ = "user_images"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    image_type = Column(SQLEnum(ImageType), nullable=False)
    image_path = Column(String, nullable=False)
    ai_metadata = Column(Text, nullable=True)  # JSON string with AI-generated metadata
    processing_status = Column(SQLEnum(ProcessingStatus), default=ProcessingStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="images")


class WardrobeItem(Base):
    __tablename__ = "wardrobe_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dress_type = Column(SQLEnum(DressType), nullable=True)
    style = Column(SQLEnum(DressStyle), nullable=True)
    color = Column(String, nullable=True)
    brand = Column(String, nullable=True)
    size = Column(String, nullable=True)
    ai_metadata = Column(Text, nullable=True)  # JSON string with additional metadata
    # Vector-based recommendation fields
    item_summary_text = Column(Text, nullable=True)  # Rich AI-generated description
    item_embedding = Column(Text, nullable=True)  # JSON array of floats (use pgvector in Postgres)
    processing_status = Column(SQLEnum(ProcessingStatus), default=ProcessingStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="wardrobe_items")
    images = relationship("WardrobeImage", back_populates="wardrobe_item")


class WardrobeImage(Base):
    __tablename__ = "wardrobe_images"

    id = Column(Integer, primary_key=True, index=True)
    wardrobe_item_id = Column(Integer, ForeignKey("wardrobe_items.id"), nullable=False)
    image_path = Column(String, nullable=False)
    image_type = Column(SQLEnum(ImageType), nullable=True)  # front, back, side, etc.
    is_original = Column(Boolean, default=True)  # True if original upload, False if cropped/processed
    original_image_id = Column(Integer, ForeignKey("wardrobe_images.id"), nullable=True)  # If cropped, reference original
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    wardrobe_item = relationship("WardrobeItem", back_populates="images", foreign_keys=[wardrobe_item_id])


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    query = Column(Text, nullable=False)  # User's query/request
    recommendation_type = Column(String, nullable=True)  # casual, business, wedding, custom, etc.
    generated_images = Column(Text, nullable=True)  # JSON array of image paths
    wardrobe_item_ids = Column(Text, nullable=True)  # JSON array of wardrobe item IDs used
    ai_metadata = Column(Text, nullable=True)  # JSON string with additional recommendation metadata
    # Vector-based diversity tracking
    recommendation_embedding = Column(Text, nullable=True)  # JSON array of floats (use pgvector in Postgres)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

