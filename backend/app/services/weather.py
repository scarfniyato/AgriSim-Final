"""
weather.py — Weather Data Loading Service (PAGASA Baseline)

This module is responsible for loading weather data that the crop simulation
needs each day (temperature, rainfall, humidity, solar radiation, and ET).

How it works (step by step):
  1. The user picks a LOCATION (e.g. Baguio) and a PLANTING MONTH (e.g. June)
     in the frontend Scenario Setup screen.
  2. The backend maps the location to a station folder inside:
         data/pagasa_data/<Station>/baseline_daily.csv
     This CSV has 365 rows (one per day-of-year), pre-computed as the median
     of 5 years (2020-2024) of actual PAGASA weather observations.
  3. Station metadata (latitude, longitude, elevation) is loaded from:
         data/pagasa_data/<Station>/<station>_station_info.json
  4. Starting from the 1st day of the chosen planting month, the code
     extracts `max_days` consecutive rows from the baseline CSV.
     If the crop grows past Dec 31, it wraps back to Jan 1 automatically.
  5. For each day, the code:
       a) Reads TMAX, TMIN from the CSV and computes Tmean = (TMAX+TMIN)/2
       b) Generates rainfall using a coin-flip (Bernoulli) method:
            - pWet      = probability of rain on this day (0.0 to 1.0)
            - WetAmount = how much rain (mm) if it does rain
            - Roll a random number; if < pWet → rain = WetAmount, else 0
       c) Estimates solar radiation (SRAD) using Hargreaves formula
       d) Computes reference evapotranspiration (ETo) via Priestley-Taylor

Baseline CSV columns:
  MONTH, DAY, DOY, TMAX, TMIN, RH, pWet, WetAmount
"""

import json
import math
import os
import random
from datetime import date, timedelta
from typing import List, Dict, Any, Optional

import pandas as pd


# ---------------------------------------------------------------------------
# Path constants — where to find the data files
# ---------------------------------------------------------------------------

# Absolute path to the pagasa_data/ folder (relative to this .py file)
PAGASA_DATA_DIR = os.path.join(
    os.path.dirname(__file__), '..', '..', 'data', 'pagasa_data'
)

# Maps the station key used in code → the actual folder name on disk.
# Example: 'baguio' → looks inside data/pagasa_data/Baguio/
STATION_FOLDER_MAP: Dict[str, str] = {
    'baguio':     'Baguio',
    'laoag':      'Laoag',
    'malaybalay': 'Malaybalay',
    'tuguegarao': 'Tuguegarao',
}


# ---------------------------------------------------------------------------
# Seasonal SRAD and radiation constants
# ---------------------------------------------------------------------------

# SRAD bounds (MJ/m²/day) — minimum and maximum solar radiation allowed
# per season.  Values are based on PAGASA solar radiation climatology.
# If the Hargreaves estimate falls outside this range, it gets clamped.
SRAD_BOUNDS: Dict[str, tuple] = {
    'dry_season': (17.3, 34.6),   # dry season has more sunshine
    'wet_season': ( 8.6, 21.6),   # wet season has more clouds/rain
}

# On rainy days (≥1 mm), solar radiation is reduced by 35% to simulate
# cloud cover.  So: SRAD_rainy = SRAD_clear × 0.65
RAINY_DAY_SRAD_FACTOR: float = 0.65

# Albedo for grass reference surface (FAO-56 standard)
ALBEDO: float = 0.23

# Stefan-Boltzmann constant (MJ/m²/day/K⁴)  [FAO-56]
STEFAN_BOLTZMANN: float = 4.903e-9

# Converts month name strings (from the frontend) to month numbers.
# Used to look up the starting row in the CSV.
MONTH_NAME_TO_NUM: Dict[str, int] = {
    'january': 1, 'february': 2, 'march': 3,    'april': 4,
    'may': 5,     'june': 6,     'july': 7,      'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12,
}


# ---------------------------------------------------------------------------
# Station metadata loader (from station_info.json)
# ---------------------------------------------------------------------------

