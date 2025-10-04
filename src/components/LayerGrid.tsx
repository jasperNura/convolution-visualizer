import React, { useMemo } from 'react';
import { Vector3 } from 'three';
import { Text } from '@react-three/drei';

interface LayerData {
  x: number;
  y: number;
  value: number;
  activated: boolean;
}

interface LayerGridProps {
  data: LayerData[];
  position: Vector3;
  color: string;
  size: number;
  name: string;
}

// Helper function to get hue from hex color
const getHue = (hexColor: string): number => {
  const colorMap: Record<string, number> = {
    '#4CAF50': 120, // Green
    '#2196F3': 210, // Blue  
    '#9C27B0': 290, // Purple
  };
  return colorMap[hexColor] || 200; // Default to blue-ish
};

const LayerGrid: React.FC<LayerGridProps> = ({ 
  data, 
  position, 
  color, 
  size, 
  name 
}) => {
  // Create cubes for each neuron/activation
  const cubes = useMemo(() => {
    return data.map((item, index) => {
      const intensity = 0.3 + (item.value * 0.7);
      const height = item.activated ? 0.8 : 0.3;
      
      const adjustedColor = `hsl(${getHue(color)}, 70%, ${20 + intensity * 50}%)`;
      
      return (
        <mesh 
          key={index}
          position={[
            position.x + item.x,
            position.y + item.y,
            position.z + height / 2
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.8, 0.8, height]} />
          <meshLambertMaterial 
            color={adjustedColor}
          />
        </mesh>
      );
    });
  }, [data, position, color]);

  // Create base platform for the layer
  const platform = useMemo(() => (
    <mesh 
      position={[position.x, position.y, position.z - 0.1]}
      receiveShadow
    >
      <boxGeometry args={[size + 1, size + 1, 0.1]} />
      <meshLambertMaterial 
        color="#333333" 
        opacity={0.7} 
        transparent 
      />
    </mesh>
  ), [position, size]);

  return (
    <group>
      {platform}
      {cubes}
      <Text
        position={[position.x, position.y - size/2 - 1.5, position.z + 1]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
      <Text
        position={[position.x, position.y - size/2 - 2, position.z + 1]}
        fontSize={0.3}
        color="#cccccc"
        anchorX="center"
        anchorY="middle"
      >
        {size}×{size}
      </Text>
    </group>
  );
};

export default LayerGrid;