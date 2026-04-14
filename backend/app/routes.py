from dataclasses import asdict
from flask import Blueprint, jsonify, request
import pandas as pd
import os

from app.services.integration import run_simulation, run_skip_with_auto
from app.services.weather import STATION_FOLDER_MAP, PAGASA_DATA_DIR

main = Blueprint('main', __name__)


def get_station_baseline_filepath(station: str):
    """Return the path to a station's baseline CSV, or None."""
    folder = STATION_FOLDER_MAP.get(station.lower())
    if not folder:
        return None
    return os.path.join(PAGASA_DATA_DIR, folder, 'baseline_daily.csv')


@main.route('/')
def index():
    return jsonify({
        'message': 'AgriSim backend is running',
        'endpoints': {
            'GET  /api/daily/<station>': 'Raw daily CSV rows for a station',
            'POST /api/simulate': 'Full SIMPLE model simulation (single run)',
            'POST /api/simulate-jump-auto': 'Skip-aware auto actions (backend batched)',
            'GET  /api/crop-params': 'Crop parameter defaults from config JSON',
        },
        'simulate_body': {
            'crop': 'sweet_corn | tomato | carrot',
            'location': 'baguio_benguet | malaybalay_bukidnon | tuguegarao_cagayan',
            'planting_month': 'january ... december',
            'soil_type': 'clay_loam | sandy_loam | loam',
            'scenario': 'baseline | drought | heat | nutrient',
            'co2_level': 'low | medium | high',
            'fertilizer_level': 'none | low | recommended | high',
            'initial_moisture': '0.0-1.0 (fraction of plant-available water)',
            'max_days': 'int (optional; overrides crop default max_days)',
            'irrigation_schedule': '{"day_number": mm_applied}',
            'pesticide_schedule': '[day1, day2, ...]',
        },
        'simulate_jump_auto_extra': {
            'start_day': 'int (required)',
            'target_day': 'int (required, must be >= start_day)',
            'auto_irrigate_enabled': 'bool',
            'auto_pesticide_enabled': 'bool',
            'irrigation_mm': '0-200',
            'water_threshold': 'float (default 1.0)',
            'pest_threshold': 'float (default 0.92)',
        },
        'stations': list(STATION_FOLDER_MAP.keys()),
    })


@main.route('/api/daily/<station>')
def get_daily_data(station):
    """Returns baseline daily weather rows for one station."""
    filepath = get_station_baseline_filepath(station)
    if not filepath:
        return jsonify({'error': 'Station not found'}), 404
    if not os.path.exists(filepath):
        return jsonify({'error': 'Baseline file not found on server'}), 404

    df = pd.read_csv(filepath)
    return jsonify(df.to_dict(orient='records'))


@main.route('/api/crop-params', methods=['GET'])
def get_crop_params():
    """
    Returns the crop parameter defaults loaded from crop_parameters.json.
    Useful for the frontend to display configurable values or for debugging.
    """
    import json
    config_path = os.path.join(
        os.path.dirname(__file__), '..', 'data', 'config', 'crop_parameters.json'
    )
    try:
        with open(config_path, 'r') as f:
            params = json.load(f)
        return jsonify(params)
    except FileNotFoundError:
        return jsonify({'error': 'crop_parameters.json not found'}), 500


@main.route('/api/simulate', methods=['POST'])
def simulate():
    payload = request.get_json(silent=True) or {}
    payload, error_response = _validate_simulation_payload(payload)
    if error_response is not None:
        return error_response

    try:
        result = run_simulation(payload)
    except FileNotFoundError as e:
        return jsonify({'error': f'Weather data file not found: {e}'}), 500
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Simulation error: {str(e)}'}), 500

    return jsonify(asdict(result))


@main.route('/api/simulate-jump-auto', methods=['POST'])
def simulate_jump_auto():
    payload = request.get_json(silent=True) or {}

    start_day_raw = payload.get('start_day')
    target_day_raw = payload.get('target_day')
    if start_day_raw is None or target_day_raw is None:
        return jsonify({'error': 'start_day and target_day are required'}), 400

    try:
        start_day = int(start_day_raw)
        target_day = int(target_day_raw)
    except (TypeError, ValueError):
        return jsonify({'error': 'start_day and target_day must be integers'}), 400

    if start_day < 1 or target_day < 1:
        return jsonify({'error': 'start_day and target_day must be >= 1'}), 400
    if target_day < start_day:
        return jsonify({'error': 'target_day must be >= start_day'}), 400

    auto_irrigate_enabled = bool(payload.get('auto_irrigate_enabled', False))
    auto_pesticide_enabled = bool(payload.get('auto_pesticide_enabled', False))

    try:
        irrigation_mm = float(payload.get('irrigation_mm', 20.0))
        if irrigation_mm < 0 or irrigation_mm > 200:
            return jsonify({'error': 'irrigation_mm must be in range 0-200'}), 400
    except (TypeError, ValueError):
        return jsonify({'error': 'irrigation_mm must be numeric'}), 400

    try:
        water_threshold = float(payload.get('water_threshold', 1.0))
        pest_threshold = float(payload.get('pest_threshold', 0.92))
    except (TypeError, ValueError):
        return jsonify({'error': 'water_threshold and pest_threshold must be numeric'}), 400

    sim_payload, error_response = _validate_simulation_payload(payload)
    if error_response is not None:
        return error_response

    try:
        result, irrigation_schedule, pesticide_schedule, counts = run_skip_with_auto(
            config=sim_payload,
            start_day=start_day,
            end_day=target_day,
            auto_irrigate_enabled=auto_irrigate_enabled,
            auto_pesticide_enabled=auto_pesticide_enabled,
            irrigation_mm=irrigation_mm,
            water_threshold=water_threshold,
            pest_threshold=pest_threshold,
        )
    except FileNotFoundError as e:
        return jsonify({'error': f'Weather data file not found: {e}'}), 500
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Simulation error: {str(e)}'}), 500

    return jsonify({
        'simulation': asdict(result),
        'irrigation_schedule': irrigation_schedule,
        'pesticide_schedule': pesticide_schedule,
        'auto_actions_applied': counts,
    })


