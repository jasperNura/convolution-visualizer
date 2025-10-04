import React, { useState, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3, CatmullRomCurve3 } from 'three';
import LayerGrid from './LayerGrid';

// Types for receptive field highlighting
interface HighlightedNode {
  x: number;
  y: number;
}

interface ReceptiveFieldState {
  selectedNode: HighlightedNode | null;
  selectedLayer: number | null;
  highlightedNodesByLayer: HighlightedNode[][];
}

// Utility function to calculate output size given input size and convolution parameters
const calculateOutputSize = (inputSize: number, kernelSize: number, stride: number, padding: number, dilation: number): number => {
  return Math.floor((inputSize + 2 * padding - dilation * (kernelSize - 1) - 1) / stride + 1);
};

// Utility function to format convolution parameters for display
const formatConvParams = (conv: LayerConfig['convolution']): string => {
  if (!conv) return '';
  const { kernelSize, stride, dilation } = conv;
  
  let result = `${kernelSize.x}x${kernelSize.y}`;
  
  if (stride.x !== 1 || stride.y !== 1) {
    if (stride.x === stride.y) {
      result += `, S${stride.x}`;
    } else {
      result += `, S${stride.x}x${stride.y}`;
    }
  }
  
  if (dilation.x !== 1 || dilation.y !== 1) {
    if (dilation.x === dilation.y) {
      result += `, D${dilation.x}`;
    } else {
      result += `, D${dilation.x}x${dilation.y}`;
    }
  }
  
  return result;
};

// Types for layer configuration
interface LayerConfig {
  size: { x: number; y: number };
  name: string;
  position: Vector3;
  color: string;
  convolution?: {
    kernelSize: { x: number; y: number };
    stride: { x: number; y: number };
    dilation: { x: number; y: number };
    padding: { x: number; y: number };
  };
}

