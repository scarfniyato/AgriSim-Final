"""
Layer 2: Recommendation Rules (Prescriptive Layer)

Purpose: Provide actionable management recommendations based on detected conditions.
These rules tell farmers WHAT to do to address problems or optimize crop performance.

Rule Structure (Lambda-based):
  - id: unique identifier (REC_<action>_<number>)
  - action_type: 'Irrigate' | 'Spray'
  - severity: 'None' | 'Low' | 'Moderate' | 'Severe' | 'Critical'
  - condition: lambda function that evaluates state
  - additional_condition: optional lambda for stage-specific or compound conditions
  - recommendation: WHAT to do (actionable advice)
  - basis: scientific reference or source
"""

LAYER2_RULES = [
    # ========================================================================
    # SECTION A: GENERIC IRRIGATION RECOMMENDATIONS (ALL CROPS)
    # ========================================================================
    {
        "id": "REC_IRR_01",
        "action_type": "Irrigate",
        "severity": "Critical",
        "condition": lambda state: state["f_water"] < 0.1,
        "additional_condition": None,
        "recommendation": "Apply irrigation immediately. Soil moisture is nearly depleted and crop growth has almost stopped. Immediate irrigation is required to prevent severe yield loss.",
        "basis": "Zhao et al. (2019) — fWater critical threshold (<0.1); DA RFO 02 Production Guides — irrigation management"
    },

    {
        "id": "REC_IRR_02",
        "action_type": "Irrigate",
        "severity": "Severe",
        "condition": lambda state: 0.1 <= state["f_water"] < 0.3,
        "additional_condition": lambda state: state["growth_stage"] == "flowering",
        "recommendation": "Apply irrigation immediately. Severe water stress during flowering carries a high risk of yield loss. Restoring soil moisture may help protect pollination and yield formation.",
        "basis": "Zhao et al. (2019) — fWater severe threshold; DA RFO 02 Production Guides — irrigation critical at reproductive stage"
    },

    {
        "id": "REC_IRR_03",
        "action_type": "Irrigate",
        "severity": "Severe",
        "condition": lambda state: 0.1 <= state["f_water"] < 0.3,
        "additional_condition": lambda state: state["growth_stage"] in ["vegetative", "seedling"],
        "recommendation": "Apply irrigation as soon as possible. Severe moisture deficit during vegetative growth significantly reduces biomass accumulation and yield potential.",
        "basis": "Zhao et al. (2019) — fWater severe threshold; DA RFO 02 Production Guides — soil moisture requirement"
    },

    {
        "id": "REC_IRR_04",
        "action_type": "Irrigate",
        "severity": "Moderate",
        "condition": lambda state: 0.3 <= state["f_water"] < 0.6,
        "additional_condition": lambda state: state["growth_stage"] == "flowering",
        "recommendation": "Apply supplemental irrigation. Moderate water stress at the flowering stage may reduce pollination success and yield formation.",
        "basis": "Zhao et al. (2019) — fWater moderate threshold; DA RFO 02 Production Guides — irrigation at reproductive stage"
    },

    {
        "id": "REC_IRR_05",
        "action_type": "Irrigate",
        "severity": "Moderate",
        "condition": lambda state: 0.3 <= state["f_water"] < 0.6,
        "additional_condition": lambda state: state["growth_stage"] in ["vegetative", "seedling"],
        "recommendation": "Apply supplemental irrigation to restore adequate soil moisture and maintain crop growth.",
        "basis": "Zhao et al. (2019) — fWater moderate threshold; DA RFO 02 Production Guides"
    },

    {
        "id": "REC_IRR_06",
        "action_type": "Irrigate",
        "severity": "Low",
        "condition": lambda state: 0.6 <= state["f_water"] < 0.8,
        "additional_condition": lambda state: state["growth_stage"] == "flowering",
        "recommendation": "Apply light irrigation. Even mild moisture stress at the flowering stage can affect pollination efficiency.",
        "basis": "Zhao et al. (2019) — fWater low stress threshold; DA RFO 02 Production Guides — irrigation at reproductive stage"
    },

    # ========================================================================
    # SECTION B: GENERIC PEST MANAGEMENT RECOMMENDATIONS (ALL CROPS)
    # ========================================================================
    {
        "id": "REC_PEST_01",
        "action_type": "Spray",
        "severity": "Critical",
        "condition": lambda state: state["f_pest"] <= 0.30,
        "additional_condition": lambda state: state.get("days_since_spray", 999) >= 14,
        "recommendation": "Apply pesticide immediately. Critical pest damage is occurring and yield loss risk is very high without intervention.",
        "basis": "Oerke (2006) — 70% yield loss under management failure; Savary et al. (2019); PhilGAP pest thresholds (FPA, 2022)"
    },

    {
        "id": "REC_PEST_02",
        "action_type": "Spray",
        "severity": "Severe",
        "condition": lambda state: 0.30 < state["f_pest"] <= 0.55,
        "additional_condition": lambda state: state.get("days_since_spray", 999) >= 7,
        "recommendation": "Apply pesticide now. Pest pressure has escalated due to lack of treatment and may cause substantial crop damage.",
        "basis": "Oerke (2006) — 35% yield loss at fPest 0.65; DA Production Guides — pest action thresholds"
    },

    {
        "id": "REC_PEST_03",
        "action_type": "Spray",
        "severity": "Moderate",
        "condition": lambda state: 0.55 < state["f_pest"] <= 0.75,
        "additional_condition": lambda state: state["growth_stage"] in ["seedling", "flowering"],
        "recommendation": "Apply pesticide. Moderate pest pressure at a sensitive growth stage may significantly affect crop establishment or reproduction.",
        "basis": "Oerke (2006) — 25% yield loss; DA Production Guides — cutworm/aphid at seedling; fruitworm/earworm at flowering"
    },

    {
        "id": "REC_PEST_04",
        "action_type": "Spray",
        "severity": "Moderate",
        "condition": lambda state: 0.55 < state["f_pest"] <= 0.75,
        "additional_condition": lambda state: state["growth_stage"] == "vegetative",
        "recommendation": "Apply pesticide to protect leaf area and biomass development during vegetative growth.",
        "basis": "Oerke (2006) — 25% yield loss; DA Corn Production Guide — armyworm, aphids during vegetative stage"
    },

    # ========================================================================
    # SECTION C: SWEET CORN-SPECIFIC RECOMMENDATIONS
    # ========================================================================
    {
        "id": "REC_CORN_IRR_01",
        "action_type": "Irrigate",
        "severity": "Severe",
        "condition": lambda state: state.get("crop_name", "") == "Sweet Corn" and state["f_water"] < 0.6,
        "additional_condition": lambda state: state["growth_stage"] == "flowering",
        "recommendation": "Apply irrigation immediately. Tasseling and silking are the most water-sensitive stages for sweet corn. Water stress may reduce pollination and ear development.",
        "basis": "DA RFO 02 Corn Production Guide — 'Irrigation is important during the reproductive stage to ensure flower and silk synchronization, pollination and ear development. Irrigation may be applied through flushing or overhead method.'"
    },

    {
        "id": "REC_CORN_IRR_02",
        "action_type": "Irrigate",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Sweet Corn" and 0.6 <= state["f_water"] < 0.8,
        "additional_condition": lambda state: state["growth_stage"] == "flowering",
        "recommendation": "Apply supplemental irrigation to maintain adequate soil moisture during tasseling and silking.",
        "basis": "DA RFO 02 Corn Production Guide — irrigation management during reproductive stage"
    },

    {
        "id": "REC_CORN_IRR_03",
        "action_type": "Irrigate",
        "severity": "Severe",
        "condition": lambda state: state.get("crop_name", "") == "Sweet Corn" and state["f_water"] < 0.6,
        "additional_condition": lambda state: state.get("dap", 0) <= 30,
        "recommendation": "Apply irrigation immediately. Early water deficit limits root establishment and reduces yield potential.",
        "basis": "DA RFO 02 Corn Production Guide — 'Soil moisture is a major requirement to high corn production'; optimum rainfall 400–600 mm distributed throughout the growing period"
    },

    {
        "id": "REC_CORN_PEST_01",
        "action_type": "Spray",
        "severity": "Severe",
        "condition": lambda state: state.get("crop_name", "") == "Sweet Corn" and 0.30 < state["f_pest"] <= 0.55,
        "additional_condition": lambda state: state["growth_stage"] == "flowering" and state.get("days_since_spray", 0) >= 7,
        "recommendation": "Apply pesticide immediately. Corn borer and earworm damage during flowering directly affects pollination and ear formation.",
        "basis": "DA RFO 02 Corn Production Guide — corn borer: 'partial destruction of cobs', 'dropping of ears in severe cases'; earworm: 'cut silk and hole at opening of ears from silking to soft dough stage'"
    },

    {
        "id": "REC_CORN_PEST_02",
        "action_type": "Spray",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Sweet Corn" and state["f_pest"] == 0.75,
        "additional_condition": lambda state: state["growth_stage"] == "vegetative",
        "recommendation": "Apply pesticide. Armyworms and aphids may reduce leaf area and crop vigor.",
        "basis": "DA RFO 02 Corn Production Guide — armyworm: 'In serious cases, whole plants are stripped bare leaving only the midrib'; aphids: 'stunted growth due to removal of plant sap'"
    },

    {
        "id": "REC_CORN_PEST_03",
        "action_type": "Spray",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Sweet Corn" and state["f_pest"] == 0.75,
        "additional_condition": lambda state: state["growth_stage"] == "seedling",
        "recommendation": "Apply pesticide. Cutworm or field cricket infestations may damage young corn seedlings.",
        "basis": "DA RFO 02 Corn Production Guide — field cricket: 'Corn seedlings totally cut along the soil surface'; cutworm: 'young plants completely defoliated'"
    },

    # ========================================================================
    # SECTION D: TOMATO-SPECIFIC RECOMMENDATIONS
    # ========================================================================
    {
        "id": "REC_TOMATO_IRR_01",
        "action_type": "Irrigate",
        "severity": "Severe",
        "condition": lambda state: state.get("crop_name", "") == "Tomato" and state["f_water"] < 0.6,
        "additional_condition": lambda state: state["growth_stage"] == "flowering",
        "recommendation": "Apply irrigation immediately. Severe water deficit during flowering increases the risk of flower drop and poor fruit set.",
        "basis": "DA RFO 02 Tomato Production Guide (2017) — 'Water or irrigate the plants just to moisten the root zone especially during the onset of flowering up to the last harvest.'"
    },

    {
        "id": "REC_TOMATO_IRR_02",
        "action_type": "Irrigate",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Tomato" and 0.6 <= state["f_water"] < 0.8,
        "additional_condition": lambda state: state["growth_stage"] == "flowering",
        "recommendation": "Apply supplemental irrigation. Tomatoes are sensitive to moisture fluctuations during flowering.",
        "basis": "DA RFO 02 Tomato Production Guide (2017) — irrigation at onset of flowering through last harvest"
    },

    {
        "id": "REC_TOMATO_PEST_01",
        "action_type": "Spray",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Tomato" and state["f_pest"] == 0.75,
        "additional_condition": lambda state: state["growth_stage"] in ["flowering", "seedling"],
        "recommendation": "Apply pest control when necessary to manage thrips, whiteflies, aphids, leaf miners, cutworms, and fruitworms.",
        "basis": "DA RFO 02 Tomato Production Guide (2017) — 'Common pests of tomato are thrips, whiteflies, melon fly, leaf miner, aphids, cutworm and fruitworm.'"
    },

    {
        "id": "REC_TOMATO_PEST_02",
        "action_type": "Spray",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Tomato" and state["f_pest"] == 0.75,
        "additional_condition": lambda state: state["growth_stage"] == "vegetative",
        "recommendation": "Apply pesticide. Aphids, leaf miners, and whiteflies may reduce leaf area and plant vigor.",
        "basis": "DA RFO 02 Tomato Production Guide (2017) — pest management guidelines; PhilGAP (FPA, 2022)"
    },

    # ========================================================================
    # SECTION E: CARROT-SPECIFIC RECOMMENDATIONS
    # ========================================================================
    {
        "id": "REC_CARROT_IRR_01",
        "action_type": "Irrigate",
        "severity": "Severe",
        "condition": lambda state: state.get("crop_name", "") == "Carrot" and state["f_water"] < 0.6,
        "additional_condition": lambda state: state.get("dap", 0) <= 30,
        "recommendation": "Apply irrigation immediately. Early moisture deficit increases the risk of root cracking, forking, and poor root formation.",
        "basis": "DA RFO 02 Carrot Production Guide (2017) — 'Carrot needs a lot of moisture during the first 30 days of growth. Irregular watering leads to cracking and forking.'"
    },

    {
        "id": "REC_CARROT_IRR_02",
        "action_type": "Irrigate",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Carrot" and 0.6 <= state["f_water"] < 0.8,
        "additional_condition": lambda state: state.get("dap", 0) <= 30,
        "recommendation": "Apply supplemental irrigation to maintain consistent soil moisture during early root development.",
        "basis": "DA RFO 02 Carrot Production Guide (2017) — moisture requirement during first 30 days"
    },

    {
        "id": "REC_CARROT_IRR_03",
        "action_type": "Irrigate",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Carrot" and state["f_water"] < 0.6,
        "additional_condition": lambda state: state["growth_stage"] == "flowering",
        "recommendation": "Apply supplemental irrigation. Water stress during root enlargement may reduce root size and marketable yield.",
        "basis": "DA RFO 02 Carrot Production Guide (2017) — irrigation management during root development"
    },

    {
        "id": "REC_CARROT_PEST_01",
        "action_type": "Spray",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Carrot" and state["f_pest"] == 0.75,
        "additional_condition": lambda state: state["growth_stage"] in ["seedling", "vegetative"],
        "recommendation": "Apply pest control to manage aphids, cutworms, and leaf-feeding insects affecting carrot crops.",
        "basis": "DA Carrot Production Guide — common pests: aphids, cutworms, leaf miners, leaf-feeding insects"
    },
]

