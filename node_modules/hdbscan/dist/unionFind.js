"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeUnionFind = exports.UnionFind = void 0;
class UnionFind {
    constructor(numNodes) {
        this.parent = new Array(2 * (numNodes - 1)).fill(-1);
        this.nextLabel = numNodes;
        this.size = new Array(numNodes).fill(1).concat(new Array(numNodes - 1).fill(0));
    }
    union(m, n) {
        this.size[this.nextLabel] = this.size[m] + this.size[n];
        this.parent[m] = this.nextLabel;
        this.parent[n] = this.nextLabel;
        this.size[this.nextLabel] = this.size[m] + this.size[n];
        this.nextLabel += 1;
    }
    fastFind(n) {
        var p = n;
        while (this.parent[n] != -1) {
            n = this.parent[n];
        }
        while (this.parent[p] != n) {
            p = this.parent[p];
            this.parent[p] = n;
        }
        return n;
    }
    sizeOf(n) {
        return this.size[n];
    }
}
exports.UnionFind = UnionFind;
class TreeUnionFind {
    constructor(size) {
        this.data = new Array(size);
        for (var i = 0; i < size; i++) {
            this.data[i] = [i, 0];
        }
        this.isComponent = new Array(size).fill(true);
    }
    union(x, y) {
        const xRoot = this.find(x);
        const yRoot = this.find(y);
        if (this.data[xRoot][1] < this.data[yRoot][1]) {
            this.data[xRoot][0] = yRoot;
        }
        else if (this.data[xRoot][1] > this.data[yRoot][1]) {
            this.data[yRoot][0] = xRoot;
        }
        else {
            this.data[yRoot][0] = xRoot;
            this.data[xRoot][1] += 1;
        }
        return;
    }
    find(x) {
        if (this.data[x][0] !== x) {
            this.data[x][0] = this.find(this.data[x][0]);
            this.isComponent[x] = false;
        }
        return this.data[x][0];
    }
    components() {
        return [...Array(this.isComponent.length).keys()]
            .filter(c => this.isComponent[c]);
    }
}
exports.TreeUnionFind = TreeUnionFind;
