import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { configService } from '@/services/api';
import type { SystemConfig } from '@/types';

interface ConfigContextValue {
  config: SystemConfig | null;
  loading: boolean;
}

const emptyConfig: SystemConfig = {
  roles: [],
  estadosCliente: [],
  estadosCuota: [],
  metodosPago: {},
  estadosPago: {},
  roleIds: {},
};

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await configService.getSystem();
        setConfig(response.data ?? emptyConfig);
      } catch {
        setConfig(emptyConfig);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const value = useMemo(
    () => ({
      config,
      loading,
    }),
    [config, loading]
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  const context = useContext(ConfigContext);

  if (!context) {
    throw new Error('useConfig debe usarse dentro de ConfigProvider');
  }

  return context;
}