def _load_station_info(station: str) -> Dict[str, Any]:
    """
    Load the station_info.json file for a given station.

    This JSON file contains latitude, longitude, elevation, and notes
    about the data.  These values are needed later for solar radiation
    and evapotranspiration calculations.

    Example:
      _load_station_info('baguio')
      → reads  data/pagasa_data/Baguio/baguio_station_info.json
      → returns {'latitude': 16.40, 'elevation_m': 1510.08, ...}
    """
    folder = STATION_FOLDER_MAP.get(station)
    if not folder:
        raise ValueError(
            f"Unknown station: '{station}'. "
            f"Valid: {list(STATION_FOLDER_MAP)}"
        )
    path = os.path.join(PAGASA_DATA_DIR, folder, f"{station}_station_info.json")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Station info not found: {path}")
    with open(path, 'r') as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_weather_window(
    station: str,
    planting_month: str,
    max_days: int,
    season: str = 'dry_season',
    seed: int | None = None,
) -> List[Dict[str, Any]]:
    """
    Main entry point — returns a list of daily weather dicts for the simulation.

    This is the function that integration.py calls.  It ties everything
    together: loads the station metadata, reads the baseline CSV, finds
    the starting row for the chosen planting month, extracts the right
    number of days, and converts each row into a weather dict.

    Parameters
    ----------
    station : str
        Station key — one of 'baguio', 'laoag', 'malaybalay', 'tuguegarao'.
    planting_month : str
        Month name, e.g. 'june'.  Case-insensitive.
    max_days : int
        How many simulation days to return (comes from the crop's
        max_days parameter in crop_parameters.json).
    season : str
        'wet_season' or 'dry_season' — affects solar radiation clamping.
    seed : int | None
        If provided, seeds the random number generator so the same config
        always produces the same stochastic rainfall sequence.  This ensures
        re-simulations (e.g. after adding irrigation) don't change past days.

    Returns
    -------
    List[dict]
        A list of length == max_days.  Each dict has keys:
        date, tmax, tmin, tmean, rainfall, rh, srad, srad_method,
        ra, elevation, season, day_of_year

    Example
    -------
    >>> weather = load_weather_window('baguio', 'june', 100, 'wet_season')
    >>> weather[0]['date']   # first simulation day
    '2025-06-01'
    >>> len(weather)
    100
    """
    station = station.lower()
    if station not in STATION_FOLDER_MAP:
        raise ValueError(
            f"Unknown station: '{station}'. "
            f"Valid: {list(STATION_FOLDER_MAP)}"
        )

    month_num = MONTH_NAME_TO_NUM.get(planting_month.lower())
    if month_num is None:
        raise ValueError(f"Unknown planting month: '{planting_month}'")

    season = season if season in SRAD_BOUNDS else 'dry_season'

    # Load station metadata from JSON
    info      = _load_station_info(station)
    latitude  = float(info['latitude'])
    elevation = float(info['elevation_m'])

    # Load baseline CSV
    df = _load_baseline_csv(station)

    # Find start index using MONTH column (matches CSV directly)
    start_idx = _find_start_index(df, month_num)

    # Extract max_days rows (wrapping circularly)
    rows = _extract_rows(df, start_idx, max_days)

    # Create a dedicated RNG so each call with the same seed produces
    # identical stochastic rainfall.  This keeps past days stable when
    # re-simulating after the user adds irrigation.
    rng = random.Random(seed)

    return [
        _build_weather_dict(row, latitude, elevation, season, rng)
        for row in rows
    ]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _load_baseline_csv(station: str) -> pd.DataFrame:
    """
    Load the baseline_daily.csv file for a station.

    This CSV has 365 rows — one for each day of the year (DOY 1–365).
    Each row contains the median weather values computed from 5 years
    of actual PAGASA daily weather data (2020–2024).

    Required columns: MONTH, DAY, DOY, TMAX, TMIN, RH, pWet, WetAmount

    Example:
      _load_baseline_csv('baguio')
      → reads  data/pagasa_data/Baguio/baseline_daily.csv
      → returns a DataFrame with 365 rows sorted by DOY
    """
    folder   = STATION_FOLDER_MAP[station]
    filepath = os.path.join(PAGASA_DATA_DIR, folder, 'baseline_daily.csv')

    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Baseline CSV not found: {filepath}")

    df = pd.read_csv(filepath)

    required = {'DOY', 'MONTH', 'DAY', 'TMAX', 'TMIN', 'RH', 'pWet', 'WetAmount'}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Baseline CSV missing required columns: {missing}")

    # Ensure numeric and sorted by DOY
    for col in ['TMAX', 'TMIN', 'RH', 'pWet', 'WetAmount']:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)

    df['DOY'] = pd.to_numeric(df['DOY'], errors='coerce').fillna(1).astype(int)
    df['MONTH'] = pd.to_numeric(df['MONTH'], errors='coerce').fillna(1).astype(int)
    df['DAY'] = pd.to_numeric(df['DAY'], errors='coerce').fillna(1).astype(int)
    df = df.sort_values('DOY').reset_index(drop=True)
    return df


