"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.euclidean = void 0;
function euclidean(a, b) {
    var sum = 0;
    for (var n = 0; n < a.length; n++) {
        sum += Math.pow(a[n] - b[n], 2);
    }
    return Math.sqrt(sum);
}
exports.euclidean = euclidean;