// Function to calculate layer sizes based on convolution parameters
const calculateLayerSizes = (configs: Omit<LayerConfig, 'size'>[]): LayerConfig[] => {
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

// Configuration for the convolution layers with various parameters
const LAYER_CONFIG_TEMPLATES: Omit<LayerConfig, 'size'>[] = [
  {
    name: 'Input Layer',
    position: new Vector3(0, 0, 6),
    color: '#4CAF50'
    // No convolution parameters for input layer
  },
  {
    name: 'Conv1', // Will be updated with calculated parameters
    position: new Vector3(0, 0, 0),
    color: '#2196F3',
    convolution: {
      kernelSize: { x: 3, y: 3 },
      stride: { x: 1, y: 1 },
      dilation: { x: 1, y: 1 },
      padding: { x: 0, y: 0 }
    }
  },
  {
    name: 'Conv2', // Will be updated with calculated parameters
    position: new Vector3(0, 0, -6),
    color: '#9C27B0',
    convolution: {
      kernelSize: { x: 1, y: 3 },
      stride: { x: 1, y: 2 },
      dilation: { x: 1, y: 1 },
      padding: { x: 0, y: 0 }
    }
  },
  {
    name: 'Conv3', // Will be updated with calculated parameters
    position: new Vector3(0, 0, -12),
    color: '#FF5722',
    convolution: {
      kernelSize: { x: 3, y: 2 },
      stride: { x: 1, y: 1 },
      dilation: { x: 2, y: 1 },
      padding: { x: 2, y: 0 }
    }
  }
];

// Calculate layer sizes and update names
const LAYER_CONFIGS: LayerConfig[] = calculateLayerSizes(LAYER_CONFIG_TEMPLATES).map(config => ({
  ...config,
  name: config.convolution 
    ? `${config.name} (${formatConvParams(config.convolution)}) - ${config.size.x}×${config.size.y}`
    : `${config.name} - ${config.size.x}×${config.size.y}`
}));

const ConvolutionVisualizer: React.FC = () => {
  // State for receptive field highlighting
  const [receptiveFieldState, setReceptiveFieldState] = useState<ReceptiveFieldState>({
    selectedNode: null,
    selectedLayer: null,
    highlightedNodesByLayer: LAYER_CONFIGS.map(() => []) // Initialize with empty arrays for each layer
  });

  // Calculate receptive field for a given node
  const calculateReceptiveField = useCallback((layerIndex: number, nodeX: number, nodeY: number): HighlightedNode[][] => {
    const highlightedByLayer: HighlightedNode[][] = LAYER_CONFIGS.map(() => []); // Create empty arrays for each layer
    
    // Add the clicked node itself
    highlightedByLayer[layerIndex].push({
      x: nodeX,
      y: nodeY
    });

    // Recursively calculate receptive field for all previous layers
    const calculateReceptiveFieldRecursive = (currentLayer: number) => {
      if (currentLayer === 0) return; // Base case: reached input layer
      
      // Note: previous here refers to the layer earlier in the network, but we're calculating the receptive field backwards
      // so it's actually the next layer in terms of processing
      const prevLayer = LAYER_CONFIGS[currentLayer - 1];
      const currentLayerConfig = LAYER_CONFIGS[currentLayer];
      
      // Skip if no convolution parameters (shouldn't happen for layers > 0)
      if (!currentLayerConfig.convolution) return;
      
      const { kernelSize, stride, dilation, padding } = currentLayerConfig.convolution;
      
      // For each node in current layer, find its receptive field in previous layer
      highlightedByLayer[currentLayer].forEach(outputNode => {
        // Calculate the receptive field in the previous layer
        // For each position in the kernel
        for (let kx = 0; kx < kernelSize.x; kx++) {
          for (let ky = 0; ky < kernelSize.y; ky++) {
            // Calculate the actual input position considering stride, dilation, and padding
            // Formula: input_pos = output_pos * stride + kernel_pos * dilation - padding
            const inputX = outputNode.x * stride.x + kx * dilation.x - padding.x;
            const inputY = outputNode.y * stride.y + ky * dilation.y - padding.y;
            
            // Check bounds
            if (inputX >= 0 && inputX < prevLayer.size.x && inputY >= 0 && inputY < prevLayer.size.y) {
              // Check if this node is already in the list to avoid duplicates
              const existing = highlightedByLayer[currentLayer - 1].find(h => h.x === inputX && h.y === inputY);
              
              if (!existing) {
                const newNode: HighlightedNode = {
                  x: inputX,
                  y: inputY
                };
                highlightedByLayer[currentLayer - 1].push(newNode);
              }
            }
          }
        }
      });
      
      calculateReceptiveFieldRecursive(currentLayer - 1);
    };
    
    // Start recursive calculation from the clicked layer
    calculateReceptiveFieldRecursive(layerIndex);
    
    return highlightedByLayer;
  }, []);

  // Handle node click
  const handleNodeClick = useCallback((layerIndex: number, nodeX: number, nodeY: number) => {
    const highlightedNodesByLayer = calculateReceptiveField(layerIndex, nodeX, nodeY);
    
    setReceptiveFieldState({
      selectedNode: {
        x: nodeX,
        y: nodeY
      },
      selectedLayer: layerIndex,
      highlightedNodesByLayer
    });
  }, [calculateReceptiveField]);
  // Generate sample data for each layer
  const layerData = useMemo(() => {
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

    return LAYER_CONFIGS.map(config => generateLayerData(config.size));
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#1a1a1a' }}>
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

        {LAYER_CONFIGS.map((config, index) => (
          <LayerGrid
            key={index}
            data={layerData[index]}
            position={config.position}
            color={config.color}
            size={config.size}
            name={config.name}
            layerIndex={index}
            onNodeClick={handleNodeClick}
            highlightedNodes={receptiveFieldState.highlightedNodesByLayer[index]}
            selectedNode={receptiveFieldState.selectedLayer === index ? receptiveFieldState.selectedNode : null}
          />
        ))}

        {/* Connection lines between layers */}
        {LAYER_CONFIGS.slice(0, -1).map((config, index) => (
          <ConnectionLines 
            key={`connection-${index}`}
            from={config.position}
            to={LAYER_CONFIGS[index + 1].position}
            fromSize={config.size}
            toSize={LAYER_CONFIGS[index + 1].size}
          />
        ))}

        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={50}
        />
      </Canvas>
      
      {/* UI Overlay */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        color: 'white',
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
        maxWidth: '400px'
      }}>
        <h2>3D Convolution Neural Network Visualizer</h2>
        <p><strong>Phase 2+: Advanced Convolution Parameters</strong></p>
        <ul style={{ fontSize: '14px', marginTop: '10px' }}>
          {LAYER_CONFIGS.map((config, index) => (
            <li key={index} style={{ color: config.color }}>
              {config.name}
            </li>
          ))}
        </ul>
        
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          borderRadius: '5px',
          fontSize: '12px'
        }}>
          <strong>🔧 Enhanced Features:</strong>
          <ul style={{ marginTop: '5px', marginBottom: '0' }}>
            <li><strong>Asymmetric Kernels:</strong> Different x/y sizes (e.g., 5x3)</li>
            <li><strong>Independent Strides:</strong> Different x/y step sizes</li>
            <li><strong>Asymmetric Dilation:</strong> Different x/y spacing</li>
            <li><strong>Precise Receptive Fields:</strong> Accurate for all parameters</li>
          </ul>
        </div>
        
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          <strong>🖱️ Click Interactions:</strong>
          <ul style={{ marginTop: '5px', marginBottom: '0' }}>
            <li><span style={{color: '#FFD700'}}>●</span> Selected node (gold)</li>
            <li><span style={{color: '#FF6B6B'}}>●</span> Receptive field (red)</li>
            <li>Click any cube to see its receptive field</li>
          </ul>
        </div>
        
        {receptiveFieldState.selectedNode && receptiveFieldState.selectedLayer !== null && (
          <div style={{ 
            marginTop: '10px', 
            padding: '8px', 
            backgroundColor: 'rgba(255,215,0,0.2)', 
            borderRadius: '5px',
            fontSize: '12px'
          }}>
            <strong>Selected:</strong> Layer {receptiveFieldState.selectedLayer} 
            ({receptiveFieldState.selectedNode.x}, {receptiveFieldState.selectedNode.y})
            <br />
            <strong>Receptive field:</strong> {receptiveFieldState.highlightedNodesByLayer.flat().length} nodes
          </div>
        )}
      </div>
    </div>
  );
};

