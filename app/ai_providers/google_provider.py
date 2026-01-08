"""
Google Gemini AI Provider
Uses: gemini-2.0-flash (text), gemini-2.0-flash-exp (image generation)
"""
import io
from typing import Dict, List, Optional
from PIL import Image
from .base import AIProvider

# Try to import Google GenAI
GOOGLE_AVAILABLE = False
genai = None
types = None

try:
    from google import genai as _genai
    from google.genai import types as _types
    genai = _genai
    types = _types
    GOOGLE_AVAILABLE = True
except ImportError:
    pass


class GoogleProvider(AIProvider):
    """Google Gemini AI Provider"""
    
    def __init__(self, api_key: str, text_model: str = "gemini-2.0-flash", 
                 image_model: str = "gemini-2.0-flash-exp"):
        self.api_key = api_key
        self.text_model = text_model
        self.image_model = image_model
        self.client = None
        self._initialize()
    
    def _initialize(self):
        if not GOOGLE_AVAILABLE:
            print("⚠️ Google GenAI SDK not installed. Run: pip install google-genai")
            return
        
        if not self.api_key:
            print("⚠️ GOOGLE_API_KEY not configured")
            return
        
        try:
            self.client = genai.Client(api_key=self.api_key)
            print(f"✓ Google Gemini initialized")
            print(f"  Text model: {self.text_model}")
            print(f"  Image model: {self.image_model}")
        except Exception as e:
            print(f"⚠️ Failed to initialize Google Gemini: {e}")
    
    @property
    def name(self) -> str:
        return "google"
    
    @property
    def is_available(self) -> bool:
        return self.client is not None
    
    def _image_to_part(self, image: Image.Image) -> "types.Part":
        """Convert PIL Image to Gemini Part"""
        img_byte_arr = io.BytesIO()
        img_format = "PNG" if image.mode == "RGBA" else "JPEG"
        image.save(img_byte_arr, format=img_format)
        img_bytes = img_byte_arr.getvalue()
        mime_type = "image/png" if img_format == "PNG" else "image/jpeg"
        return types.Part.from_bytes(data=img_bytes, mime_type=mime_type)
    
    async def analyze_image(self, image: Image.Image, prompt: str) -> Dict:
        """Analyze single image with Gemini"""
        if not self.is_available:
            return {"error": "Google Gemini not available"}
        
        try:
            image_part = self._image_to_part(image)
            response = self.client.models.generate_content(
                model=self.text_model,
                contents=[prompt, image_part]
            )
            return {"text": response.text, "model": self.text_model}
        except Exception as e:
            return {"error": str(e)}
    
    async def generate_text(self, prompt: str) -> str:
        """Generate text with Gemini"""
        if not self.is_available:
            return ""
        
        try:
            response = self.client.models.generate_content(
                model=self.text_model,
                contents=[prompt]
            )
            return response.text
        except Exception as e:
            print(f"⚠️ Gemini text generation error: {e}")
            return ""
    
    async def analyze_images_batch(self, images: List[Image.Image], prompt: str) -> Dict:
        """Analyze multiple images together"""
        if not self.is_available:
            return {"error": "Google Gemini not available"}
        
        try:
            content_parts = [prompt]
            for img in images:
                content_parts.append(self._image_to_part(img))
            
            response = self.client.models.generate_content(
                model=self.text_model,
                contents=content_parts
            )
            return {"text": response.text, "model": self.text_model}
        except Exception as e:
            return {"error": str(e)}
    
    async def generate_image(
        self, 
        prompt: str, 
        reference_image: Optional[Image.Image] = None
    ) -> Optional[Image.Image]:
        """Generate image with Gemini (requires image generation model)"""
        if not self.is_available:
            return None
        
        try:
            contents = [prompt]
            if reference_image:
                contents.append(reference_image)
            
            response = self.client.models.generate_content(
                model=self.image_model,
                contents=contents
            )
            
            # Look for generated image in response
            for part in response.parts:
                if part.inline_data is not None:
                    return part.as_image()
            
            return None
        except Exception as e:
            print(f"⚠️ Gemini image generation error: {e}")
            return None

