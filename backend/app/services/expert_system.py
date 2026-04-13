"""
expert_system.py — Rule-Based Expert System (Forward Chaining Inference Engine)

Implements a two-layer expert system architecture:
  Layer 1 (Explanation): Diagnoses WHY crop growth has changed based on stress factors
  Layer 2 (Recommendation): Prescribes WHAT farmers should do to address problems

Architecture follows the thesis design:
  - Layer 1 provides causal explanations (diagnostic)
  - Layer 2 provides actionable management recommendations (prescriptive)
  - Both layers use forward chaining inference with lambda-based condition evaluation

Three-Tier Alert Ranking System:
  - Level 1 (Status Summary): Always shown, one line per stress variable
  - Level 2 (Active Warnings): Only shown when severity >= Moderate (Layer 1 explanations)
  - Level 3 (Recommendations): Only shown when Layer 2 fires (actionable advice)

Ranking Logic (Option B):
  - Step 1: Filter — collect all fired rules with severity >= Moderate
  - Step 2: Sort by:
      Key 1: severity weight (Critical=4, Severe=3, Moderate=2)
      Key 2: stress factor value (ascending — lower = more limiting)
      Key 3: rule specificity (crop-specific=0 higher priority, generic=1 lower priority)
  - Step 3: Top result = PRIMARY LIMITING FACTOR
  - Step 4: Remaining results = SECONDARY ALERTS (collapsed)

Rule Structure (Lambda-based):
  - condition: lambda function that evaluates the current state
  - additional_condition: optional lambda for compound or stage-specific conditions
  - Layer 1: conclusion field (WHY this is happening)
  - Layer 2: recommendation field (WHAT to do about it)
  - severity: 'None' | 'Low' | 'Moderate' | 'Severe' | 'Critical'
  - basis: scientific reference or production guide source

The engine returns combined explanations + recommendations for the current day.
"""

from typing import Dict, Any, List
from app.services.rules import LAYER1_RULES, LAYER2_RULES

# ---------------------------------------------------------------------------
# Load rules once at import time
# ---------------------------------------------------------------------------

# Combine Layer 1 and Layer 2 rules
# Rules are evaluated in definition order
_ALL_RULES = LAYER1_RULES + LAYER2_RULES

# ---------------------------------------------------------------------------
# Severity weights for ranking (Option B from thesis)
# ---------------------------------------------------------------------------
SEVERITY_WEIGHTS = {
    'Critical': 4,
    'Severe': 3,
    'Moderate': 2,
    'Low': 1,
    'None': 0,
}

# ---------------------------------------------------------------------------
# Status labels for Level 1 Summary
# ---------------------------------------------------------------------------
def _get_status_label(value: float, factor_type: str) -> str:
    """
    Convert a stress factor value to a human-readable status label.

    Parameters
    ----------
    value : float
        The stress factor value (0-1 for most, >= 1 for f_co2)
    factor_type : str
        The type of factor (f_water, f_heat, f_temp, f_nutrient, f_pest, f_co2, f_solar)

    Returns
    -------
    str : Status label (Optimal, Mild, Moderate, Severe, Critical, etc.)
    """
    if factor_type == 'f_co2':
        # CO2 is a boost factor (>= 1.0)
        if value >= 1.1:
            return 'Elevated (Boost)'
        else:
            return 'Normal'

    # All other factors: higher = better (1.0 = optimal)
    if value >= 0.9:
        return 'Optimal'
    elif value >= 0.7:
        return 'Mild'
    elif value >= 0.4:
        return 'Moderate'
    elif value >= 0.1:
        return 'Severe'
    else:
        return 'Critical'


def _get_stress_factor_for_rule(rule_id: str, state: Dict[str, Any]) -> float:
    """
    Determine which stress factor a rule is associated with and return its value.
    Used for ranking by stress factor value (lower = more limiting).

    Parameters
    ----------
    rule_id : str
        The rule ID (e.g., 'EXP_WATER_03', 'REC_IRR_01')
    state : dict
        The current simulation state containing stress factor values

    Returns
    -------
    float : The stress factor value associated with this rule
    """
    rule_id_upper = rule_id.upper()

    # Map rule ID patterns to stress factors
    if 'WATER' in rule_id_upper or 'IRR' in rule_id_upper:
        return state.get('f_water', 1.0)
    elif 'HEAT' in rule_id_upper:
        return state.get('f_heat', 1.0)
    elif 'TEMP' in rule_id_upper:
        return state.get('f_temp', 1.0)
    elif 'NUTR' in rule_id_upper or 'FERT' in rule_id_upper:
        return state.get('f_nutrient', 1.0)
    elif 'PEST' in rule_id_upper:
        return state.get('f_pest', 1.0)
    elif 'CO2' in rule_id_upper:
        return state.get('f_co2', 1.0)
    elif 'SOLAR' in rule_id_upper:
        return state.get('f_solar', 1.0)
    else:
        # For stage or other rules, return 1.0 (lowest priority in stress ranking)
        return 1.0


