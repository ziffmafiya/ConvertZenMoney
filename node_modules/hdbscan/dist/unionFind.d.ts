export declare class UnionFind {
    private nextLabel;
    private parent;
    private size;
    constructor(numNodes: number);
    union(m: number, n: number): void;
    fastFind(n: number): number;
    sizeOf(n: number): number;
}
export declare class TreeUnionFind {
    private data;
    private isComponent;
    constructor(size: number);
    union(x: number, y: number): void;
    find(x: number): number;
    components(): number[];
}