def _find_start_index(df: pd.DataFrame, month_num: int) -> int:
    """
    Find the starting row for a given planting month in the baseline CSV.

    Looks for the row where MONTH == month_num and DAY == 1.
    This becomes "Day 1" of the simulation.

    Example:
      If the user picks June → month_num = 6
      The code finds the row with MONTH=6, DAY=1 (June 1st)
      and returns its DataFrame index (e.g. 151).

    Fallback: if DAY=1 isn't found, uses the first row in that month.
    If the month doesn't exist at all, defaults to row 0 (Jan 1).
    """
    exact = df[(df['MONTH'] == month_num) & (df['DAY'] == 1)]
    if not exact.empty:
        return exact.index[0]
    # Fallback: first row in that month
    month_rows = df[df['MONTH'] == month_num]
    if not month_rows.empty:
        return month_rows.index[0]
    return 0


def _extract_rows(df: pd.DataFrame, start_idx: int, max_days: int) -> List:
    """
    Extract max_days consecutive rows from the baseline, starting at start_idx.

    If the crop grows past the end of the year (row 364 = Dec 31),
    it wraps back to row 0 (Jan 1) automatically using modulo (%).

    Example:
      start_idx=304 (Nov 1), max_days=120
      → rows 304..364 (Nov–Dec), then wraps to rows 0..58 (Jan–Feb)
      → returns exactly 120 rows covering Nov 1 through Feb 28
    """
    n = len(df)
    rows = []
    for offset in range(max_days):
        idx = (start_idx + offset) % n
        rows.append(df.iloc[idx])
    return rows


def _generate_rainfall(p_wet: float, wet_amount: float, rng: random.Random) -> float:
    """
    Generate daily rainfall using a coin-flip (Bernoulli) method.

    Uses a seeded Random instance so the same config always produces
    the same rainfall sequence across re-simulations.
    """
    if p_wet <= 0 or wet_amount <= 0:
        return 0.0
    if rng.random() < p_wet:
        return round(wet_amount, 2)
    return 0.0


def _build_weather_dict(
    row,
    latitude: float,
    elevation: float,
    season: str,
    rng: random.Random,
) -> Dict[str, Any]:
    """
    Convert one row of the baseline CSV into a weather dict for the simulation.

    This is where raw CSV data gets transformed into the format that
    the SIMPLE crop model (simulation.py) expects.  For each day it:

      1. Reads temperature:  TMAX, TMIN → also computes tmean = (TMAX+TMIN)/2
      2. Reads humidity:     RH (relative humidity %)
      3. Generates rainfall: pWet + WetAmount → coin-flip → mm of rain
      4. Estimates solar radiation (SRAD) using the Hargreaves formula:
           SRAD = 0.16 × Ra × sqrt(TMAX - TMIN)
         Then reduces by 35% on rainy days and clamps to seasonal bounds.
      5. Derives a calendar date from the DOY column (reference year 2025).

    Returns a dict like:
      {'date': '2025-06-01', 'tmax': 23.8, 'tmin': 17.0, 'tmean': 20.4,
       'rainfall': 5.4, 'rh': 87.0, 'srad': 18.5, 'elevation': 1510, ...}
    """
    doy   = int(row['DOY'])
    tmax  = float(row['TMAX'])
    tmin  = float(row['TMIN'])
    tmean = (tmax + tmin) / 2.0
    rh    = float(row['RH'])

    # Stochastic rainfall from baseline probability & amount
    rainfall = _generate_rainfall(
        float(row['pWet']),
        float(row['WetAmount']),
        rng,
    )

    # Derive a calendar date from DOY using a non-leap reference year (2025)
    # Baseline has 365 rows with non-leap DOY numbering (no Feb 29)
    try:
        cal_date = date(2025, 1, 1) + timedelta(days=doy - 1)
    except ValueError:
        cal_date = date(2025, 12, 31)

    # Solar radiation
    ra       = _extraterrestrial_radiation(doy, latitude)
    srad_raw = _estimate_srad_hargreaves(tmax, tmin, ra)

    # Rainy-day cloud correction
    if rainfall >= 1.0:
        srad_raw *= RAINY_DAY_SRAD_FACTOR

    # Clamp to seasonal SRAD range
    srad_min, srad_max = SRAD_BOUNDS[season]
    srad = max(srad_min, min(srad_max, srad_raw))

    return {
        'date':        cal_date.isoformat(),
        'day_of_year': doy,
        'tmax':        tmax,
        'tmin':        tmin,
        'tmean':       tmean,
        'rainfall':    rainfall,
        'rh':          rh,
        'srad':        round(srad, 3),
        'srad_method': 'seasonal_hargreaves',
        'ra':          ra,
        'elevation':   elevation,
        'season':      season,
    }


