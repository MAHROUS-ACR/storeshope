import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "@/lib/languageContext";

interface MapSelectorProps {
  onLocationSelect: (address: string, lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
}

export function MapSelector({ 
  onLocationSelect, 
  initialLat = 30.0444, 
  initialLng = 31.2357,
  initialAddress = ""
}: MapSelectorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const { language } = useLanguage();
  const [selectedLat, setSelectedLat] = useState(initialLat);
  const [selectedLng, setSelectedLng] = useState(initialLng);
  const [address, setAddress] = useState(initialAddress);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = L.map(mapContainer.current).setView([selectedLat, selectedLng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map.current);

    // Add marker
    marker.current = L.marker([selectedLat, selectedLng])
      .addTo(map.current)
      .bindPopup(
        `<div style="text-align: ${language === "ar" ? "right" : "left"}; direction: ${language === "ar" ? "rtl" : "ltr"}">
          <strong>${language === "ar" ? "الموقع المختار" : "Selected Location"}</strong><br/>
          ${language === "ar" ? "خط العرض:" : "Latitude:"} ${selectedLat.toFixed(6)}<br/>
          ${language === "ar" ? "خط الطول:" : "Longitude:"} ${selectedLng.toFixed(6)}
        </div>`
      );

    // Map click handler
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSelectedLat(lat);
      setSelectedLng(lng);

      if (marker.current) {
        marker.current.setLatLng([lat, lng]);
        marker.current.setPopupContent(
          `<div style="text-align: ${language === "ar" ? "right" : "left"}; direction: ${language === "ar" ? "rtl" : "ltr"}">
            <strong>${language === "ar" ? "الموقع المختار" : "Selected Location"}</strong><br/>
            ${language === "ar" ? "خط العرض:" : "Latitude:"} ${lat.toFixed(6)}<br/>
            ${language === "ar" ? "خط الطول:" : "Longitude:"} ${lng.toFixed(6)}
          </div>`
        );
      }

      // Reverse geocode to get address (using nominatim - free service)
      reverseGeocode(lat, lng);
    };

    map.current.on("click", handleMapClick);

    return () => {
      map.current?.off("click", handleMapClick);
    };
  }, []);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      setIsLoadingLocation(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            "Accept-Language": language === "ar" ? "ar" : "en",
          },
        }
      );
      const data = await response.json();
      const addressText = data.address?.road
        ? `${data.address.road}, ${data.address.city || data.address.town || ""}`
        : data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(addressText);
    } catch (error) {
      console.log("Geocoding error:", error);
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleConfirmLocation = () => {
    onLocationSelect(address, selectedLat, selectedLng);
  };

  const handleUseCurrentLocation = () => {
    if ("geolocation" in navigator) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setSelectedLat(latitude);
          setSelectedLng(longitude);

          if (map.current) {
            map.current.setView([latitude, longitude], 13);
          }

          if (marker.current) {
            marker.current.setLatLng([latitude, longitude]);
            marker.current.setPopupContent(
              `<div style="text-align: ${language === "ar" ? "right" : "left"}; direction: ${language === "ar" ? "rtl" : "ltr"}">
                <strong>${language === "ar" ? "الموقع الحالي" : "Current Location"}</strong><br/>
                ${language === "ar" ? "خط العرض:" : "Latitude:"} ${latitude.toFixed(6)}<br/>
                ${language === "ar" ? "خط الطول:" : "Longitude:"} ${longitude.toFixed(6)}
              </div>`
            );
          }

          reverseGeocode(latitude, longitude);
        },
        (error) => {
          console.log("Geolocation error:", error);
          setIsLoadingLocation(false);
        }
      );
    }
  };

  return (
    <div className="space-y-3">
      <div
        ref={mapContainer}
        style={{ height: "300px", borderRadius: "12px", border: "2px solid #e5e7eb" }}
      />

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">
          {language === "ar" ? "📍 الموقع على الخريطة" : "📍 Location on Map"}
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={language === "ar" ? "العنوان المختار" : "Selected address"}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
        <p className="text-xs text-gray-600">
          {language === "ar"
            ? `خط العرض: ${selectedLat.toFixed(6)}, خط الطول: ${selectedLng.toFixed(6)}`
            : `Latitude: ${selectedLat.toFixed(6)}, Longitude: ${selectedLng.toFixed(6)}`}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleUseCurrentLocation}
          disabled={isLoadingLocation}
          className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400 transition"
        >
          {isLoadingLocation
            ? language === "ar"
              ? "⏳ جاري..."
              : "⏳ Loading..."
            : language === "ar"
            ? "📍 موقعي الحالي"
            : "📍 My Location"}
        </button>
        <button
          onClick={handleConfirmLocation}
          className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition"
        >
          {language === "ar" ? "✅ تأكيد الموقع" : "✅ Confirm Location"}
        </button>
      </div>

      <p className="text-xs text-gray-600 text-center">
        {language === "ar"
          ? "👆 اضغط على الخريطة لتحديد الموقع أو استخدم زر الموقع الحالي"
          : "👆 Click on the map to select location or use current location button"}
      </p>
    </div>
  );
}
