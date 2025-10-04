export const colorMap: Record<string, number> = {
  '#4CAF50': 120, // Green (Input)
  '#2196F3': 210, // Blue
  '#9C27B0': 290, // Purple
  '#FF5722': 14, // Deep Orange
  '#FF9800': 36, // Orange
  '#795548': 16, // Brown
  '#607D8B': 18, // Blue Grey
  '#E91E63': 24, // Pink
  '#3F51B5': 30, // Indigo
  '#009688': 42, // Teal
  '#8BC34A': 48, // Light Green
  '#FFEB3B': 54, // Yellow
};

// Helper function to get hue from hex color
export const getHue = (hexColor: string): number => colorMap[hexColor] || 200;
export const getColor = (i: number): string => Object.keys(colorMap)[i % Object.keys(colorMap).length];
