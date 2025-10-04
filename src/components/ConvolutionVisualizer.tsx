import React, { useState, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import LayerGrid from './LayerGrid';
import ConfigurationPanel from './ConfigurationPanel';
import type { LayerConfigTemplate, LayerConfig } from './components.types';

// Types for receptive field highlighting
interface HighlightedNode {
  x: number;
  y: number;
}

interface ReceptiveFieldState {
  selectedNode: HighlightedNode | null;
  selectedLayer: number | null;
}

// Utility function to calculate output size given input size and convolution parameters
const calculateOutputSize = (inputSize: number, kernelSize: number, stride: number, padding: number, dilation: number): number => {
  return Math.floor((inputSize + 2 * padding - dilation * (kernelSize - 1) - 1) / stride + 1);
};

// Function to calculate layer sizes based on convolution parameters
const calculateLayerSizes = (configs: LayerConfigTemplate[]): LayerConfig[] => {
  const result: LayerConfig[] = [];
  
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    let size: { x: number; y: number };
    
    if (i === 0) {
      // Input layer - manually specified
      size = { x: 10, y: 10 };
    } else {
      // Calculate based on previous layer and convolution parameters
      const prevSize = result[i - 1].size;
      const conv = config.convolution!;
      
      size = {
        x: calculateOutputSize(prevSize.x, conv.kernelSize.x, conv.stride.x, conv.padding.x, conv.dilation.x),
        y: calculateOutputSize(prevSize.y, conv.kernelSize.y, conv.stride.y, conv.padding.y, conv.dilation.y)
      };
    }
    
    result.push({
      ...config,
      size
    });
  }
  
  return result;
};

// Initial configuration templates
const INITIAL_LAYER_CONFIG_TEMPLATES: LayerConfigTemplate[] = [
  {
    name: 'Input Layer',
    color: '#4CAF50'
    // No convolution parameters for input layer
  },
  {
    name: 'Conv1',
    color: '#2196F3',
    convolution: {
      kernelSize: { x: 3, y: 3 },
      stride: { x: 1, y: 1 },
      dilation: { x: 1, y: 1 },
      padding: { x: 0, y: 0 }
    }
  },
  {
    name: 'Conv2',
    color: '#9C27B0',
    convolution: {
      kernelSize: { x: 1, y: 3 },
      stride: { x: 1, y: 2 },
      dilation: { x: 1, y: 1 },
      padding: { x: 0, y: 0 }
    }
  },
  {
    name: 'Conv3',
    color: '#FF5722',
    convolution: {
      kernelSize: { x: 3, y: 2 },
      stride: { x: 1, y: 1 },
      dilation: { x: 2, y: 1 },
      padding: { x: 2, y: 0 }
    }
  }
];

// Helper function to calculate receptive field for a single node
const calculateSingleNodeReceptiveField = (
  nodeX: number, 
  nodeY: number,
  kernelSize: { x: number; y: number },
  stride: { x: number; y: number },
  dilation: { x: number; y: number },
  padding: { x: number; y: number },
  inputSize: { x: number; y: number }
): HighlightedNode[] => {
  const receptiveField: HighlightedNode[] = [];
  
  // For each position in the kernel
  for (let kx = 0; kx < kernelSize.x; kx++) {
    for (let ky = 0; ky < kernelSize.y; ky++) {
      // Calculate the actual input position considering stride, dilation, and padding
      // Formula: input_pos = output_pos * stride + kernel_pos * dilation - padding
      const inputX = nodeX * stride.x + kx * dilation.x - padding.x;
      const inputY = nodeY * stride.y + ky * dilation.y - padding.y;
      
      // Check bounds
      if (inputX >= 0 && inputX < inputSize.x && inputY >= 0 && inputY < inputSize.y) {
        receptiveField.push({ x: inputX, y: inputY });
      }
    }
  }
  
  return receptiveField;
};

// Helper function to remove duplicate nodes
const removeDuplicateNodes = (nodes: HighlightedNode[]): HighlightedNode[] => {
  const unique: HighlightedNode[] = [];
  
  for (const node of nodes) {
    const exists = unique.find(u => u.x === node.x && u.y === node.y);
    if (!exists) {
      unique.push(node);
    }
  }
  
  return unique;
};

// Helper function to generate layer data
const generateLayerData = (size: { x: number; y: number }) => {
  const data = [];
  for (let i = 0; i < size.x; i++) {
    for (let j = 0; j < size.y; j++) {
      // Generate some sample activation values
      const value = Math.random() * 0.8 + 0.2;
      data.push({
        x: i - size.x / 2 + 0.5,
        y: j - size.y / 2 + 0.5,
        value: value,
        activated: value > 0.5
      });
    }
  }
  return data;
};

