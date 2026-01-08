#!/usr/bin/env python3
"""
Test AI API keys for both Google and OpenAI

Usage:
    python scripts/test_api_key.py                    # Test using .env settings
    python scripts/test_api_key.py google API_KEY    # Test Google key
    python scripts/test_api_key.py openai API_KEY    # Test OpenAI key
"""

import sys
import os
from pathlib import Path


def load_env():
    """Load .env file"""
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key.strip(), value.strip().strip('"'))


def test_google(api_key: str) -> bool:
    """Test Google Gemini API key"""
    print(f"\n{'='*50}")
    print("Google Gemini API Test")
    print(f"{'='*50}")
    print(f"API Key: {api_key[:10]}...{api_key[-4:]}")
    
    try:
        from google import genai
        print("✓ google-genai package installed")
    except ImportError:
        print("✗ google-genai not installed")
        print("  Run: pip install google-genai")
        return False

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents="Say 'Hello from Gemini!' in exactly those words."
        )
        
        if response and response.text:
            print(f"✓ Response: {response.text.strip()[:80]}")
            print("\n✅ GOOGLE API KEY IS WORKING!")
            return True
        else:
            print("✗ Empty response")
            return False
            
    except Exception as e:
        error_msg = str(e)
        print(f"✗ Error: {error_msg}")
        
        if "RESOURCE_EXHAUSTED" in error_msg:
            print("\n⚠️  QUOTA EXCEEDED!")
            print("   - Wait a few minutes (rate limit)")
            print("   - Or create new key: https://aistudio.google.com/apikey")
        elif "INVALID" in error_msg.upper():
            print("\n⚠️  INVALID KEY - Get new key: https://aistudio.google.com/apikey")
        
        return False


def test_openai(api_key: str) -> bool:
    """Test OpenAI API key"""
    print(f"\n{'='*50}")
    print("OpenAI GPT API Test")
    print(f"{'='*50}")
    print(f"API Key: {api_key[:10]}...{api_key[-4:]}")
    
    try:
        import openai
        print("✓ openai package installed")
    except ImportError:
        print("✗ openai not installed")
        print("  Run: pip install openai")
        return False

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Say 'Hello from GPT!' in exactly those words."}],
            max_tokens=50
        )
        
        if response and response.choices:
            print(f"✓ Response: {response.choices[0].message.content.strip()[:80]}")
            print("\n✅ OPENAI API KEY IS WORKING!")
            return True
        else:
            print("✗ Empty response")
            return False
            
    except Exception as e:
        error_msg = str(e)
        print(f"✗ Error: {error_msg}")
        
        if "rate_limit" in error_msg.lower():
            print("\n⚠️  RATE LIMIT - Wait and try again")
        elif "invalid_api_key" in error_msg.lower() or "401" in error_msg:
            print("\n⚠️  INVALID KEY - Get new key: https://platform.openai.com/api-keys")
        elif "insufficient_quota" in error_msg.lower():
            print("\n⚠️  QUOTA EXCEEDED - Add credits at: https://platform.openai.com/account/billing")
        
        return False


def main():
    load_env()
    
    # Parse arguments
    if len(sys.argv) >= 3:
        provider = sys.argv[1].lower()
        api_key = sys.argv[2]
    elif len(sys.argv) == 2:
        # Single arg - assume it's a Google key (backwards compatible)
        provider = "google"
        api_key = sys.argv[1]
    else:
        # Use .env settings
        provider = os.environ.get("LLM_PROVIDER", "google").lower()
        if provider == "openai":
            api_key = os.environ.get("OPENAI_API_KEY", "")
        else:
            api_key = os.environ.get("GOOGLE_API_KEY", "")
    
    if not api_key:
        print("✗ No API key provided!")
        print()
        print("Usage:")
        print("  python scripts/test_api_key.py google YOUR_GOOGLE_KEY")
        print("  python scripts/test_api_key.py openai YOUR_OPENAI_KEY")
        print("  # or set keys in .env file and just run:")
        print("  python scripts/test_api_key.py")
        sys.exit(1)
    
    # Test the appropriate provider
    if provider == "openai":
        success = test_openai(api_key)
    else:
        success = test_google(api_key)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
