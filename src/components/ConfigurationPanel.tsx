import React from 'react';
import type { LayerConfigTemplate, ConvolutionConfig } from './components.types';

interface ConvolutionParameterProps {
  label: string;
  param: keyof ConvolutionConfig;
  values: { x: number; y: number };
  minValue: number;
  maxValue: number;
  onParamChange: (param: keyof ConvolutionConfig, axis: 'x' | 'y', value: number) => void;
}

const ConvolutionParameter: React.FC<ConvolutionParameterProps> = ({
  label,
  param,
  values,
  minValue,
  maxValue,
  onParamChange
}) => (
  <div style={{ marginBottom: '8px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <label style={{ fontWeight: 'bold', fontSize: '11px', minWidth: '60px' }}>
        {label}:
      </label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '10px', color: '#ccc' }}>X:</span>
          <input
            type="number"
            min={minValue}
            max={maxValue}
            value={values.x}
            onChange={(e) => onParamChange(param, 'x', parseInt(e.target.value))}
            style={compactInputStyle}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '10px', color: '#ccc' }}>Y:</span>
          <input
            type="number"
            min={minValue}
            max={maxValue}
            value={values.y}
            onChange={(e) => onParamChange(param, 'y', parseInt(e.target.value))}
            style={compactInputStyle}
          />
        </div>
      </div>
    </div>
  </div>
);

interface ConfigurationPanelProps {
  layerConfigs: LayerConfigTemplate[];
  onConfigChange: (index: number, config: LayerConfigTemplate) => void;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  layerConfigs,
  onConfigChange
}) => {
  const handleConvolutionChange = (
    layerIndex: number,
    param: keyof ConvolutionConfig,
    axis: 'x' | 'y',
    value: number
  ) => {
    const config = layerConfigs[layerIndex];
    if (!config.convolution) return;

    const updatedConfig = {
      ...config,
      convolution: {
        ...config.convolution,
        [param]: {
          ...config.convolution[param],
          [axis]: value
        }
      }
    };

    onConfigChange(layerIndex, updatedConfig);
  };

  const handleNameChange = (layerIndex: number, name: string) => {
    const config = layerConfigs[layerIndex];
    onConfigChange(layerIndex, { ...config, name });
  };

  return (
    <div style={{
      position: 'fixed',
      left: '0',
      top: '0',
      width: '350px',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '20px',
      overflowY: 'auto',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      zIndex: 1000
    }}>
      <h2 style={{ marginTop: '0', marginBottom: '20px', fontSize: '18px' }}>
        🔧 Layer Configuration
      </h2>
      
      <div style={{ marginBottom: '20px', fontSize: '12px', color: '#ccc' }}>
        <strong>Phase 3:</strong> Real-time Parameter Control
      </div>

      {layerConfigs.map((config, index) => (
        <div key={index} style={{
          marginBottom: '25px',
          padding: '15px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          border: `2px solid ${config.color}`
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '15px'
          }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                backgroundColor: config.color,
                borderRadius: '50%',
                marginRight: '8px'
              }}
            />
            <input
              type="text"
              value={config.name}
              onChange={(e) => handleNameChange(index, e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                outline: 'none',
                width: '100%'
              }}
              placeholder="Layer Name"
            />
          </div>

          {config.convolution && (
            <div style={{ fontSize: '12px' }}>
              <ConvolutionParameter
                label="Kernel Size"
                param="kernelSize"
                values={config.convolution.kernelSize}
                minValue={1}
                maxValue={10}
                onParamChange={(param, axis, value) => handleConvolutionChange(index, param, axis, value)}
              />

              <ConvolutionParameter
                label="Stride"
                param="stride"
                values={config.convolution.stride}
                minValue={1}
                maxValue={5}
                onParamChange={(param, axis, value) => handleConvolutionChange(index, param, axis, value)}
              />

              <ConvolutionParameter
                label="Dilation"
                param="dilation"
                values={config.convolution.dilation}
                minValue={1}
                maxValue={5}
                onParamChange={(param, axis, value) => handleConvolutionChange(index, param, axis, value)}
              />

              <ConvolutionParameter
                label="Padding"
                param="padding"
                values={config.convolution.padding}
                minValue={0}
                maxValue={5}
                onParamChange={(param, axis, value) => handleConvolutionChange(index, param, axis, value)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const compactInputStyle: React.CSSProperties = {
  width: '40px',
  padding: '2px 4px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '3px',
  color: 'white',
  fontSize: '11px',
  textAlign: 'center'
};

export default ConfigurationPanel;