export interface Size {
    x: number;
    y: number;
}

export interface ConvolutionConfig {
  kernelSize: Size;
  stride: Size;
  dilation: Size;
  padding: Size;
}

// Full layer configuration with position and size
export interface LayerConfig {
  name: string;
  size: Size;
  color: string;
  convolution?: ConvolutionConfig;
}

export interface LayerConfigTemplate extends Omit<LayerConfig, 'size'> {}

export interface Node {
  x: number;
  y: number;
}

export class NodeCounter implements Iterable<[Node, number]> {
    private counts: Map<string, number> = new Map();
    private nodeCache: Map<string, Node> = new Map();

    private getNodeKey(node: Node): string {
        return `${node.x},${node.y}`;
    }

    add(node: Node): void {
        const key = this.getNodeKey(node);
        const currentCount = this.counts.get(key) || 0;
        this.counts.set(key, currentCount + 1);
        this.nodeCache.set(key, {...node}); // Cache node for iterator
    }

    addAll(nodes: Node[]): void {
        nodes.forEach(node => this.add(node));
    }

    getAll(): Node[] {
        return Array.from(this.nodeCache.values());
    }

    getCount(node: Node): number {
        const key = this.getNodeKey(node);
        return this.counts.get(key) || 0;
    }

    getMaxCount(): number {
        return Math.max(...this.counts.values());
    }

    has(node: Node): boolean {
        const key = this.getNodeKey(node);
        return this.counts.has(key);
    }

    clear(): void {
        this.counts.clear();
        this.nodeCache.clear();
    }

    [Symbol.iterator](): Iterator<[Node, number]> {
        const entries = Array.from(this.counts.entries());
        let index = 0;
        
        return {
            next: (): IteratorResult<[Node, number]> => {
                if (index < entries.length) {
                    const [key, count] = entries[index++];
                    const node = this.nodeCache.get(key)!;
                    return { value: [node, count], done: false };
                }
                return { value: undefined, done: true };
            }
        };
    }
}

