import React, { useMemo } from 'react';
import { Vector3 } from 'three';
import { Text } from '@react-three/drei';

interface LayerData {
  x: number;
  y: number;
  value: number;
  activated: boolean;
}

interface HighlightedNode {
  x: number;
  y: number;
}

interface LayerGridProps {
  data: LayerData[];
  position: Vector3;
  color: string;
  size: { x: number; y: number };
  name: string;
  layerIndex: number;
  onNodeClick: (layerIndex: number, nodeX: number, nodeY: number) => void;
  highlightedNodes: HighlightedNode[];
  selectedNode: HighlightedNode | null;
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
  name,
  layerIndex,
  onNodeClick,
  highlightedNodes,
  selectedNode
}) => {
  // Create cubes for each neuron/activation
  const cubes = useMemo(() => {
    return data.map((item, index) => {
      const intensity = 0.3 + (item.value * 0.7);
      const height = item.activated ? 0.8 : 0.3;
      
      // Calculate node coordinates in grid space
      const nodeX = Math.round(item.x + size.x / 2 - 0.5);
      const nodeY = Math.round(item.y + size.y / 2 - 0.5);
      
      // Check if this node is highlighted
      const isHighlighted = highlightedNodes.some(h => 
        h.x === nodeX && h.y === nodeY
      );
      
      // Check if this is the selected node
      const isSelected = selectedNode?.x === nodeX && 
                        selectedNode?.y === nodeY;
      
      // Determine color based on state
      let cubeColor: string;
      if (isSelected) {
        cubeColor = '#FFD700'; // Gold for selected
      } else if (isHighlighted) {
        cubeColor = '#FF6B6B'; // Red for highlighted receptive field
      } else {
        cubeColor = `hsl(${getHue(color)}, 70%, ${20 + intensity * 50}%)`;
      }
      
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
          onClick={(e) => {
            e.stopPropagation();
            onNodeClick(layerIndex, nodeX, nodeY);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'default';
          }}
        >
          <boxGeometry args={[0.8, 0.8, height]} />
          <meshLambertMaterial 
            color={cubeColor}
            emissive={isSelected ? '#222200' : isHighlighted ? '#220000' : '#000000'}
            emissiveIntensity={isSelected || isHighlighted ? 0.3 : 0}
          />
        </mesh>
      );
    });
  }, [data, position, color, layerIndex, highlightedNodes, selectedNode, onNodeClick, size]);

  // Create base platform for the layer
  const platform = useMemo(() => (
    <mesh 
      position={[position.x, position.y, position.z - 0.1]}
      receiveShadow
    >
      <boxGeometry args={[size.x + 1, size.y + 1, 0.1]} />
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
        position={[position.x, position.y - size.y/2 - 1.5, position.z + 1]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
      <Text
        position={[position.x, position.y - size.y/2 - 2, position.z + 1]}
        fontSize={0.3}
        color="#cccccc"
        anchorX="center"
        anchorY="middle"
      >
        {size.x}×{size.y}
      </Text>
    </group>
  );
};

export default LayerGrid;