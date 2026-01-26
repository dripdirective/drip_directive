"""
AI Service - Modular AI processing for fashion recommendations
Supports: Google Gemini, OpenAI GPT

Control via .env:
  LLM_PROVIDER=google|openai
  LLM_MODEL=gemini-2.0-flash|gpt-4o-mini
  IMAGE_MODEL=gemini-2.0-flash-exp|dall-e-3
"""
import json
import asyncio
import os
import uuid
import io
import httpx
from typing import Dict, List, Optional
from datetime import datetime
from PIL import Image as PILImage

from app.config import settings
from app.ai_providers import GoogleProvider, OpenAIProvider, AIProvider
from app.ai_prompts import (
    USER_PROFILE_PROMPT, 
    WARDROBE_ANALYSIS_PROMPT,
    RECOMMENDATION_PROMPT,
    VIRTUAL_TRYON_PROMPT
)

# Virtual try-on output directory
TRYON_OUTPUT_DIR = os.path.join(settings.BASE_DIR, "uploads", "tryon_images")


def compress_image(image: PILImage.Image, max_size: int = 1024) -> PILImage.Image:
    """Resize image to reduce API costs and avoid quota issues"""
    width, height = image.size
    if width > max_size or height > max_size:
        if width > height:
            new_width = max_size
            new_height = int(height * (max_size / width))
        else:
            new_height = max_size
            new_width = int(width * (max_size / height))
        image = image.resize((new_width, new_height), PILImage.Resampling.LANCZOS)
    return image


def get_image_path(path: str) -> str:
    """Get absolute path for an image"""
    if isinstance(path, str) and (path.startswith("http://") or path.startswith("https://")):
        return path
    if os.path.isabs(path):
        return path
    return os.path.join(settings.BASE_DIR, path)


def _extract_s3_key_from_url(*, url: str, bucket_name: str, cloudfront_domain: Optional[str]) -> str:
    """
    Extract object key from common S3/CloudFront URL formats.

    Supports:
    - https://<bucket>.s3.<region>.amazonaws.com/<key>
    - https://s3.<region>.amazonaws.com/<bucket>/<key>
    - https://<cloudfront-domain>/<key>
    """
    if cloudfront_domain and cloudfront_domain in url:
        key = url.split(f"{cloudfront_domain}/", 1)[-1]
        return key.lstrip("/")

    if ".amazonaws.com/" in url:
        remainder = url.split(".amazonaws.com/", 1)[-1].lstrip("/")
        # Path-style URLs include bucket in the path: /<bucket>/<key>
        if bucket_name and remainder.startswith(f"{bucket_name}/"):
            remainder = remainder[len(bucket_name) + 1 :]
        return remainder

    # Fallback: treat everything after the host as key
    parts = url.split("/", 3)
    return parts[3] if len(parts) >= 4 else url


async def load_image_from_path_or_url(path_or_url: str) -> Optional[PILImage.Image]:
    """
    Load an image from local path (relative/absolute) or from an https URL (S3/CloudFront).
    Returns a PIL Image or None if unavailable.
    """
    if not path_or_url:
        return None

    # Local file path
    if not (path_or_url.startswith("http://") or path_or_url.startswith("https://")):
        abs_path = get_image_path(path_or_url)
        if not os.path.exists(abs_path):
            return None
        return PILImage.open(abs_path)

    # Remote URL (S3/CloudFront)
    # Prefer boto3 for private buckets when USE_S3=true; fallback to plain HTTP fetch.
    if settings.USE_S3:
        try:
            from app.core.s3_storage import storage as s3_storage

            if getattr(s3_storage, "use_s3", False):
                key = _extract_s3_key_from_url(
                    url=path_or_url,
                    bucket_name=getattr(s3_storage, "bucket_name", ""),
                    cloudfront_domain=getattr(s3_storage, "cloudfront_domain", None),
                )
                obj = s3_storage.s3_client.get_object(
                    Bucket=s3_storage.bucket_name,
                    Key=key,
                )
                data = obj["Body"].read()
                return PILImage.open(io.BytesIO(data))
        except Exception:
            # Fall back to HTTP GET below
            pass

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(path_or_url)
            resp.raise_for_status()
            return PILImage.open(io.BytesIO(resp.content))
    except Exception:
        return None


# ============================================
# AI SERVICE
# ============================================

