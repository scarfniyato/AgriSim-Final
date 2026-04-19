from dataclasses import asdict
from flask import Blueprint, jsonify, request
import pandas as pd
import os

from app.services.integration import run_simulation
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
            'POST /api/simulate':        'Full SIMPLE model simulation (see body spec below)',
            'GET  /api/crop-params':     'Crop parameter defaults from config JSON',
        },
        'simulate_body': {
            'crop':             'sweet_corn | tomato | carrot',
            'location':         'baguio_benguet | malaybalay_bukidnon | tuguegarao_cagayan',
            'planting_month':   'january ... december',
            'scenario':         'baseline | drought | heat | nutrient',
            'co2_level':        'low | medium | high',
            'fertilizer_level': 'none | low | recommended | high',
            'initial_moisture': '0.0-1.0 (fraction of plant-available water)',
            'max_days':         'int (optional; overrides crop default max_days)',
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
    """
    Run the full SIMPLE crop model simulation.

    Expected JSON body (all fields required unless marked optional):
    {
      "crop":             "sweet_corn" | "tomato" | "carrot",
      "location":         "baguio_benguet" | "malaybalay_bukidnon" | "tuguegarao_cagayan",
      "planting_month":   "june",
      "scenario":         "baseline" | "drought" | "heat" | "nutrient",
      "co2_level":        "low" | "medium" | "high",
      "fertilizer_level": "none" | "low" | "recommended" | "high",
      "initial_moisture": 0.7,          // optional, 0.0-1.0
      "max_days":         90            // optional, overrides crop default
    }

    Returns JSON with the full SimulationOutput including per-day results.
    """
    payload = request.get_json(silent=True) or {}

    # --- Required field validation ---
    required = ['crop', 'location', 'planting_month',
                'scenario', 'co2_level', 'fertilizer_level']
    missing = [f for f in required if not payload.get(f)]
    if missing:
        return jsonify({'error': f'Missing required fields: {missing}'}), 400

    valid_crops = ['sweet_corn', 'tomato', 'carrot']
    if payload['crop'] not in valid_crops:
        return jsonify({'error': f"Invalid crop. Must be one of: {valid_crops}"}), 400

    valid_locations = ['baguio_benguet', 'malaybalay_bukidnon', 'tuguegarao_cagayan']
    if payload['location'] not in valid_locations:
        return jsonify({'error': f"Invalid location. Must be one of: {valid_locations}"}), 400

    valid_scenarios = ['baseline', 'drought', 'heat', 'nutrient']
    if payload['scenario'] not in valid_scenarios:
        return jsonify({'error': f"Invalid scenario. Must be one of: {valid_scenarios}"}), 400

    valid_co2 = ['low', 'medium', 'high']
    if payload['co2_level'] not in valid_co2:
        return jsonify({'error': f"Invalid co2_level. Must be one of: {valid_co2}"}), 400

    valid_fert = ['none', 'low', 'recommended', 'high']
    if payload['fertilizer_level'] not in valid_fert:
        return jsonify({'error': f"Invalid fertilizer_level. Must be one of: {valid_fert}"}), 400

    # Derive station from location
    location_to_station = {
        'baguio_benguet':     'baguio',
        'malaybalay_bukidnon':'malaybalay',
        'tuguegarao_cagayan': 'tuguegarao',
    }
    payload['station'] = location_to_station[payload['location']]

    # Optional fields with defaults
    payload.setdefault('initial_moisture', 0.7)
    payload.setdefault('season', 'wet_season')

    # Irrigation schedule: {"day_number": mm_applied, ...}
    # Validated as dict of string keys → positive floats
    if 'irrigation_schedule' in payload:
        raw_sched = payload['irrigation_schedule']
        if not isinstance(raw_sched, dict):
            return jsonify({'error': 'irrigation_schedule must be an object mapping day numbers to mm values'}), 400
        validated = {}
        for k, v in raw_sched.items():
            try:
                day_key = str(int(k))
                mm_val = float(v)
                if mm_val < 0 or mm_val > 200:
                    return jsonify({'error': f'irrigation_schedule value for day {k} out of range (0-200mm)'}), 400
                validated[day_key] = mm_val
            except (TypeError, ValueError):
                return jsonify({'error': f'irrigation_schedule has invalid entry: {k}={v}'}), 400
        payload['irrigation_schedule'] = validated

    # Pesticide schedule: [day1, day2, ...] — list of days when pesticide was applied
    if 'pesticide_schedule' in payload:
        raw_pest = payload['pesticide_schedule']
        if not isinstance(raw_pest, list):
            return jsonify({'error': 'pesticide_schedule must be an array of day numbers'}), 400
        validated_pest = []
        for day in raw_pest:
            try:
                day_int = int(day)
                if day_int < 1:
                    return jsonify({'error': f'pesticide_schedule day must be >= 1, got {day}'}), 400
                validated_pest.append(day_int)
            except (TypeError, ValueError):
                return jsonify({'error': f'pesticide_schedule has invalid entry: {day}'}), 400
        payload['pesticide_schedule'] = validated_pest

    try:
        initial_moisture = float(payload['initial_moisture'])
        payload['initial_moisture'] = max(0.0, min(1.0, initial_moisture))
    except (TypeError, ValueError):
        return jsonify({'error': 'initial_moisture must be a number between 0 and 1'}), 400

    if 'max_days' in payload:
        try:
            payload['max_days'] = int(payload['max_days'])
            if payload['max_days'] <= 0:
                return jsonify({'error': 'max_days must be a positive integer'}), 400
        except (TypeError, ValueError):
            return jsonify({'error': 'max_days must be an integer'}), 400

    # --- Run simulation ---
    try:
        result = run_simulation(payload)
    except FileNotFoundError as e:
        return jsonify({'error': f'Weather data file not found: {e}'}), 500
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        # Log full traceback server-side; return safe message to client
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Simulation error: {str(e)}'}), 500

    # --- Serialise SimulationOutput dataclass to dict ---
    output_dict = asdict(result)

    return jsonify(output_dict)
