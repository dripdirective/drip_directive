"""
Centralized prompts used by the AI service.

Keeping prompts out of the core service code makes it easier to tweak wording,
swap providers/models, and manage prompt versions.
"""

# Prompt used to extract user profile signals from one or more user images
USER_PROFILE_PROMPT = """You are an expert fashion stylist AI. Analyze the user image(s) provided and extract comprehensive fashion profile information.

PREVIOUS PROFILE CONTEXT:
{previous_profile_context}

TASK: Return a JSON object with both structured data and a summary as a list of bullet points.

INSTRUCTIONS:
1. If "PREVIOUS PROFILE CONTEXT" is provided, use it as a baseline.
2. Only update fields (like Body Type, Skin Tone) if the NEW images provide CLEAR, stronger evidence to the contrary.
3. If the new images show a different style, ADD it to the valid styles rather than replacing the old ones (unless the old ones were clearly wrong).
4. Maintain consistency in core attributes (Body Shape, Skin Tone).
5. Refine the style assessment by merging insights from both old and new images.

FORMAT REQUIREMENTS:
- Return ONLY valid JSON.
- Do NOT output markdown code blocks (no ```json).
- Do NOT output any conversational text.

JSON SCHEMA:
{
    "physical_attributes": {
        "body_type": "slim/athletic/average/curvy/plus_size",
        "shoulder_type": "broad/average/narrow/sloping",
        "vertical_proportions": "short_torso/balanced/long_torso/long_legs/short_legs",
        "waist_type": "defined/straight/soft",
        "body_shape_details": "detailed description of proportions, height perception, frame",
        "skin_tone": "fair/light/medium/olive/tan/dark/deep",
        "skin_undertone": "warm/cool/neutral",
        "contrast_level": "high/medium/low",
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
        "observed_fit_preference": "tight/fitted/regular/loose/oversized",
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
    "summary_points": ["First point describing physical attributes...", "Second point about style...", "Third point with advice..."]
}"""


# Prompt used to extract clothing metadata from a wardrobe item image
# Prompt used to extract clothing metadata from a wardrobe item image (GENERAL)
WARDROBE_ANALYSIS_PROMPT_GENERAL = """You are an expert fashion stylist AI. Analyze this clothing item image comprehensively. If multiple views are provided, combine information from all angles.
 
TASK: Return a JSON object with both structured data and a detailed summary as a list of points.

GUARDRAIL CHECK: First, determine if the image contains a valid fashion usage.
- If the image is NOT a clothing item (e.g., random object, landscape, blurry, person without clear clothes focus), set "is_fashion_item" to false and provide a reason.
- If valid, set "is_fashion_item" to true and populate all fields.

FORMAT REQUIREMENTS:
- Return ONLY valid JSON.
- Do NOT output markdown code blocks (no ```json).
- Do NOT output any conversational text.

JSON SCHEMA:
{
    "is_fashion_item": true,
    "refusal_reason": null,
    "garment_type": "shirt/t-shirt/pants/jeans/shorts/dress/skirt/jacket/coat/suit/blazer/sweater/hoodie/saree/kurta/lehenga/salwar_kameez/dupatta/other",
    "category": "top/bottom/outerwear/full_body/accessory",
    "color": "primary color",
    "secondary_colors": ["color1", "color2"],
    "pattern": "solid/striped/checkered/floral/printed/geometric/abstract/other",
    "pattern_details": "detailed description of pattern if not solid",
    "material": "cotton/polyester/wool/silk/denim/leather/synthetic/linen/velvet/chiffon",
    "material_texture": "description of fabric texture and weight",
    "fit_type": "skinny/slim/regular/relaxed/oversized/fitted/tailored",
    "neckline": "if applicable: crew/v-neck/scoop/collar/turtleneck/off-shoulder",
    "sleeve_type": "if applicable: short/long/sleeveless/3-quarter/cap",
    "length": "description of garment length",
    "style": "casual/formal/business/sporty/elegant/bohemian/vintage/modern/classic",
    "style_vibe": "detailed aesthetic: minimalist/edgy/romantic/preppy/streetwear/boho/etc",
    "occasion": ["casual", "work", "formal", "party", "date_night", "wedding", "travel", "athleisure"],
    "season": ["spring", "summer", "fall", "winter", "all_season"],
    "weather_suitability": "hot/warm/cool/cold/layerable",
    "time_of_day": ["daytime", "evening", "night", "versatile"],
    "formality_level": 1,
    "versatility_score": 1,
    "statement_piece": false,
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
    "summary_text": "short summary paragraph (2-4 sentences)",
    "summary_points": ["Point 1: Visual appeal and fit...", "Point 2: Versatility and styling...", "Point 3: Occasions and seasons..."]
}"""


