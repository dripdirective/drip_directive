"""
OpenAI GPT AI Provider
Uses: gpt-4o-mini (text + vision), dall-e-3 (image generation)
"""
import io
import base64
import asyncio
import os
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
                 image_model: str = "dall-e-3",
                 vision_model: Optional[str] = None,
                 fallback_vision_model: Optional[str] = None,
                 enable_vision_fallback: bool = True,
                 max_concurrency: int = 4,
                 timeout_seconds: float = 60.0):
        self.api_key = api_key
        self.text_model = text_model
        # Use a vision-capable model for image analysis (can differ from text_model)
        self.vision_model = vision_model or text_model
        self.fallback_vision_model = fallback_vision_model
        self.enable_vision_fallback = bool(enable_vision_fallback)
        self.image_model = image_model
        self.max_concurrency = max(1, int(max_concurrency or 1))
        self.timeout_seconds = float(timeout_seconds or 60.0)
        self.client = None
        self._semaphore = asyncio.Semaphore(self.max_concurrency)
        self._initialize()
    
    def _initialize(self):
        if not OPENAI_AVAILABLE:
            print("⚠️ OpenAI SDK not installed. Run: pip install openai")
            return
        
        if not self.api_key:
            print("⚠️ OPENAI_API_KEY not configured")
            return
        
        try:
            # Use the async client so we don't block the event loop.
            # openai>=1.x provides AsyncOpenAI.
            self.client = openai.AsyncOpenAI(api_key=self.api_key, timeout=self.timeout_seconds)
            print(f"✓ OpenAI GPT initialized")
            print(f"  Text model: {self.text_model}")
            print(f"  Image model: {self.image_model}")
            print(f"  Max concurrency: {self.max_concurrency}")
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

    def _extract_output_text(self, resp) -> str:
        """
        Extract text output from either ChatCompletions or Responses API objects.
        """
        if resp is None:
            return ""
        # New Responses API (openai>=1.0): resp.output_text convenience
        text = getattr(resp, "output_text", None)
        if text:
            return str(text)
        # ChatCompletions: resp.choices[0].message.content
        try:
            return str(resp.choices[0].message.content or "")
        except Exception:
            pass
        # Fallback: best-effort stringify
        try:
            return str(resp)
        except Exception:
            return ""

    async def _responses_vision(self, *, model_name: str, prompt: str, image_data_url: str) -> Dict:
        """
        Call OpenAI Responses API for vision analysis (preferred for GPT-5.x).
        Returns {text, model} or {error, model}.
        """
        if not hasattr(self.client, "responses"):
            return {"error": "Responses API not available in this OpenAI SDK", "model": model_name}

        try:
            # Prefer JSON mode if supported by the model; if rejected, fall back without it.
            try:
                resp = await self.client.responses.create(
                    model=model_name,
                    response_format={"type": "json_object"},
                    input=[
                        {
                            "role": "system",
                            "content": [{"type": "input_text", "text": "You must respond with ONLY valid JSON (no markdown, no extra text)."}],
                        },
                        {
                            "role": "user",
                            "content": [
                                {"type": "input_text", "text": prompt},
                                {"type": "input_image", "image_url": image_data_url},
                            ],
                        },
                    ],
                    # NOTE: some GPT-5.x endpoints reject non-default temperature.
                )
            except Exception:
                resp = await self.client.responses.create(
                    model=model_name,
                    input=[
                        {
                            "role": "system",
                            "content": [{"type": "input_text", "text": "You must respond with ONLY valid JSON (no markdown, no extra text)."}],
                        },
                        {
                            "role": "user",
                            "content": [
                                {"type": "input_text", "text": prompt},
                                {"type": "input_image", "image_url": image_data_url},
                            ],
                        },
                    ],
                    # NOTE: some GPT-5.x endpoints reject non-default temperature.
                )

            text = self._extract_output_text(resp)
            if not text.strip():
                return {"error": "Empty response from OpenAI vision model", "model": model_name, "api": "responses"}
            return {"text": text, "model": model_name, "api": "responses"}
        except Exception as e:
            return {"error": str(e), "model": model_name, "api": "responses"}
    
    async def analyze_image(self, image: Image.Image, prompt: str) -> Dict:
        """Analyze single image with GPT-4o Vision"""
        if not self.is_available:
            return {"error": "OpenAI not available"}
        
        try:
            image_url = self._image_to_base64(image)

            async def _call(model_name: str) -> Dict:
                # Prefer Responses API for GPT-5.x vision (more reliable).
                resp_out = await self._responses_vision(model_name=model_name, prompt=prompt, image_data_url=image_url)
                if "error" not in resp_out:
                    return resp_out

                # Fallback to chat.completions vision style
                try:
                    resp = await self.client.chat.completions.create(
                        model=model_name,
                        response_format={"type": "json_object"},
                        messages=[
                            {
                                "role": "system",
                                "content": "You must respond with ONLY valid JSON (no markdown, no extra text).",
                            },
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": prompt},
                                    {"type": "image_url", "image_url": {"url": image_url, "detail": "high"}},
                                ],
                            },
                        ],
                        max_completion_tokens=2000,
                        # NOTE: some GPT-5.x endpoints reject non-default temperature.
                    )
                except Exception:
                    resp = await self.client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {
                                "role": "system",
                                "content": "You must respond with ONLY valid JSON (no markdown, no extra text).",
                            },
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": prompt},
                                    {"type": "image_url", "image_url": {"url": image_url, "detail": "high"}},
                                ],
                            },
                        ],
                        max_completion_tokens=2000,
                        # NOTE: some GPT-5.x endpoints reject non-default temperature.
                    )

                text = self._extract_output_text(resp)
                if not text.strip():
                    return {"error": "Empty response from OpenAI vision model", "model": model_name, "api": "chat"}
                return {"text": text, "model": model_name, "api": "chat"}

            async with self._semaphore:
                primary = await _call(self.vision_model)
                if "error" not in primary:
                    return primary

                # Optional one-shot fallback
                if (
                    self.enable_vision_fallback
                    and self.fallback_vision_model
                    and self.fallback_vision_model != self.vision_model
                ):
                    fallback = await _call(self.fallback_vision_model)
                    if "error" not in fallback:
                        return fallback

                return primary
        except Exception as e:
            return {"error": str(e)}
    
    async def generate_text(self, prompt: str) -> str:
        """Generate text with GPT"""
        if not self.is_available:
            return ""
        
        try:
            # Prefer the Responses API (more reliable for GPT-5.x) and enforce JSON output,
            # since callers typically expect machine-parsable JSON.
            if hasattr(self.client, "responses"):
                async with self._semaphore:
                    try:
                        resp = await self.client.responses.create(
                            model=self.text_model,
                            response_format={"type": "json_object"},
                            input=[
                                {
                                    "role": "system",
                                    "content": [{"type": "input_text", "text": "You must respond with ONLY valid JSON (no markdown, no extra text)."}],
                                },
                                {"role": "user", "content": [{"type": "input_text", "text": prompt}]},
                            ],
                        )
                    except Exception:
                        # If JSON mode is rejected by the model, fall back without it.
                        resp = await self.client.responses.create(
                            model=self.text_model,
                            input=[
                                {
                                    "role": "system",
                                    "content": [{"type": "input_text", "text": "You must respond with ONLY valid JSON (no markdown, no extra text)."}],
                                },
                                {"role": "user", "content": [{"type": "input_text", "text": prompt}]},
                            ],
                        )

                text = self._extract_output_text(resp)
                return (text or "").strip()

            # Fallback to chat.completions (older SDKs / models)
            async with self._semaphore:
                response = await self.client.chat.completions.create(
                    model=self.text_model,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": "You must respond with ONLY valid JSON (no markdown, no extra text)."},
                        {"role": "user", "content": prompt},
                    ],
                    max_completion_tokens=2000,
                )
            return (response.choices[0].message.content or "").strip()
        except Exception as e:
            print(f"⚠️ OpenAI text generation error: {e}")
            return ""
    
    async def analyze_images_batch(self, images: List[Image.Image], prompt: str) -> Dict:
        """Analyze multiple images with GPT-4o Vision"""
        if not self.is_available:
            return {"error": "OpenAI not available"}
        
        try:
            # For batch, prefer Responses API with multiple input_image blocks.
            image_urls = [self._image_to_base64(img) for img in images]

            async def _call(model_name: str) -> Dict:
                if hasattr(self.client, "responses"):
                    try:
                        user_content = [{"type": "input_text", "text": prompt}]
                        for u in image_urls:
                            user_content.append({"type": "input_image", "image_url": u})

                        try:
                            resp = await self.client.responses.create(
                                model=model_name,
                                response_format={"type": "json_object"},
                                input=[
                                    {
                                        "role": "system",
                                        "content": [{"type": "input_text", "text": "You must respond with ONLY valid JSON (no markdown, no extra text)."}],
                                    },
                                    {"role": "user", "content": user_content},
                                ],
                                # NOTE: some GPT-5.x endpoints reject non-default temperature.
                            )
                        except Exception:
                            resp = await self.client.responses.create(
                                model=model_name,
                                input=[
                                    {
                                        "role": "system",
                                        "content": [{"type": "input_text", "text": "You must respond with ONLY valid JSON (no markdown, no extra text)."}],
                                    },
                                    {"role": "user", "content": user_content},
                                ],
                                # NOTE: some GPT-5.x endpoints reject non-default temperature.
                            )

                        text = self._extract_output_text(resp)
                        if text.strip():
                            return {"text": text, "model": model_name, "api": "responses"}
                        return {"error": "Empty response from OpenAI vision model", "model": model_name, "api": "responses"}
                    except Exception as e:
                        # fall through to chat.completions below
                        pass

                # Fallback to chat.completions with multiple image_url blocks
                content = [{"type": "text", "text": prompt}]
                for u in image_urls:
                    content.append({"type": "image_url", "image_url": {"url": u, "detail": "high"}})

                try:
                    resp = await self.client.chat.completions.create(
                        model=model_name,
                        response_format={"type": "json_object"},
                        messages=[
                            {"role": "system", "content": "You must respond with ONLY valid JSON (no markdown, no extra text)."},
                            {"role": "user", "content": content},
                        ],
                        max_completion_tokens=3000,
                        # NOTE: some GPT-5.x endpoints reject non-default temperature.
                    )
                except Exception:
                    resp = await self.client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {"role": "system", "content": "You must respond with ONLY valid JSON (no markdown, no extra text)."},
                            {"role": "user", "content": content},
                        ],
                        max_completion_tokens=3000,
                        # NOTE: some GPT-5.x endpoints reject non-default temperature.
                    )

                text = self._extract_output_text(resp)
                if not text.strip():
                    return {"error": "Empty response from OpenAI vision model", "model": model_name, "api": "chat"}
                return {"text": text, "model": model_name, "api": "chat"}

            async with self._semaphore:
                primary = await _call(self.vision_model)
                if "error" not in primary:
                    return primary

                if (
                    self.enable_vision_fallback
                    and self.fallback_vision_model
                    and self.fallback_vision_model != self.vision_model
                ):
                    fallback = await _call(self.fallback_vision_model)
                    if "error" not in fallback:
                        return fallback

                return primary
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
            async with self._semaphore:
                response = await self.client.images.generate(
                    model=self.image_model,
                    prompt=prompt,
                    size="1024x1024",
                    quality="standard",
                    n=1,
                )
            
            # Download the generated image
            image_url = response.data[0].url
            
            async with httpx.AsyncClient(
                timeout=self.timeout_seconds,
                follow_redirects=True,
            ) as client:
                img_response = await client.get(image_url)
                img_bytes = img_response.content
            
            return Image.open(io.BytesIO(img_bytes))
            
        except Exception as e:
            print(f"⚠️ DALL-E image generation error: {e}")
            return None

