import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import LayerGrid from './LayerGrid';
import ConfigurationPanel from './ConfigurationPanel';
import type { LayerConfigTemplate, LayerConfig, Node, Size } from './components.types';
import { NodeCounter } from './components.types';
import { getColor } from './components.constants';

interface ReceptiveFieldState {
  selectedNode: Node | null;
  selectedLayer: number | null;
}

// Utility function to calculate output size given input size and convolution parameters
const calculateOutputSize = (inputSize: number, kernelSize: number, stride: number, padding: number, dilation: number, singleSidedPadding: boolean): number => {
  return Math.floor((inputSize + (singleSidedPadding ? padding : 2 * padding) - dilation * (kernelSize - 1) - 1) / stride + 1);
};

// Function to calculate layer sizes based on convolution parameters
const calculateLayerSizes = (configs: LayerConfigTemplate[], inputSize: Size, temporalMode: boolean): LayerConfig[] => {
  const result: LayerConfig[] = [];

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    let size: { x: number; y: number };

    if (i === 0) {
      // Input layer - manually specified
      size = inputSize;
    } else {
      // Calculate based on previous layer and convolution parameters
      const prevSize = result[i - 1].size;
      const conv = config.convolution!;

      size = {
        x: calculateOutputSize(prevSize.x, conv.kernelSize.x, conv.stride.x, conv.padding.x, conv.dilation.x, false),
        y: calculateOutputSize(prevSize.y, conv.kernelSize.y, conv.stride.y, conv.padding.y, conv.dilation.y, temporalMode)
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
      kernelSize: { x: 3, y: 3 },
      stride: { x: 1, y: 1 },
      dilation: { x: 2, y: 1 },
      padding: { x: 1, y: 0 }
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
  _inputSize: { x: number; y: number },
  temporalMode: boolean = false
): Node[] => {
  const receptiveField: Node[] = [];

  // For each position in the kernel
  for (let kx = 0; kx < kernelSize.x; kx++) {
    for (let ky = 0; ky < kernelSize.y; ky++) {
      // Calculate the actual input position considering stride, dilation, and padding
      const inputX = nodeX * stride.x + kx * dilation.x - padding.x;

      // For temporal mode (causal), padding is only added at the beginning (y=0)
      // so we don't subtract padding from the Y calculation
      const inputY = temporalMode
        ? nodeY * stride.y + ky * dilation.y
        : nodeY * stride.y + ky * dilation.y - padding.y;

      // Check bounds
      // if (inputX >= 0 && inputX < inputSize.x && inputY >= 0 && inputY < inputSize.y) {
      receptiveField.push({ x: inputX, y: inputY });
      // }
    }
  }

  return receptiveField;
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
const generateConnectionLines = (fromLayer: LayerConfig, fromPos: Vector3, toLayer: LayerConfig, toPos: Vector3) => {
  const positions = [];
  const step = 3; // Only draw some connections to avoid clutter

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
const ConnectionLines: React.FC<{
  layerConfigs: LayerConfig[];
  layerPositions: Vector3[];
}> = ({ layerConfigs, layerPositions }) => {
  const lines = useMemo(() => {
    const allLines = [];
    for (let i = 0; i < layerConfigs.length - 1; i++) {
      const fromPos = layerPositions[i];

      const toPos = layerPositions[i + 1];

      const positions = generateConnectionLines(layerConfigs[i], fromPos, layerConfigs[i + 1], toPos);
      allLines.push(positions);
    }
    return allLines;
  }, [layerConfigs, layerPositions]);

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
  // State for visualization settings
  const [useLayerData, setUseLayerData] = useState(true);
  const [temporalConvolutionMode, setTemporalConvolutionMode] = useState(true);
  const [reverseOrder, setReverseOrder] = useState(true);

  const [inputLayerSize, setInputLayerSize] = useState<Size>({ x: 10, y: 10 });

  // State for layer configuration
  const [layerConfigs, setLayerConfigs] = useState(calculateLayerSizes(INITIAL_LAYER_CONFIG_TEMPLATES, inputLayerSize, temporalConvolutionMode));

  // State for receptive field highlighting
  const [receptiveFieldState, setReceptiveFieldState] = useState<ReceptiveFieldState>({
    selectedNode: null,
    selectedLayer: null,
  });

  // State for animation
  const [isAnimating, setIsAnimating] = useState(false);
  const animationIntervalRef = useRef<number | null>(null);

  // Calculate receptive field for a given node
  const calculateReceptiveField = useCallback((state: ReceptiveFieldState): NodeCounter[] => {
    const highlightedByLayer: NodeCounter[] = layerConfigs.map(() => new NodeCounter()); // Create empty maps for each layer
    if (state.selectedNode == null || state.selectedLayer == null) {
      return highlightedByLayer;
    }
    // Start from the clicked layer and work backwards to input layer
    let currentLayer = state.selectedLayer;
    let currentNodes: NodeCounter = highlightedByLayer[currentLayer];
    currentNodes.add({ x: state.selectedNode.x, y: state.selectedNode.y });

    // Add the clicked node to its layer
    highlightedByLayer[currentLayer] = currentNodes;

    // Work backwards through layers
    while (currentLayer > 0) {
      const nextNodes: NodeCounter = highlightedByLayer[currentLayer - 1];

      // Get the layer configuration for the previous layer and current layer
      const prevLayer = layerConfigs[currentLayer - 1];
      const currentLayerConfig = layerConfigs[currentLayer];
      const currSize = currentLayerConfig.size;

      if (!currentLayerConfig.convolution) {
        currentLayer--;
        continue;
      }

      const conv = currentLayerConfig.convolution;

      // For each node in the current layer, calculate its receptive field in the previous layer
      for (const [node, ] of currentNodes) {
        if (node.x < 0 || node.x >= currSize.x || node.y < 0 || node.y >= currSize.y) {
          // If the node is out of bounds, move on (this can happen with padding)
          continue;
        }
        // Calculate the receptive field for this node
        const receptiveFieldNodes = calculateSingleNodeReceptiveField(
          node.x, node.y,
          conv.kernelSize, conv.stride, conv.dilation, conv.padding,
          prevLayer.size,
          temporalConvolutionMode
        );

        // Add all receptive field nodes to the next layer's highlights
        nextNodes.addAll(receptiveFieldNodes);
      }

      // Move to the previous layer
      currentNodes = nextNodes;
      currentLayer--;
    }

    return highlightedByLayer;
  }, [layerConfigs, temporalConvolutionMode]);

  const highlightedNodesByLayer = useMemo(() => {
    return calculateReceptiveField(receptiveFieldState);
  }, [receptiveFieldState, calculateReceptiveField]);

  // Animation functions
  const getNextNode = useCallback((currentNode: Node | null, layerSize: { x: number; y: number }): Node => {
    if (!currentNode) {
      return { x: 0, y: 0 };
    }

    let { x, y } = currentNode;
    x++;

    if (x >= layerSize.x) {
      x = 0;
      y++;

      if (y >= layerSize.y) {
        y = 0; // Loop back to start
      }
    }

    return { x, y };
  }, []);

  const startAnimation = useCallback(() => {
    if (isAnimating) return;

    const finalLayer = layerConfigs.length - 1;
    const finalLayerSize = layerConfigs[finalLayer].size;

    setIsAnimating(true);
    setReceptiveFieldState({
      selectedNode: { x: 0, y: 0 },
      selectedLayer: finalLayer,
    });

    animationIntervalRef.current = window.setInterval(() => {
      setReceptiveFieldState(prevState => {
        if (!prevState.selectedNode) return prevState;

        const nextNode = getNextNode(prevState.selectedNode, finalLayerSize);
        return {
          selectedNode: nextNode,
          selectedLayer: finalLayer,
        };
      });
    }, 500);
  }, [isAnimating, layerConfigs, getNextNode]);

  const stopAnimation = useCallback(() => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  // Cleanup animation on unmount
  useEffect(() => {

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, []);

  // Handle layer configuration updates
  const handleInputLayerSizeChange = useCallback((newSize: Size) => {
    setInputLayerSize(newSize);
    setLayerConfigs(calculateLayerSizes(layerConfigs, newSize, temporalConvolutionMode));
  }, [layerConfigs, temporalConvolutionMode]);

  // Handle layer configuration updates
  const handleConfigurationChange = useCallback((index: number, configTemplate: LayerConfigTemplate) => {
    const newConfigs = [...layerConfigs];
    // Convert the template back to our full config format
    newConfigs[index] = { ...configTemplate, size: { x: 1, y: 1 } }; // Temporary size, will be recalculated
    setLayerConfigs(calculateLayerSizes(newConfigs, inputLayerSize, temporalConvolutionMode));

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
  }, [layerConfigs, inputLayerSize, temporalConvolutionMode, receptiveFieldState.selectedNode, receptiveFieldState.selectedLayer]);

  // Add new convolution layer
  const handleAddLayer = useCallback(() => {
    const newIndex = layerConfigs.length;
    const newLayer: LayerConfigTemplate = {
      name: `Conv${newIndex}`,
      color: getColor(newIndex),
      convolution: {
        kernelSize: { x: 3, y: 3 },
        stride: { x: 1, y: 1 },
        dilation: { x: 1, y: 1 },
        padding: { x: 0, y: 0 }
      }
    };

    // Convert current layerConfigs to templates, add new layer, then recalculate
    const currentTemplates = layerConfigs.map(config => ({
      name: config.name,
      color: config.color,
      convolution: config.convolution
    }));

    const newTemplates = [...currentTemplates, newLayer];
    const newConfigs = calculateLayerSizes(newTemplates, inputLayerSize, temporalConvolutionMode);
    setLayerConfigs(newConfigs);
  }, [layerConfigs, inputLayerSize, temporalConvolutionMode]);

  // Remove layer by index
  const handleRemoveLayer = useCallback((index: number) => {
    if (index === 0) return; // Cannot remove input layer

    const currentTemplates = layerConfigs.map(config => ({
      name: config.name,
      color: config.color,
      convolution: config.convolution
    }));

    const newTemplates = currentTemplates.filter((_, i) => i !== index);
    const newConfigs = calculateLayerSizes(newTemplates, inputLayerSize, temporalConvolutionMode);
    setLayerConfigs(newConfigs);

    // If the removed layer was selected, clear the selection
    if (receptiveFieldState.selectedLayer === index) {
      setReceptiveFieldState({
        selectedNode: null,
        selectedLayer: null,
      });
    } else if (receptiveFieldState.selectedLayer && receptiveFieldState.selectedLayer > index) {
      // Adjust selected layer index if it's after the removed layer
      setReceptiveFieldState({
        selectedNode: receptiveFieldState.selectedNode,
        selectedLayer: receptiveFieldState.selectedLayer - 1,
      });
    }
  }, [layerConfigs, inputLayerSize, temporalConvolutionMode, receptiveFieldState, setLayerConfigs]);

  // Handle node click
  const handleNodeClick = useCallback((layerIndex: number, x: number, y: number) => {
    setReceptiveFieldState({
      selectedNode: { x, y },
      selectedLayer: layerIndex,
    });
  }, []);

  // Calculate layer position based on temporal convolution mode
  const calculateLayerPosition = useCallback((config: LayerConfig, index: number): Vector3 => {
    const zIndex = reverseOrder ? 6 * (2 + index - layerConfigs.length) : 6 * (1 - index);
    if (temporalConvolutionMode) {
      // In temporal mode, align the bottom row of all layers
      const maxSizeY = layerConfigs[0].size.y;
      const yOffset = (maxSizeY - config.size.y) / 2;
      return new Vector3(0, -yOffset, zIndex);
    } else {
      // Normal mode - center all layers
      return new Vector3(0, 0, zIndex);
    }
  }, [temporalConvolutionMode, reverseOrder, layerConfigs]);

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
        onAddLayer={handleAddLayer}
        onRemoveLayer={handleRemoveLayer}
        inputSize={inputLayerSize}
        onInputSizeChange={handleInputLayerSizeChange}
        useLayerData={useLayerData}
        onUseLayerDataChange={setUseLayerData}
        temporalConvolutionMode={temporalConvolutionMode}
        onTemporalConvolutionModeChange={setTemporalConvolutionMode}
        reverseOrder={reverseOrder}
        onReverseOrderChange={setReverseOrder}
        isAnimating={isAnimating}
        onStartAnimation={startAnimation}
        onStopAnimation={stopAnimation}
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

          {layerConfigs.filter(c => c.size.x > 0 && c.size.y > 0).map((config, index) => (
            <LayerGrid
              key={`${config.name}-${config.size.x}x${config.size.y}`} // Include size in key for re-rendering
              data={layerData[index]}
              position={calculateLayerPosition(config, index)}
              color={config.color}
              size={config.size}
              name={config.name}
              layerIndex={index}
              onNodeClick={handleNodeClick}
              highlightedNodes={highlightedNodesByLayer[index] || new Map()}
              selectedNode={receptiveFieldState.selectedLayer === index ? receptiveFieldState.selectedNode : null}
              useLayerData={useLayerData}
            />
          ))}

          {/* Connection lines between layers */}
          <ConnectionLines
            layerConfigs={layerConfigs.filter(c => c.size.x > 0 && c.size.y > 0)}
            layerPositions={layerConfigs.filter(c => c.size.x > 0 && c.size.y > 0).map((config, index) => calculateLayerPosition(config, index))}
          />

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