"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMstUsingPrim = void 0;
const types_1 = require("./types");
function buildMstUsingPrim(input, alpha, metric, coreDistances) {
    const numPoints = input.length;
    const inTree = [];
    const result = [];
    const currentDistances = new Array(numPoints).fill(Infinity);
    var currentNode = 0;
    var currentNodeCoreDistance = Infinity;
    var newNode = Infinity;
    var newDistance = Infinity;
    var rightValue = Infinity;
    var leftValue = Infinity;
    for (var i = 1; i < numPoints; i++) {
        inTree[currentNode] = 1;
        currentNodeCoreDistance = coreDistances[currentNode];
        newDistance = Infinity;
        newNode = 0;
        for (var j = 0; j < numPoints; j++) {
            if (inTree[j]) {
                continue;
            }
            rightValue = currentDistances[j];
            leftValue = metric(input[currentNode], input[j]);
            if (alpha != 1.0) {
                leftValue /= alpha;
            }
            const coreValue = coreDistances[j];
            if (currentNodeCoreDistance > rightValue ||
                coreValue > rightValue ||
                leftValue > rightValue) {
                if (rightValue < newDistance) {
                    newDistance = rightValue;
                    newNode = j;
                }
                continue;
            }
            if (coreValue > currentNodeCoreDistance) {
                if (coreValue > leftValue) {
                    leftValue = coreValue;
                }
            }
            else if (currentNodeCoreDistance > leftValue) {
                leftValue = currentNodeCoreDistance;
            }
            if (leftValue < rightValue) {
                currentDistances[j] = leftValue;
                if (leftValue < newDistance) {
                    newDistance = leftValue;
                    newNode = j;
                }
            }
            else if (rightValue < newDistance) {
                newDistance = rightValue;
                newNode = j;
            }
        }
        result[i - 1] = new types_1.HierarchyNode(currentNode, newNode, newDistance, 0);
        currentNode = newNode;
    }
    return result;
}
exports.buildMstUsingPrim = buildMstUsingPrim;
