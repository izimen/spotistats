import { useState, useCallback, useMemo } from 'react';

export interface SettingsState {
  // Powiadomienia
  'weekly-summary': boolean;
  'new-features': boolean;
  'listening-milestones': boolean;
  // Prywatność
  'public-profile': boolean;
  'share-data': boolean;
  'listening-history': boolean;
  // Wygląd
  'dark-mode': boolean;
  'animations': boolean;
  'compact-mode': boolean;
  // Odtwarzanie
  'autoplay': boolean;
  'crossfade': boolean;
  'normalize-volume': boolean;
}

const defaultSettings: SettingsState = {
  'weekly-summary': true,
  'new-features': true,
  'listening-milestones': false,
  'public-profile': false,
  'share-data': true,
  'listening-history': true,
  'dark-mode': true,
  'animations': true,
  'compact-mode': false,
  'autoplay': true,
  'crossfade': false,
  'normalize-volume': true,
};

const STORAGE_KEY = 'spotistats-settings';

const loadSettings = (): SettingsState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return defaultSettings;
};

const saveSettings = (settings: SettingsState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
};

export const useSettings = () => {
  const [settings, setSettings] = useState<SettingsState>(loadSettings);

  const updateSetting = useCallback((key: keyof SettingsState, value: boolean) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const toggleSetting = useCallback((key: keyof SettingsState) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: !prev[key] };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  return useMemo(() => ({
    settings,
    updateSetting,
    toggleSetting,
  }), [settings, updateSetting, toggleSetting]);
};