def _is_crop_specific_rule(rule_id: str) -> bool:
    """
    Determine if a rule is crop-specific (higher priority) or generic (lower priority).

    Parameters
    ----------
    rule_id : str
        The rule ID

    Returns
    -------
    bool : True if crop-specific, False if generic
    """
    crop_prefixes = ['CORN', 'SCORN', 'TOMATO', 'CARROT']
    rule_id_upper = rule_id.upper()
    return any(prefix in rule_id_upper for prefix in crop_prefixes)


def _rule_category(rule_id: str) -> str:
    """Map rule ID to a broad stress/action category for de-duplication."""
    rule_id_upper = rule_id.upper()
    if 'PEST' in rule_id_upper:
        return 'pest'
    if 'WATER' in rule_id_upper or 'IRR' in rule_id_upper:
        return 'water'
    if 'HEAT' in rule_id_upper:
        return 'heat'
    if 'TEMP' in rule_id_upper:
        return 'temperature'
    if 'NUTR' in rule_id_upper or 'FERT' in rule_id_upper:
        return 'nutrient'
    if 'CO2' in rule_id_upper:
        return 'co2'
    if 'SOLAR' in rule_id_upper:
        return 'solar'
    return 'general'


def _dedupe_by_layer_and_category(alerts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Keep only the best alert per (layer, category).

    Priority:
      1) higher severity
      2) lower stress factor value (more limiting)
      3) crop-specific over generic
      4) first encountered (stable)
    """
    best_by_key: Dict[tuple, Dict[str, Any]] = {}
    key_order: List[tuple] = []

    for alert in alerts:
        layer = alert.get('layer', 'unknown')
        category = alert.get('_category', _rule_category(alert.get('rule_id', '')))
        key = (layer, category)

        if key not in best_by_key:
            best_by_key[key] = alert
            key_order.append(key)
            continue

        current = best_by_key[key]

        current_score = (
            SEVERITY_WEIGHTS.get(current.get('severity', 'None'), 0),
            -current.get('_stress_value', 1.0),  # lower stress value = higher priority
            1 if current.get('_is_crop_specific', _is_crop_specific_rule(current.get('rule_id', ''))) else 0,
        )
        candidate_score = (
            SEVERITY_WEIGHTS.get(alert.get('severity', 'None'), 0),
            -alert.get('_stress_value', 1.0),   # lower stress value = higher priority
            1 if alert.get('_is_crop_specific', _is_crop_specific_rule(alert.get('rule_id', ''))) else 0,
        )

        if candidate_score > current_score:
            best_by_key[key] = alert

    return [best_by_key[k] for k in key_order]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def evaluate(state: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Evaluate all rules (Layer 1 + Layer 2) against the current daily simulation state.

    The new lambda-based rule format allows for flexible condition evaluation
    without explicit condition dictionaries.

    Parameters
    ----------
    state : dict — the fact base for the current day, must include:
        f_water              : float (0-1)
        f_heat               : float (0-1)
        f_co2                : float (>= 1.0)
        f_solar              : float (0-1)
        f_temp               : float (0-1)
        f_nutrient           : float (0-1)
        f_pest               : float (0.5-1)
        soil_water_mm        : float
        soil_water_pct       : float (0-100)
        tmax                 : float
        tmin                 : float
        tmean                : float
        rainfall             : float
        biomass              : float (g/m²)
        cumulative_gdd       : float (°C·d)
        growth_stage         : str
        day                  : int
        consecutive_dry_days : int
        eta                  : float
        etp                  : float

    Returns
    -------
    List[dict] — alerts for this day, each containing:
        rule_id       : str
        layer         : 'layer1' | 'layer2'
        severity      : str
        message       : str (conclusion from Layer 1 or recommendation from Layer 2)
        action_type   : str (only for Layer 2 rules)
        basis         : str (scientific reference)
        is_primary    : bool (True if this is the primary limiting factor)
        rank          : int (1 = primary, 2+ = secondary)
    """
    fired_alerts: List[Dict[str, Any]] = []

    for rule in _ALL_RULES:
        try:
            # Evaluate main condition (lambda function)
            condition_fn = rule.get('condition')
            if not condition_fn or not callable(condition_fn):
                continue

            # Check if main condition is met
            if not condition_fn(state):
                continue

            # Check additional condition if present
            additional_condition_fn = rule.get('additional_condition')
            if additional_condition_fn and callable(additional_condition_fn):
                if not additional_condition_fn(state):
                    continue

            # Rule fires — determine if Layer 1 or Layer 2
            alert = {
                'rule_id': rule['id'],
                'severity': rule.get('severity', 'None'),
                'basis': rule.get('basis', ''),
                '_stress_value': _get_stress_factor_for_rule(rule['id'], state),
                '_category': _rule_category(rule['id']),
                '_is_crop_specific': _is_crop_specific_rule(rule['id']),
            }

            # Layer 1 rules have 'conclusion' field
            if 'conclusion' in rule:
                alert['layer'] = 'layer1'
                alert['message'] = rule['conclusion']

            # Layer 2 rules have 'recommendation' field
            elif 'recommendation' in rule:
                alert['layer'] = 'layer2'
                alert['message'] = rule['recommendation']
                alert['action_type'] = rule.get('action_type', 'General Management')

            # Skip rules without proper message field
            else:
                continue

            fired_alerts.append(alert)

        except Exception as e:
            # Skip rules that fail evaluation (e.g., missing state keys)
            # This allows the system to be robust to incomplete state
            continue

    # De-duplicate: keep only one alert per unique (layer, rule_id) pair
    # This prevents duplicate alerts from firing multiple times
    seen_rules = set()
    deduped = []
    for alert in fired_alerts:
        key = (alert.get('layer', 'unknown'), alert['rule_id'])
        if key not in seen_rules:
            seen_rules.add(key)
            deduped.append(alert)

    # Generic layer/category conflict resolution
    deduped = _dedupe_by_layer_and_category(deduped)

    # =========================================================================
    # THREE-TIER RANKING LOGIC (Option B)
    # =========================================================================

    # Step 1: Filter — collect all alerts with severity >= Moderate
    rankable_alerts = [
        a for a in deduped
        if SEVERITY_WEIGHTS.get(a['severity'], 0) >= SEVERITY_WEIGHTS['Moderate']
    ]

    # Step 2: Sort by:
    #   Key 1: severity weight (descending — Critical first)
    #   Key 2: stress factor value (ascending — lower = more limiting)
    #   Key 3: rule specificity (crop-specific=0 first, generic=1 second)
    def sort_key(alert):
        severity_weight = SEVERITY_WEIGHTS.get(alert['severity'], 0)
        stress_value = alert.get('_stress_value', _get_stress_factor_for_rule(alert['rule_id'], state))
        specificity = 0 if alert.get('_is_crop_specific', _is_crop_specific_rule(alert['rule_id'])) else 1
        return (-severity_weight, stress_value, specificity)

    rankable_alerts.sort(key=sort_key)

    # Step 3 & 4: Assign ranks and primary flag
    ranked_rule_ids = set()
    for rank_idx, alert in enumerate(rankable_alerts):
        alert['rank'] = rank_idx + 1
        alert['is_primary'] = (rank_idx == 0)
        ranked_rule_ids.add(alert['rule_id'])

    # For alerts not in ranking (severity < Moderate), assign rank=0 and is_primary=False
    for alert in deduped:
        if alert['rule_id'] not in ranked_rule_ids:
            alert['rank'] = 0
            alert['is_primary'] = False

    # Remove internal helper fields before returning
    for alert in deduped:
        alert.pop('_stress_value', None)
        alert.pop('_category', None)
        alert.pop('_is_crop_specific', None)

    return deduped


