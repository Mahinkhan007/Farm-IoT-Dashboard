import React, { useState, useEffect, useRef, useCallback } from 'react';
import './DashboardPage.css';
import { supabase } from '../lib/supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

type SensorStatus = 'good' | 'warning' | 'alert';
type NodeStatus = 'Online' | 'Offline' | 'Warning' | 'Alert';
type ViewMode = 'tabular' | 'satellite' | 'autoplay';

interface SensorReading {
  id: string;
  value: number;
  unit: string;
  status: SensorStatus;
}

interface SensorNode {
  nodeId: number;
  label: string;
  zone: string;
  status: NodeStatus;
  humidity: SensorReading[];
  soilMoisture: SensorReading[];
  lastUpdated: string;
  position: { x: number; y: number }; // SVG percentage position
}

interface UserProfile {
  id: string;
  email: string;
  role: string;
  assigned_lands: string[] | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_LANDS = ['Batang Kali', 'Saba', 'MMU Vanilla Plantation'];

// ─── Status Helpers ───────────────────────────────────────────────────────────

const getHumidityStatus = (v: number): SensorStatus => {
  if (v >= 50 && v <= 80) return 'good';
  if (v >= 30 && v <= 90) return 'warning';
  return 'alert';
};

const getSoilStatus = (v: number): SensorStatus => {
  if (v >= 35 && v <= 65) return 'good';
  if (v >= 20 && v <= 75) return 'warning';
  return 'alert';
};

const statusColor: Record<SensorStatus, string> = {
  good: '#22c55e',
  warning: '#f59e0b',
  alert: '#ef4444',
};

const nodeStatusColor: Record<NodeStatus, string> = {
  Online: '#22c55e',
  Warning: '#f59e0b',
  Alert: '#ef4444',
  Offline: '#94a3b8',
};

// ─── Mock Sensor Data ─────────────────────────────────────────────────────────

const MOCK_DATA: Record<string, SensorNode[]> = {
  'Batang Kali': [
    {
      nodeId: 1, label: 'ESP32-01', zone: 'Zone A', status: 'Online',
      humidity: [
        { id: 'H1', value: 72.3, unit: '%', status: 'good' },
        { id: 'H2', value: 68.1, unit: '%', status: 'good' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 55.2, unit: '%', status: 'good' },
        { id: 'SM2', value: 48.7, unit: '%', status: 'good' },
        { id: 'SM3', value: 61.3, unit: '%', status: 'good' },
        { id: 'SM4', value: 53.8, unit: '%', status: 'good' },
      ],
      lastUpdated: '1 min ago', position: { x: 18, y: 28 },
    },
    {
      nodeId: 2, label: 'ESP32-02', zone: 'Zone B', status: 'Online',
      humidity: [
        { id: 'H1', value: 65.8, unit: '%', status: 'good' },
        { id: 'H2', value: 71.2, unit: '%', status: 'good' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 43.9, unit: '%', status: 'good' },
        { id: 'SM2', value: 52.1, unit: '%', status: 'good' },
        { id: 'SM3', value: 47.8, unit: '%', status: 'good' },
        { id: 'SM4', value: 50.3, unit: '%', status: 'good' },
      ],
      lastUpdated: '2 min ago', position: { x: 50, y: 28 },
    },
    {
      nodeId: 3, label: 'ESP32-03', zone: 'Zone C', status: 'Warning',
      humidity: [
        { id: 'H1', value: 88.5, unit: '%', status: 'warning' },
        { id: 'H2', value: 84.1, unit: '%', status: 'warning' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 77.3, unit: '%', status: 'warning' },
        { id: 'SM2', value: 79.8, unit: '%', status: 'warning' },
        { id: 'SM3', value: 82.1, unit: '%', status: 'alert' },
        { id: 'SM4', value: 85.6, unit: '%', status: 'alert' },
      ],
      lastUpdated: '3 min ago', position: { x: 82, y: 28 },
    },
    {
      nodeId: 4, label: 'ESP32-04', zone: 'Zone D', status: 'Online',
      humidity: [
        { id: 'H1', value: 61.4, unit: '%', status: 'good' },
        { id: 'H2', value: 59.8, unit: '%', status: 'good' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 38.5, unit: '%', status: 'good' },
        { id: 'SM2', value: 44.2, unit: '%', status: 'good' },
        { id: 'SM3', value: 41.7, unit: '%', status: 'good' },
        { id: 'SM4', value: 36.9, unit: '%', status: 'good' },
      ],
      lastUpdated: '1 min ago', position: { x: 18, y: 72 },
    },
    {
      nodeId: 5, label: 'ESP32-05', zone: 'Zone E', status: 'Online',
      humidity: [
        { id: 'H1', value: 74.6, unit: '%', status: 'good' },
        { id: 'H2', value: 70.3, unit: '%', status: 'good' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 57.8, unit: '%', status: 'good' },
        { id: 'SM2', value: 63.4, unit: '%', status: 'good' },
        { id: 'SM3', value: 51.2, unit: '%', status: 'good' },
        { id: 'SM4', value: 59.1, unit: '%', status: 'good' },
      ],
      lastUpdated: '2 min ago', position: { x: 50, y: 72 },
    },
    {
      nodeId: 6, label: 'ESP32-06', zone: 'Zone F', status: 'Offline',
      humidity: [
        { id: 'H1', value: 0, unit: '%', status: 'alert' },
        { id: 'H2', value: 0, unit: '%', status: 'alert' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 0, unit: '%', status: 'alert' },
        { id: 'SM2', value: 0, unit: '%', status: 'alert' },
        { id: 'SM3', value: 0, unit: '%', status: 'alert' },
        { id: 'SM4', value: 0, unit: '%', status: 'alert' },
      ],
      lastUpdated: '15 min ago', position: { x: 82, y: 72 },
    },
  ],
  'Saba': [
    {
      nodeId: 1, label: 'ESP32-01', zone: 'Zone A', status: 'Online',
      humidity: [
        { id: 'H1', value: 78.4, unit: '%', status: 'good' },
        { id: 'H2', value: 75.9, unit: '%', status: 'good' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 62.3, unit: '%', status: 'good' },
        { id: 'SM2', value: 58.7, unit: '%', status: 'good' },
        { id: 'SM3', value: 55.1, unit: '%', status: 'good' },
        { id: 'SM4', value: 60.7, unit: '%', status: 'good' },
      ],
      lastUpdated: '1 min ago', position: { x: 18, y: 28 },
    },
    {
      nodeId: 2, label: 'ESP32-02', zone: 'Zone B', status: 'Online',
      humidity: [
        { id: 'H1', value: 69.2, unit: '%', status: 'good' },
        { id: 'H2', value: 73.5, unit: '%', status: 'good' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 47.6, unit: '%', status: 'good' },
        { id: 'SM2', value: 53.8, unit: '%', status: 'good' },
        { id: 'SM3', value: 49.2, unit: '%', status: 'good' },
        { id: 'SM4', value: 51.4, unit: '%', status: 'good' },
      ],
      lastUpdated: '2 min ago', position: { x: 50, y: 28 },
    },
    {
      nodeId: 3, label: 'ESP32-03', zone: 'Zone C', status: 'Online',
      humidity: [
        { id: 'H1', value: 64.7, unit: '%', status: 'good' },
        { id: 'H2', value: 67.3, unit: '%', status: 'good' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 44.1, unit: '%', status: 'good' },
        { id: 'SM2', value: 40.8, unit: '%', status: 'good' },
        { id: 'SM3', value: 46.3, unit: '%', status: 'good' },
        { id: 'SM4', value: 43.2, unit: '%', status: 'good' },
      ],
      lastUpdated: '1 min ago', position: { x: 82, y: 28 },
    },
    {
      nodeId: 4, label: 'ESP32-04', zone: 'Zone D', status: 'Warning',
      humidity: [
        { id: 'H1', value: 85.6, unit: '%', status: 'warning' },
        { id: 'H2', value: 87.2, unit: '%', status: 'warning' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 71.4, unit: '%', status: 'warning' },
        { id: 'SM2', value: 73.9, unit: '%', status: 'warning' },
        { id: 'SM3', value: 68.2, unit: '%', status: 'good' },
        { id: 'SM4', value: 70.1, unit: '%', status: 'warning' },
      ],
      lastUpdated: '3 min ago', position: { x: 18, y: 72 },
    },
    {
      nodeId: 5, label: 'ESP32-05', zone: 'Zone E', status: 'Online',
      humidity: [
        { id: 'H1', value: 72.8, unit: '%', status: 'good' },
        { id: 'H2', value: 69.4, unit: '%', status: 'good' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 58.3, unit: '%', status: 'good' },
        { id: 'SM2', value: 61.7, unit: '%', status: 'good' },
        { id: 'SM3', value: 54.9, unit: '%', status: 'good' },
        { id: 'SM4', value: 56.8, unit: '%', status: 'good' },
      ],
      lastUpdated: '2 min ago', position: { x: 50, y: 72 },
    },
    {
      nodeId: 6, label: 'ESP32-06', zone: 'Zone F', status: 'Online',
      humidity: [
        { id: 'H1', value: 67.1, unit: '%', status: 'good' },
        { id: 'H2', value: 71.8, unit: '%', status: 'good' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 52.4, unit: '%', status: 'good' },
        { id: 'SM2', value: 48.6, unit: '%', status: 'good' },
        { id: 'SM3', value: 56.8, unit: '%', status: 'good' },
        { id: 'SM4', value: 54.3, unit: '%', status: 'good' },
      ],
      lastUpdated: '1 min ago', position: { x: 82, y: 72 },
    },
  ],
  'MMU Vanilla Plantation': [
    {
      nodeId: 1, label: 'ESP32-01', zone: 'Zone A', status: 'Online',
      humidity: [
        { id: 'H1', value: 66.9, unit: '%', status: 'good' },
        { id: 'H2', value: 63.4, unit: '%', status: 'good' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 42.7, unit: '%', status: 'good' },
        { id: 'SM2', value: 39.5, unit: '%', status: 'good' },
        { id: 'SM3', value: 45.8, unit: '%', status: 'good' },
        { id: 'SM4', value: 41.2, unit: '%', status: 'good' },
      ],
      lastUpdated: '1 min ago', position: { x: 18, y: 28 },
    },
    {
      nodeId: 2, label: 'ESP32-02', zone: 'Zone B', status: 'Online',
      humidity: [
        { id: 'H1', value: 70.5, unit: '%', status: 'good' },
        { id: 'H2', value: 74.2, unit: '%', status: 'good' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 60.1, unit: '%', status: 'good' },
        { id: 'SM2', value: 57.4, unit: '%', status: 'good' },
        { id: 'SM3', value: 63.8, unit: '%', status: 'good' },
        { id: 'SM4', value: 61.3, unit: '%', status: 'good' },
      ],
      lastUpdated: '2 min ago', position: { x: 50, y: 28 },
    },
    {
      nodeId: 3, label: 'ESP32-03', zone: 'Zone C', status: 'Online',
      humidity: [
        { id: 'H1', value: 62.3, unit: '%', status: 'good' },
        { id: 'H2', value: 58.9, unit: '%', status: 'good' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 37.6, unit: '%', status: 'good' },
        { id: 'SM2', value: 41.3, unit: '%', status: 'good' },
        { id: 'SM3', value: 35.9, unit: '%', status: 'good' },
        { id: 'SM4', value: 38.4, unit: '%', status: 'good' },
      ],
      lastUpdated: '3 min ago', position: { x: 82, y: 28 },
    },
    {
      nodeId: 4, label: 'ESP32-04', zone: 'Zone D', status: 'Online',
      humidity: [
        { id: 'H1', value: 75.8, unit: '%', status: 'good' },
        { id: 'H2', value: 71.3, unit: '%', status: 'good' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 55.9, unit: '%', status: 'good' },
        { id: 'SM2', value: 62.4, unit: '%', status: 'good' },
        { id: 'SM3', value: 58.7, unit: '%', status: 'good' },
        { id: 'SM4', value: 57.6, unit: '%', status: 'good' },
      ],
      lastUpdated: '1 min ago', position: { x: 18, y: 72 },
    },
    {
      nodeId: 5, label: 'ESP32-05', zone: 'Zone E', status: 'Alert',
      humidity: [
        { id: 'H1', value: 25.4, unit: '%', status: 'alert' },
        { id: 'H2', value: 22.1, unit: '%', status: 'alert' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 15.3, unit: '%', status: 'alert' },
        { id: 'SM2', value: 12.8, unit: '%', status: 'alert' },
        { id: 'SM3', value: 18.6, unit: '%', status: 'alert' },
        { id: 'SM4', value: 14.1, unit: '%', status: 'alert' },
      ],
      lastUpdated: '8 min ago', position: { x: 50, y: 72 },
    },
    {
      nodeId: 6, label: 'ESP32-06', zone: 'Zone F', status: 'Online',
      humidity: [
        { id: 'H1', value: 68.7, unit: '%', status: 'good' },
        { id: 'H2', value: 64.5, unit: '%', status: 'good' },
      ],
      soilMoisture: [
        { id: 'SM1', value: 49.8, unit: '%', status: 'good' },
        { id: 'SM2', value: 53.2, unit: '%', status: 'good' },
        { id: 'SM3', value: 46.9, unit: '%', status: 'good' },
        { id: 'SM4', value: 48.3, unit: '%', status: 'good' },
      ],
      lastUpdated: '2 min ago', position: { x: 82, y: 72 },
    },
  ],
};

// ─── Live Data Helpers ────────────────────────────────────────────────────────

// ESP IDs in order — maps to Zone A…F
const ESP_ORDER = ['esp-1', 'esp-2', 'esp-3', 'esp-4', 'esp-5', 'esp-6'];

const NODE_POSITIONS = [
  { x: 18, y: 28 }, { x: 50, y: 28 }, { x: 82, y: 28 },
  { x: 18, y: 72 }, { x: 50, y: 72 }, { x: 82, y: 72 },
];

const ZONE_LABELS = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F'];

// How many minutes before a node is considered Offline
const OFFLINE_THRESHOLD_MINUTES = 90; // 3× the 30-min send interval for safe margin

type RawReading = {
  esp_id: string; land_name: string; zone: string | null;
  soil_1: number | null; soil_2: number | null;
  soil_3: number | null; soil_4: number | null;
  temp_1: number | null; hum_1: number | null;
  temp_2: number | null; hum_2: number | null;
  created_at: string;
};

function formatLastUpdated(isoString: string): string {
  const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function mapRawToNode(row: RawReading, index: number): SensorNode {
  const mins = Math.floor((Date.now() - new Date(row.created_at).getTime()) / 60000);
  const offline = mins > OFFLINE_THRESHOLD_MINUTES;

  const h1  = row.hum_1  ?? 0;
  const h2  = row.hum_2  ?? 0;
  const sm1 = row.soil_1 ?? 0;
  const sm2 = row.soil_2 ?? 0;
  const sm3 = row.soil_3 ?? 0;
  const sm4 = row.soil_4 ?? 0;

  const humidity: SensorReading[] = [
    { id: 'H1', value: h1, unit: '%', status: offline ? 'alert' : getHumidityStatus(h1) },
    { id: 'H2', value: h2, unit: '%', status: offline ? 'alert' : getHumidityStatus(h2) },
  ];
  const soilMoisture: SensorReading[] = [
    { id: 'SM1', value: sm1, unit: '%', status: offline ? 'alert' : getSoilStatus(sm1) },
    { id: 'SM2', value: sm2, unit: '%', status: offline ? 'alert' : getSoilStatus(sm2) },
    { id: 'SM3', value: sm3, unit: '%', status: offline ? 'alert' : getSoilStatus(sm3) },
    { id: 'SM4', value: sm4, unit: '%', status: offline ? 'alert' : getSoilStatus(sm4) },
  ];

  const worst = [...humidity, ...soilMoisture].reduce<SensorStatus>((w, s) => {
    if (s.status === 'alert') return 'alert';
    if (s.status === 'warning' && w !== 'alert') return 'warning';
    return w;
  }, 'good');

  let status: NodeStatus = 'Online';
  if (offline)             status = 'Offline';
  else if (worst === 'alert')   status = 'Alert';
  else if (worst === 'warning') status = 'Warning';

  return {
    nodeId: index + 1,
    label:  `ESP32-0${index + 1}`,
    zone:   row.zone ?? ZONE_LABELS[index],
    status,
    humidity,
    soilMoisture,
    lastUpdated: formatLastUpdated(row.created_at),
    position:    NODE_POSITIONS[index],
  };
}

function makeOfflineNode(index: number): SensorNode {
  return {
    nodeId: index + 1,
    label:  `ESP32-0${index + 1}`,
    zone:   ZONE_LABELS[index],
    status: 'Offline',
    humidity:     [
      { id: 'H1', value: 0, unit: '%', status: 'alert' },
      { id: 'H2', value: 0, unit: '%', status: 'alert' },
    ],
    soilMoisture: [
      { id: 'SM1', value: 0, unit: '%', status: 'alert' },
      { id: 'SM2', value: 0, unit: '%', status: 'alert' },
      { id: 'SM3', value: 0, unit: '%', status: 'alert' },
      { id: 'SM4', value: 0, unit: '%', status: 'alert' },
    ],
    lastUpdated: 'No data',
    position:    NODE_POSITIONS[index],
  };
}

// ─── Satellite Farm Map ───────────────────────────────────────────────────────

interface SensorHotspot {
  id: string;
  label: string;       // S1–S4 or T1–T2
  type: 'soil' | 'dht';
  zoneIdx: number;     // 0–5 → ESP32-01…06
  dataIdx: number;     // soilMoisture[0–3] or humidity[0–1]
  x: number;           // % from left of image
  y: number;           // % from top of image
}

interface ActiveTooltip {
  hotspot: SensorHotspot;
  node: SensorNode;
  relX: number;
  relY: number;
}

// Positions extracted pixel-perfectly from the PPTX annotation (36 sensors × 6 zones)
const BATANGKALI_HOTSPOTS: SensorHotspot[] = [
  { id: 'z1-s1', label: 'S1', type: 'soil', zoneIdx: 0, dataIdx: 0, x: 31.6, y: 52.5 },
  { id: 'z1-s4', label: 'S4', type: 'soil', zoneIdx: 0, dataIdx: 3, x: 34.3, y: 52.5 },
  { id: 'z1-t1', label: 'T1', type: 'dht',  zoneIdx: 0, dataIdx: 0, x: 31.6, y: 72.2 },
  { id: 'z1-t2', label: 'T2', type: 'dht',  zoneIdx: 0, dataIdx: 1, x: 34.3, y: 72.2 },
  { id: 'z1-s3', label: 'S3', type: 'soil', zoneIdx: 0, dataIdx: 2, x: 31.6, y: 81.2 },
  { id: 'z1-s2', label: 'S2', type: 'soil', zoneIdx: 0, dataIdx: 1, x: 34.3, y: 81.2 },
  { id: 'z2-s4', label: 'S4', type: 'soil', zoneIdx: 1, dataIdx: 3, x: 38.1, y: 52.4 },
  { id: 'z2-s1', label: 'S1', type: 'soil', zoneIdx: 1, dataIdx: 0, x: 40.9, y: 52.4 },
  { id: 'z2-t1', label: 'T1', type: 'dht',  zoneIdx: 1, dataIdx: 0, x: 38.1, y: 72.2 },
  { id: 'z2-t2', label: 'T2', type: 'dht',  zoneIdx: 1, dataIdx: 1, x: 40.9, y: 72.2 },
  { id: 'z2-s3', label: 'S3', type: 'soil', zoneIdx: 1, dataIdx: 2, x: 38.1, y: 81.1 },
  { id: 'z2-s2', label: 'S2', type: 'soil', zoneIdx: 1, dataIdx: 1, x: 40.8, y: 81.1 },
  { id: 'z3-s4', label: 'S4', type: 'soil', zoneIdx: 2, dataIdx: 3, x: 44.7, y: 52.4 },
  { id: 'z3-s1', label: 'S1', type: 'soil', zoneIdx: 2, dataIdx: 0, x: 47.4, y: 52.4 },
  { id: 'z3-t1', label: 'T1', type: 'dht',  zoneIdx: 2, dataIdx: 0, x: 44.8, y: 72.2 },
  { id: 'z3-t2', label: 'T2', type: 'dht',  zoneIdx: 2, dataIdx: 1, x: 47.5, y: 72.2 },
  { id: 'z3-s3', label: 'S3', type: 'soil', zoneIdx: 2, dataIdx: 2, x: 44.7, y: 81.1 },
  { id: 'z3-s2', label: 'S2', type: 'soil', zoneIdx: 2, dataIdx: 1, x: 47.4, y: 81.1 },
  { id: 'z4-s2', label: 'S2', type: 'soil', zoneIdx: 3, dataIdx: 1, x: 51.3, y: 52.4 },
  { id: 'z4-s4', label: 'S4', type: 'soil', zoneIdx: 3, dataIdx: 3, x: 54.1, y: 52.4 },
  { id: 'z4-t2', label: 'T2', type: 'dht',  zoneIdx: 3, dataIdx: 1, x: 51.2, y: 72.2 },
  { id: 'z4-t1', label: 'T1', type: 'dht',  zoneIdx: 3, dataIdx: 0, x: 54.0, y: 72.2 },
  { id: 'z4-s1', label: 'S1', type: 'soil', zoneIdx: 3, dataIdx: 0, x: 51.3, y: 81.1 },
  { id: 'z4-s3', label: 'S3', type: 'soil', zoneIdx: 3, dataIdx: 2, x: 54.0, y: 81.1 },
  { id: 'z5-s3', label: 'S3', type: 'soil', zoneIdx: 4, dataIdx: 2, x: 58.0, y: 52.5 },
  { id: 'z5-s1', label: 'S1', type: 'soil', zoneIdx: 4, dataIdx: 0, x: 60.7, y: 52.5 },
  { id: 'z5-t2', label: 'T2', type: 'dht',  zoneIdx: 4, dataIdx: 1, x: 57.9, y: 72.2 },
  { id: 'z5-t1', label: 'T1', type: 'dht',  zoneIdx: 4, dataIdx: 0, x: 60.7, y: 72.2 },
  { id: 'z5-s4', label: 'S4', type: 'soil', zoneIdx: 4, dataIdx: 3, x: 58.0, y: 81.2 },
  { id: 'z5-s2', label: 'S2', type: 'soil', zoneIdx: 4, dataIdx: 1, x: 60.7, y: 81.2 },
  { id: 'z6-s4', label: 'S4', type: 'soil', zoneIdx: 5, dataIdx: 3, x: 64.5, y: 52.5 },
  { id: 'z6-s3', label: 'S3', type: 'soil', zoneIdx: 5, dataIdx: 2, x: 67.3, y: 52.5 },
  { id: 'z6-t2', label: 'T2', type: 'dht',  zoneIdx: 5, dataIdx: 1, x: 64.6, y: 72.2 },
  { id: 'z6-t1', label: 'T1', type: 'dht',  zoneIdx: 5, dataIdx: 0, x: 67.3, y: 72.2 },
  { id: 'z6-s2', label: 'S2', type: 'soil', zoneIdx: 5, dataIdx: 1, x: 64.5, y: 81.2 },
  { id: 'z6-s1', label: 'S1', type: 'soil', zoneIdx: 5, dataIdx: 0, x: 67.2, y: 81.2 },
];

const ZONE_NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];

interface FarmMapProps {
  nodes: SensorNode[];
  landName: string;
}

const FarmMap: React.FC<FarmMapProps> = ({ nodes, landName }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);

