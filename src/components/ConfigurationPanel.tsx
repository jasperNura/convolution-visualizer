import React from 'react';
import type { LayerConfigTemplate, ConvolutionConfig, Size } from './components.types';

interface ConvolutionParameterProps {
  label: string;
  param: keyof ConvolutionConfig;
  values: Size;
  minValue: number;
  maxValue: number;
  step?: number;
  onParamChange: (param: keyof ConvolutionConfig, axis: 'x' | 'y', value: number) => void;
}

const ConvolutionParameter: React.FC<ConvolutionParameterProps> = ({
  label,
  param,
  values,
  minValue,
  maxValue,
  step = 1,
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
            step={step}
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
            step={step}
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
  onAddLayer: () => void;
  onRemoveLayer: (index: number) => void;
  inputSize: Size;
  onInputSizeChange: (size: Size) => void;
  useLayerData: boolean;
  onUseLayerDataChange: (useLayerData: boolean) => void;
  temporalConvolutionMode: boolean;
  onTemporalConvolutionModeChange: (temporalMode: boolean) => void;
  reverseOrder: boolean;
  onReverseOrderChange: (reverseOrder: boolean) => void;
  isAnimating: boolean;
  onStartAnimation: () => void;
  onStopAnimation: () => void;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  layerConfigs,
  onConfigChange,
  onAddLayer,
  onRemoveLayer,
  useLayerData,
  inputSize,
  onInputSizeChange,
  onUseLayerDataChange,
  temporalConvolutionMode,
  onTemporalConvolutionModeChange,
  reverseOrder,
  onReverseOrderChange,
  isAnimating,
  onStartAnimation,
  onStopAnimation
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

      {/* Settings Box */}
      <div style={{
        marginBottom: '25px',
        padding: '15px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#fff' }}>
          ⚙️ Visualization Settings
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={useLayerData}
              onChange={(e) => onUseLayerDataChange(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#4CAF50'
              }}
            />
            <span>Use Layer Data for visualization</span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={temporalConvolutionMode}
              onChange={(e) => onTemporalConvolutionModeChange(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#2196F3'
              }}
            />
            <span>Temporal Convolution Mode</span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={reverseOrder}
              onChange={(e) => onReverseOrderChange(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#2196F3'
              }}
            />
            <span>Reverse Order</span>
          </label>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '8px',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <span style={{ fontSize: '11px', color: '#ccc', fontWeight: 'bold' }}>
              🎬 Animation Controls
            </span>
            <button
              onClick={isAnimating ? onStopAnimation : onStartAnimation}
              style={{
                padding: '8px 12px',
                backgroundColor: isAnimating ? '#f44336' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = isAnimating ? '#d32f2f' : '#45a049';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = isAnimating ? '#f44336' : '#4CAF50';
              }}
            >
              {isAnimating ? '⏹️ Stop Animation' : '▶️ Start Animation'}
            </button>
            <div style={{ fontSize: '10px', color: '#999', lineHeight: '1.2' }}>
              Cycles through all nodes in the final layer every 500ms
            </div>
          </div>
        </div>
        
        <div style={{ 
          marginTop: '8px', 
          fontSize: '11px', 
          color: '#999',
          lineHeight: '1.3'
        }}>
          <div style={{ marginBottom: '4px' }}>
            <strong>Layer Data:</strong> Shows varying heights/colors based on activation values.
          </div>
          <div>
            <strong>Temporal Mode:</strong> Aligns bottom row of all convolution layers for temporal analysis and only apply padding to the top (past timesteps).
          </div>
          <div>
            <strong>Reverse order:</strong> Show last layer first.
          </div>
        </div>
      </div>

      {/* Layer Management Section */}
      <div style={{
        marginBottom: '25px',
        padding: '15px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#fff' }}>
          🔧 Layer Management
        </h3>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={onAddLayer}
            style={{
              padding: '8px 12px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#45a049';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#4CAF50';
            }}
          >
            ➕ Add Conv Layer
          </button>
          
          <span style={{ fontSize: '11px', color: '#ccc' }}>
            {layerConfigs.length - 1} convolution layer{layerConfigs.length - 1 !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div style={{ fontSize: '10px', color: '#999', marginTop: '8px', lineHeight: '1.2' }}>
          Add or remove convolution layers. The input layer cannot be removed.
        </div>
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
            justifyContent: 'space-between',
            marginBottom: '15px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
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
                  flex: 1
                }}
                placeholder="Layer Name"
              />
            </div>
            
            {/* Remove button - only show for convolution layers (not input layer) */}
            {index > 0 && (
              <button
                onClick={() => onRemoveLayer(index)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#d32f2f';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f44336';
                }}
                title="Remove this layer"
              >
                🗑️ Remove
              </button>
            )}
          </div>

          {(index == 0) && (
            <div style={{ fontSize: '12px' }}>
              <ConvolutionParameter
                label="Input Size"
                param="kernelSize" // Dummy param, not used
                values={inputSize}
                minValue={1}
                maxValue={50}
                onParamChange={(_, axis, value) => {
                  const newSize = { ...inputSize, [axis]: value };
                  onInputSizeChange(newSize);
                }}
              />
            </div>
          )}
          {config.convolution && (
            <div style={{ fontSize: '12px' }}>
              <ConvolutionParameter
                label="Kernel Size"
                param="kernelSize"
                values={config.convolution.kernelSize}
                minValue={1}
                maxValue={10}
                step={2}
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