// Component for drawing connection lines between layers
const ConnectionLines: React.FC<{
  from: Vector3;
  to: Vector3;
  fromSize: { x: number; y: number };
  toSize: { x: number; y: number };
}> = ({ from, to, fromSize, toSize }) => {
  const lines = useMemo(() => {
    const connections = [];
    const step = 3; // Only draw some connections to avoid clutter
    
    for (let i = 0; i < fromSize.x; i += step) {
      for (let j = 0; j < fromSize.y; j += step) {
        const fromX = from.x + i - fromSize.x / 2 + 0.5;
        const fromY = from.y + j - fromSize.y / 2 + 0.5;
        const fromZ = from.z;
        
        // Connect to corresponding region in the next layer
        const toX = to.x + (i * toSize.x / fromSize.x) - toSize.x / 2 + 0.5;
        const toY = to.y + (j * toSize.y / fromSize.y) - toSize.y / 2 + 0.5;
        const toZ = to.z;
        
        connections.push([
          [fromX, fromY, fromZ],
          [toX, toY, toZ]
        ]);
      }
    }
    
    return connections;
  }, [from, to, fromSize, toSize]);

  return (
    <>
      {lines.map((points, index) => (
        <mesh key={index}>
          <tubeGeometry args={[
            new CatmullRomCurve3([
              new Vector3(points[0][0], points[0][1], points[0][2]),
              new Vector3(points[1][0], points[1][1], points[1][2])
            ]),
            20,
            0.02,
            8,
            false
          ]} />
          <meshBasicMaterial 
            color="#ffffff" 
            opacity={0.3} 
            transparent 
            depthWrite={false}
            alphaTest={0.05}
          />
        </mesh>
      ))}
    </>
  );
};

export default ConvolutionVisualizer;