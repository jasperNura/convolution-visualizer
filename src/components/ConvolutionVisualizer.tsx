import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3, CatmullRomCurve3 } from 'three';
import LayerGrid from './LayerGrid';

// Configuration for the convolution layers
const LAYER_CONFIG = {
  input: {
    size: 10,
    name: 'Input Layer',
    position: new Vector3(0, 0, 0),
    color: '#4CAF50'
  },
  conv1: {
    size: 8, // 10 - 3 + 1 = 8 (assuming no padding)
    name: 'Conv Layer 1 (3x3)',
    position: new Vector3(0, 0, -6),
    color: '#2196F3'
  },
  conv2: {
    size: 6, // 8 - 3 + 1 = 6
    name: 'Conv Layer 2 (3x3)',
    position: new Vector3(0, 0, -12),
    color: '#9C27B0'
  }
};

const ConvolutionVisualizer: React.FC = () => {
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

    return {
      input: generateLayerData(LAYER_CONFIG.input.size),
      conv1: generateLayerData(LAYER_CONFIG.conv1.size),
      conv2: generateLayerData(LAYER_CONFIG.conv2.size)
    };
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

        {/* Input Layer */}
        <LayerGrid
          data={layerData.input}
          position={LAYER_CONFIG.input.position}
          color={LAYER_CONFIG.input.color}
          size={LAYER_CONFIG.input.size}
          name={LAYER_CONFIG.input.name}
        />

        {/* First Convolution Layer */}
        <LayerGrid
          data={layerData.conv1}
          position={LAYER_CONFIG.conv1.position}
          color={LAYER_CONFIG.conv1.color}
          size={LAYER_CONFIG.conv1.size}
          name={LAYER_CONFIG.conv1.name}
        />

        {/* Second Convolution Layer */}
        <LayerGrid
          data={layerData.conv2}
          position={LAYER_CONFIG.conv2.position}
          color={LAYER_CONFIG.conv2.color}
          size={LAYER_CONFIG.conv2.size}
          name={LAYER_CONFIG.conv2.name}
        />

        {/* Connection lines between layers */}
        <ConnectionLines 
          from={LAYER_CONFIG.input.position}
          to={LAYER_CONFIG.conv1.position}
          fromSize={LAYER_CONFIG.input.size}
          toSize={LAYER_CONFIG.conv1.size}
        />
        
        <ConnectionLines 
          from={LAYER_CONFIG.conv1.position}
          to={LAYER_CONFIG.conv2.position}
          fromSize={LAYER_CONFIG.conv1.size}
          toSize={LAYER_CONFIG.conv2.size}
        />

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
        textShadow: '2px 2px 4px rgba(0,0,0,0.7)'
      }}>
        <h2>3D Convolution Neural Network Visualizer</h2>
        <p>Phase 1: Basic Layer Visualization</p>
        <ul style={{ fontSize: '14px', marginTop: '10px' }}>
          <li>Input: 10×10 grid (green)</li>
          <li>Conv Layer 1: 8×8 grid with 3×3 filter (blue)</li>
          <li>Conv Layer 2: 6×6 grid with 3×3 filter (purple)</li>
        </ul>
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