# ---------------------------------------------------------------------------
# Solar radiation and ET utilities
# These are standard formulas from FAO Irrigation & Drainage Paper No. 56
# (Allen et al., 1998).  Used worldwide for crop water requirement studies.
# ---------------------------------------------------------------------------

def _extraterrestrial_radiation(doy: int, latitude_deg: float) -> float:
    """
    Compute extraterrestrial radiation Ra (MJ/m²/day) — FAO-56 method.

    Ra is the amount of solar energy hitting the TOP of the atmosphere
    (before clouds, dust, etc. reduce it).  It depends on:
      - Day of year (DOY): summer days get more sunlight than winter days
      - Latitude: tropical stations get more than temperate ones

    We need Ra as an input to the Hargreaves SRAD formula below.

    Parameters
    ----------
    doy          : int   — day of year (1–365)
    latitude_deg : float — station latitude in decimal degrees (e.g. 16.40)

    Returns
    -------
    float — Ra in MJ/m²/day (typically 20–40 in the tropics)
    """
    lat = math.radians(latitude_deg)
    Gsc = 0.0820  # solar constant (MJ/m²/min)

    # Inverse relative distance Earth-Sun
    dr = 1 + 0.033 * math.cos(2 * math.pi * doy / 365)

    # Solar declination (radians)
    delta = 0.409 * math.sin(2 * math.pi * doy / 365 - 1.39)

    # Sunset hour angle (radians)
    arg = -math.tan(lat) * math.tan(delta)
    arg = max(-1.0, min(1.0, arg))   # clamp to avoid domain errors
    ws  = math.acos(arg)

    Ra = (
        (24 * 60 / math.pi) * Gsc * dr *
        (ws * math.sin(lat) * math.sin(delta) +
         math.cos(lat) * math.cos(delta) * math.sin(ws))
    )
    return max(0.0, Ra)


def _estimate_srad_hargreaves(tmax: float, tmin: float, ra: float) -> float:
    """
    Estimate solar radiation (SRAD) that actually reaches the ground.

    Uses the Hargreaves formula:
      SRAD = kRs × Ra × sqrt(Tmax - Tmin)

    The idea: bigger temperature swings (Tmax – Tmin) usually mean
    clearer skies → more solar radiation.  Cloudy/rainy days have smaller
    temperature swings because clouds trap heat at night and block sun by day.

    kRs = 0.16 (conservative default for all Philippine stations).
    Could use 0.19 for coastal stations if we want higher accuracy.

    NOTE: This is a rough estimate. If we later parse the Sunshine Duration
    data from PAGASA, we can switch to the more accurate Angstrom formula
    (see _angstrom_srad stub at the bottom of this file).

    Returns float — SRAD in MJ/m²/day (before seasonal/rainy-day adjustments).
    """
    kRs = 0.16
    td  = max(0.0, tmax - tmin)
    return kRs * ra * math.sqrt(td)


