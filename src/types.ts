export interface HiveData {
  created_at: string;
  entry_id: number;
  field1: string; // Temperature
  field2: string; // Humidity
  field3: string; // Weight
}

export interface ThingSpeakResponse {
  channel: {
    id: number;
    name: string;
    description: string;
    latitude: string;
    longitude: string;
    field1: string;
    field2: string;
    field3: string;
    created_at: string;
    updated_at: string;
    last_entry_id: number;
  };
  feeds: HiveData[];
}

export interface AIInsight {
  status: 'healthy' | 'warning' | 'critical';
  harvestReady: boolean;
  summary: string;
  recommendations: string[];
  hiveHealthScore: number; // 0-100
}
