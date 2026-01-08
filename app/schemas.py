from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Any
from datetime import datetime
from app.models import BodyType, FaceTone, ImageType, DressType, DressStyle, ProcessingStatus


# Authentication Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


# User Profile Schemas
class UserProfileBase(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    body_type: Optional[BodyType] = None
    face_tone: Optional[FaceTone] = None
    state: Optional[str] = None
    city: Optional[str] = None
    additional_info: Optional[str] = None


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(UserProfileBase):
    pass


class UserProfileResponse(UserProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# User Image Schemas
class UserImageBase(BaseModel):
    image_type: ImageType


class UserImageCreate(UserImageBase):
    pass


class UserImageResponse(UserImageBase):
    id: int
    user_id: int
    image_path: str
    ai_metadata: Optional[str] = None
    processing_status: ProcessingStatus
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Wardrobe Schemas
class WardrobeItemBase(BaseModel):
    dress_type: Optional[DressType] = None
    style: Optional[DressStyle] = None
    color: Optional[str] = None
    brand: Optional[str] = None
    size: Optional[str] = None


class WardrobeItemCreate(WardrobeItemBase):
    pass


class WardrobeItemResponse(WardrobeItemBase):
    id: int
    user_id: int
    ai_metadata: Optional[str] = None
    processing_status: ProcessingStatus
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class WardrobeImageResponse(BaseModel):
    id: int
    wardrobe_item_id: int
    image_path: str
    image_type: Optional[ImageType] = None
    is_original: bool
    created_at: datetime

    class Config:
        from_attributes = True


class WardrobeItemWithImages(WardrobeItemResponse):
    images: List[WardrobeImageResponse] = []


# Recommendation Schemas
class RecommendationRequest(BaseModel):
    query: str
    recommendation_type: Optional[str] = None  # casual, business, wedding, custom

    @field_validator("query", mode="before")
    @classmethod
    def normalize_query(cls, v: Any) -> str:
        """
        Be tolerant to accidental nested payloads from the frontend, e.g.
          { "query": { "query": "Casual weekend look" } }
        """
        # Unwrap nested {"query": ...} objects
        while isinstance(v, dict) and "query" in v:
            v = v.get("query")

        if isinstance(v, str):
            return v

        raise ValueError("query must be a string")


class TryOnRequest(BaseModel):
    outfit_index: int


class TryOnResponse(BaseModel):
    image_path: Optional[str] = None
    outfit_index: int


class OutfitItem(BaseModel):
    wardrobe_item_id: int
    item_name: str
    styling_tip: Optional[str] = None


class OutfitResponse(BaseModel):
    outfit_name: str
    occasion: Optional[str] = None
    description: Optional[str] = None
    why_it_works: Optional[str] = None
    styling_tips: Optional[List[str]] = None
    items: List[OutfitItem] = []
    wardrobe_item_ids: List[int] = []
    tryon_image_path: Optional[str] = None


class RecommendationResponse(BaseModel):
    id: int
    user_id: int
    query: str
    recommendation_type: Optional[str] = None
    generated_images: Optional[str] = None
    wardrobe_item_ids: Optional[str] = None
    ai_metadata: Optional[str] = None
    created_at: datetime
    status: str = "completed"  # Computed field
    outfits: List[OutfitResponse] = []  # Parsed from ai_metadata

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_outfits(cls, rec, db=None):
        """Parse ai_metadata to extract outfits"""
        import json
        
        outfits = []
        status = "completed"
        
        if rec.ai_metadata:
            try:
                metadata = json.loads(rec.ai_metadata)
                raw_outfits = metadata.get("recommended_outfits", [])
                
                for outfit in raw_outfits:
                    # Get wardrobe item IDs
                    item_ids = outfit.get("wardrobe_item_ids", [])
                    
                    # Build items list from wardrobe_item_ids
                    items = []
                    for idx, item_id in enumerate(item_ids):
                        items.append(OutfitItem(
                            wardrobe_item_id=item_id,
                            item_name=f"Item {item_id}",
                            styling_tip=outfit.get("styling_tips", [None])[idx] if isinstance(outfit.get("styling_tips"), list) and idx < len(outfit.get("styling_tips", [])) else None
                        ))
                    
                    outfits.append(OutfitResponse(
                        outfit_name=outfit.get("outfit_name", "Outfit"),
                        occasion=outfit.get("best_for", metadata.get("occasion_detected")),
                        description=outfit.get("items_description", ""),
                        why_it_works=outfit.get("why_it_works"),
                        styling_tips=outfit.get("styling_tips") if isinstance(outfit.get("styling_tips"), list) else None,
                        items=items,
                        wardrobe_item_ids=item_ids,
                        tryon_image_path=outfit.get("tryon_image_path")
                    ))
            except json.JSONDecodeError:
                pass
        
        # If no outfits and no ai_metadata, it's still processing
        if not rec.ai_metadata:
            status = "processing"
        
        return cls(
            id=rec.id,
            user_id=rec.user_id,
            query=rec.query,
            recommendation_type=rec.recommendation_type,
            generated_images=rec.generated_images,
            wardrobe_item_ids=rec.wardrobe_item_ids,
            ai_metadata=rec.ai_metadata,
            created_at=rec.created_at,
            status=status,
            outfits=outfits
        )


# AI Processing Schemas
class ProcessingResponse(BaseModel):
    status: str
    message: str
    task_id: Optional[str] = None