def priestley_taylor_eto(
    tmean: float,
    srad: float,
    elevation: float,
    tmax: float,
    tmin: float,
    rh: float,
    ra: float,
) -> float:
    """
    Compute reference evapotranspiration (ETo) using the Priestley-Taylor method
    with FAO-56 net radiation (Rn = Rns - Rnl).

    Formula:
      ETo = 1.26 × (Δ / (Δ + γ)) × 0.408 × Rn

    Net radiation is computed properly per FAO-56:
      Rns = (1 - albedo) × Rs
      Rnl = σ × ((Tmax_K⁴ + Tmin_K⁴)/2) × (0.34 - 0.14√ea) × (1.35 Rs/Rso - 0.35)
      Rn  = Rns - Rnl

    Parameters
    ----------
    tmean     : float — mean daily temperature (°C)
    srad      : float — solar radiation Rs (MJ/m²/day)
    elevation : float — station elevation (m above sea level)
    tmax      : float — maximum daily temperature (°C)
    tmin      : float — minimum daily temperature (°C)
    rh        : float — relative humidity (%)
    ra        : float — extraterrestrial radiation Ra (MJ/m²/day)

    Returns
    -------
    float — reference ET in mm/day (typically 2–6 mm in tropical PH)
    """
    # Slope of saturation vapour pressure curve (kPa/°C)  [FAO-56 Eq. 13]
    es_tmean = 0.6108 * math.exp(17.27 * tmean / (tmean + 237.3))
    delta    = 4098.0 * es_tmean / (tmean + 237.3) ** 2

    # Atmospheric pressure at elevation (kPa)  [FAO-56 Eq. 7]
    P = 101.3 * ((293.0 - 0.0065 * elevation) / 293.0) ** 5.26

    # Psychrometric constant (kPa/°C)  [FAO-56 Eq. 8]
    gamma = 0.000665 * P

    # --- Net radiation (FAO-56) ---

    # Net shortwave radiation  [FAO-56 Eq. 38]
    Rns = (1.0 - ALBEDO) * srad

    # Actual vapour pressure from relative humidity  [FAO-56 Eq. 17]
    es_tmax = 0.6108 * math.exp(17.27 * tmax / (tmax + 237.3))
    es_tmin = 0.6108 * math.exp(17.27 * tmin / (tmin + 237.3))
    ea = (rh / 100.0) * (es_tmax + es_tmin) / 2.0
    ea = max(ea, 0.001)  # prevent sqrt of negative

    # Clear-sky radiation  [FAO-56 Eq. 37]
    Rso = (0.75 + 2e-5 * elevation) * ra
    Rso = max(Rso, 0.001)  # prevent division by zero

    # Net longwave radiation  [FAO-56 Eq. 39]
    tmax_K = tmax + 273.16
    tmin_K = tmin + 273.16
    Rnl = (STEFAN_BOLTZMANN
           * (tmax_K ** 4 + tmin_K ** 4) / 2.0
           * (0.34 - 0.14 * math.sqrt(ea))
           * (1.35 * min(srad / Rso, 1.0) - 0.35))

    Rn = Rns - Rnl

    # Priestley-Taylor ETo
    eto = 1.26 * (delta / (delta + gamma)) * 0.408 * Rn
    return max(0.0, eto)


def hargreaves_etp(tmax: float, tmin: float, tmean: float, ra: float) -> float:
    """
    Hargreaves-Samani reference evapotranspiration (mm/day).

    ETo = 0.0023 × Ra × (Tmax - Tmin)^0.5 × (Tmean + 17.8)

    NOTE: This function is kept as a backup / for reference only.
    The simulation currently uses priestley_taylor_eto() instead,
    which is more accurate because it accounts for station elevation
    and seasonally-corrected solar radiation.

    Returns float — reference ET in mm/day
    """
    td  = max(0.0, tmax - tmin)
    eto = 0.0023 * ra * math.sqrt(td) * (tmean + 17.8)
    return max(0.0, eto)


# ---------------------------------------------------------------------------
# SUGGESTION — Angstrom SRAD stub (to replace Hargreaves once XLS data parsed)
# ---------------------------------------------------------------------------

def _angstrom_srad(ra: float, n: float, N: float,
                   a_s: float = 0.25, b_s: float = 0.50) -> float:
    """
    STUB — Estimate SRAD from actual sunshine hours using Angstrom equation.

    SRAD = Ra × (a_s + b_s × n/N)

    Parameters
    ----------
    ra : float — extraterrestrial radiation (MJ/m²/day)
    n  : float — actual sunshine duration (hours)
    N  : float — maximum possible sunshine duration (hours); compute from ws
    a_s, b_s : Angstrom regression constants (default FAO-56 values)

    To activate: parse the Sunshine Duration XLS files in weather.py,
    merge them with the daily CSV by date, then call this function
    instead of _estimate_srad_hargreaves().

    Returns float — SRAD in MJ/m²/day
    """
    if N <= 0:
        return 0.0
    return ra * (a_s + b_s * (n / N))