  const isBatangKali = landName === 'Batang Kali';
  const hotspots = isBatangKali ? BATANGKALI_HOTSPOTS : [];

  // Reset zoom + pan whenever the selected land changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [landName]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom(z => Math.min(Math.max(z * factor, 0.4), 7));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.sat-hotspot')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const getSensorData = (hotspot: SensorHotspot, node: SensorNode) => {
    if (hotspot.type === 'soil') {
      const sm = node.soilMoisture[hotspot.dataIdx];
      return { value: sm?.value ?? 0, unit: '%', status: sm?.status ?? 'alert' as SensorStatus };
    }
    const h = node.humidity[hotspot.dataIdx];
    return { value: h?.value ?? 0, unit: '%', status: h?.status ?? 'alert' as SensorStatus };
  };

  const handleHotspotEnter = (e: React.MouseEvent, hotspot: SensorHotspot) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const node = nodes[hotspot.zoneIdx];
    if (!node) return;
    let relX = e.clientX - rect.left + 18;
    let relY = e.clientY - rect.top - 90;
    if (relX + 240 > rect.width) relX = e.clientX - rect.left - 250;
    if (relY < 8) relY = 8;
    setActiveTooltip({ hotspot, node, relX, relY });
  };

  // SVG zones for non-Batang-Kali placeholder
  const zoneColors = ['#4ade8022','#86efac22','#6ee7b722','#a3e63522','#bbf45122','#86efac22'];
  const zoneStroke = '#16a34a55';
  const zones = [
    { x: 10,  y: 10,  w: 280, h: 240, label: 'A' },
    { x: 310, y: 10,  w: 280, h: 240, label: 'B' },
    { x: 610, y: 10,  w: 280, h: 240, label: 'C' },
    { x: 10,  y: 270, w: 280, h: 240, label: 'D' },
    { x: 310, y: 270, w: 280, h: 240, label: 'E' },
    { x: 610, y: 270, w: 280, h: 240, label: 'F' },
  ];

  // Pin positions for the SVG placeholder (non-Batang-Kali farms)
  const pinPositions = [
    { x: 150, y: 130 }, { x: 450, y: 130 }, { x: 750, y: 130 },
    { x: 150, y: 390 }, { x: 450, y: 390 }, { x: 750, y: 390 },
  ];

  return (
    <div className="sat-container" ref={containerRef}>

      {/* ── Batang Kali: real satellite image with per-sensor hotspots ── */}
      {isBatangKali ? (
        <>
          {/* Zoom control buttons */}
          <div className="sat-zoom-btns">
            <button className="sat-zoom-btn" onClick={() => setZoom(z => Math.min(z * 1.3, 7))} title="Zoom In">＋</button>
            <button className="sat-zoom-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset">⊙</button>
            <button className="sat-zoom-btn" onClick={() => setZoom(z => Math.max(z / 1.3, 0.4))} title="Zoom Out">－</button>
            <span className="sat-zoom-pct">{Math.round(zoom * 100)}%</span>
          </div>

          {/* Scrollable/zoomable viewport */}
          <div
            className="sat-viewport"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <div
              className="sat-img-wrap"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.08s ease',
              }}
            >
              {/* Annotated satellite photo (zone outlines + sensor labels baked in) */}
              <img
                src="/batangkali_annotated.jpg"
                alt="Batang Kali Satellite View with Zone Outlines"
                className="sat-image"
                draggable={false}
              />

              {/* 36 individual sensor hotspots */}
              {hotspots.map(hs => {
                const node = nodes[hs.zoneIdx];
                if (!node) return null;
                const { value, status } = getSensorData(hs, node);
                const col = statusColor[status];
                return (
                  <div
                    key={hs.id}
                    className={`sat-hotspot sat-hotspot--${hs.type}`}
                    style={{
                      left: `${hs.x}%`,
                      top: `${hs.y}%`,
                      background: col + '28',
                      borderColor: col,
                      color: col,
                      boxShadow: `0 0 6px ${col}66`,
                    }}
                    onMouseEnter={e => handleHotspotEnter(e, hs)}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <span className="sat-hs-lbl">{hs.label}</span>
                    <span className="sat-hs-val">{value === 0 ? '—' : `${value}%`}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-sensor tooltip (rendered outside the transformed div) */}
          {activeTooltip && (() => {
            const { hotspot: hs, node, relX, relY } = activeTooltip;
            const { value, status } = getSensorData(hs, node);
            const col = statusColor[status];
            const isSoil = hs.type === 'soil';
            const sLabel = isSoil
              ? `Soil Moisture ${hs.dataIdx + 1} (${hs.label})`
              : `DHT22 Humidity ${hs.dataIdx + 1} (${hs.label})`;
            return (
              <div className="sat-tooltip" style={{ left: relX, top: relY }}>
                <div className="sat-tt-header">
                  <span className="sat-tt-label">{hs.label}</span>
                  <span className={`sat-tt-status sat-tt-status--${node.status.toLowerCase()}`}>{node.status}</span>
                </div>
                <div className="sat-tt-zone">Zone {ZONE_NAMES[hs.zoneIdx]} · {node.label} · {landName}</div>
                <div className="sat-tt-section">{isSoil ? '🌱' : '💧'} {sLabel}</div>
                <div className="sat-tt-row">
                  <span>Reading</span>
                  <span style={{ color: col, fontWeight: 700, fontSize: '1rem' }}>
                    {value === 0 ? 'N/A' : `${value}%`}
                  </span>
                </div>
                <div className="sat-tt-row">
                  <span>Status</span>
                  <span style={{ color: col, textTransform: 'capitalize' }}>{status}</span>
                </div>
                <div className="sat-tt-footer">🕒 {node.lastUpdated}</div>
              </div>
            );
          })()}

          {/* Legend */}
          <div className="sat-legend">
            <span className="sat-legend-title">Reading:</span>
            {(['good', 'warning', 'alert'] as SensorStatus[]).map(s => (
              <div key={s} className="sat-legend-item">
                <span className="sat-legend-dot" style={{ background: statusColor[s] }} />
                <span style={{ textTransform: 'capitalize' }}>{s}</span>
              </div>
            ))}
            <span className="sat-legend-sep">·</span>
            <div className="sat-legend-item">
              <span className="sat-legend-chip sat-legend-chip--soil">S</span>
              <span>Soil</span>
            </div>
            <div className="sat-legend-item">
              <span className="sat-legend-chip sat-legend-chip--dht">T</span>
              <span>DHT22</span>
            </div>
            <span className="sat-legend-sep">·</span>
            <span className="sat-legend-hint">Scroll to zoom · Drag to pan</span>
          </div>
        </>
      ) : (
        /* ── Other farms: keep the original SVG placeholder ── */
        <>
          <div className="sat-notice">
            🛰️ Satellite imagery available for Batang Kali. Showing zoned layout for {landName}.
          </div>
          <svg className="sat-svg" viewBox="0 0 900 520" preserveAspectRatio="xMidYMid meet">
            <rect x="0" y="0" width="900" height="520" fill="#1a3a1a" rx="12" />
            {zones.map((z, i) => (
              <g key={z.label}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={zoneColors[i]} stroke={zoneStroke} strokeWidth="2" rx="4" />
                {Array.from({ length: Math.floor(z.h / 20) }).map((_, row) => (
                  <line key={row} x1={z.x+8} y1={z.y+18+row*20} x2={z.x+z.w-8} y2={z.y+18+row*20} stroke="#22c55e18" strokeWidth="6" />
                ))}
                <text x={z.x+12} y={z.y+24} fill="#4ade80cc" fontSize="16" fontWeight="700" fontFamily="'Outfit', sans-serif">Zone {z.label}</text>
              </g>
            ))}
            <line x1="300" y1="10" x2="300" y2="510" stroke="#22c55e44" strokeWidth="2" strokeDasharray="8,4" />
            <line x1="600" y1="10" x2="600" y2="510" stroke="#22c55e44" strokeWidth="2" strokeDasharray="8,4" />
            <line x1="10" y1="260" x2="890" y2="260" stroke="#22c55e44" strokeWidth="2" strokeDasharray="8,4" />
            {nodes.map((node, i) => {
              const pin = pinPositions[i];
              const col = nodeStatusColor[node.status];
              return (
                <g key={node.nodeId} style={{ cursor: 'pointer' }}>
                  {node.status !== 'Offline' && (
                    <circle cx={pin.x} cy={pin.y} r="18" fill="none" stroke={col} strokeWidth="2" opacity="0.4">
                      <animate attributeName="r" from="14" to="28" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={pin.x} cy={pin.y} r="14" fill={col+'33'} stroke={col} strokeWidth="2.5" />
                  <circle cx={pin.x} cy={pin.y} r="6" fill={col} />
                  <text x={pin.x} y={pin.y+28} textAnchor="middle" fill="#e2e8f0cc" fontSize="11" fontWeight="600">{node.label}</text>
                </g>
              );
            })}
          </svg>
          <div className="sat-legend">
            {(['Online', 'Warning', 'Alert', 'Offline'] as NodeStatus[]).map(s => (
              <div key={s} className="sat-legend-item">
                <span className="sat-legend-dot" style={{ background: nodeStatusColor[s] }} />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Tabular Stats View ───────────────────────────────────────────────────────

interface TabularViewProps {
  nodes: SensorNode[];
  landName: string;
  isLive?: boolean;
}

const TabularView: React.FC<TabularViewProps> = ({ nodes, landName, isLive }) => {
  const now = new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const soilCount = nodes[0]?.soilMoisture.length ?? 3;

  const Badge: React.FC<{ status: SensorStatus; value: number }> = ({ status, value }) => (
    <span className={`tbl-badge tbl-badge--${status}`}>
      {value === 0 ? '—' : `${value}%`}
    </span>
  );

  return (
    <div className="tbl-container">
      <div className="tbl-header-row">
        <div>
          <h3 className="tbl-title">📡 Sensor Readings — {landName}</h3>
          <p className="tbl-subtitle">ESP32 Node Network · {nodes.length} Nodes · Last refreshed {now}</p>
        </div>
        <div className={`tbl-live-badge${isLive ? '' : ' tbl-live-badge--demo'}`}>
          <span className="tbl-live-dot" />
          {isLive ? 'LIVE' : 'DEMO'}
        </div>
      </div>

      <div className="tbl-scroll">
        <table className="tbl-table">
          <thead>
            <tr>
              <th>Node</th>
              <th>Zone</th>
              <th colSpan={2}>💧 Humidity (%)</th>
              <th colSpan={soilCount}>🌱 Soil Moisture (%)</th>
              <th>Status</th>
              <th>Last Updated</th>
            </tr>
            <tr className="tbl-sub-header">
              <th /><th />
              <th>H1</th><th>H2</th>
              {nodes[0]?.soilMoisture.map(s => <th key={s.id}>{s.id}</th>)}
              <th /><th />
            </tr>
          </thead>
          <tbody>
            {nodes.map(node => (
              <tr key={node.nodeId} className={`tbl-row tbl-row--${node.status.toLowerCase()}`}>
                <td>
                  <div className="tbl-node-cell">
                    <span className="tbl-node-icon">📟</span>
                    <span className="tbl-node-label">{node.label}</span>
                  </div>
                </td>
                <td><span className="tbl-zone">{node.zone}</span></td>
                {node.humidity.map(h => (
                  <td key={h.id}><Badge status={h.status} value={h.value} /></td>
                ))}
                {node.soilMoisture.map(s => (
                  <td key={s.id}><Badge status={s.status} value={s.value} /></td>
                ))}
                <td>
                  <span
                    className="tbl-status"
                    style={{ background: nodeStatusColor[node.status] + '22', color: nodeStatusColor[node.status], borderColor: nodeStatusColor[node.status] + '55' }}
                  >
                    <span className="tbl-status-dot" style={{ background: nodeStatusColor[node.status] }} />
                    {node.status}
                  </span>
                </td>
                <td className="tbl-updated">{node.lastUpdated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status key */}
      <div className="tbl-key">
        <span className="tbl-key-title">Threshold Key:</span>
        <span className="tbl-key-item tbl-key-item--good">● Good</span>
        <span className="tbl-key-item tbl-key-item--warning">● Warning</span>
        <span className="tbl-key-item tbl-key-item--alert">● Alert / Offline</span>
        <span className="tbl-key-sep">·</span>
        <span className="tbl-key-desc">Humidity: Good 50–80% · Soil Moisture: Good 35–65%</span>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLand, setSelectedLand] = useState<string>('Batang Kali');
  const [viewMode, setViewMode] = useState<ViewMode>('tabular');
  const [, setAutoPlayActive] = useState(false);
  const [autoPlayView, setAutoPlayView] = useState<'tabular' | 'satellite'>('tabular');
  const [autoPlayProgress, setAutoPlayProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('');
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Live sensor data state ──────────────────────────────────────────────────
  const [liveNodes, setLiveNodes] = useState<SensorNode[] | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'mock'>('mock');
  const [lastFetched, setLastFetched] = useState<string>('');
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clock
  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleString('en-MY', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Fetch live sensor data ────────────────────────────────────────────────────
  const fetchLiveData = useCallback(async (land: string) => {
    // Only Batang Kali has real ESP32s connected right now
    if (land !== 'Batang Kali') {
      setDataSource('mock');
      setLiveNodes(null);
      return;
    }

    // Query each ESP individually in parallel — guarantees we always get the true
    // latest reading per node regardless of how many historical rows exist in the DB.
    const results = await Promise.all(
      ESP_ORDER.map(espId =>
        supabase
          .from('sensor_readings')
          .select('*')
          .eq('land_name', land)
          .eq('esp_id', espId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      )
    );

    // If every single query errored out, fall back to mock
    const allFailed = results.every(r => r.error || !r.data);
    if (allFailed) {
      console.warn('[Dashboard] All per-ESP queries failed or returned no data');
      setDataSource('mock');
      setLiveNodes(null);
      return;
    }

    const nodes = results.map((result, i) =>
      result.data ? mapRawToNode(result.data as RawReading, i) : makeOfflineNode(i)
    );

    setLiveNodes(nodes);
    setDataSource('live');
    setLastFetched(new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, []);

  // Fetch on land change + 30-second auto-refresh
  useEffect(() => {
    fetchLiveData(selectedLand);
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(() => fetchLiveData(selectedLand), 30000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [selectedLand, fetchLiveData]);

  // Auth check + profile fetch
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = '/';
        return;
      }

      // Single resilient query — select('*') won't error on missing columns
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      // If RLS blocked the read entirely, fall back to auth metadata
      const resolvedRole: string =
        (prof as { role?: string } | null)?.role ??
        (session.user.user_metadata?.role as string | undefined) ??
        'user';

      const resolvedProfile: UserProfile = {
        id: prof?.id ?? session.user.id,
        email: prof?.email ?? session.user.email ?? '',
        role: resolvedRole,
        assigned_lands: (prof as { assigned_lands?: string[] } | null)?.assigned_lands ?? [],
      };

      setProfile(resolvedProfile);

      // Auto-select first available land for farmers
      if (resolvedProfile.role !== 'admin') {
        const lands = resolvedProfile.assigned_lands ?? [];
        if (lands.length > 0) setSelectedLand(lands[0]);
      }

      setLoading(false);
    };
    init();
  }, []);

  // Auto play logic
  const stopAutoPlay = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    autoRef.current = null;
    progressRef.current = null;
    setAutoPlayActive(false);
    setAutoPlayProgress(0);
  }, []);

  const startAutoPlay = useCallback(() => {
    setAutoPlayActive(true);
    setAutoPlayView('tabular');
    setAutoPlayProgress(0);

    let progress = 0;
    progressRef.current = setInterval(() => {
      progress += 1;
      setAutoPlayProgress(progress % 100);
    }, 50); // 100 steps × 50ms = 5s per slide

    autoRef.current = setInterval(() => {
      setAutoPlayView(v => v === 'tabular' ? 'satellite' : 'tabular');
      progress = 0;
      setAutoPlayProgress(0);
    }, 5000);
  }, []);

  useEffect(() => {
    if (viewMode === 'autoplay') {
      startAutoPlay();
    } else {
      stopAutoPlay();
    }
    return () => stopAutoPlay();
  }, [viewMode, startAutoPlay, stopAutoPlay]);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // Available lands for current user
  const availableLands = profile?.role === 'admin'
    ? ALL_LANDS
    : (profile?.assigned_lands ?? []);

  const isLandAvailable = (land: string) => availableLands.includes(land);

  // Use live data for Batang Kali when available, fall back to mock for others
  const nodes = (dataSource === 'live' && liveNodes) ? liveNodes : (MOCK_DATA[selectedLand] ?? []);

  // Summary counts
  // "Online" = connectivity (any node sending recent data, regardless of sensor readings)
  // "Warning" / "Alert" = data quality (can overlap with Online)
  const summary: Record<string, number> = {
    Online:  nodes.filter(n => n.status !== 'Offline').length,
    Warning: nodes.filter(n => n.status === 'Warning').length,
    Alert:   nodes.filter(n => n.status === 'Alert').length,
    Offline: nodes.filter(n => n.status === 'Offline').length,
  };

  const activeView = viewMode === 'autoplay' ? autoPlayView : viewMode;

  if (loading) {
    return (
      <div className="db-loading">
        <div className="db-loading-spinner" />
        <p>Memuatkan papan pemuka...</p>
      </div>
    );
  }

  return (
    <div className="db-root">
      {/* ── Header ── */}
      <header className="db-header">
        <div className="db-header-logos">
          <img src="/mmu_logo.png" alt="MMU" className="db-logo" />
          <img src="/kpm_logo.png" alt="KPM" className="db-logo db-logo--kpm" />
          <img src="/ict_logo.jpg" alt="ICT" className="db-logo" />
        </div>

        <div className="db-header-center">
          <span className="db-header-title">MMU Smart Farm</span>
          <span className="db-header-sub">IoT Dashboard</span>
        </div>

        <div className="db-header-right">
          <div className="db-live-pill">
            <span className="db-live-dot" />
            Live
          </div>
          <div className="db-user-info">
            <span className="db-user-role" data-role={profile?.role}>
              {profile?.role === 'admin' ? '👑 Admin' : '🌾 Farmer'}
            </span>
            <span className="db-user-email">{profile?.email}</span>
          </div>
          <button className="db-logout-btn" onClick={handleLogout}>
            🚪 Log Keluar
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="db-main">

        {/* Welcome strip */}
        <div className="db-welcome">
          <div>
            <h2 className="db-welcome-title">
              Selamat Datang{profile?.role === 'admin' ? ', Admin' : ''} 👋
            </h2>
            <p className="db-welcome-time">{currentTime}</p>
          </div>
          <div className="db-welcome-badges">
            <span className="db-welcome-badge">🌿 3 Ladang Aktif</span>
            <span className="db-welcome-badge">📡 {nodes.length} ESP32 Nodes</span>
            {dataSource === 'live'
              ? <span className="db-welcome-badge db-welcome-badge--live">🟢 Live · {lastFetched}</span>
              : <span className="db-welcome-badge db-welcome-badge--demo">🟡 Demo Data</span>
            }
          </div>
        </div>

        {/* Controls row */}
        <div className="db-controls">
          {/* Land selector */}
          <div className="db-selector-wrap">
            <label className="db-selector-label">🗺️ Pilih Ladang</label>
            <select
              className="db-selector"
              value={selectedLand}
              onChange={e => setSelectedLand(e.target.value)}
            >
              {ALL_LANDS.map(land => (
                <option
                  key={land}
                  value={land}
                  disabled={!isLandAvailable(land)}
                >
                  {isLandAvailable(land) ? land : `${land} (Akses Terhad)`}
                </option>
              ))}
            </select>
          </div>

          {/* View mode buttons */}
          <div className="db-view-toggle">
            <button
              className={`db-view-btn${viewMode === 'tabular' ? ' db-view-btn--active' : ''}`}
              onClick={() => setViewMode('tabular')}
            >
              📊 Tabular Stats
            </button>
            <button
              className={`db-view-btn${viewMode === 'satellite' ? ' db-view-btn--active' : ''}`}
              onClick={() => setViewMode('satellite')}
            >
              🛰️ Satellite View
            </button>
            <button
              className={`db-view-btn db-view-btn--autoplay${viewMode === 'autoplay' ? ' db-view-btn--active' : ''}`}
              onClick={() => setViewMode(v => v === 'autoplay' ? 'tabular' : 'autoplay')}
            >
              {viewMode === 'autoplay' ? (
                <><span className="db-autoplay-spinner" /> Auto Play (ON)</>
              ) : (
                <>▶ Auto Play</>
              )}
            </button>
          </div>
        </div>

        {/* Auto-play progress bar */}
        {viewMode === 'autoplay' && (
          <div className="db-autoplay-bar">
            <div className="db-autoplay-track">
              <div className="db-autoplay-fill" style={{ width: `${autoPlayProgress}%` }} />
            </div>
            <span className="db-autoplay-label">
              Showing: {autoPlayView === 'tabular' ? '📊 Tabular Stats' : '🛰️ Satellite View'} · Switching in {Math.round((100 - autoPlayProgress) * 0.05)}s
            </span>
          </div>
        )}

        {/* Summary bar */}
        <div className="db-summary">
          {(['Online', 'Warning', 'Alert', 'Offline'] as NodeStatus[]).map(s => (
            <div key={s} className={`db-summary-card db-summary-card--${s.toLowerCase()}`}>
              <span className="db-summary-num">{summary[s] ?? 0}</span>
              <span className="db-summary-label">{s}</span>
            </div>
          ))}
          <div className="db-summary-card db-summary-card--total">
            <span className="db-summary-num">{nodes.length}</span>
            <span className="db-summary-label">Total Nodes</span>
          </div>
        </div>

        {/* Content area */}
        <div className="db-content">
          {availableLands.length === 0 && profile?.role !== 'admin' ? (
            <div className="db-no-access">
              <div className="db-no-access-icon">🔒</div>
              <h3>Tiada Akses Ladang</h3>
              <p>Akaun anda belum diberikan akses ke mana-mana ladang. Sila hubungi admin.</p>
            </div>
          ) : activeView === 'tabular' ? (
            <TabularView nodes={nodes} landName={selectedLand} isLive={dataSource === 'live'} />
          ) : (
            <FarmMap nodes={nodes} landName={selectedLand} />
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <p className="lp-footer-label">Dengan kolaborasi:</p>
        <div className="lp-footer-logos">
          <img src="/kpm_logo.png" alt="Kementerian Pendidikan Malaysia" className="lp-footer-logo" />
          <img src="/jpt_logo.png" alt="JPT" className="lp-footer-logo lp-footer-logo--dark" />
          <img src="/meme_logo.jpg" alt="MEME" className="lp-footer-logo lp-footer-logo--round" />
          <img src="/cambodia_logo.png" alt="Cambodia University" className="lp-footer-logo" />
          <img src="/laos_logo.png" alt="Laos University" className="lp-footer-logo" />
          <img src="/brunei_logo.png" alt="Universiti Teknologi Brunei" className="lp-footer-logo" />
        </div>
        <p className="lp-footer-copy">
          © {new Date().getFullYear()} Multimedia University · Cyberjaya, Malaysia · ASEAN IVO Collaborative Initiative
        </p>
      </footer>
    </div>
  );
};

export default DashboardPage;
