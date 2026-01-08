"""
Base AI Provider Interface
All providers must implement these methods
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from PIL import Image


class AIProvider(ABC):
    """Abstract base class for AI providers"""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name (google, openai)"""
        pass
    
    @property
    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is properly configured"""
        pass
    
    @abstractmethod
    async def analyze_image(self, image: Image.Image, prompt: str) -> Dict:
        """
        Analyze an image with a text prompt
        Returns: Dict with analysis results
        """
        pass
    
    @abstractmethod
    async def generate_text(self, prompt: str) -> str:
        """
        Generate text from a prompt
        Returns: Generated text
        """
        pass
    
    @abstractmethod
    async def analyze_images_batch(self, images: List[Image.Image], prompt: str) -> Dict:
        """
        Analyze multiple images together
        Returns: Dict with combined analysis
        """
        pass
    
    @abstractmethod
    async def generate_image(
        self, 
        prompt: str, 
        reference_image: Optional[Image.Image] = None
    ) -> Optional[Image.Image]:
        """
        Generate an image from prompt (and optionally reference image)
        Returns: PIL Image or None if not supported/failed
        """
        pass