def _validate_simulation_payload(payload):
    """Validate and normalize simulation payload. Returns (payload, error_response)."""
    required = [
        'crop', 'location', 'planting_month', 'soil_type',
        'scenario', 'co2_level', 'fertilizer_level',
    ]
    missing = [f for f in required if not payload.get(f)]
    if missing:
        return None, (jsonify({'error': f'Missing required fields: {missing}'}), 400)

    valid_crops = ['sweet_corn', 'tomato', 'carrot']
    if payload['crop'] not in valid_crops:
        return None, (jsonify({'error': f"Invalid crop. Must be one of: {valid_crops}"}), 400)

    valid_locations = ['baguio_benguet', 'malaybalay_bukidnon', 'tuguegarao_cagayan']
    if payload['location'] not in valid_locations:
        return None, (jsonify({'error': f"Invalid location. Must be one of: {valid_locations}"}), 400)

    valid_soils = ['clay_loam', 'sandy_loam', 'loam']
    if payload['soil_type'] not in valid_soils:
        return None, (jsonify({'error': f"Invalid soil_type. Must be one of: {valid_soils}"}), 400)

    valid_scenarios = ['baseline', 'drought', 'heat', 'nutrient']
    if payload['scenario'] not in valid_scenarios:
        return None, (jsonify({'error': f"Invalid scenario. Must be one of: {valid_scenarios}"}), 400)

    valid_co2 = ['low', 'medium', 'high']
    if payload['co2_level'] not in valid_co2:
        return None, (jsonify({'error': f"Invalid co2_level. Must be one of: {valid_co2}"}), 400)

    valid_fert = ['none', 'low', 'recommended', 'high']
    if payload['fertilizer_level'] not in valid_fert:
        return None, (jsonify({'error': f"Invalid fertilizer_level. Must be one of: {valid_fert}"}), 400)

    normalized = dict(payload)

    location_to_station = {
        'baguio_benguet': 'baguio',
        'malaybalay_bukidnon': 'malaybalay',
        'tuguegarao_cagayan': 'tuguegarao',
    }
    normalized['station'] = location_to_station[normalized['location']]
    normalized.setdefault('initial_moisture', 0.7)
    normalized.setdefault('season', 'wet_season')

    if 'irrigation_schedule' in normalized:
        raw_sched = normalized['irrigation_schedule']
        if not isinstance(raw_sched, dict):
            return None, (jsonify({'error': 'irrigation_schedule must be an object mapping day numbers to mm values'}), 400)
        validated = {}
        for k, v in raw_sched.items():
            try:
                day_key = str(int(k))
                mm_val = float(v)
                if mm_val < 0 or mm_val > 200:
                    return None, (jsonify({'error': f'irrigation_schedule value for day {k} out of range (0-200mm)'}), 400)
                validated[day_key] = mm_val
            except (TypeError, ValueError):
                return None, (jsonify({'error': f'irrigation_schedule has invalid entry: {k}={v}'}), 400)
        normalized['irrigation_schedule'] = validated

    if 'pesticide_schedule' in normalized:
        raw_pest = normalized['pesticide_schedule']
        if not isinstance(raw_pest, list):
            return None, (jsonify({'error': 'pesticide_schedule must be an array of day numbers'}), 400)
        validated_pest = []
        for day in raw_pest:
            try:
                day_int = int(day)
                if day_int < 1:
                    return None, (jsonify({'error': f'pesticide_schedule day must be >= 1, got {day}'}), 400)
                validated_pest.append(day_int)
            except (TypeError, ValueError):
                return None, (jsonify({'error': f'pesticide_schedule has invalid entry: {day}'}), 400)
        normalized['pesticide_schedule'] = validated_pest

    try:
        initial_moisture = float(normalized['initial_moisture'])
        normalized['initial_moisture'] = max(0.0, min(1.0, initial_moisture))
    except (TypeError, ValueError):
        return None, (jsonify({'error': 'initial_moisture must be a number between 0 and 1'}), 400)

    if 'max_days' in normalized:
        try:
            normalized['max_days'] = int(normalized['max_days'])
            if normalized['max_days'] <= 0:
                return None, (jsonify({'error': 'max_days must be a positive integer'}), 400)
        except (TypeError, ValueError):
            return None, (jsonify({'error': 'max_days must be an integer'}), 400)

    return normalized, None
