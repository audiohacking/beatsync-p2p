import { countryCodeEmoji } from "@/lib/country/countryCode";
import { LocationSchema, MAX_LOCATION_QUALITY, sanitizeLocationFields, scoreLocationQuality } from "@beatsync/shared";
import { z } from "zod";
import { getCountryName } from "./country/codeToName";

type RequiredResponse = Pick<z.infer<typeof LocationSchema>, "city" | "country" | "region" | "countryCode">;

const FETCH_TIMEOUT_MS = 5000;

let cachedLocation: z.infer<typeof LocationSchema> | null = null;

const toLocation = (response: RequiredResponse): z.infer<typeof LocationSchema> => {
  const sanitized = sanitizeLocationFields(response);
  return {
    ...sanitized,
    country: getCountryName(sanitized.countryCode) || sanitized.country,
    flagEmoji: countryCodeEmoji(sanitized.countryCode),
    flagSvgURL: getFlagSvgURLFromCountryCode(sanitized.countryCode),
  };
};

export const getUserLocation = async (): Promise<z.infer<typeof LocationSchema>> => {
  if (cachedLocation) {
    return cachedLocation;
  }

  // CORS-friendly providers only (country.is / ipwho / ipapi often fail on GitHub Pages).
  const locationServices = [getUserLocationGeoJS, getUserLocationKameroGeo];

  const results = await Promise.allSettled(locationServices.map((service) => service()));

  let bestResponse: RequiredResponse | null = null;
  let bestScore = -1;

  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      console.warn(`Location service ${locationServices[index].name} failed:`, result.reason);
      continue;
    }
    const response = result.value;
    const score = scoreLocationQuality(response);
    console.log(
      `${locationServices[index].name}: score=${score}/${MAX_LOCATION_QUALITY}. Hello person from ${response.country}!`
    );
    if (score > bestScore) {
      bestResponse = response;
      bestScore = score;
    }
  }

  if (!bestResponse) {
    throw new Error("All IP location services failed");
  }

  const location = toLocation(bestResponse);
  cachedLocation = location;
  return location;
};

const getFlagSvgURLFromCountryCode = (countryCode: string) => {
  if (countryCode.length !== 2) {
    throw new Error(`Country code must be exactly 2 characters, got: ${countryCode}`);
  }

  return `/flags/${countryCode.toLowerCase()}.svg`;
};

// https://www.geojs.io — Cloudflare-backed, full CORS, no key, unlimited
const GeoJSResponseSchema = z.object({
  country_code: z.string(),
  country: z.string(),
  city: z.string().optional(),
  region: z.string().optional(),
});

const getUserLocationGeoJS = async (): Promise<RequiredResponse> => {
  const rawResponse = await fetch("https://get.geojs.io/v1/ip/geo.json", {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!rawResponse.ok) {
    throw new Error(`Failed to fetch geolocation: ${rawResponse.status} ${rawResponse.statusText}`);
  }

  const response = GeoJSResponseSchema.parse(await rawResponse.json());

  return {
    city: response.city ?? "",
    country: response.country,
    region: response.region ?? "",
    countryCode: response.country_code,
  };
};

// https://geo.kamero.ai — Vercel Edge, CORS, no key, free
const KameroGeoResponseSchema = z.object({
  country: z.string(),
  city: z.string().optional(),
  countryRegion: z.string().optional(),
});

const getUserLocationKameroGeo = async (): Promise<RequiredResponse> => {
  const rawResponse = await fetch("https://geo.kamero.ai/api/geo", {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!rawResponse.ok) {
    throw new Error(`Failed to fetch geolocation: ${rawResponse.status} ${rawResponse.statusText}`);
  }

  const response = KameroGeoResponseSchema.parse(await rawResponse.json());

  return {
    city: response.city ?? "",
    country: response.country,
    region: response.countryRegion ?? "",
    countryCode: response.country,
  };
};
