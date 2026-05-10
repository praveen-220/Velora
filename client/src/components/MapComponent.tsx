"use client";
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const VeloraIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #6366f1; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(99,102,241,0.6);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

interface MapProps {
    center?: [number, number];
    zoom?: number;
    markers?: any[];
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

export default function MapComponent({ center = [20.5937, 78.9629], zoom = 5, markers = [] }: MapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return <div className="w-full h-full bg-slate-900 animate-pulse rounded-3xl" />;

    return (
        <div className="w-full h-full rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative">
            <MapContainer 
                center={center} 
                zoom={zoom} 
                style={{ height: '100%', width: '100%', background: '#020617' }}
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                <ChangeView center={center} zoom={zoom} />
                {markers.map((m, i) => (
                    m.lat && m.lng && (
                        <Marker key={i} position={[m.lat, m.lng]} icon={VeloraIcon}>
                            {m.label && (
                                <Popup className="velora-popup">
                                    <div className="font-black text-[10px] uppercase tracking-widest text-slate-900">{m.label}</div>
                                </Popup>
                            )}
                        </Marker>
                    )
                ))}
            </MapContainer>
            <style jsx global>{`
                .velora-popup .leaflet-popup-content-wrapper {
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(10px);
                    border-radius: 12px;
                    padding: 4px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                .velora-popup .leaflet-popup-tip {
                    background: rgba(255, 255, 255, 0.9);
                }
            `}</style>
        </div>
    );
}
