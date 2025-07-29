"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kdTreeCoreDistance = void 0;
const kd_tree_javascript_1 = require("kd-tree-javascript");
function kdTreeCoreDistance(input, minSamples, metric) {
    const tree = new kd_tree_javascript_1.kdTree(input, metric, []);
    const coreDistances = input.map(p => tree.nearest(p, minSamples)[0][1]);
    return coreDistances;
}
exports.kdTreeCoreDistance = kdTreeCoreDistance;
