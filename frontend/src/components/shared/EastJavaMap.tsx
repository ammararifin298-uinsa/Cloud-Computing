import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface CityCoord {
  name: string;
  lat: number;
  lng: number;
  hub?: string;
}

export const JATIM_COORDS: CityCoord[] = [
  { name: "Surabaya", lat: -7.2575, lng: 112.7521, hub: "DC Rungkut, Surabaya (Gudang Utama)" },
  { name: "Sidoarjo", lat: -7.4478, lng: 112.7183, hub: "Hub Sidoarjo" },
  { name: "Gresik", lat: -7.1567, lng: 112.6555, hub: "Hub Gresik" },
  { name: "Mojokerto", lat: -7.4726, lng: 112.4336, hub: "Hub Mojokerto" },
  { name: "Pasuruan", lat: -7.6453, lng: 112.9075, hub: "Hub Pasuruan" },
  { name: "Malang", lat: -7.9666, lng: 112.6326, hub: "Hub Regional Singosari, Malang" },
  { name: "Batu", lat: -7.8712, lng: 112.5269, hub: "Gerai Batu" },
  { name: "Kediri", lat: -7.848, lng: 112.0178, hub: "Hub Kediri" },
  { name: "Blitar", lat: -8.0955, lng: 112.1609, hub: "Gerai Blitar" },
  { name: "Madiun", lat: -7.6298, lng: 111.5239, hub: "Hub Madiun" },
  { name: "Jember", lat: -8.1845, lng: 113.6681, hub: "Hub Jember" },
  { name: "Banyuwangi", lat: -8.2192, lng: 114.3691, hub: "Hub Banyuwangi" },
  { name: "Probolinggo", lat: -7.7543, lng: 113.2159, hub: "Hub Probolinggo" },
  { name: "Lamongan", lat: -7.1193, lng: 112.4167, hub: "Gerai Lamongan" },
  { name: "Bojonegoro", lat: -7.1502, lng: 111.8817, hub: "Hub Bojonegoro" },
  { name: "Tuban", lat: -6.8976, lng: 112.0649, hub: "Gerai Tuban" },
  { name: "Bangkalan", lat: -7.0455, lng: 112.7351, hub: "Gerai Bangkalan" },
  { name: "Pamekasan", lat: -7.1568, lng: 113.4746, hub: "Hub Pamekasan" },
  { name: "Sumenep", lat: -7.0167, lng: 113.8667, hub: "Gerai Sumenep" },
];

function findCoord(query?: string): CityCoord | null {
  if (!query) return null;
  const q = query.toLowerCase();
  return (
    JATIM_COORDS.find((c) => q.includes(c.name.toLowerCase())) ||
    JATIM_COORDS[0]
  );
}

function createPinIcon(color: string, size = 14, pulse = false) {
  return L.divIcon({
    className: "lacakin-map-pin",
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      ${
        pulse
          ? `<span style="position:absolute;inset:-6px;border-radius:9999px;background:${color};opacity:0.35;"></span>`
          : ""
      }
      <span style="display:block;width:100%;height:100%;border-radius:9999px;background:${color};border:2.5px solid #ffffff;box-shadow:0 2px 6px rgba(15,35,84,0.35);"></span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface EastJavaMapProps {
  mode?: "network" | "route";
  originCity?: string;
  destCity?: string;
  currentLocation?: string;
  heightClass?: string;
}

export function EastJavaMap({
  mode = "network",
  originCity,
  destCity,
  currentLocation,
  heightClass = "h-[260px] sm:h-[300px]",
}: EastJavaMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      center: [-7.65, 112.75],
      zoom: 8,
      scrollWheelZoom: false,
      attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);

    if (mode === "route" && (originCity || destCity)) {
      const origin = findCoord(originCity) || JATIM_COORDS[0];
      const dest = findCoord(destCity) || JATIM_COORDS[1];
      const current = findCoord(currentLocation) || origin;

      L.polyline(
        [
          [origin.lat, origin.lng],
          [current.lat, current.lng],
          [dest.lat, dest.lng],
        ],
        { color: "#2563eb", weight: 3.5, dashArray: "7 6", opacity: 0.9 }
      ).addTo(map);

      L.marker([origin.lat, origin.lng], { icon: createPinIcon("#1d4ed8", 14) })
        .addTo(map)
        .bindPopup(`<strong>Asal:</strong> ${originCity || origin.name}`);

      L.marker([current.lat, current.lng], { icon: createPinIcon("#0ea5e9", 16, true) })
        .addTo(map)
        .bindPopup(`<strong>Posisi Saat Ini:</strong> ${currentLocation || current.name}`)
        .openPopup();

      L.marker([dest.lat, dest.lng], { icon: createPinIcon("#dc2626", 14) })
        .addTo(map)
        .bindPopup(`<strong>Tujuan:</strong> ${destCity || dest.name}`);

      const bounds = L.latLngBounds([
        [origin.lat, origin.lng],
        [current.lat, current.lng],
        [dest.lat, dest.lng],
      ]);
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 11 });
    } else {
      const sby = JATIM_COORDS[0];
      JATIM_COORDS.forEach((city, idx) => {
        const isMain = idx === 0;
        const marker = L.marker([city.lat, city.lng], {
          icon: createPinIcon(isMain ? "#1d4ed8" : "#2563eb", isMain ? 16 : 12, isMain),
        }).addTo(map);
        marker.bindPopup(
          `<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:12px;">
            <strong>${city.name}</strong><br/>
            <span style="color:#475569;">${city.hub || "Gerai LacakIn"}</span>
          </div>`
        );

        if (!isMain && idx <= 11) {
          L.polyline(
            [
              [sby.lat, sby.lng],
              [city.lat, city.lng],
            ],
            { color: "#2563eb", weight: 1.8, dashArray: "5 5", opacity: 0.55 }
          ).addTo(map);
        }
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mode, originCity, destCity, currentLocation]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-200 z-0`}
    />
  );
}
