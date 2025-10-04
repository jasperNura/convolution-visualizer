import React, { useMemo } from 'react';
import { Vector3, BoxGeometry } from 'three';
import { Text } from '@react-three/drei';
import type { Node, NodeCounter } from './components.types';

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
  size: { x: number; y: number };
  name: string;
  layerIndex: number;
  onNodeClick: (layerIndex: number, nodeX: number, nodeY: number) => void;
  highlightedNodes: NodeCounter;
  selectedNode: Node | null;
  useLayerData: boolean;
}

// Helper function to get hue from hex color
const getHue = (hexColor: string): number => {
  const colorMap: Record<string, number> = {
    '#4CAF50': 120, // Green
    '#2196F3': 210, // Blue  
    '#9C27B0': 290, // Purple
    '#FF5722': 14, //  Orange
  };
  return colorMap[hexColor] || 200; // Default to blue-ish
};

const isPaddingNode = (node: Node, layerSize: { x: number; y: number }): boolean => {
  return (
    node.x < 0 || node.x >= layerSize.x ||
    node.y < 0 || node.y >= layerSize.y
  );
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
  selectedNode,
  useLayerData
}) => {
  // Create cubes for each neuron/activation
  const cubes = useMemo(() => {
    const maxHighlightCount = highlightedNodes.getMaxCount();
    return data.map((item, index) => {
      // Use layer data for visualization if enabled, otherwise use uniform values
      const intensity = useLayerData ? 0.3 + (item.value * 0.7) : 0.6;
      const height = useLayerData ? (item.activated ? 0.8 : 0.3) : 0.6;
      
      // Calculate node coordinates in grid space
      const nodeX = Math.round(item.x + size.x / 2 - 0.5);
      const nodeY = Math.round(item.y + size.y / 2 - 0.5);

      // Check if this node is highlighted
      const count = highlightedNodes.getCount({ x: nodeX, y: nodeY });
      const isHighlighted = count > 0;
      
      // Check if this is the selected node
      const isSelected = selectedNode?.x === nodeX && 
                        selectedNode?.y === nodeY;
      
      // Determine color based on state
      let cubeColor: string;
      let edgeColor: string;
      if (isSelected) {
        cubeColor = '#FFD700'; // Gold for selected
        edgeColor = '#312a00'; // Darker gold for edge
      } else if (isHighlighted) {
        cubeColor = `hsl(0, ${count / maxHighlightCount * 100}%, 50%)`;
        edgeColor = `hsl(0, ${count / maxHighlightCount * 100}%, 20%)`;
      } else {
        cubeColor = `hsl(${getHue(color)}, 70%, ${20 + intensity * 50}%)`;
        edgeColor = `hsl(${getHue(color)}, 70%, 10%)`;
      }
      
      return (
        <group key={index}>
          <mesh 
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
              // transparent
              // opacity={isHighlighted ? 1 : 0.6}
            />
          </mesh>
          
          {/* Edge lines for the cube */}
          <lineSegments
            position={[
              position.x + item.x,
              position.y + item.y,
              position.z + height / 2
            ]}
          >
            <edgesGeometry args={[new BoxGeometry(0.8, 0.8, height)]} />
            <lineBasicMaterial color={edgeColor} opacity={0.9} transparent />
          </lineSegments>
        </group>
      );
    });
  }, [data, position, color, layerIndex, highlightedNodes, selectedNode, onNodeClick, size, useLayerData]);

  const padding = useMemo(() => {
    const paddedNodes: Node[] = highlightedNodes.getAll().filter(n => isPaddingNode(n, size));
    return paddedNodes.map((node, index) => {
      const height = 0.6;
      const posX = node.x - size.x / 2 + 0.5;
      const posY = node.y - size.y / 2 + 0.5;

      return (
          <mesh key={`padding-${index}`} 
            position={[
              position.x + posX,
              position.y + posY,
              position.z + height / 2
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.8, 0.8, height]} />
            <meshLambertMaterial 
              color='#ffffff'
              transparent
              opacity={0.3}
            />
          </mesh>
      );
    });
  }, [position, highlightedNodes, size]);

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
      {padding}
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