// Helper function to generate connection lines between layers
const generateConnectionLines = (configs: LayerConfig[], fromLayerIdx: number, toLayerIdx: number) => {
  const positions = [];
  const step = 3; // Only draw some connections to avoid clutter
  const fromPos = new Vector3(0, 0, 6 * (1 - fromLayerIdx));
  const toPos = new Vector3(0, 0, 6 * (1 - toLayerIdx));
  const fromLayer = configs[fromLayerIdx];
  const toLayer = configs[toLayerIdx];

  for (let i = 0; i < fromLayer.size.x; i += step) {
    for (let j = 0; j < fromLayer.size.y; j += step) {
      const fromX = fromPos.x + i - fromLayer.size.x / 2 + 0.5;
      const fromY = fromPos.y + j - fromLayer.size.y / 2 + 0.5;
      const fromZ = fromPos.z;

      // Connect to corresponding region in the next layer
      const toX = toPos.x + (i * toLayer.size.x / fromLayer.size.x) - toLayer.size.x / 2 + 0.5;
      const toY = toPos.y + (j * toLayer.size.y / fromLayer.size.y) - toLayer.size.y / 2 + 0.5;
      const toZ = toPos.z;

      positions.push(fromX, fromY, fromZ);
      positions.push(toX, toY, toZ);
    }
  }
  
  return positions;
};

