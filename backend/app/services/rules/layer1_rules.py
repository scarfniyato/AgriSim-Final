"""
Layer 1: Explanation Rules (Diagnostic Layer)

Purpose: Explain WHY crop growth has changed based on observed stress factors.
These rules interpret the current state and provide causal explanations.

Rule Structure (Lambda-based):
  - id: unique identifier (EXP_<category>_<number>)
  - severity: 'None' | 'Low' | 'Moderate' | 'Severe' | 'Critical'
  - condition: lambda function that evaluates state
  - additional_condition: optional lambda for stage-specific or compound conditions
  - conclusion: WHY this is happening (causal explanation)
  - basis: scientific reference or source
"""

LAYER1_RULES = [
    # ========================================================================
    # SECTION A: TEMPERATURE STRESS (fTemp)
    # ========================================================================
    {
        "id": "EXP_TEMP_01",
        "severity": "None",
        "condition": lambda state: state["f_temp"] == 1.0,
        "additional_condition": None,
        "conclusion": "Temperature is optimal. Crop growth is occuring at full thermal efficiency.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_TEMP_02",
        "severity": "Low",
        "condition": lambda state: 0.7 <= state["f_temp"] < 1.0,
        "additional_condition": None,
        "conclusion": "Temperature is slightly outside optimal range. Crop growth is mildly reduced.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_TEMP_03",
        "severity": "Moderate",
        "condition": lambda state: 0.3 <= state["f_temp"] < 0.7,
        "additional_condition": None,
        "conclusion": "Temperature stress detected. Crop growth is moderately reduced.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_TEMP_04",
        "severity": "Severe",
        "condition": lambda state: 0.0 < state["f_temp"] < 0.3,
        "additional_condition": None,
        "conclusion": "Temperature is near the developmental limit. Crop growth is severely reduced.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_TEMP_05",
        "severity": "Critical",
        "condition": lambda state: state["f_temp"] == 0.0,
        "additional_condition": None,
        "conclusion": "Temperature is at or below the base threshold. Crop development has stopped.",
        "basis": "Zhao et al. (2019)"
    },

    # ========================================================================
    # SECTION B: HEAT STRESS (fHeat)
    # ========================================================================
    {
        "id": "EXP_HEAT_01",
        "severity": "None",
        "condition": lambda state: state["f_heat"] == 1.0,
        "additional_condition": None,
        "conclusion": "No heat stress detected. Maximum temperature is within safe limits.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_HEAT_02",
        "severity": "Low",
        "condition": lambda state: 0.6 <= state["f_heat"] < 1.0,
        "additional_condition": None,
        "conclusion": "Mild heat stress detected. Maximum temperature slightly exceeds the safe threshold.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_HEAT_03",
        "severity": "Moderate",
        "condition": lambda state: 0.3 <= state["f_heat"] < 0.6,
        "additional_condition": None,
        "conclusion": "Moderate heat stress detected. High temperatures are reducing crop growth efficiency.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_HEAT_04",
        "severity": "Severe",
        "condition": lambda state: 0.0 < state["f_heat"] < 0.3,
        "additional_condition": None,
        "conclusion": "Severe heat stress detected. Crop growth is strongly limited.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_HEAT_05",
        "severity": "Critical",
        "condition": lambda state: state["f_heat"] == 0.0,
        "additional_condition": None,
        "conclusion": "Extreme heat stress detected. Crop development has stopped.",
        "basis": "Zhao et al. (2019)"
    },

    # ========================================================================
    # SECTION C: WATER STRESS (fWater)
    # ========================================================================
    {
        "id": "EXP_WATER_01",
        "severity": "None",
        "condition": lambda state: 0.8 <= state["f_water"] <= 1.0,
        "additional_condition": None,
        "conclusion": "Soil moisture is adequate. No water stress detected.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_WATER_02",
        "severity": "Low",
        "condition": lambda state: 0.6 <= state["f_water"] < 0.8,
        "additional_condition": None,
        "conclusion": "Mild water stress detected. Crop growth is slightly reduced.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_WATER_03",
        "severity": "Moderate",
        "condition": lambda state: 0.3 <= state["f_water"] < 0.6,
        "additional_condition": None,
        "conclusion": "Moderate water stress detected. Crop growth rate is noticeably reduced.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_WATER_04",
        "severity": "Severe",
        "condition": lambda state: 0.1 <= state["f_water"] < 0.3,
        "additional_condition": None,
        "conclusion": "Severe water stress detected. Crop growth is strongly limited.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_WATER_05",
        "severity": "Critical",
        "condition": lambda state: state["f_water"] < 0.1,
        "additional_condition": None,
        "conclusion": "Critical water stress. Soil moisture is nearly depleted and crop growth has almost stopped.",
        "basis": "Zhao et al. (2019)"
    },

    # ========================================================================
    # SECTION D: CO2 EFFECT (fCO2)
    # ========================================================================
    {
        "id": "EXP_CO2_01",
        "severity": "None",
        "condition": lambda state: state["f_co2"] == 1.0,
        "additional_condition": None,
        "conclusion": "Atmospheric CO2 is at baseline level. No enhancement to radiation use efficiency.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_CO2_02",
        "severity": "None",
        "condition": lambda state: state["f_co2"] > 1.0,
        "additional_condition": None,
        "conclusion": "Elevated CO2 enhances radiation use efficiency and biomass accumulation potential.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_CO2_03",
        "severity": "None",
        "condition": lambda state: state.get("co2_ppm", 0) >= 700,
        "additional_condition": None,
        "conclusion": "CO2 enhancement has reached saturation. Additional CO2 produces little further growth increase.",
        "basis": "Zhao et al. (2019)"
    },

    # ========================================================================
    # SECTION E: SOLAR RADIATION AND CANOPY INTERCEPTION (fSolar)
    # ========================================================================
    {
        "id": "EXP_SOLAR_01",
        "severity": "None",
        "condition": lambda state: state.get("cumulative_gdd", 0) < state.get("t_sum", 1) - state.get("i50b", 0),
        "additional_condition": None,
        "conclusion": "The canopy is expanding and radiation interception is increasing as leaf area develops.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_SOLAR_02",
        "severity": "None",
        "condition": lambda state: state["f_solar"] >= 0.90,
        "additional_condition": lambda state: state.get("i50a", 0) <= state.get("cumulative_gdd", 0) < state.get("t_sum", 1) - state.get("i50b", 0),
        "conclusion": "Canopy is at peak radiation interception. The crop is capturing near-maximum solar radiation.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_SOLAR_03",
        "severity": "None",
        "condition": lambda state: state.get("cumulative_gdd", 0) >= state.get("t_sum", 1) - state.get("i50b", 0),
        "additional_condition": None,
        "conclusion": "Canopy senescence has begun. This is normal near crop maturity.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_SOLAR_04",
        "severity": "Severe",
        "condition": lambda state: state.get("cumulative_gdd", 0) >= state.get("t_sum", 1) - state.get("i50b", 0),
        "additional_condition": lambda state: state["f_heat"] < 1.0 or state["f_water"] < 0.6,
        "conclusion": "Premature canopy senescence detected due to stress. Reduced radiation interception may lower final yield.",
        "basis": "Zhao et al. (2019)"
    },

    {
        "id": "EXP_SOLAR_05",
        "severity": "Severe",
        "condition": lambda state: state.get("cumulative_gdd", 0) < state.get("t_sum", 1) - state.get("i50b", 0),
        "additional_condition": lambda state: state["f_heat"] < 1.0 or state["f_water"] < 0.6,
        "conclusion": "Stress is accelerating canopy senescence, reducing radiation interception.",
        "basis": "Zhao et al. (2019)"
    },

    # ========================================================================
    # SECTION F: NUTRIENT STATUS (application_ratio)
    # ========================================================================
    {
        "id": "EXP_NUTR_01",
        "severity": "None",
        "condition": lambda state: state.get("application_ratio", 0) == 1.0,
        "additional_condition": None,
        "conclusion": "Fertilizer was applied at the recommended rate. Nutrient availability is optimal and does not limit crop growth.",
        "basis": "Van Gaelen et al. (2015) — Optimal category: 0% biomass reduction; DA RFO 02 Production Guide recommended rate"
    },

    {
        "id": "EXP_NUTR_02",
        "severity": "Moderate",
        "condition": lambda state: state.get("application_ratio", 0) == 0.5,
        "additional_condition": None,
        "conclusion": "Fertilizer was applied below the recommended rate. Moderate nutrient stress is reducing crop growth.",
        "basis": "Van Gaelen et al. (2015) — Moderate category: 25–40% biomass reduction; DA RFO 02 Production Guide"
    },

    {
        "id": "EXP_NUTR_03",
        "severity": "Severe",
        "condition": lambda state: state.get("application_ratio", 0) == 0.0,
        "additional_condition": None,
        "conclusion": "No fertilizer was applied. Severe nutrient deficiency is strongly limiting crop growth and yield.",
        "basis": "Van Gaelen et al. (2015) — Poor category: 50–70% biomass reduction; DA RFO 02 Production Guide"
    },

    {
        "id": "EXP_NUTR_04",
        "severity": "None",
        "condition": lambda state: state.get("application_ratio", 0) == 1.5,
        "additional_condition": None,
        "conclusion": "Fertilizer exceeds the recommended rate. Nutrient efficiency declines and growth benefits are reduced.",
        "basis": "Van Gaelen et al. (2015) — Near Optimal category: 10–15% biomass reduction; over-application penalty: Sweet Corn 22%, Tomato 17%, Carrot 20% per empirical literature"
    },

    # ========================================================================
    # SECTION G: PEST PRESSURE (fPest)
    # ========================================================================
    {
        "id": "EXP_PEST_01",
        "severity": "None",
        "condition": lambda state: state["f_pest"] == 1.0,
        "additional_condition": None,
        "conclusion": "No pest pressure detected. Crop growth is not limited by pest damage.",
        "basis": "Oerke (2006); Savary et al. (2019)"
    },

    {
        "id": "EXP_PEST_02",
        "severity": "Low",
        "condition": lambda state: state["f_pest"] == 0.92,
        "additional_condition": lambda state: state.get("days_since_spray", 0) < 10,
        "conclusion": "Minor pest presence. Negligible growth impact. Monitor closely.",
        "basis": "Oerke (2006) — 8% yield loss estimate"
    },

    {
        "id": "EXP_PEST_03",
        "severity": "Low",
        "condition": lambda state: state["f_pest"] == 0.90,
        "additional_condition": lambda state: state.get("days_since_spray", 0) < 10,
        "conclusion": "Pesticide application has reduced pest pressure. Some residual crop damage from prior pest activity remains. Continue monitoring after the protection window expires.",
        "basis": "AgriSim post-spray residual state; PhilGAP 7–14 day protection window (FPA, 2022)"
    },

    {
        "id": "EXP_PEST_04",
        "severity": "Moderate",
        "condition": lambda state: state["f_pest"] == 0.75,
        "additional_condition": lambda state: state["growth_stage"] in ["seedling", "flowering", "reproductive"],
        "conclusion": "Moderate pest pressure detected at a high-susceptibility growth stage. Widespread pest activity is causing measurable growth reduction.",
        "basis": "Oerke (2006); Savary et al. (2019) — 25% yield loss; DA Production Guides — Seedling: cutworms/aphids; Flowering: fruitworm"
    },

    {
        "id": "EXP_PEST_05",
        "severity": "Moderate",
        "condition": lambda state: state["f_pest"] == 0.75,
        "additional_condition": lambda state: state["growth_stage"] == "vegetative",
        "conclusion": "Moderate pest pressure detected during vegetative growth. Leaf-feeding insects are causing growth reduction.",
        "basis": "Oerke (2006) — 25% yield loss; DA Corn Production Guide — armyworm, aphids during vegetative stage"
    },

    {
        "id": "EXP_PEST_06",
        "severity": "Severe",
        "condition": lambda state: state["f_pest"] == 0.55,
        "additional_condition": lambda state: state.get("days_since_spray", 0) >= 7,
        "conclusion": "Pest pressure has escalated due to lack of management. Crop damage is significant and yield loss is likely.",
        "basis": "Oerke (2006) — 45% yield loss at 0.55; DA Production Guide pest thresholds"
    },

    {
        "id": "EXP_PEST_07",
        "severity": "Critical",
        "condition": lambda state: state["f_pest"] == 0.30,
        "additional_condition": lambda state: state.get("days_since_spray", 0) >= 14,
        "conclusion": "Critical pest damage detected. Pest management has failed and severe yield loss is occurring.",
        "basis": "Oerke (2006) — 70% yield loss under management failure; Savary et al. (2019)"
    },

    # ========================================================================
    # SECTION H: GROWTH STAGE
    # ========================================================================
    {
        "id": "EXP_STAGE_01",
        "severity": "None",
        "condition": lambda state: state.get("cumulative_gdd", 0) < state.get("i50a", 0),
        "additional_condition": None,
        "conclusion": "Crop is in the seedling stage. Canopy is developing and radiation interception is increasing.",
        "basis": "Crop Growth Cycle"
    },

    {
        "id": "EXP_STAGE_02",
        "severity": "None",
        "condition": lambda state: state.get("i50a", 0) <= state.get("cumulative_gdd", 0) < state.get("t_sum", 1) - state.get("i50b", 0),
        "additional_condition": None,
        "conclusion": "Crop is in the vegetative stage. Leaf area is near maximum and biomass accumulation is rapid.",
        "basis": "Crop Growth Cycle"
    },

    {
        "id": "EXP_STAGE_03",
        "severity": "None",
        "condition": lambda state: state.get("t_sum", 1) - state.get("i50b", 0) <= state.get("cumulative_gdd", 0) < state.get("t_sum", 1),
        "additional_condition": None,
        "conclusion": "Crop is in the reproductive stage. Resources are being allocated to flowering and yield formation.",
        "basis": "Crop Growth Cycle"
    },

    {
        "id": "EXP_STAGE_04",
        "severity": "None",
        "condition": lambda state: state.get("cumulative_gdd", 0) >= state.get("t_sum", 1),
        "additional_condition": None,
        "conclusion": "Crop has reached physiological maturity and harvest stage reached.",
        "basis": "Crop Growth Cycle"
    },

    # ========================================================================
    # SECTION I: SWEET CORN-SPECIFIC RULES
    # ========================================================================
    {
        "id": "EXP_SCORN_TEMP_01",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Sweet Corn" and state["f_temp"] < 1.0,
        "additional_condition": lambda state: state.get("t_avg", 20) < 10 or state.get("t_avg", 20) > 35,
        "conclusion": "Temperature is outside sweet corn's favorable range. Very low or very high temperatures reduce germination, growth efficiency, and ear development.",
        "basis": "Zhao et al. (2019) — fTemp stress factor; DA RFO 02 Corn Production Guide — planting season calendar implying 20–30°C productive window"
    },

    {
        "id": "EXP_SCORN_TEMP_02",
        "severity": "Severe",
        "condition": lambda state: state.get("crop_name", "") == "Sweet Corn" and state["f_heat"] < 1.0,
        "additional_condition": lambda state: state.get("t_avg", 20) > 35 and state["growth_stage"] in ["flowering", "reproductive"],
        "conclusion": "Extreme heat during flowering disrupts pollen viability and silk receptivity, increasing the risk of poor ear set and yield loss.",
        "basis": "Zhao et al. (2019) — fHeat stress factor; DA RFO 02 Corn Production Guide — 'Drying of tassels, poor pollination and unfilled ears' listed as effect of heat stress"
    },

    {
        "id": "EXP_SCORN_WATER_FLOWER_01",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Sweet Corn" and state["growth_stage"] in ["flowering", "reproductive"],
        "additional_condition": lambda state: 0.6 <= state["f_water"] < 0.8,
        "conclusion": "Moderate water stress detected during flowering. Sweet corn requires consistent moisture during tasseling and silking for proper pollination and kernel development.",
        "basis": "DA RFO 02 Corn Production Guide — 'Irrigation is important during the reproductive stage to ensure flower and silk synchronization, pollination and ear development.'"
    },

    {
        "id": "EXP_SCORN_WATER_FLOWER_02",
        "severity": "Severe",
        "condition": lambda state: state.get("crop_name", "") == "Sweet Corn" and state["growth_stage"] in ["flowering", "reproductive"],
        "additional_condition": lambda state: state["f_water"] < 0.6,
        "conclusion": "Severe water stress during flowering may cause poor silk tassel synchronization, incomplete pollination, and reduced ear formation.",
        "basis": "DA RFO 02 Corn Production Guide — 'Irrigation may be applied through flushing or overhead method' during reproductive stage; 'Drying of tassels, poor pollination and unfilled ears' as drought effect"
    },

    {
        "id": "EXP_SCORN_PEST_01",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Sweet Corn" and state["f_pest"] < 1.0,
        "additional_condition": lambda state: state.get("days_since_spray", 0) >= 10,
        "conclusion": "For sweet corn, common pest threats include corn borer, earworm, armyworm, aphids, cutworms, and plant hoppers. Uncontrolled infestations may reduce plant vigor and yield.",
        "basis": "DA RFO 02 Corn Production Guide — Table 5: Corn borer, Earworm, Army worm, Aphids, Cutworm, Plant hopper listed as insect pests of corn"
    },

    # ========================================================================
    # SECTION J: TOMATO-SPECIFIC RULES
    # ========================================================================
    {
        "id": "EXP_TOMATO_TEMP_01",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Tomato" and state["f_temp"] < 1.0,
        "additional_condition": lambda state: state.get("t_avg", 22) < 18 or state.get("t_avg", 22) > 30,
        "conclusion": "Temperature is outside tomato favorable range. Low or high temperatures may reduce fruit set and growth efficiency.",
        "basis": "Zhao et al. (2019) — fTemp stress factor; DA RFO 02 Tomato Production Guide (2017) — 'Optimum temperature requirement of tomato ranges from 21°C–24°C.'"
    },

    {
        "id": "EXP_TOMATO_TEMP_02",
        "severity": "None",
        "condition": lambda state: state.get("crop_name", "") == "Tomato" and 21 <= state.get("t_avg", 0) <= 24,
        "additional_condition": lambda state: state.get("cumulative_gdd", 0) >= state.get("t_sum", 1) - state.get("i50b", 0),
        "conclusion": "Optimal temperature detected during the reproductive stage. Conditions favor good fruit development and quality.",
        "basis": "DA RFO 02 Tomato Production Guide (2017) — 'Optimum temperature requirement of tomato ranges from 21°C–24°C.'"
    },

    {
        "id": "EXP_TOMATO_WATER_FLOWER_01",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Tomato" and state["growth_stage"] in ["flowering", "reproductive"],
        "additional_condition": lambda state: 0.6 <= state["f_water"] < 0.8,
        "conclusion": "Mild to moderate water stress during flowering. Tomatoes require consistent moisture at flowering; insufficient water may reduce fruit set.",
        "basis": "DA RFO 02 Tomato Production Guide (2017) — 'Water or irrigate the plants just to moisten the root zone especially during the onset of flowering up to the last harvest.'"
    },

    {
        "id": "EXP_TOMATO_WATER_FLOWER_02",
        "severity": "Severe",
        "condition": lambda state: state.get("crop_name", "") == "Tomato" and state["growth_stage"] in ["flowering", "reproductive"],
        "additional_condition": lambda state: state["f_water"] < 0.6,
        "conclusion": "Severe water stress during flowering. Continued drought may cause flower drop and significant yield loss.",
        "basis": "DA RFO 02 Tomato Production Guide (2017) — 'Water or irrigate the plants just to moisten the root zone especially during the onset of flowering up to the last harvest.'"
    },

    {
        "id": "EXP_TOMATO_PEST_STAGE_01",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Tomato" and state["f_pest"] < 1.0,
        "additional_condition": lambda state: state.get("days_since_spray", 0) >= 10,
        "conclusion": "For tomato, common pest threats include thrips, whiteflies, melon fly, leaf miner, aphids, cutworm, and fruitworm. Pest activity may reduce crop growth and fruit yield if unmanaged.",
        "basis": "DA RFO 02 Tomato Production Guide (2017) — 'Common pests of tomato are thrips, whiteflies, melon fly, leaf miner, aphids, cutworm and fruitworm.'"
    },

    # ========================================================================
    # SECTION K: CARROT-SPECIFIC RULES
    # ========================================================================
    {
        "id": "EXP_CARROT_TEMP_01",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Carrot" and state["f_temp"] < 1.0,
        "additional_condition": lambda state: state.get("t_avg", 18) < 10 or state.get("t_avg", 18) > 30,
        "conclusion": "Root quality is at risk. Temperatures below 10°C or above 30°C may cause fibrous, pale, or deformed roots and reduce growth efficiency.",
        "basis": "Zhao et al. (2019) — fTemp stress factor; DA RFO 02 Carrot Production Guide (2017) — 'Temperatures below 10°C and above 30°C reduce quality and yields of carrots.'"
    },

    {
        "id": "EXP_CARROT_TEMP_02",
        "severity": "None",
        "condition": lambda state: state.get("crop_name", "") == "Carrot" and 15 <= state.get("t_avg", 0) <= 21,
        "additional_condition": lambda state: state.get("cumulative_gdd", 0) >= state.get("t_sum", 1) - state.get("i50b", 0),
        "conclusion": "Optimal root coloring conditions detected. Temperature is within the ideal range for final root color development and quality.",
        "basis": "DA RFO 02 Carrot Production Guide (2017) — 'Roots attain optimal color when air temperature is 15–21°C, deepening rapidly about 3 weeks before harvest.'"
    },

    {
        "id": "EXP_CARROT_WATER_EARLY_01",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Carrot" and state.get("dap", 0) <= 30,
        "additional_condition": lambda state: 0.6 <= state["f_water"] < 0.8,
        "conclusion": "Mild to moderate water stress detected during early growth. Carrots require consistent moisture during the first 30 days, and insufficient water may cause root cracking and forking.",
        "basis": "DA RFO 02 Carrot Production Guide (2017) — 'Carrot needs a lot of moisture during the first 30 days of growth. Irregular watering leads to cracking and forking.'"
    },

    {
        "id": "EXP_CARROT_WATER_EARLY_02",
        "severity": "Severe",
        "condition": lambda state: state.get("crop_name", "") == "Carrot" and state.get("dap", 0) <= 30,
        "additional_condition": lambda state: state["f_water"] < 0.6,
        "conclusion": "Severe water stress detected during early growth. Root development is at high risk of cracking, forking, and deformation.",
        "basis": "DA RFO 02 Carrot Production Guide (2017) — 'Carrot needs a lot of moisture during the first 30 days of growth. Irregular watering leads to cracking and forking.'"
    },

    {
        "id": "EXP_CARROT_PEST_01",
        "severity": "Moderate",
        "condition": lambda state: state.get("crop_name", "") == "Carrot" and state["f_pest"] < 1.0,
        "additional_condition": lambda state: state.get("days_since_spray", 0) >= 10,
        "conclusion": "For carrot, common pest threats include aphids, cutworms, leaf miners, and other leaf-feeding insects. Pest activity may reduce plant vigor and root yield if unmanaged.",
        "basis": "DA RFO 02 Carrot Production Guide — common pests: aphids, cutworms, leaf miners, leaf-feeding insects"
    },
]