# Prompt used to extract clothing metadata from a wardrobe item image (MALE)
WARDROBE_ANALYSIS_PROMPT_MALE = """You are an expert fashion stylist AI specializing in Men's Fashion. Analyze this clothing item image comprehensively.

TASK: Return a JSON object with both structured data and a detailed summary as a list of points.

GUARDRAIL CHECK: First, determine if the image contains a valid fashion usage.
- If the image is NOT a clothing item (e.g., random object, landscape, blurry, person without clear clothes focus), set "is_fashion_item" to false and provide a reason.
- If valid, set "is_fashion_item" to true and populate all fields.

FORMAT REQUIREMENTS:
- Return ONLY valid JSON.
- Do NOT output markdown code blocks.

JSON SCHEMA:
{
    "is_fashion_item": true,
    "refusal_reason": null,
    "garment_type": "shirt/t-shirt/polo/pants/jeans/shorts/chinos/joggers/suit/blazer/tuxedo/sweater/hoodie/jacket/coat/sherwani/kurta/pyjama/dhoti/vest/other",
    "category": "top/bottom/outerwear/full_body/accessory/footwear",
    "color": "primary color",
    "secondary_colors": ["color1", "color2"],
    "pattern": "solid/striped/checkered/plaid/houndstooth/pinstripe/camo/graphic/abstract/other",
    "pattern_details": "detailed description of pattern",
    "material": "cotton/wool/linen/polyester/denim/leather/suede/corduroy/fleece/silk/synthetic",
    "material_texture": "description of fabric texture",
    "fit_type": "slim/regular/relaxed/loose/oversized/tailored/muscle_fit/skinny",
    "collar_type": "crew/v-neck/polo/button-down/spread/mandarin/camp/notch_lapel/peak_lapel/shawl_lapel/hooded",
    "sleeve_type": "short/long/sleeveless/raglan",
    "length": "short/long/cropped/ankle_length/full_length",
    "closure_type": "button/zip/drawstring/elastic/none",
    "style": "casual/business_casual/formal/streetwear/athleisure/rugged/preppy/avant_garde/classic/minimalist",
    "style_vibe": "aesthetic description",
    "occasion": ["casual", "work", "formal", "party", "date_night", "wedding", "gym", "travel", "loungewear"],
    "season": ["spring", "summer", "fall", "winter", "all_season"],
    "formality_level": 1,
    "versatility_score": 1,
    "statement_piece": false,
    "color_pairing_suggestions": ["colors"],
    "styling_suggestions": {
        "pairs_well_with": ["specific items like chinos, denim, blazer"],
        "layering_options": ["layering ideas"],
        "accessories": ["watch, belt, hat, sunglasses, ties, pocket_squares"],
        "shoes": ["sneakers, loafers, oxfords, boots, sandals, slides"],
        "avoid_pairing_with": ["what to avoid"]
    },
    "care_observations": "quality notes",
    "brand_style_indicators": "markers",
    "description": "detailed description",
    "summary_text": "short summary paragraph (2-4 sentences)",
    "summary_points": ["Point 1: Fit and fabric quality...", "Point 2: Masculine silhouette details...", "Point 3: Specific styling combination..."]
}"""