// Component for rendering connection lines
const ConnectionLines: React.FC<{ layerConfigs: LayerConfig[] }> = ({ layerConfigs }) => {
  const lines = useMemo(() => {
    const allLines = [];
    for (let i = 0; i < layerConfigs.length - 1; i++) {
      const positions = generateConnectionLines(layerConfigs, i, i + 1);
      allLines.push(positions);
    }
    return allLines;
  }, [layerConfigs]);

  return (
    <>
      {lines.map((positions, index) => (
        <lineSegments key={`connection-${index}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(positions), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff" opacity={0.3} transparent />
        </lineSegments>
      ))}
    </>
  );
};

const ConvolutionVisualizer: React.FC = () => {
  // State for layer configuration
  const [layerConfigs, setLayerConfigs] = useState(calculateLayerSizes(INITIAL_LAYER_CONFIG_TEMPLATES));

  // State for receptive field highlighting
  const [receptiveFieldState, setReceptiveFieldState] = useState<ReceptiveFieldState>({
    selectedNode: null,
    selectedLayer: null,
  });

  // Calculate receptive field for a given node
  const calculateReceptiveField = useCallback((state: ReceptiveFieldState): HighlightedNode[][] => {
    const highlightedByLayer: HighlightedNode[][] = layerConfigs.map(() => []); // Create empty arrays for each layer
    if (state.selectedNode  == null || state.selectedLayer == null) {
      return highlightedByLayer;
    }
    // Start from the clicked layer and work backwards to input layer
    let currentLayer = state.selectedLayer;
    let currentNodes: HighlightedNode[] = [{ x: state.selectedNode.x, y: state.selectedNode.y }];
    
    // Add the clicked node to its layer
    highlightedByLayer[currentLayer] = [...currentNodes];
    
    // Work backwards through layers
    while (currentLayer > 0) {
      const nextNodes: HighlightedNode[] = [];
      
      // Get the layer configuration for the previous layer and current layer
      const prevLayer = layerConfigs[currentLayer - 1];
      const currentLayerConfig = layerConfigs[currentLayer];
      
      if (!currentLayerConfig.convolution) {
        currentLayer--;
        continue;
      }
      
      const conv = currentLayerConfig.convolution;
      
      // For each node in the current layer, calculate its receptive field in the previous layer
      for (const node of currentNodes) {
        // Calculate the receptive field for this node
        const receptiveFieldNodes = calculateSingleNodeReceptiveField(
          node.x, node.y,
          conv.kernelSize, conv.stride, conv.dilation, conv.padding,
          prevLayer.size
        );
        
        // Add all receptive field nodes to the next layer's highlights
        nextNodes.push(...receptiveFieldNodes);
      }
      
      // Remove duplicates and store
      const uniqueNodes = removeDuplicateNodes(nextNodes);
      highlightedByLayer[currentLayer - 1] = uniqueNodes;
      
      // Move to the previous layer
      currentNodes = uniqueNodes;
      currentLayer--;
    }
    
    return highlightedByLayer;
  }, [layerConfigs]);

  const highlightedNodesByLayer = useMemo(() => {
    return calculateReceptiveField(receptiveFieldState);
  }, [layerConfigs, receptiveFieldState]);

  // Handle layer configuration updates
  const handleConfigurationChange = useCallback((index: number, configTemplate: LayerConfigTemplate) => {
    const newConfigs = [...layerConfigs];
    // Convert the template back to our full config format
    newConfigs[index] = { ...configTemplate, size: { x: 1, y: 1 } }; // Temporary size, will be recalculated
    setLayerConfigs(calculateLayerSizes(newConfigs));

    // If there's a selected node, try to preserve it or find the closest one
    if (receptiveFieldState.selectedNode && receptiveFieldState.selectedLayer !== null) {
      const selectedLayerConfig = newConfigs[receptiveFieldState.selectedLayer];
      
      if (selectedLayerConfig) {
        const { x, y } = receptiveFieldState.selectedNode;
        
        // Check if the selected position still exists
        if (x >= selectedLayerConfig.size.x || y >= selectedLayerConfig.size.y) {
          // Find the closest valid position
          const newX = Math.min(x, selectedLayerConfig.size.x - 1);
          const newY = Math.min(y, selectedLayerConfig.size.y - 1);
          setReceptiveFieldState({
              selectedNode: { x: newX, y: newY },
              selectedLayer: receptiveFieldState.selectedLayer,
          });
        }

      }
    }
  }, [layerConfigs, receptiveFieldState.selectedNode, receptiveFieldState.selectedLayer]);

  // Handle node click
  const handleNodeClick = useCallback((layerIndex: number, x: number, y: number) => {
    setReceptiveFieldState({
      selectedNode: { x, y },
      selectedLayer: layerIndex,
    });
  }, [calculateReceptiveField]);

  // Generate layer data for rendering
  const layerData = useMemo(() => {
    return layerConfigs.map(config => generateLayerData(config.size));
  }, [layerConfigs]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {/* Configuration Panel */}
      <ConfigurationPanel
        layerConfigs={layerConfigs}
        onConfigChange={handleConfigurationChange}
      />
      
      {/* 3D Canvas */}
      <div style={{ flex: 1 }}>
        <Canvas
          camera={{
            position: [15, 10, 15],
            fov: 60
          }}
          style={{ background: 'linear-gradient(to bottom, #2c3e50, #34495e)' }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
          }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 10]}
            intensity={0.8}
            castShadow
          />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />

          {layerConfigs.map((config, index) => (
            <LayerGrid
              key={`${config.name}-${config.size.x}x${config.size.y}`} // Include size in key for re-rendering
              data={layerData[index]}
              position={new Vector3(0, 0, 6 * (1 - index))}
              color={config.color}
              size={config.size}
              name={config.name}
              layerIndex={index}
              onNodeClick={handleNodeClick}
              highlightedNodes={highlightedNodesByLayer[index] || []}
              selectedNode={receptiveFieldState.selectedLayer === index ? receptiveFieldState.selectedNode : null}
            />
          ))}

          {/* Connection lines between layers */}
          <ConnectionLines layerConfigs={layerConfigs} />

          <OrbitControls
            enableDamping 
            dampingFactor={0.05}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            target={[0, 0, 0]}
          />
        </Canvas>

        {/* Layer information overlay */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px',
          maxWidth: '300px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Layer Information</h3>
          {layerConfigs.map((config, index) => (
            <div key={index} style={{ marginBottom: '8px' }}>
              <div style={{ color: config.color, fontWeight: 'bold' }}>
                {config.name}
              </div>
              {config.convolution && (
                <div style={{ fontSize: '12px', marginLeft: '10px', color: '#ccc' }}>
                  Kernel: {config.convolution.kernelSize.x}×{config.convolution.kernelSize.y} |
                  Stride: {config.convolution.stride.x}×{config.convolution.stride.y} |
                  Dilation: {config.convolution.dilation.x}×{config.convolution.dilation.y} |
                  Padding: {config.convolution.padding.x}×{config.convolution.padding.y}
                </div>
              )}
            </div>
          ))}

          {receptiveFieldState.selectedNode && receptiveFieldState.selectedLayer !== null && (
            <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #555' }}>
              <div style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                Selected: Layer {receptiveFieldState.selectedLayer}
                ({receptiveFieldState.selectedNode.x}, {receptiveFieldState.selectedNode.y})
              </div>
              <div style={{ fontSize: '12px', color: '#ccc' }}>
                Click a cube to see its receptive field
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConvolutionVisualizer;