import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CropId, LocationId, CO2LevelId, MonthId } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Crop display functions
export function getCropDisplayName(cropId: CropId): string {
  const names: Record<CropId, string> = {
    sweet_corn: "Sweet Corn",
    carrot: "Carrot",
    tomato: "Tomato",
  };
  return names[cropId];
}

export function getCropScientificName(cropId: CropId): string {
  const names: Record<CropId, string> = {
    sweet_corn: "Zea mays",
    carrot: "Daucus carota",
    tomato: "Solanum lycopersicum",
  };
  return names[cropId];
}

export function getCropBaseEmoji(cropId: CropId): string {
  const emojis: Record<CropId, string> = {
    sweet_corn: "🌽",
    carrot: "🥕",
    tomato: "🍅",
  };
  return emojis[cropId];
}

// Location display functions
export function getLocationDisplayName(locationId: LocationId): string {
  const names: Record<LocationId, string> = {
    baguio_benguet: "Baguio, Benguet",
    malaybalay_bukidnon: "Malaybalay, Bukidnon",
    tuguegarao_cagayan: "Tuguegarao, Cagayan",
  };
  return names[locationId];
}

// Month display functions
export function getMonthDisplayName(monthId: MonthId): string {
  const names: Record<MonthId, string> = {
    january: "January",
    february: "February",
    march: "March",
    april: "April",
    may: "May",
    june: "June",
    july: "July",
    august: "August",
    september: "September",
    october: "October",
    november: "November",
    december: "December",
  };
  return names[monthId];
}

// CO2 level display functions
export function getCO2DisplayName(co2LevelId: CO2LevelId): string {
  const names: Record<CO2LevelId, string> = {
    low: "Low CO₂ (350 ppm)",
    medium: "Medium CO₂ (500 ppm)",
    high: "High CO₂ (700 ppm)",
  };
  return names[co2LevelId];
}

export function getCO2Value(co2LevelId: CO2LevelId): number {
  const values: Record<CO2LevelId, number> = {
    low: 350,
    medium: 500,
    high: 700,
  };
  return values[co2LevelId];
}
