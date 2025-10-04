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

// Configuration for the convolution layers
const LAYER_CONFIGS = [
  {
    size: 10,
    name: 'Input Layer',
    position: new Vector3(0, 0, 0),
    color: '#4CAF50',
    kernelSize: 1 // Input layer doesn't have a kernel
  },
  {
    size: 8, // 10 - 3 + 1 = 8 (assuming no padding)
    name: 'Conv Layer 1 (3x3)',
    position: new Vector3(0, 0, -6),
    color: '#2196F3',
    kernelSize: 3
  },
  {
    size: 6, // 8 - 3 + 1 = 6
    name: 'Conv Layer 2 (3x3)',
    position: new Vector3(0, 0, -12),
    color: '#9C27B0',
    kernelSize: 3
  }
];

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
      const kernelSize = currentLayerConfig.kernelSize;
      
      // For each node in current layer, find its receptive field in previous layer
      highlightedByLayer[currentLayer].forEach(node => {
        for (let i = 0; i < kernelSize; i++) {
          for (let j = 0; j < kernelSize; j++) {
            const prevX = node.x + i;
            const prevY = node.y + j;
            
            // Check bounds
            if (prevX >= 0 && prevX < prevLayer.size && prevY >= 0 && prevY < prevLayer.size) {
              // Check if this node is already in the list to avoid duplicates
              const existing = highlightedByLayer[currentLayer - 1].find(h => h.x === prevX && h.y === prevY);
              
              if (!existing) {
                const newNode: HighlightedNode = {
                  x: prevX,
                  y: prevY
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
    const generateLayerData = (size: number) => {
      const data = [];
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          // Generate some sample activation values
          const value = Math.random() * 0.8 + 0.2;
          data.push({
            x: i - size / 2 + 0.5,
            y: j - size / 2 + 0.5,
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
        <p><strong>Phase 2: Receptive Field Interactions</strong></p>
        <ul style={{ fontSize: '14px', marginTop: '10px' }}>
          <li>Input: 10×10 grid (green)</li>
          <li>Conv Layer 1: 8×8 grid with 3×3 filter (blue)</li>
          <li>Conv Layer 2: 6×6 grid with 3×3 filter (purple)</li>
        </ul>
        
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
  fromSize: number;
  toSize: number;
}> = ({ from, to, fromSize, toSize }) => {
  const lines = useMemo(() => {
    const connections = [];
    const step = 3; // Only draw some connections to avoid clutter
    
    for (let i = 0; i < fromSize; i += step) {
      for (let j = 0; j < fromSize; j += step) {
        const fromX = from.x + i - fromSize / 2 + 0.5;
        const fromY = from.y + j - fromSize / 2 + 0.5;
        const fromZ = from.z;
        
        // Connect to corresponding region in the next layer
        const toX = to.x + (i * toSize / fromSize) - toSize / 2 + 0.5;
        const toY = to.y + (j * toSize / fromSize) - toSize / 2 + 0.5;
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