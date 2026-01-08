"""
OpenAI GPT AI Provider
Uses: gpt-4o-mini (text + vision), dall-e-3 (image generation)
"""
import io
import base64
import httpx
from typing import Dict, List, Optional
from PIL import Image
from .base import AIProvider

# Try to import OpenAI
OPENAI_AVAILABLE = False
openai = None

try:
    import openai as _openai
    openai = _openai
    OPENAI_AVAILABLE = True
except ImportError:
    pass


class OpenAIProvider(AIProvider):
    """OpenAI GPT AI Provider"""
    
    def __init__(self, api_key: str, text_model: str = "gpt-4o-mini", 
                 image_model: str = "dall-e-3"):
        self.api_key = api_key
        self.text_model = text_model
        self.image_model = image_model
        self.client = None
        self._initialize()
    
    def _initialize(self):
        if not OPENAI_AVAILABLE:
            print("⚠️ OpenAI SDK not installed. Run: pip install openai")
            return
        
        if not self.api_key:
            print("⚠️ OPENAI_API_KEY not configured")
            return
        
        try:
            self.client = openai.OpenAI(api_key=self.api_key)
            print(f"✓ OpenAI GPT initialized")
            print(f"  Text model: {self.text_model}")
            print(f"  Image model: {self.image_model}")
        except Exception as e:
            print(f"⚠️ Failed to initialize OpenAI: {e}")
    
    @property
    def name(self) -> str:
        return "openai"
    
    @property
    def is_available(self) -> bool:
        return self.client is not None
    
    def _image_to_base64(self, image: Image.Image) -> str:
        """Convert PIL Image to base64 data URL"""
        img_byte_arr = io.BytesIO()
        img_format = "PNG" if image.mode == "RGBA" else "JPEG"
        image.save(img_byte_arr, format=img_format)
        img_bytes = img_byte_arr.getvalue()
        b64 = base64.b64encode(img_bytes).decode("utf-8")
        mime = "image/png" if img_format == "PNG" else "image/jpeg"
        return f"data:{mime};base64,{b64}"
    
    async def analyze_image(self, image: Image.Image, prompt: str) -> Dict:
        """Analyze single image with GPT-4o Vision"""
        if not self.is_available:
            return {"error": "OpenAI not available"}
        
        try:
            image_url = self._image_to_base64(image)
            
            response = self.client.chat.completions.create(
                model=self.text_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": image_url, "detail": "low"}
                            }
                        ]
                    }
                ],
                max_completion_tokens=2000
            )
            return {"text": response.choices[0].message.content, "model": self.text_model}
        except Exception as e:
            return {"error": str(e)}
    
    async def generate_text(self, prompt: str) -> str:
        """Generate text with GPT"""
        if not self.is_available:
            return ""
        
        try:
            response = self.client.chat.completions.create(
                model=self.text_model,
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"⚠️ OpenAI text generation error: {e}")
            return ""
    
    async def analyze_images_batch(self, images: List[Image.Image], prompt: str) -> Dict:
        """Analyze multiple images with GPT-4o Vision"""
        if not self.is_available:
            return {"error": "OpenAI not available"}
        
        try:
            content = [{"type": "text", "text": prompt}]
            
            for img in images:
                image_url = self._image_to_base64(img)
                content.append({
                    "type": "image_url",
                    "image_url": {"url": image_url, "detail": "low"}
                })
            
            response = self.client.chat.completions.create(
                model=self.text_model,
                messages=[{"role": "user", "content": content}],
                max_completion_tokens=3000
            )
            return {"text": response.choices[0].message.content, "model": self.text_model}
        except Exception as e:
            return {"error": str(e)}
    
    async def generate_image(
        self, 
        prompt: str, 
        reference_image: Optional[Image.Image] = None
    ) -> Optional[Image.Image]:
        """Generate image with DALL-E 3"""
        if not self.is_available:
            return None
        
        try:
            # DALL-E 3 doesn't support reference images directly
            # For virtual try-on, we'll use the prompt only
            response = self.client.images.generate(
                model=self.image_model,
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                n=1
            )
            
            # Download the generated image
            image_url = response.data[0].url
            
            async with httpx.AsyncClient() as client:
                img_response = await client.get(image_url)
                img_bytes = img_response.content
            
            return Image.open(io.BytesIO(img_bytes))
            
        except Exception as e:
            print(f"⚠️ DALL-E image generation error: {e}")
            return None

