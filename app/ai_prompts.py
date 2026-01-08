"""
Centralized prompts used by the AI service.

Keeping prompts out of the core service code makes it easier to tweak wording,
swap providers/models, and manage prompt versions.
"""

# Prompt used to extract user profile signals from one or more user images
USER_PROFILE_PROMPT = """Analyze the user image(s) and extract comprehensive fashion profile information.

Return a JSON object with both structured data and a rich narrative summary:
{
    "physical_attributes": {
        "estimated_gender": "male/female/non-binary",
        "body_type": "slim/athletic/average/curvy/plus_size",
        "body_shape_details": "detailed description of proportions, height perception, frame",
        "skin_tone": "fair/light/medium/olive/tan/dark/deep",
        "skin_undertone": "warm/cool/neutral",
        "complexion_notes": "texture, clarity, unique features"
    },
    "facial_features": {
        "face_shape": "oval/round/square/heart/oblong",
        "prominent_features": "description of striking features",
        "hair_color": "black/brown/blonde/red/gray",
        "hair_length": "short/medium/long",
        "hair_texture": "straight/wavy/curly/coily",
        "eye_color": "if visible"
    },
    "style_assessment": {
        "current_style_impression": "detailed description of their current aesthetic",
        "style_personality": "classic/trendy/eclectic/minimalist/bohemian/edgy",
        "recommended_colors": ["color1", "color2", "color3", "color4", "color5"],
        "colors_to_avoid": ["color1", "color2"],
        "recommended_styles": ["style1", "style2", "style3"],
        "style_strengths": "what works well for them",
        "style_opportunities": "areas for experimentation",
        "seasonal_recommendations": "which seasons suit them best",
        "accessory_suggestions": "jewelry, bags, shoes style recommendations",
        "style_notes": "comprehensive personalized fashion advice"
    },
    "confidence_scores": {
        "overall_confidence": 85,
        "body_type_confidence": 90,
        "skin_tone_confidence": 95,
        "style_assessment_confidence": 80
    },
    "summary_text": "A rich 2-3 paragraph narrative that describes this person's unique physical attributes, natural coloring, body proportions, and the style aesthetic that would complement them best. Include specific fashion advice about cuts, silhouettes, patterns, and styling approaches that would enhance their natural features. Make it personal, detailed, and actionable - like advice from a personal stylist who truly understands them."
}

Return ONLY the JSON object, no markdown."""


# Prompt used to extract clothing metadata from a wardrobe item image
WARDROBE_ANALYSIS_PROMPT = """Analyze this clothing item image comprehensively. If multiple views are provided, combine information from all angles.

Return a JSON object with both structured data and a rich narrative description:
{
    "garment_type": "shirt/t-shirt/pants/jeans/shorts/dress/skirt/jacket/coat/suit/blazer/sweater/hoodie/saree/kurta/lehenga/salwar_kameez/dupatta/other",
    "category": "top/bottom/outerwear/full_body/accessory",
    "color": "primary color",
    "secondary_colors": ["color1", "color2"],
    "pattern": "solid/striped/checkered/floral/printed/geometric/abstract/other",
    "pattern_details": "detailed description of pattern if not solid",
    "material": "cotton/polyester/wool/silk/denim/leather/synthetic/linen/velvet/chiffon",
    "material_texture": "description of fabric texture and weight",
    "fit_type": "slim/regular/relaxed/oversized/fitted/tailored",
    "neckline": "if applicable: crew/v-neck/scoop/collar/turtleneck/off-shoulder",
    "sleeve_type": "if applicable: short/long/sleeveless/3-quarter/cap",
    "length": "description of garment length",
    "style": "casual/formal/business/sporty/elegant/bohemian/vintage/modern/classic",
    "style_vibe": "detailed aesthetic: minimalist/edgy/romantic/preppy/streetwear/boho/etc",
    "occasion": ["casual", "work", "formal", "party", "date_night", "wedding", "travel", "athleisure"],
    "season": ["spring", "summer", "fall", "winter", "all_season"],
    "weather_suitability": "hot/warm/cool/cold/layerable",
    "time_of_day": ["daytime", "evening", "night", "versatile"],
    "formality_level": "1-10 scale where 1=very casual, 10=very formal",
    "versatility_score": "1-10 scale of how many ways it can be styled",
    "statement_piece": "true/false - is this a bold focal point or a basic?",
    "color_pairing_suggestions": ["colors that pair well with this item"],
    "styling_suggestions": {
        "pairs_well_with": ["specific garment types that complement this"],
        "layering_options": ["how to layer with/under this"],
        "accessories": ["accessory recommendations"],
        "shoes": ["shoe style recommendations"],
        "avoid_pairing_with": ["what NOT to wear with this"]
    },
    "care_observations": "visible quality, condition, special care likely needed",
    "brand_style_indicators": "any visible luxury/quality markers",
    "description": "detailed 2-3 sentence description",
    "summary_text": "A rich 1-2 paragraph narrative describing this garment in detail. Include the visual appeal, how it might fit and flatter different body types, the versatility in styling, the mood/vibe it creates, specific occasions it shines for, seasonal appropriateness, and creative pairing ideas. Write as if you're a personal stylist explaining to a client why this piece is valuable in their wardrobe and how to maximize its potential. Be specific about styling scenarios."
}

Return ONLY the JSON object."""


# Prompt used to generate outfit recommendations from wardrobe items
RECOMMENDATION_PROMPT = """You are an expert fashion stylist. Create outfit recommendations.

USER PROFILE:
{user_profile}

USER REQUEST: "{query}"

WARDROBE ITEMS (with AI relevance scores):
{wardrobe_summary}

Note: Items have a "vector_relevance" score (0-1) showing how well they match the request semantically. 
Higher scores mean better match to the query. Consider this when creating outfits.

Create 3 complete outfit recommendations using items from the wardrobe.

Return a JSON object:
{{
    "query_understanding": "what the user wants",
    "occasion_detected": "casual/formal/business/party/wedding",
    "recommended_outfits": [
        {{
            "outfit_id": 1,
            "outfit_name": "creative name",
            "wardrobe_item_ids": [id1, id2],
            "items_description": "what each item is",
            "why_it_works": "why these work together (mention if using high-relevance items)",
            "styling_tips": ["tip1", "tip2"],
            "confidence_score": 0.85
        }}
    ],
    "style_notes": "overall advice"
}}

IMPORTANT: 
- Prioritize items with higher vector_relevance scores when possible
- Set confidence_score based on: outfit quality (60%) + average item relevance (40%)
- Order outfits by your confidence in them (best first)

Return ONLY the JSON object."""


# Prompt used for virtual try-on image generation
VIRTUAL_TRYON_PROMPT = """Create a photorealistic fashion image showing a person wearing: {outfit_name}

{profile_desc}

Outfit: {outfit_description}

Instructions:
1. Keep the person's face and identity from the reference
2. Show them wearing the described outfit
3. Full body view, clean background
4. Natural, well-fitted appearance

Generate the image now."""