class AIService:
    """
    Modular AI Service supporting multiple providers.
    
    Usage:
        ai_service = AIService()  # Uses settings from .env
        result = await ai_service.process_user_images(user_id, image_paths)
    """
    
    def __init__(self):
        self.provider: Optional[AIProvider] = None
        self._initialize_provider()
    
    def _initialize_provider(self):
        """Initialize the configured AI provider"""
        provider_name = (settings.LLM_PROVIDER or "google").lower()
        
        print(f"\n🤖 Initializing AI Provider: {provider_name}")
        
        if provider_name == "openai":
            self.provider = OpenAIProvider(
                api_key=settings.OPENAI_API_KEY or "",
                text_model=settings.LLM_MODEL or "gpt-4o-mini",
                image_model=getattr(settings, "IMAGE_MODEL", "dall-e-3")
            )
        else:  # default: google
            self.provider = GoogleProvider(
                api_key=settings.GOOGLE_API_KEY or "",
                text_model=settings.LLM_MODEL or "gemini-2.0-flash",
                image_model=getattr(settings, "IMAGE_MODEL", "gemini-2.0-flash-exp")
            )
        
        if not self.provider.is_available:
            print(f"⚠️ AI Provider '{provider_name}' is not available")
            print(f"   Check your API key in .env")
    
    @property
    def is_available(self) -> bool:
        return self.provider is not None and self.provider.is_available
    
    def _parse_json_response(self, text: str) -> Dict:
        """Parse JSON from LLM response"""
        text = text.strip()
        # Remove markdown code blocks
        if text.startswith("```"):
            parts = text.split("```")
            if len(parts) >= 2:
                text = parts[1]
                if text.startswith("json"):
                    text = text[4:]
        text = text.strip()
        
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parse error: {e}")
            return {"raw_response": text, "parse_error": str(e)}
    
    # ----------------------------------------
    # USER IMAGE PROCESSING
    # ----------------------------------------
    
    async def process_user_images(self, user_id: int, image_paths: Dict[str, str]) -> Dict:
        """Process user images and generate profile metadata"""
        print(f"\n🤖 Processing user images for user {user_id}")
        print(f"   Provider: {self.provider.name if self.provider else 'none'}")
        print(f"   Images: {list(image_paths.keys())}")
        
        if not self.is_available:
            return await self._placeholder_user_metadata(image_paths)
        
        try:
            # Load and compress images
            images = []
            for image_type, path in image_paths.items():
                img = await load_image_from_path_or_url(path)
                if img is not None:
                    img = compress_image(img, max_size=1024)
                    images.append(img)
                    print(f"   ✓ Loaded: {image_type}")
            
            if not images:
                return await self._placeholder_user_metadata(image_paths)
            
            # Analyze with provider
            print(f"   📤 Sending to {self.provider.name}...")
            result = await self.provider.analyze_images_batch(images, USER_PROFILE_PROMPT)
            
            if "error" in result:
                print(f"   ✗ Error: {result['error']}")
                return await self._placeholder_user_metadata(image_paths)
            
            analysis = self._parse_json_response(result.get("text", "{}"))
            
            # Build response
            metadata = {}
            for image_type in image_paths.keys():
                metadata[image_type] = {
                    "profile_analysis": analysis,
                    "model_used": result.get("model", self.provider.name)
                }
            
            metadata["_combined_profile"] = {
                "user_id": user_id,
                "analysis": analysis,
                "images_analyzed": list(image_paths.keys()),
                "processing_timestamp": datetime.utcnow().isoformat(),
                "model_used": result.get("model", self.provider.name),
                "provider": self.provider.name
            }
            
            print(f"   ✓ Processing complete")
            return metadata
            
        except Exception as e:
            print(f"   ✗ Error: {e}")
            import traceback
            traceback.print_exc()
            return await self._placeholder_user_metadata(image_paths)
    
    async def _placeholder_user_metadata(self, image_paths: Dict[str, str]) -> Dict:
        """Return placeholder when AI is not available"""
        placeholder = {
            "physical_attributes": {"body_type": "average", "skin_tone": "medium"},
            "facial_features": {"face_shape": "oval", "hair_color": "black"},
            "style_assessment": {
                "recommended_colors": ["navy", "gray", "white"],
                "recommended_styles": ["casual", "smart casual"],
                "style_notes": "Configure AI provider for personalized analysis"
            },
            "confidence_scores": {"overall_confidence": 0}
        }
        
        metadata = {img_type: {"profile_analysis": placeholder, "model_used": "placeholder"} 
                    for img_type in image_paths}
        metadata["_combined_profile"] = {"analysis": placeholder, "model_used": "placeholder"}
        return metadata
    
    # ----------------------------------------
    # WARDROBE PROCESSING
    # ----------------------------------------
    
    async def process_wardrobe_images(self, image_path: str) -> Dict:
        """Process wardrobe image and extract clothing metadata"""
        print(f"\n🤖 Processing wardrobe image: {image_path}")
        
        if not self.is_available:
            return self._placeholder_wardrobe_metadata()
        
        try:
            img = await load_image_from_path_or_url(image_path)
            if img is None:
                return self._placeholder_wardrobe_metadata()

            img = compress_image(img, max_size=1024)
            
            print(f"   📤 Sending to {self.provider.name}...")
            result = await self.provider.analyze_image(img, WARDROBE_ANALYSIS_PROMPT)
            
            if "error" in result:
                print(f"   ✗ Error: {result['error']}")
                return self._placeholder_wardrobe_metadata()
            
            metadata = self._parse_json_response(result.get("text", "{}"))
            metadata["processing_timestamp"] = datetime.utcnow().isoformat()
            metadata["model_used"] = result.get("model", self.provider.name)
            metadata["provider"] = self.provider.name
            
            print(f"   ✓ Wardrobe analysis complete")
            return {"clothing_analysis": metadata}
            
        except Exception as e:
            print(f"   ✗ Error: {e}")
            return self._placeholder_wardrobe_metadata()
    
    def _placeholder_wardrobe_metadata(self) -> Dict:
        return {"clothing_analysis": {
            "garment_type": "unknown", 
            "color": "unknown", 
            "style": "casual",
            "note": "Configure AI provider for real analysis"
        }}
    
    # ----------------------------------------
    # EMBEDDINGS
    # ----------------------------------------
    
    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate text embedding for vector search"""
        if not text or not text.strip():
            return None
        
        print(f"\n🔢 Generating embedding for text ({len(text)} chars)")
        
        try:
            # Try OpenAI embeddings first (works with any provider for embeddings)
            if settings.OPENAI_API_KEY:
                try:
                    import openai
                    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
                    response = client.embeddings.create(
                        model="text-embedding-3-small",  # cheaper and faster
                        input=text[:8000]  # limit input length
                    )
                    embedding = response.data[0].embedding
                    print(f"   ✓ Generated embedding (dim={len(embedding)})")
                    return embedding
                except Exception as e:
                    print(f"   ⚠️ OpenAI embedding failed: {e}")
            
            # Fallback: Google embeddings if using Gemini
            if self.provider and self.provider.name == "google" and self.is_available:
                try:
                    # Google's text embedding
                    result = self.provider.client.models.embed_content(
                        model="models/text-embedding-004",
                        content=text[:8000]
                    )
                    embedding = result.embeddings[0].values
                    print(f"   ✓ Generated Google embedding (dim={len(embedding)})")
                    return embedding
                except Exception as e:
                    print(f"   ⚠️ Google embedding failed: {e}")
            
            print(f"   ⚠️ No embedding provider available")
            return None
            
        except Exception as e:
            print(f"   ✗ Embedding generation error: {e}")
            return None
    
    # ----------------------------------------
    # RECOMMENDATIONS
    # ----------------------------------------
    
    async def generate_recommendations(
        self,
        user_id: int,
        query: str,
        user_profile: Dict,
        wardrobe_items: List[Dict],
        user_image_path: Optional[str] = None
    ) -> Dict:
        """Generate outfit recommendations based on user profile and wardrobe"""
        print(f"\n🤖 Generating recommendations for user {user_id}")
        print(f"   Query: {query}")
        print(f"   Wardrobe items: {len(wardrobe_items)}")
        
        if not self.is_available:
            return self._placeholder_recommendations(query)
        
        try:
            # Filter to top N items for API efficiency
            max_items = getattr(settings, "MAX_RECOMMENDATION_WARDROBE_ITEMS", 20)
            filtered_items = wardrobe_items[:max_items]
            
            # Prepare wardrobe summary with relevance scores
            wardrobe_summary = []
            for item in filtered_items:
                metadata = item.get("metadata", {})
                clothing_data = metadata.get("clothing_analysis", metadata)
                
                item_summary = {
                    "id": item.get("id"),
                    "type": clothing_data.get("garment_type") or item.get("dress_type", "unknown"),
                    "color": clothing_data.get("color") or item.get("color", "unknown"),
                    "style": clothing_data.get("style") or item.get("style", "unknown"),
                    "category": clothing_data.get("category", "unknown")
                }
                
                # Include vector relevance score if available
                if "vector_relevance" in item:
                    item_summary["vector_relevance"] = item["vector_relevance"]
                
                wardrobe_summary.append(item_summary)
            
            # Create prompt using template
            prompt = RECOMMENDATION_PROMPT.format(
                user_profile=json.dumps(user_profile, indent=2) if user_profile else "General user",
                query=query,
                wardrobe_summary=json.dumps(wardrobe_summary, indent=2)
            )

            print(f"   📤 Sending to {self.provider.name}...")
            response_text = await self.provider.generate_text(prompt)
            
            if not response_text:
                return self._placeholder_recommendations(query)
            
            recommendations = self._parse_json_response(response_text)
            recommendations["processing_timestamp"] = datetime.utcnow().isoformat()
            recommendations["model_used"] = self.provider.name
            recommendations["items_considered"] = len(filtered_items)
            
            print(f"   ✓ Generated {len(recommendations.get('recommended_outfits', []))} outfits")
            
            # Generate try-on images if user image available
            generated_images = []
            if user_image_path:
                for outfit in recommendations.get("recommended_outfits", [])[:2]:
                    tryon_result = await self.generate_virtual_tryon(
                        user_image_path=user_image_path,
                        outfit_description=outfit.get("items_description", ""),
                        outfit_name=outfit.get("outfit_name", "Outfit"),
                        user_profile=user_profile,
                        wardrobe_items=[i for i in filtered_items if i.get("id") in outfit.get("wardrobe_item_ids", [])]
                    )
                    if tryon_result.get("image_path"):
                        generated_images.append({
                            "outfit_id": outfit.get("outfit_id"),
                            "image_path": tryon_result["image_path"]
                        })
                        outfit["tryon_image_path"] = tryon_result["image_path"]
            
            return {
                "recommended_outfits": recommendations.get("recommended_outfits", []),
                "generated_images": generated_images,
                "metadata": recommendations
            }
            
        except Exception as e:
            print(f"   ✗ Error: {e}")
            import traceback
            traceback.print_exc()
            return self._placeholder_recommendations(query)
    
    def _placeholder_recommendations(self, query: str) -> Dict:
        return {
            "recommended_outfits": [{
                "outfit_id": 1,
                "outfit_name": "Default Recommendation",
                "wardrobe_item_ids": [],
                "why_it_works": "Configure AI provider for real recommendations",
                "confidence_score": 0
            }],
            "generated_images": [],
            "metadata": {"query_understanding": query, "note": "AI not configured"}
        }
    
    # ----------------------------------------
    # VIRTUAL TRY-ON
    # ----------------------------------------
    
    async def generate_virtual_tryon(
        self,
        user_image_path: str,
        outfit_description: str,
        outfit_name: str,
        user_profile: Optional[Dict] = None,
        wardrobe_items: Optional[List[Dict]] = None
    ) -> Dict:
        """Generate virtual try-on image"""
        print(f"\n   🎨 Generating try-on: {outfit_name}")
        
        if not self.is_available:
            return {"error": "AI not available", "image_path": None}
        
        os.makedirs(TRYON_OUTPUT_DIR, exist_ok=True)
        
        try:
            user_image = await load_image_from_path_or_url(user_image_path)
            if user_image is None:
                return {"error": "User image not found", "image_path": None}
            user_image = compress_image(user_image, max_size=1024)
            
            # Build try-on prompt
            profile_desc = ""
            if user_profile:
                phys = user_profile.get("ai_profile_analysis", {}).get("physical_attributes", {})
                if isinstance(phys, dict):
                    profile_desc = f"Person: {phys.get('body_type', 'average')} build, {phys.get('skin_tone', 'medium')} skin tone"
            
            prompt = VIRTUAL_TRYON_PROMPT.format(
                outfit_name=outfit_name,
                profile_desc=profile_desc,
                outfit_description=outfit_description
            )

            print(f"      📤 Generating with {self.provider.name}...")
            
            generated_image = await self.provider.generate_image(prompt, user_image)
            
            if generated_image:
                filename = f"tryon_{uuid.uuid4().hex[:8]}.png"
                output_path = os.path.join(TRYON_OUTPUT_DIR, filename)
                generated_image.save(output_path)
                
                relative_path = f"uploads/tryon_images/{filename}"
                print(f"      ✅ Saved: {relative_path}")
                
                return {
                    "image_path": relative_path,
                    "description": f"Virtual try-on: {outfit_name}",
                    "model_used": self.provider.name
                }
            else:
                print(f"      ⚠️ No image generated")
                return {"image_path": None, "description": outfit_description}
                
        except Exception as e:
            print(f"      ✗ Error: {e}")
            return {"error": str(e), "image_path": None}


# ============================================
# GLOBAL INSTANCE
# ============================================
ai_service = AIService()
