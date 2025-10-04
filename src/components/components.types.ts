// Configuration panel types (matching ConfigurationPanel.tsx)
export interface ConvolutionConfig {
  kernelSize: { x: number; y: number };
  stride: { x: number; y: number };
  dilation: { x: number; y: number };
  padding: { x: number; y: number };
}

// Full layer configuration with position and size
export interface LayerConfig {
  name: string;
  size: { x: number; y: number };
  color: string;
  convolution?: ConvolutionConfig;
}

export interface LayerConfigTemplate extends Omit<LayerConfig, 'size'> {}