# Prompt used to extract clothing metadata from a wardrobe item image (FEMALE)
WARDROBE_ANALYSIS_PROMPT_FEMALE = """You are an expert fashion stylist AI specializing in Women's Fashion. Analyze this clothing item image comprehensively.

TASK: Return a JSON object with both structured data and a detailed summary as a list of points.

GUARDRAIL CHECK: First, determine if the image contains a valid fashion usage.
- If the image is NOT a clothing item (e.g., random object, landscape, blurry, person without clear clothes focus), set "is_fashion_item" to false and provide a reason.
- If valid, set "is_fashion_item" to true and populate all fields.

FORMAT REQUIREMENTS:
- Return ONLY valid JSON.
- Do NOT output markdown code blocks.

JSON SCHEMA:
{
    "is_fashion_item": true,
    "refusal_reason": null,
    "garment_type": "top/blouse/t-shirt/camisole/crop_top/shirt/pants/jeans/skirt/shorts/leggings/dress/gown/jumpsuit/romper/blazer/jacket/coat/cardigan/sweater/saree/lehenga/kurti/salwar_kameez/dupatta/other",
    "category": "top/bottom/outerwear/full_body/accessory/footwear",
    "color": "primary color",
    "secondary_colors": ["color1", "color2"],
    "pattern": "solid/floral/striped/polka_dot/animal_print/geometric/abstract/plaid/checkered/paisley/tie_dye",
    "pattern_details": "detailed description",
    "material": "cotton/silk/chiffon/georgette/satin/velvet/lace/denim/leather/wool/linen/rayon/polyester/sequin",
    "material_texture": "description of texture, sheer/opaque, drape",
    "fit_type": "bodycon/fitted/regular/relaxed/loose/oversized/a-line/fit_and_flare/wrap/Empire_waist",
    "neckline": "v-neck/round/square/sweetheart/halter/off-shoulder/boat/cowl/high_neck/collared/plunge/strapless/one_shoulder",
    "sleeve_type": "sleeveless/cap/short/elbow/3-quarter/long/bell/puff/bishop/kimono/lantern",
    "length": "mini/midi/maxi/floor_length/ankle/cropped/full_length",
    "waist_rise": "high_rise/mid_rise/low_rise/not_applicable",
    "style": "casual/chic/bohemian/elegant/business/streetwear/romantic/vintage/minimalist/glamorous/preppy",
    "style_vibe": "aesthetic description",
    "occasion": ["casual", "work", "formal", "party", "date_night", "wedding", "vacation", "festival", "loungewear"],
    "season": ["spring", "summer", "fall", "winter", "all_season"],
    "formality_level": 1,
    "versatility_score": 1,
    "statement_piece": false,
    "color_pairing_suggestions": ["colors"],
    "styling_suggestions": {
        "pairs_well_with": ["complementary items"],
        "layering_options": ["layering ideas"],
        "accessories": ["jewelry (earrings, necklaces), bags, belts, scarves, hair_accessories"],
        "shoes": ["heels, flats, boots, sneakers, sandals, wedges"],
        "avoid_pairing_with": ["what to avoid"]
    },
    "care_observations": "quality notes",
    "brand_style_indicators": "markers",
    "description": "detailed description",
    "summary_text": "short summary paragraph (2-4 sentences)",
    "summary_points": ["Point 1: Silhouette and drape...", "Point 2: Flattery and figure...", "Point 3: Specific styling combination..."]
}"""


# Prompt used to generate outfit recommendations from wardrobe items
RECOMMENDATION_PROMPT = """You are an expert personal stylist. Create highly personalized outfit recommendations based on the user's profile, request, and available wardrobe.

USER PROFILE:
{user_profile}

USER REQUEST: "{query}"

WARDROBE ITEMS (with AI relevance scores):
{wardrobe_summary}

Note: "vector_relevance" (0-1) indicates semantic match to the request.

INSTRUCTIONS:
1.  **Analyze the Request**: specific occasion? specific mood? specific weather?
2.  **Apply Personalization**:
    *   **Body Flattery**: Use the user's `body_type`, `shoulder_type`, `vertical_proportions` etc. to select items that balance their silhouette.
        *   *Example*: Provide V-necks for broad shoulders, high-waisted bottoms for long torsos.
    *   **Color Theory**: Use `skin_tone`, `undertone`, and `contrast_level`. Suggest colors that enhance their complexion.
    *   **Style Match**: Ensure the outfit respects their `style_personality` and `observed_fit_preference`.
    *   **Life Context**: Factor in **Age**, **Occupation**, and **Marital Status**. E.g., corporate professionals need workplace-appropriate looks; younger users might prefer trends. Adjust formality and modesty based on their life stage.
3.  **Complete the Look**:
*   Select 1-4 items that form a coherent outfit. If you cannot complete a full outfit (e.g., only a top is available), still return a useful partial outfit using what exists.
*   If key pieces are missing (e.g., gym bottoms, shoes, accessories), explicitly list them in `missing_items` so the user knows what to buy/add.
4.  **Prioritize Relevance**: Use high-relevance items if they fit the style rules, but do not force mismatches.

TASK: Create up to 3 distinct outfit options. One safest match, one creative/bold match, and one alternative interpretation.
If the wardrobe cannot support 3 outfits, return fewer outfits rather than inventing items.

Return a JSON object:
{{
    "query_understanding": "concise interpretation of what the user wants",
    "occasion_detected": "detected occasion",
    "predicted_weather": "inferred weather context if any",
    "recommended_outfits": [
        {{
            "outfit_id": 1,
            "outfit_name": "Reviewable Name (e.g., 'The Smart Casual Friday')",
            "wardrobe_item_ids": [id1, id2, id3],
            "items_description": "Brief list of items used (e.g., 'Navy Blazer + White Tee + Chinos')",
            "style_reasoning": "Explain WHY this works for THIS specific user. Mention body type flattery and color compatibility.",
            "missing_items": ["white sneakers", "silver watch"],
            "styling_tips": ["Tuck in the shirt to highlight waist", "Roll sleeves for casual vibe"],
            "occasion_suitability": 9,
            "confidence_score": 0.9
        }}
    ],
    "style_notes": "General advice for this request"
}}

Return ONLY valid JSON. Do not output markdown code blocks."""


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