def generate_status_summary(state: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    Generate Level 1 Status Summary — always shown, one line per stress variable.

    Parameters
    ----------
    state : dict
        The current simulation state containing stress factor values

    Returns
    -------
    dict : Status summary for each stress variable
        {
            'temperature': {'value': 0.85, 'status': 'Mild', 'label': 'Temperature'},
            'water': {'value': 0.95, 'status': 'Optimal', 'label': 'Water Stress'},
            ...
        }
    """
    return {
        'temperature': {
            'value': round(state.get('f_temp', 1.0), 4),
            'status': _get_status_label(state.get('f_temp', 1.0), 'f_temp'),
            'label': 'Temperature',
        },
        'heat': {
            'value': round(state.get('f_heat', 1.0), 4),
            'status': _get_status_label(state.get('f_heat', 1.0), 'f_heat'),
            'label': 'Heat Stress',
        },
        'water': {
            'value': round(state.get('f_water', 1.0), 4),
            'status': _get_status_label(state.get('f_water', 1.0), 'f_water'),
            'label': 'Water Stress',
        },
        'nutrient': {
            'value': round(state.get('f_nutrient', 1.0), 4),
            'status': _get_status_label(state.get('f_nutrient', 1.0), 'f_nutrient'),
            'label': 'Nutrients',
        },
        'pest': {
            'value': round(state.get('f_pest', 1.0), 4),
            'status': _get_status_label(state.get('f_pest', 1.0), 'f_pest'),
            'label': 'Pest Pressure',
        },
        'co2': {
            'value': round(state.get('f_co2', 1.0), 4),
            'status': _get_status_label(state.get('f_co2', 1.0), 'f_co2'),
            'label': 'CO2 Effect',
        },
        'solar': {
            'value': round(state.get('f_solar', 0.0), 4),
            'status': _get_status_label(state.get('f_solar', 0.0), 'f_solar'),
            'label': 'Canopy Interception',
        },
    }


def generate_tiered_alerts(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate the complete three-tier alert structure for the UI.

    Parameters
    ----------
    state : dict
        The current simulation state

    Returns
    -------
    dict : Three-tier alert structure
        {
            'level1_status_summary': {...},  # Always shown
            'level2_warnings': [...],         # Layer 1 explanations (severity >= Moderate)
            'level3_recommendations': [...],  # Layer 2 recommendations
            'primary_limiting_factor': {...} or None,
            'secondary_alerts': [...],
        }
    """
    # Level 1: Status Summary (always shown)
    status_summary = generate_status_summary(state)

    # Evaluate all rules
    all_alerts = evaluate(state)

    # Level 2: Active Warnings (Layer 1 explanations with severity >= Moderate)
    level2_warnings = [
        a for a in all_alerts
        if a['layer'] == 'layer1' and SEVERITY_WEIGHTS.get(a['severity'], 0) >= SEVERITY_WEIGHTS['Moderate']
    ]

    # Level 3: Recommendations (Layer 2 rules that fired)
    level3_recommendations = [
        a for a in all_alerts
        if a['layer'] == 'layer2'
    ]

    # Primary limiting factor (rank == 1)
    primary = next((a for a in all_alerts if a.get('is_primary', False)), None)

    # Secondary alerts (rank > 1)
    secondary = [a for a in all_alerts if a.get('rank', 0) > 1]

    # Best available action / other actions split for Layer 2 display
    all_layer2 = level3_recommendations
    primary_category = _rule_category(primary['rule_id']) if primary else None

    best_action = None
    if all_layer2:
        if primary_category is not None:
            best_action = next(
                (a for a in all_layer2 if _rule_category(a['rule_id']) == primary_category),
                None
            )
        # Fallback: if no Layer 2 action matches primary factor category,
        # show the top available Layer 2 action.
        if best_action is None:
            best_action = all_layer2[0]

    other_actions = [
        a for a in all_layer2
        if best_action is not None and a['rule_id'] != best_action['rule_id']
    ]

    return {
        'level1_status_summary': status_summary,
        'level2_warnings': level2_warnings,
        'level3_recommendations': level3_recommendations,
        'best_available_action': best_action,
        'other_actions': other_actions,
        'primary_limiting_factor': primary,
        'secondary_alerts': secondary,
        'all_alerts': all_alerts,
    }

def compute_stress_factors(
    growth_stage: str,
    application_ratio: float = 1.0,
    crop_name: str = 'Sweet Corn',
    days_since_spray: int = 999,
) -> Dict[str, float]:
    """
    Compute nutrient and pest stress factors based on environmental conditions.

    f_nutrient is a pre-season decision — computed once from user input.
    Does not change daily during simulation.

    Parameters
    ----------
    growth_stage : str
        Current crop growth stage
    application_ratio : float
        Fertilizer application ratio (0.0-2.0), where:
        - 0.0 = no fertilizer → f_nutrient = 0.30
        - 0.5 = 50% of recommended → f_nutrient = 0.60
        - 1.0 = recommended dose → f_nutrient = 1.00
        - >1.0 = over-application → penalty applied
    crop_name : str
        Crop name for crop-specific over-application penalties
    days_since_spray : int
        Days since last pesticide application (default 999 = no spray)

    Returns
    -------
    dict with keys:
        f_nutrient : float (0-1, where 1=optimal nutrition)
        f_pest     : float (0-1, where 1=no pest pressure)
    """
    # ===================================================================
    # f_nutrient: Nutrient availability factor
    # ===================================================================
    # Step 1: Baseline fertility from application_ratio (linear 0.30 to 1.00)
    #   application_ratio = 0.0 → f_nutrient = 0.30
    #   application_ratio = 0.5 → f_nutrient = 0.65
    #   application_ratio = 1.0 → f_nutrient = 1.00
    if application_ratio <= 1.0:
        f_nutrient = 0.30 + (application_ratio * 0.70)
    else:
        # Step 2: Over-application penalty (application_ratio > 1.0)
        # Crop-specific penalty rates (% reduction per 100% excess)
        penalty_rates = {
            'Sweet Corn': 0.22,  # 22% penalty per 100% excess
            'Carrot':     0.20,  # 20% penalty per 100% excess
            'Tomato':     0.17,  # 17% penalty per 100% excess
        }
        penalty_rate = penalty_rates.get(crop_name, 0.20)  # default 20%

        excess = application_ratio - 1.0
        penalty_multiplier = 1.0 - (penalty_rate * excess)
        penalty_multiplier = max(0.0, penalty_multiplier)  # no negative

        f_nutrient = 1.0 * penalty_multiplier

    # Clamp to [0, 1]
    f_nutrient = max(0.0, min(1.0, f_nutrient))

    # ===================================================================
    # f_pest: Pest damage factor
    # ===================================================================
    # Following Oerke (2006) and Savary et al. (2019) for yield loss ranges.
    # Management timing based on DA/ATI production guides and PhilGAP.

    # Stage susceptibility mapping (DA/ATI Production Guides)
    STAGE_SUSCEPTIBILITY = {
        'seedling': 'high',        # Vulnerable to cutworms, damping-off
        'vegetative': 'medium',    # Leaf feeders, aphids
        'reproductive': 'high',       # Fruit/flower pests, diseases
        'maturity': 'low',         # Less yield-critical
    }

    # Pressure levels to f_pest (Oerke 2006; Savary et al. 2019)
    PRESSURE_LEVELS = {
        'none': 1.00,      # No biotic stress
        'low': 0.92,       # 8% yield reduction
        'moderate': 0.75,  # 25% yield reduction (Oerke 2006 mid-range)
        'high': 0.65,      # 35% yield reduction
        'severe': 0.30,    # 70% yield reduction (unmanaged)
    }

    # Capped Escalation Logic
    # - Escalation thresholds based on PhilGAP 7-14 day reapplication interval
    # - Savary et al. (2019): unmanaged fields experience 30-40% losses

    # Step 1: Protection window - recently sprayed (PhilGAP: 7-14 days)
    if days_since_spray < 10:
        pressure = 'low'
    else:
        # Step 2: Get base susceptibility from stage
        susceptibility = STAGE_SUSCEPTIBILITY.get(growth_stage, 'medium')

        # Low susceptibility stages - no escalation (maturity)
        if susceptibility == 'low':
            pressure = 'none'

        # Medium susceptibility - capped at moderate (vegetative)
        elif susceptibility == 'medium':
            if days_since_spray >= 7:
                pressure = 'moderate'
            else:
                pressure = 'low'

        # High susceptibility - full escalation path (seedling, flowering)
        else:  # susceptibility == 'high'
            if days_since_spray >= 14:
                pressure = 'severe'  # CAP - never goes beyond this
            elif days_since_spray >= 7:
                pressure = 'high'
            else:
                pressure = 'moderate'  # baseline for high susceptibility

    # Step 3: Convert pressure level to stress factor
    f_pest = PRESSURE_LEVELS.get(pressure, 0.92)

    return {
        'f_nutrient': round(f_nutrient, 4),
        'f_pest': round(f_pest, 4),
    }

