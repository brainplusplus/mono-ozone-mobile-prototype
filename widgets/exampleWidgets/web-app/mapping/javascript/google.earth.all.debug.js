// JC2CUI - Modified to use local images instead

/*
Copyright 2009 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
(function() {
/**
 * The geo namespace contains generic classes and namespaces for processing
 * geographic data in JavaScript. Where possible, an effort was made to keep
 * the library compatible with the Google Geo APIs (Maps, Earth, KML, etc.)
 * @namespace
 */
var geo = {isnamespace_:true};
/*
Copyright 2009 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
// TODO: geo.ALTITUDE_NONE to differentiate 2D/3D coordinates
geo.ALTITUDE_CLAMP_TO_GROUND = 0;
geo.ALTITUDE_RELATIVE_TO_GROUND = 1;
geo.ALTITUDE_ABSOLUTE = 2;
geo.ALTITUDE_CLAMP_TO_SEA_FLOOR = 4;
geo.ALTITUDE_RELATIVE_TO_SEA_FLOOR = 5;
/*
 * This is an excerpt from the Sylvester linear algebra library, MIT-licensed.
 */
// This file is required in order for any other classes to work. Some Vector methods work with the
// other Sylvester classes and are useless unless they are included. Other classes such as Line and
// Plane will not function at all without Vector being loaded first.

var Sylvester = {
  precision: 1e-6
};

function Vector() {}
Vector.prototype = {

  // Returns element i of the vector
  e: function(i) {
    return (i < 1 || i > this.elements.length) ? null : this.elements[i-1];
  },

  // Returns the number of elements the vector has
  dimensions: function() {
    return this.elements.length;
  },

  // Returns the modulus ('length') of the vector
  modulus: function() {
    return Math.sqrt(this.dot(this));
  },

  // Returns true iff the vector is equal to the argument
  eql: function(vector) {
    var n = this.elements.length;
    var V = vector.elements || vector;
    if (n != V.length) { return false; }
    while (n--) {
      if (Math.abs(this.elements[n] - V[n]) > Sylvester.precision) { return false; }
    }
    return true;
  },

  // Returns a copy of the vector
  dup: function() {
    return Vector.create(this.elements);
  },

  // Maps the vector to another vector according to the given function
  map: function(fn) {
    var elements = [];
    this.each(function(x, i) {
      elements.push(fn(x, i));
    });
    return Vector.create(elements);
  },

  // Calls the iterator for each element of the vector in turn
  each: function(fn) {
    var n = this.elements.length;
    for (var i = 0; i < n; i++) {
      fn(this.elements[i], i+1);
    }
  },

  // Returns a new vector created by normalizing the receiver
  toUnitVector: function() {
    var r = this.modulus();
    if (r === 0) { return this.dup(); }
    return this.map(function(x) { return x/r; });
  },

  // Returns the angle between the vector and the argument (also a vector)
  angleFrom: function(vector) {
    var V = vector.elements || vector;
    var n = this.elements.length, k = n, i;
    if (n != V.length) { return null; }
    var dot = 0, mod1 = 0, mod2 = 0;
    // Work things out in parallel to save time
    this.each(function(x, i) {
      dot += x * V[i-1];
      mod1 += x * x;
      mod2 += V[i-1] * V[i-1];
    });
    mod1 = Math.sqrt(mod1); mod2 = Math.sqrt(mod2);
    if (mod1*mod2 === 0) { return null; }
    var theta = dot / (mod1*mod2);
    if (theta < -1) { theta = -1; }
    if (theta > 1) { theta = 1; }
    return Math.acos(theta);
  },

  // Returns true iff the vector is parallel to the argument
  isParallelTo: function(vector) {
    var angle = this.angleFrom(vector);
    return (angle === null) ? null : (angle <= Sylvester.precision);
  },

  // Returns true iff the vector is antiparallel to the argument
  isAntiparallelTo: function(vector) {
    var angle = this.angleFrom(vector);
    return (angle === null) ? null : (Math.abs(angle - Math.PI) <= Sylvester.precision);
  },

  // Returns true iff the vector is perpendicular to the argument
  isPerpendicularTo: function(vector) {
    var dot = this.dot(vector);
    return (dot === null) ? null : (Math.abs(dot) <= Sylvester.precision);
  },

  // Returns the result of adding the argument to the vector
  add: function(vector) {
    var V = vector.elements || vector;
    if (this.elements.length != V.length) { return null; }
    return this.map(function(x, i) { return x + V[i-1]; });
  },

  // Returns the result of subtracting the argument from the vector
  subtract: function(vector) {
    var V = vector.elements || vector;
    if (this.elements.length != V.length) { return null; }
    return this.map(function(x, i) { return x - V[i-1]; });
  },

  // Returns the result of multiplying the elements of the vector by the argument
  multiply: function(k) {
    return this.map(function(x) { return x*k; });
  },

  x: function(k) { return this.multiply(k); },

  // Returns the scalar product of the vector with the argument
  // Both vectors must have equal dimensionality
  dot: function(vector) {
    var V = vector.elements || vector;
    var i, product = 0, n = this.elements.length;
    if (n != V.length) { return null; }
    while (n--) { product += this.elements[n] * V[n]; }
    return product;
  },

  // Returns the vector product of the vector with the argument
  // Both vectors must have dimensionality 3
  cross: function(vector) {
    var B = vector.elements || vector;
    if (this.elements.length != 3 || B.length != 3) { return null; }
    var A = this.elements;
    return Vector.create([
      (A[1] * B[2]) - (A[2] * B[1]),
      (A[2] * B[0]) - (A[0] * B[2]),
      (A[0] * B[1]) - (A[1] * B[0])
    ]);
  },

  // Returns the (absolute) largest element of the vector
  max: function() {
    var m = 0, i = this.elements.length;
    while (i--) {
      if (Math.abs(this.elements[i]) > Math.abs(m)) { m = this.elements[i]; }
    }
    return m;
  },

  // Returns the index of the first match found
  indexOf: function(x) {
    var index = null, n = this.elements.length;
    for (var i = 0; i < n; i++) {
      if (index === null && this.elements[i] == x) {
        index = i + 1;
      }
    }
    return index;
  },

  // Returns a diagonal matrix with the vector's elements as its diagonal elements
  toDiagonalMatrix: function() {
    return Matrix.Diagonal(this.elements);
  },

  // Returns the result of rounding the elements of the vector
  round: function() {
    return this.map(function(x) { return Math.round(x); });
  },

  // Returns a copy of the vector with elements set to the given value if they
  // differ from it by less than Sylvester.precision
  snapTo: function(x) {
    return this.map(function(y) {
      return (Math.abs(y - x) <= Sylvester.precision) ? x : y;
    });
  },

  // Returns the vector's distance from the argument, when considered as a point in space
  distanceFrom: function(obj) {
    if (obj.anchor || (obj.start && obj.end)) { return obj.distanceFrom(this); }
    var V = obj.elements || obj;
    if (V.length != this.elements.length) { return null; }
    var sum = 0, part;
    this.each(function(x, i) {
      part = x - V[i-1];
      sum += part * part;
    });
    return Math.sqrt(sum);
  },

  // Returns true if the vector is point on the given line
  liesOn: function(line) {
    return line.contains(this);
  },

  // Return true iff the vector is a point in the given plane
  liesIn: function(plane) {
    return plane.contains(this);
  },

  // Rotates the vector about the given object. The object should be a 
  // point if the vector is 2D, and a line if it is 3D. Be careful with line directions!
  rotate: function(t, obj) {
    var V, R = null, x, y, z;
    if (t.determinant) { R = t.elements; }
    switch (this.elements.length) {
      case 2:
        V = obj.elements || obj;
        if (V.length != 2) { return null; }
        if (!R) { R = Matrix.Rotation(t).elements; }
        x = this.elements[0] - V[0];
        y = this.elements[1] - V[1];
        return Vector.create([
          V[0] + R[0][0] * x + R[0][1] * y,
          V[1] + R[1][0] * x + R[1][1] * y
        ]);
        break;
      case 3:
        if (!obj.direction) { return null; }
        var C = obj.pointClosestTo(this).elements;
        if (!R) { R = Matrix.Rotation(t, obj.direction).elements; }
        x = this.elements[0] - C[0];
        y = this.elements[1] - C[1];
        z = this.elements[2] - C[2];
        return Vector.create([
          C[0] + R[0][0] * x + R[0][1] * y + R[0][2] * z,
          C[1] + R[1][0] * x + R[1][1] * y + R[1][2] * z,
          C[2] + R[2][0] * x + R[2][1] * y + R[2][2] * z
        ]);
        break;
      default:
        return null;
    }
  },

  // Returns the result of reflecting the point in the given point, line or plane
  reflectionIn: function(obj) {
    if (obj.anchor) {
      // obj is a plane or line
      var P = this.elements.slice();
      var C = obj.pointClosestTo(P).elements;
      return Vector.create([C[0] + (C[0] - P[0]), C[1] + (C[1] - P[1]), C[2] + (C[2] - (P[2] || 0))]);
    } else {
      // obj is a point
      var Q = obj.elements || obj;
      if (this.elements.length != Q.length) { return null; }
      return this.map(function(x, i) { return Q[i-1] + (Q[i-1] - x); });
    }
  },

  // Utility to make sure vectors are 3D. If they are 2D, a zero z-component is added
  to3D: function() {
    var V = this.dup();
    switch (V.elements.length) {
      case 3: break;
      case 2: V.elements.push(0); break;
      default: return null;
    }
    return V;
  },

  // Returns a string representation of the vector
  inspect: function() {
    return '[' + this.elements.join(', ') + ']';
  },

  // Set vector's elements from an array
  setElements: function(els) {
    this.elements = (els.elements || els).slice();
    return this;
  }
};

// Constructor function
Vector.create = function(elements) {
  var V = new Vector();
  return V.setElements(elements);
};
var $V = Vector.create;

// i, j, k unit vectors
Vector.i = Vector.create([1,0,0]);
Vector.j = Vector.create([0,1,0]);
Vector.k = Vector.create([0,0,1]);

// Random vector of size n
Vector.Random = function(n) {
  var elements = [];
  while (n--) { elements.push(Math.random()); }
  return Vector.create(elements);
};

// Vector filled with zeros
Vector.Zero = function(n) {
  var elements = [];
  while (n--) { elements.push(0); }
  return Vector.create(elements);
};// Matrix class - depends on Vector.

function Matrix() {}
Matrix.prototype = {

  // Returns element (i,j) of the matrix
  e: function(i,j) {
    if (i < 1 || i > this.elements.length || j < 1 || j > this.elements[0].length) { return null; }
    return this.elements[i-1][j-1];
  },

  // Returns row k of the matrix as a vector
  row: function(i) {
    if (i > this.elements.length) { return null; }
    return Vector.create(this.elements[i-1]);
  },

  // Returns column k of the matrix as a vector
  col: function(j) {
    if (j > this.elements[0].length) { return null; }
    var col = [], n = this.elements.length;
    for (var i = 0; i < n; i++) { col.push(this.elements[i][j-1]); }
    return Vector.create(col);
  },

  // Returns the number of rows/columns the matrix has
  dimensions: function() {
    return {rows: this.elements.length, cols: this.elements[0].length};
  },

  // Returns the number of rows in the matrix
  rows: function() {
    return this.elements.length;
  },

  // Returns the number of columns in the matrix
  cols: function() {
    return this.elements[0].length;
  },

  // Returns true iff the matrix is equal to the argument. You can supply
  // a vector as the argument, in which case the receiver must be a
  // one-column matrix equal to the vector.
  eql: function(matrix) {
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    if (this.elements.length != M.length ||
        this.elements[0].length != M[0].length) { return false; }
    var i = this.elements.length, nj = this.elements[0].length, j;
    while (i--) { j = nj;
      while (j--) {
        if (Math.abs(this.elements[i][j] - M[i][j]) > Sylvester.precision) { return false; }
      }
    }
    return true;
  },

  // Returns a copy of the matrix
  dup: function() {
    return Matrix.create(this.elements);
  },

  // Maps the matrix to another matrix (of the same dimensions) according to the given function
  map: function(fn) {
    var els = [], i = this.elements.length, nj = this.elements[0].length, j;
    while (i--) { j = nj;
      els[i] = [];
      while (j--) {
        els[i][j] = fn(this.elements[i][j], i + 1, j + 1);
      }
    }
    return Matrix.create(els);
  },

  // Returns true iff the argument has the same dimensions as the matrix
  isSameSizeAs: function(matrix) {
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    return (this.elements.length == M.length &&
        this.elements[0].length == M[0].length);
  },

  // Returns the result of adding the argument to the matrix
  add: function(matrix) {
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    if (!this.isSameSizeAs(M)) { return null; }
    return this.map(function(x, i, j) { return x + M[i-1][j-1]; });
  },

  // Returns the result of subtracting the argument from the matrix
  subtract: function(matrix) {
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    if (!this.isSameSizeAs(M)) { return null; }
    return this.map(function(x, i, j) { return x - M[i-1][j-1]; });
  },

  // Returns true iff the matrix can multiply the argument from the left
  canMultiplyFromLeft: function(matrix) {
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    // this.columns should equal matrix.rows
    return (this.elements[0].length == M.length);
  },

  // Returns the result of multiplying the matrix from the right by the argument.
  // If the argument is a scalar then just multiply all the elements. If the argument is
  // a vector, a vector is returned, which saves you having to remember calling
  // col(1) on the result.
  multiply: function(matrix) {
    if (!matrix.elements) {
      return this.map(function(x) { return x * matrix; });
    }
    var returnVector = matrix.modulus ? true : false;
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    if (!this.canMultiplyFromLeft(M)) { return null; }
    var i = this.elements.length, nj = M[0].length, j;
    var cols = this.elements[0].length, c, elements = [], sum;
    while (i--) { j = nj;
      elements[i] = [];
      while (j--) { c = cols;
        sum = 0;
        while (c--) {
          sum += this.elements[i][c] * M[c][j];
        }
        elements[i][j] = sum;
      }
    }
    var M = Matrix.create(elements);
    return returnVector ? M.col(1) : M;
  },

  x: function(matrix) { return this.multiply(matrix); },

  // Returns a submatrix taken from the matrix
  // Argument order is: start row, start col, nrows, ncols
  // Element selection wraps if the required index is outside the matrix's bounds, so you could
  // use this to perform row/column cycling or copy-augmenting.
  minor: function(a, b, c, d) {
    var elements = [], ni = c, i, nj, j;
    var rows = this.elements.length, cols = this.elements[0].length;
    while (ni--) { i = c - ni - 1;
      elements[i] = [];
      nj = d;
      while (nj--) { j = d - nj - 1;
        elements[i][j] = this.elements[(a+i-1)%rows][(b+j-1)%cols];
      }
    }
    return Matrix.create(elements);
  },

  // Returns the transpose of the matrix
  transpose: function() {
    var rows = this.elements.length, i, cols = this.elements[0].length, j;
    var elements = [], i = cols;
    while (i--) { j = rows;
      elements[i] = [];
      while (j--) {
        elements[i][j] = this.elements[j][i];
      }
    }
    return Matrix.create(elements);
  },

  // Returns true iff the matrix is square
  isSquare: function() {
    return (this.elements.length == this.elements[0].length);
  },

  // Returns the (absolute) largest element of the matrix
  max: function() {
    var m = 0, i = this.elements.length, nj = this.elements[0].length, j;
    while (i--) { j = nj;
      while (j--) {
        if (Math.abs(this.elements[i][j]) > Math.abs(m)) { m = this.elements[i][j]; }
      }
    }
    return m;
  },

  // Returns the indeces of the first match found by reading row-by-row from left to right
  indexOf: function(x) {
    var index = null, ni = this.elements.length, i, nj = this.elements[0].length, j;
    for (i = 0; i < ni; i++) {
      for (j = 0; j < nj; j++) {
        if (this.elements[i][j] == x) { return {i: i+1, j: j+1}; }
      }
    }
    return null;
  },

  // If the matrix is square, returns the diagonal elements as a vector.
  // Otherwise, returns null.
  diagonal: function() {
    if (!this.isSquare) { return null; }
    var els = [], n = this.elements.length;
    for (var i = 0; i < n; i++) {
      els.push(this.elements[i][i]);
    }
    return Vector.create(els);
  },

  // Make the matrix upper (right) triangular by Gaussian elimination.
  // This method only adds multiples of rows to other rows. No rows are
  // scaled up or switched, and the determinant is preserved.
  toRightTriangular: function() {
    var M = this.dup(), els;
    var n = this.elements.length, i, j, np = this.elements[0].length, p;
    for (i = 0; i < n; i++) {
      if (M.elements[i][i] == 0) {
        for (j = i + 1; j < n; j++) {
          if (M.elements[j][i] != 0) {
            els = [];
            for (p = 0; p < np; p++) { els.push(M.elements[i][p] + M.elements[j][p]); }
            M.elements[i] = els;
            break;
          }
        }
      }
      if (M.elements[i][i] != 0) {
        for (j = i + 1; j < n; j++) {
          var multiplier = M.elements[j][i] / M.elements[i][i];
          els = [];
          for (p = 0; p < np; p++) {
            // Elements with column numbers up to an including the number
            // of the row that we're subtracting can safely be set straight to
            // zero, since that's the point of this routine and it avoids having
            // to loop over and correct rounding errors later
            els.push(p <= i ? 0 : M.elements[j][p] - M.elements[i][p] * multiplier);
          }
          M.elements[j] = els;
        }
      }
    }
    return M;
  },

  toUpperTriangular: function() { return this.toRightTriangular(); },

  // Returns the determinant for square matrices
  determinant: function() {
    if (!this.isSquare()) { return null; }
    var M = this.toRightTriangular();
    var det = M.elements[0][0], n = M.elements.length;
    for (var i = 1; i < n; i++) {
      det = det * M.elements[i][i];
    }
    return det;
  },

  det: function() { return this.determinant(); },

  // Returns true iff the matrix is singular
  isSingular: function() {
    return (this.isSquare() && this.determinant() === 0);
  },

  // Returns the trace for square matrices
  trace: function() {
    if (!this.isSquare()) { return null; }
    var tr = this.elements[0][0], n = this.elements.length;
    for (var i = 1; i < n; i++) {
      tr += this.elements[i][i];
    }
    return tr;
  },

  tr: function() { return this.trace(); },

  // Returns the rank of the matrix
  rank: function() {
    var M = this.toRightTriangular(), rank = 0;
    var i = this.elements.length, nj = this.elements[0].length, j;
    while (i--) { j = nj;
      while (j--) {
        if (Math.abs(M.elements[i][j]) > Sylvester.precision) { rank++; break; }
      }
    }
    return rank;
  },

  rk: function() { return this.rank(); },

  // Returns the result of attaching the given argument to the right-hand side of the matrix
  augment: function(matrix) {
    var M = matrix.elements || matrix;
    if (typeof(M[0][0]) == 'undefined') { M = Matrix.create(M).elements; }
    var T = this.dup(), cols = T.elements[0].length;
    var i = T.elements.length, nj = M[0].length, j;
    if (i != M.length) { return null; }
    while (i--) { j = nj;
      while (j--) {
        T.elements[i][cols + j] = M[i][j];
      }
    }
    return T;
  },

  // Returns the inverse (if one exists) using Gauss-Jordan
  inverse: function() {
    if (!this.isSquare() || this.isSingular()) { return null; }
    var n = this.elements.length, i= n, j;
    var M = this.augment(Matrix.I(n)).toRightTriangular();
    var np = M.elements[0].length, p, els, divisor;
    var inverse_elements = [], new_element;
    // Matrix is non-singular so there will be no zeros on the diagonal
    // Cycle through rows from last to first
    while (i--) {
      // First, normalise diagonal elements to 1
      els = [];
      inverse_elements[i] = [];
      divisor = M.elements[i][i];
      for (p = 0; p < np; p++) {
        new_element = M.elements[i][p] / divisor;
        els.push(new_element);
        // Shuffle off the current row of the right hand side into the results
        // array as it will not be modified by later runs through this loop
        if (p >= n) { inverse_elements[i].push(new_element); }
      }
      M.elements[i] = els;
      // Then, subtract this row from those above it to
      // give the identity matrix on the left hand side
      j = i;
      while (j--) {
        els = [];
        for (p = 0; p < np; p++) {
          els.push(M.elements[j][p] - M.elements[i][p] * M.elements[j][i]);
        }
        M.elements[j] = els;
      }
    }
    return Matrix.create(inverse_elements);
  },

  inv: function() { return this.inverse(); },

  // Returns the result of rounding all the elements
  round: function() {
    return this.map(function(x) { return Math.round(x); });
  },

  // Returns a copy of the matrix with elements set to the given value if they
  // differ from it by less than Sylvester.precision
  snapTo: function(x) {
    return this.map(function(p) {
      return (Math.abs(p - x) <= Sylvester.precision) ? x : p;
    });
  },

  // Returns a string representation of the matrix
  inspect: function() {
    var matrix_rows = [];
    var n = this.elements.length;
    for (var i = 0; i < n; i++) {
      matrix_rows.push(Vector.create(this.elements[i]).inspect());
    }
    return matrix_rows.join('\n');
  },

  // Set the matrix's elements from an array. If the argument passed
  // is a vector, the resulting matrix will be a single column.
  setElements: function(els) {
    var i, j, elements = els.elements || els;
    if (typeof(elements[0][0]) != 'undefined') {
      i = elements.length;
      this.elements = [];
      while (i--) { j = elements[i].length;
        this.elements[i] = [];
        while (j--) {
          this.elements[i][j] = elements[i][j];
        }
      }
      return this;
    }
    var n = elements.length;
    this.elements = [];
    for (i = 0; i < n; i++) {
      this.elements.push([elements[i]]);
    }
    return this;
  }
};

// Constructor function
Matrix.create = function(elements) {
  var M = new Matrix();
  return M.setElements(elements);
};
var $M = Matrix.create;

// Identity matrix of size n
Matrix.I = function(n) {
  var els = [], i = n, j;
  while (i--) { j = n;
    els[i] = [];
    while (j--) {
      els[i][j] = (i == j) ? 1 : 0;
    }
  }
  return Matrix.create(els);
};

// Diagonal matrix - all off-diagonal elements are zero
Matrix.Diagonal = function(elements) {
  var i = elements.length;
  var M = Matrix.I(i);
  while (i--) {
    M.elements[i][i] = elements[i];
  }
  return M;
};

// Rotation matrix about some axis. If no axis is
// supplied, assume we're after a 2D transform
Matrix.Rotation = function(theta, a) {
  if (!a) {
    return Matrix.create([
      [Math.cos(theta),  -Math.sin(theta)],
      [Math.sin(theta),   Math.cos(theta)]
    ]);
  }
  var axis = a.dup();
  if (axis.elements.length != 3) { return null; }
  var mod = axis.modulus();
  var x = axis.elements[0]/mod, y = axis.elements[1]/mod, z = axis.elements[2]/mod;
  var s = Math.sin(theta), c = Math.cos(theta), t = 1 - c;
  // Formula derived here: http://www.gamedev.net/reference/articles/article1199.asp
  // That proof rotates the co-ordinate system so theta
  // becomes -theta and sin becomes -sin here.
  return Matrix.create([
    [ t*x*x + c, t*x*y - s*z, t*x*z + s*y ],
    [ t*x*y + s*z, t*y*y + c, t*y*z - s*x ],
    [ t*x*z - s*y, t*y*z + s*x, t*z*z + c ]
  ]);
};

// Special case rotations
Matrix.RotationX = function(t) {
  var c = Math.cos(t), s = Math.sin(t);
  return Matrix.create([
    [  1,  0,  0 ],
    [  0,  c, -s ],
    [  0,  s,  c ]
  ]);
};
Matrix.RotationY = function(t) {
  var c = Math.cos(t), s = Math.sin(t);
  return Matrix.create([
    [  c,  0,  s ],
    [  0,  1,  0 ],
    [ -s,  0,  c ]
  ]);
};
Matrix.RotationZ = function(t) {
  var c = Math.cos(t), s = Math.sin(t);
  return Matrix.create([
    [  c, -s,  0 ],
    [  s,  c,  0 ],
    [  0,  0,  1 ]
  ]);
};

// Random matrix of n rows, m columns
Matrix.Random = function(n, m) {
  return Matrix.Zero(n, m).map(
    function() { return Math.random(); }
  );
};

// Matrix filled with zeros
Matrix.Zero = function(n, m) {
  var els = [], i = n, j;
  while (i--) { j = m;
    els[i] = [];
    while (j--) {
      els[i][j] = 0;
    }
  }
  return Matrix.create(els);
};// Line class - depends on Vector, and some methods require Matrix and Plane.

function Line() {}
Line.prototype = {

  // Returns true if the argument occupies the same space as the line
  eql: function(line) {
    return (this.isParallelTo(line) && this.contains(line.anchor));
  },

  // Returns a copy of the line
  dup: function() {
    return Line.create(this.anchor, this.direction);
  },

  // Returns the result of translating the line by the given vector/array
  translate: function(vector) {
    var V = vector.elements || vector;
    return Line.create([
      this.anchor.elements[0] + V[0],
      this.anchor.elements[1] + V[1],
      this.anchor.elements[2] + (V[2] || 0)
    ], this.direction);
  },

  // Returns true if the line is parallel to the argument. Here, 'parallel to'
  // means that the argument's direction is either parallel or antiparallel to
  // the line's own direction. A line is parallel to a plane if the two do not
  // have a unique intersection.
  isParallelTo: function(obj) {
    if (obj.normal || (obj.start && obj.end)) { return obj.isParallelTo(this); }
    var theta = this.direction.angleFrom(obj.direction);
    return (Math.abs(theta) <= Sylvester.precision || Math.abs(theta - Math.PI) <= Sylvester.precision);
  },

  // Returns the line's perpendicular distance from the argument,
  // which can be a point, a line or a plane
  distanceFrom: function(obj) {
    if (obj.normal || (obj.start && obj.end)) { return obj.distanceFrom(this); }
    if (obj.direction) {
      // obj is a line
      if (this.isParallelTo(obj)) { return this.distanceFrom(obj.anchor); }
      var N = this.direction.cross(obj.direction).toUnitVector().elements;
      var A = this.anchor.elements, B = obj.anchor.elements;
      return Math.abs((A[0] - B[0]) * N[0] + (A[1] - B[1]) * N[1] + (A[2] - B[2]) * N[2]);
    } else {
      // obj is a point
      var P = obj.elements || obj;
      var A = this.anchor.elements, D = this.direction.elements;
      var PA1 = P[0] - A[0], PA2 = P[1] - A[1], PA3 = (P[2] || 0) - A[2];
      var modPA = Math.sqrt(PA1*PA1 + PA2*PA2 + PA3*PA3);
      if (modPA === 0) return 0;
      // Assumes direction vector is normalized
      var cosTheta = (PA1 * D[0] + PA2 * D[1] + PA3 * D[2]) / modPA;
      var sin2 = 1 - cosTheta*cosTheta;
      return Math.abs(modPA * Math.sqrt(sin2 < 0 ? 0 : sin2));
    }
  },

  // Returns true iff the argument is a point on the line, or if the argument
  // is a line segment lying within the receiver
  contains: function(obj) {
    if (obj.start && obj.end) { return this.contains(obj.start) && this.contains(obj.end); }
    var dist = this.distanceFrom(obj);
    return (dist !== null && dist <= Sylvester.precision);
  },

  // Returns the distance from the anchor of the given point. Negative values are
  // returned for points that are in the opposite direction to the line's direction from
  // the line's anchor point.
  positionOf: function(point) {
    if (!this.contains(point)) { return null; }
    var P = point.elements || point;
    var A = this.anchor.elements, D = this.direction.elements;
    return (P[0] - A[0]) * D[0] + (P[1] - A[1]) * D[1] + ((P[2] || 0) - A[2]) * D[2];
  },

  // Returns true iff the line lies in the given plane
  liesIn: function(plane) {
    return plane.contains(this);
  },

  // Returns true iff the line has a unique point of intersection with the argument
  intersects: function(obj) {
    if (obj.normal) { return obj.intersects(this); }
    return (!this.isParallelTo(obj) && this.distanceFrom(obj) <= Sylvester.precision);
  },

  // Returns the unique intersection point with the argument, if one exists
  intersectionWith: function(obj) {
    if (obj.normal || (obj.start && obj.end)) { return obj.intersectionWith(this); }
    if (!this.intersects(obj)) { return null; }
    var P = this.anchor.elements, X = this.direction.elements,
        Q = obj.anchor.elements, Y = obj.direction.elements;
    var X1 = X[0], X2 = X[1], X3 = X[2], Y1 = Y[0], Y2 = Y[1], Y3 = Y[2];
    var PsubQ1 = P[0] - Q[0], PsubQ2 = P[1] - Q[1], PsubQ3 = P[2] - Q[2];
    var XdotQsubP = - X1*PsubQ1 - X2*PsubQ2 - X3*PsubQ3;
    var YdotPsubQ = Y1*PsubQ1 + Y2*PsubQ2 + Y3*PsubQ3;
    var XdotX = X1*X1 + X2*X2 + X3*X3;
    var YdotY = Y1*Y1 + Y2*Y2 + Y3*Y3;
    var XdotY = X1*Y1 + X2*Y2 + X3*Y3;
    var k = (XdotQsubP * YdotY / XdotX + XdotY * YdotPsubQ) / (YdotY - XdotY * XdotY);
    return Vector.create([P[0] + k*X1, P[1] + k*X2, P[2] + k*X3]);
  },

  // Returns the point on the line that is closest to the given point or line/line segment
  pointClosestTo: function(obj) {
    if (obj.start && obj.end) {
      // obj is a line segment
      var P = obj.pointClosestTo(this);
      return (P === null) ? null : this.pointClosestTo(P);
    } else if (obj.direction) {
      // obj is a line
      if (this.intersects(obj)) { return this.intersectionWith(obj); }
      if (this.isParallelTo(obj)) { return null; }
      var D = this.direction.elements, E = obj.direction.elements;
      var D1 = D[0], D2 = D[1], D3 = D[2], E1 = E[0], E2 = E[1], E3 = E[2];
      // Create plane containing obj and the shared normal and intersect this with it
      // Thank you: http://www.cgafaq.info/wiki/Line-line_distance
      var x = (D3 * E1 - D1 * E3), y = (D1 * E2 - D2 * E1), z = (D2 * E3 - D3 * E2);
      var N = [x * E3 - y * E2, y * E1 - z * E3, z * E2 - x * E1];
      var P = Plane.create(obj.anchor, N);
      return P.intersectionWith(this);
    } else {
      // obj is a point
      var P = obj.elements || obj;
      if (this.contains(P)) { return Vector.create(P); }
      var A = this.anchor.elements, D = this.direction.elements;
      var D1 = D[0], D2 = D[1], D3 = D[2], A1 = A[0], A2 = A[1], A3 = A[2];
      var x = D1 * (P[1]-A2) - D2 * (P[0]-A1), y = D2 * ((P[2] || 0) - A3) - D3 * (P[1]-A2),
          z = D3 * (P[0]-A1) - D1 * ((P[2] || 0) - A3);
      var V = Vector.create([D2 * x - D3 * z, D3 * y - D1 * x, D1 * z - D2 * y]);
      var k = this.distanceFrom(P) / V.modulus();
      return Vector.create([
        P[0] + V.elements[0] * k,
        P[1] + V.elements[1] * k,
        (P[2] || 0) + V.elements[2] * k
      ]);
    }
  },

  // Returns a copy of the line rotated by t radians about the given line. Works by
  // finding the argument's closest point to this line's anchor point (call this C) and
  // rotating the anchor about C. Also rotates the line's direction about the argument's.
  // Be careful with this - the rotation axis' direction affects the outcome!
  rotate: function(t, line) {
    // If we're working in 2D
    if (typeof(line.direction) == 'undefined') { line = Line.create(line.to3D(), Vector.k); }
    var R = Matrix.Rotation(t, line.direction).elements;
    var C = line.pointClosestTo(this.anchor).elements;
    var A = this.anchor.elements, D = this.direction.elements;
    var C1 = C[0], C2 = C[1], C3 = C[2], A1 = A[0], A2 = A[1], A3 = A[2];
    var x = A1 - C1, y = A2 - C2, z = A3 - C3;
    return Line.create([
      C1 + R[0][0] * x + R[0][1] * y + R[0][2] * z,
      C2 + R[1][0] * x + R[1][1] * y + R[1][2] * z,
      C3 + R[2][0] * x + R[2][1] * y + R[2][2] * z
    ], [
      R[0][0] * D[0] + R[0][1] * D[1] + R[0][2] * D[2],
      R[1][0] * D[0] + R[1][1] * D[1] + R[1][2] * D[2],
      R[2][0] * D[0] + R[2][1] * D[1] + R[2][2] * D[2]
    ]);
  },

  // Returns a copy of the line with its direction vector reversed.
  // Useful when using lines for rotations.
  reverse: function() {
    return Line.create(this.anchor, this.direction.x(-1));
  },

  // Returns the line's reflection in the given point or line
  reflectionIn: function(obj) {
    if (obj.normal) {
      // obj is a plane
      var A = this.anchor.elements, D = this.direction.elements;
      var A1 = A[0], A2 = A[1], A3 = A[2], D1 = D[0], D2 = D[1], D3 = D[2];
      var newA = this.anchor.reflectionIn(obj).elements;
      // Add the line's direction vector to its anchor, then mirror that in the plane
      var AD1 = A1 + D1, AD2 = A2 + D2, AD3 = A3 + D3;
      var Q = obj.pointClosestTo([AD1, AD2, AD3]).elements;
      var newD = [Q[0] + (Q[0] - AD1) - newA[0], Q[1] + (Q[1] - AD2) - newA[1], Q[2] + (Q[2] - AD3) - newA[2]];
      return Line.create(newA, newD);
    } else if (obj.direction) {
      // obj is a line - reflection obtained by rotating PI radians about obj
      return this.rotate(Math.PI, obj);
    } else {
      // obj is a point - just reflect the line's anchor in it
      var P = obj.elements || obj;
      return Line.create(this.anchor.reflectionIn([P[0], P[1], (P[2] || 0)]), this.direction);
    }
  },

  // Set the line's anchor point and direction.
  setVectors: function(anchor, direction) {
    // Need to do this so that line's properties are not
    // references to the arguments passed in
    anchor = Vector.create(anchor);
    direction = Vector.create(direction);
    if (anchor.elements.length == 2) {anchor.elements.push(0); }
    if (direction.elements.length == 2) { direction.elements.push(0); }
    if (anchor.elements.length > 3 || direction.elements.length > 3) { return null; }
    var mod = direction.modulus();
    if (mod === 0) { return null; }
    this.anchor = anchor;
    this.direction = Vector.create([
      direction.elements[0] / mod,
      direction.elements[1] / mod,
      direction.elements[2] / mod
    ]);
    return this;
  }
};

// Constructor function
Line.create = function(anchor, direction) {
  var L = new Line();
  return L.setVectors(anchor, direction);
};
var $L = Line.create;

// Axes
Line.X = Line.create(Vector.Zero(3), Vector.i);
Line.Y = Line.create(Vector.Zero(3), Vector.j);
Line.Z = Line.create(Vector.Zero(3), Vector.k);/**
 * @namespace
 */
geo.linalg = {};

geo.linalg.Vector = function() {
  return Vector.create.apply(null, arguments);
};
geo.linalg.Vector.create = Vector.create;
geo.linalg.Vector.i = Vector.i;
geo.linalg.Vector.j = Vector.j;
geo.linalg.Vector.k = Vector.k;
geo.linalg.Vector.Random = Vector.Random;
geo.linalg.Vector.Zero = Vector.Zero;

geo.linalg.Matrix = function() {
  return Matrix.create.apply(null, arguments);
};
geo.linalg.Matrix.create = Matrix.create;
geo.linalg.Matrix.I = Matrix.I;
geo.linalg.Matrix.Random = Matrix.Random;
geo.linalg.Matrix.Rotation = Matrix.Rotation;
geo.linalg.Matrix.RotationX = Matrix.RotationX;
geo.linalg.Matrix.RotationY = Matrix.RotationY;
geo.linalg.Matrix.RotationZ = Matrix.RotationZ;
geo.linalg.Matrix.Zero = Matrix.Zero;

geo.linalg.Line = function() {
  return Line.create.apply(null, arguments);
};
geo.linalg.Line.create = Line.create;
geo.linalg.Line.X = Line.X;
geo.linalg.Line.Y = Line.Y;
geo.linalg.Line.Z = Line.Z;
/**
 * @namespace
 */
geo.math = {isnamespace_:true};
/**
 * Converts an angle from radians to degrees.
 * @type Number
 * @return Returns the angle, converted to degrees.
 */
if (!('toDegrees' in Number.prototype)) {
  Number.prototype.toDegrees = function() {
    return this * 180 / Math.PI;
  };
}

/**
 * Converts an angle from degrees to radians.
 * @type Number
 * @return Returns the angle, converted to radians.
 */
if (!('toRadians' in Number.prototype)) {
  Number.prototype.toRadians = function() {
    return this * Math.PI / 180;
  };
}
/**
 * Normalizes an angle to the [0,2pi) range.
 * @param {Number} angleRad The angle to normalize, in radians.
 * @type Number
 * @return Returns the angle, fit within the [0,2pi) range, in radians.
 */
geo.math.normalizeAngle = function(angleRad) {
  angleRad = angleRad % (2 * Math.PI);
  return angleRad >= 0 ? angleRad : angleRad + 2 * Math.PI;
};

/**
 * Normalizes a latitude to the [-90,90] range. Latitudes above 90 or
 * below -90 are capped, not wrapped.
 * @param {Number} lat The latitude to normalize, in degrees.
 * @type Number
 * @return Returns the latitude, fit within the [-90,90] range.
 */
geo.math.normalizeLat = function(lat) {
  return Math.max(-90, Math.min(90, lat));
};

/**
 * Normalizes a longitude to the [-180,180] range. Longitudes above 180
 * or below -180 are wrapped.
 * @param {Number} lng The longitude to normalize, in degrees.
 * @type Number
 * @return Returns the latitude, fit within the [-90,90] range.
 */
geo.math.normalizeLng = function(lng) {
  if (lng % 360 == 180) {
    return 180;
  }

  lng = lng % 360;
  return lng < -180 ? lng + 360 : lng > 180 ? lng - 360 : lng;
};

/**
 * Reverses an angle.
 * @param {Number} angleRad The angle to reverse, in radians.
 * @type Number
 * @return Returns the reverse angle, in radians.
 */
geo.math.reverseAngle = function(angleRad) {
  return geo.math.normalizeAngle(angleRad + Math.PI);
};

/**
 * Wraps the given number to the given range. If the wrapped value is exactly
 * equal to min or max, favors max, unless favorMin is true.
 * @param {Number} value The value to wrap.
 * @param {Number[]} range An array of two numbers, specifying the minimum and
 *     maximum bounds of the range, respectively.
 * @param {Boolean} [favorMin=false] Whether or not to favor min over
 *     max in the case of ambiguity.
 * @return {Number} Returns the value wrapped to the given range.
 */
geo.math.wrapValue = function(value, range, favorMin) {
  if (!range || !geo.util.isArray(range) || range.length != 2) {
    throw new TypeError('The range parameter must be an array of 2 numbers.');
  }
  
  // Don't wrap min as max.
  if (value === range[0]) {
    return range[0];
  }
  
  // Normalize to min = 0.
  value -= range[0];
  
  value = value % (range[1] - range[0]);
  if (value < 0) {
    value += (range[1] - range[0]);
  }
  
  // Reverse normalization.
  value += range[0];
  
  // When ambiguous (min or max), return max unless favorMin is true.
  return (value === range[0]) ? (favorMin ? range[0] : range[1]) : value;
};

/**
 * Constrains the given number to the given range.
 * @param {Number} value The value to constrain.
 * @param {Number[]} range An array of two numbers, specifying the minimum and
 *     maximum bounds of the range, respectively.
 * @return {Number} Returns the value constrained to the given range.
 */
geo.math.constrainValue = function(value, range) {
  if (!range || !geo.util.isArray(range) || range.length != 2) {
    throw new TypeError('The range parameter must be an array of 2 numbers.');
  }
  
  return Math.max(range[0], Math.min(range[1], value));
};
/**
 * The radius of the Earth, in meters, assuming the Earth is a perfect sphere.
 * @see http://en.wikipedia.org/wiki/Earth_radius
 * @type Number
 */
geo.math.EARTH_RADIUS = 6378135;

/**
 * The average radius-of-curvature of the Earth, in meters.
 * @see http://en.wikipedia.org/wiki/Radius_of_curvature_(applications)
 * @type Number
 * @ignore
 */
geo.math.EARTH_RADIUS_CURVATURE_AVG = 6372795;
/**
 * Returns the approximate sea level great circle (Earth) distance between
 * two points using the Haversine formula and assuming an Earth radius of
 * geo.math.EARTH_RADIUS.
 * @param {geo.Point} point1 The first point.
 * @param {geo.Point} point2 The second point.
 * @return {Number} The Earth distance between the two points, in meters.
 * @see http://www.movable-type.co.uk/scripts/latlong.html
 */
geo.math.distance = function(point1, point2) {
  return geo.math.EARTH_RADIUS * geo.math.angularDistance(point1, point2);
};

/*
Vincenty formula:
geo.math.angularDistance = function(point1, point2) {
  point1 = new geo.Point(point1);
  point2 = new geo.Point(point2);
  
  var phi1 = point1.lat.toRadians();
  var phi2 = point2.lat.toRadians();
  
  var sin_phi1 = Math.sin(phi1);
  var cos_phi1 = Math.cos(phi1);
  
  var sin_phi2 = Math.sin(phi2);
  var cos_phi2 = Math.cos(phi2);
  
  var sin_d_lmd = Math.sin(
      point2.lng.toRadians() - point1.lng.toRadians());
  var cos_d_lmd = Math.cos(
      point2.lng.toRadians() - point1.lng.toRadians());
  
  // TODO: options to specify formula
  // TODO: compute radius of curvature at given point for more precision
  
  // Vincenty formula (may replace with Haversine for performance?)
  return Math.atan2(
      Math.sqrt(
        Math.pow(cos_phi2 * sin_d_lmd, 2) +
        Math.pow(cos_phi1 * sin_phi2 - sin_phi1 * cos_phi2 * cos_d_lmd, 2)
      ), sin_phi1 * sin_phi2 + cos_phi1 * cos_phi2 * cos_d_lmd);
}
*/
/**
 * Returns the angular distance between two points using the Haversine
 * formula.
 * @see geo.math.distance
 * @ignore
 */
geo.math.angularDistance = function(point1, point2) {
  var phi1 = point1.lat().toRadians();
  var phi2 = point2.lat().toRadians();
  
  var d_phi = (point2.lat() - point1.lat()).toRadians();
  var d_lmd = (point2.lng() - point1.lng()).toRadians();
  
  var A = Math.pow(Math.sin(d_phi / 2), 2) +
          Math.cos(phi1) * Math.cos(phi2) *
            Math.pow(Math.sin(d_lmd / 2), 2);
  
  return 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A));
};
// TODO: add non-sea level distance using Earth API's math3d.js or Sylvester
/*
    p1 = V3.latLonAltToCartesian([loc1.lat(), loc1.lng(),
      this.ge.getGlobe().getGroundAltitude(loc1.lat(), loc1.lng())]);
    p2 = V3.latLonAltToCartesian([loc2.lat(), loc2.lng(),
      this.ge.getGlobe().getGroundAltitude(loc2.lat(), loc2.lng())]);
    return V3.earthDistance(p1, p2);
*/

/**
 * Calculates the initial heading/bearing at which an object at the start
 * point will need to travel to get to the destination point.
 * @param {geo.Point} start The start point.
 * @param {geo.Point} dest The destination point.
 * @return {Number} The initial heading required to get to the destination
 *     point, in the [0,360) degree range.
 * @see http://mathforum.org/library/drmath/view/55417.html
 */
geo.math.heading = function(start, dest) {
  var phi1 = start.lat().toRadians();
  var phi2 = dest.lat().toRadians();
  var cos_phi2 = Math.cos(phi2);
  
  var d_lmd = (dest.lng() - start.lng()).toRadians();
  
  return geo.math.normalizeAngle(Math.atan2(
      Math.sin(d_lmd) * cos_phi2,
      Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * cos_phi2 *
        Math.cos(d_lmd))).toDegrees();
};

/**
 * @function
 * @param {geo.Point} start
 * @param {geo.Point} dest
 * @return {Number}
 * @see geo.math.heading
 */
geo.math.bearing = geo.math.heading;

/**
 * Calculates an intermediate point on the geodesic between the two given
 * points.
 * @param {geo.Point} point1 The first point.
 * @param {geo.Point} point2 The second point.
 * @param {Number} [fraction] The fraction of distance between the first
 *     and second points.
 * @return {geo.Point}
 * @see http://williams.best.vwh.net/avform.htm#Intermediate
 */
geo.math.midpoint = function(point1, point2, fraction) {
  // TODO: check for antipodality and fail w/ exception in that case
  if (geo.util.isUndefined(fraction) || fraction === null) {
    fraction = 0.5;
  }
  
  if (point1.equals(point2)) {
    return new geo.Point(point1);
  }
  
  var phi1 = point1.lat().toRadians();
  var phi2 = point2.lat().toRadians();
  var lmd1 = point1.lng().toRadians();
  var lmd2 = point2.lng().toRadians();
  
  var cos_phi1 = Math.cos(phi1);
  var cos_phi2 = Math.cos(phi2);
  
  var angularDistance = geo.math.angularDistance(point1, point2);
  var sin_angularDistance = Math.sin(angularDistance);
  
  var A = Math.sin((1 - fraction) * angularDistance) / sin_angularDistance;
  var B = Math.sin(fraction * angularDistance) / sin_angularDistance;
  
  var x = A * cos_phi1 * Math.cos(lmd1) +
          B * cos_phi2 * Math.cos(lmd2);
  
  var y = A * cos_phi1 * Math.sin(lmd1) +
          B * cos_phi2 * Math.sin(lmd2);
  
  var z = A * Math.sin(phi1) +
          B * Math.sin(phi2);
  
  return new geo.Point(
      Math.atan2(z, Math.sqrt(Math.pow(x, 2) +
                              Math.pow(y, 2))).toDegrees(),
      Math.atan2(y, x).toDegrees());
};

/**
 * Calculates the destination point along a geodesic, given an initial heading
 * and distance, from the given start point.
 * @see http://www.movable-type.co.uk/scripts/latlong.html
 * @param {geo.Point} start The start point.
 * @param {Object} options The heading and distance object literal.
 * @param {Number} options.heading The initial heading, in degrees.
 * @param {Number} options.distance The distance along the geodesic, in meters.
 * @return {geo.Point}
 */
geo.math.destination = function(start, options) {
  if (!('heading' in options && 'distance' in options)) {
    throw new TypeError('destination() requres both heading and ' +
                        'distance options.');
  }
  
  var phi1 = start.lat().toRadians();
  
  var sin_phi1 = Math.sin(phi1);
  
  var angularDistance = options.distance / geo.math.EARTH_RADIUS;
  var heading_rad = options.heading.toRadians();
  
  var sin_angularDistance = Math.sin(angularDistance);
  var cos_angularDistance = Math.cos(angularDistance);
  
  var phi2 = Math.asin(
               sin_phi1 * cos_angularDistance + 
               Math.cos(phi1) * sin_angularDistance *
                 Math.cos(heading_rad));
  
  return new geo.Point(
      phi2.toDegrees(),
      Math.atan2(
        Math.sin(heading_rad) *
          sin_angularDistance * Math.cos(phi2),
        cos_angularDistance - sin_phi1 * Math.sin(phi2)).toDegrees() +
        start.lng());
};
/**
 * Creates a new point from the given parameters.
 * @param {geo.Point|Number[]|KmlPoint|KmlLookAt|KmlCoord|KmlLocation|GLatLng}
 *     src The point data.
 * @constructor
 */
geo.Point = function() {
  var pointArraySrc = null;
  
  // 1 argument constructor
  if (arguments.length == 1) {
    var point = arguments[0];
    
    // copy constructor
    if (point.constructor === geo.Point) {
      this.lat_ = point.lat();
      this.lng_ = point.lng();
      this.altitude_ = point.altitude();
      this.altitudeMode_ = point.altitudeMode();
      
    // array constructor
    } else if (geo.util.isArray(point)) {
      pointArraySrc = point;
    
    // constructor from an Earth API object
    } else if (isEarthAPIObject_(point)) {
      var type = point.getType();
      
      // KmlPoint and KmlLookAt constructor
      if (type == 'KmlPoint' ||
          type == 'KmlLookAt') {
        this.lat_ = point.getLatitude();
        this.lng_ = point.getLongitude();
        this.altitude_ = point.getAltitude();
        this.altitudeMode_ = point.getAltitudeMode();
      
      // KmlCoord and KmlLocation constructor
      } else if (type == 'KmlCoord' ||
                 type == 'KmlLocation') {
        this.lat_ = point.getLatitude();
        this.lng_ = point.getLongitude();
        this.altitude_ = point.getAltitude();
      
      // Error, can't create a Point from any other Earth object
      } else {
        throw new TypeError(
            'Could not create a point from the given Earth object');
      }
    
    // GLatLng constructor
    } else if (isGLatLng_(point)) {
      this.lat_ = point.lat();
      this.lng_ = point.lng();

    // Error, can't create a Point from the single argument
    } else {
      throw new TypeError('Could not create a point from the given arguments');
    }
  
  // Assume each argument is a point coordinate, i.e.
  // new Point(0, 1, 2) ==> new Point([0, 1, 2])
  } else {
    pointArraySrc = arguments;
  }
  
  // construct from an array
  if (pointArraySrc) {
    for (var i = 0; i < pointArraySrc.length; i++) {
      if (typeof pointArraySrc[i] != 'number') {
        throw new TypeError('Coordinates must be numerical');
      }
    }
    
    this.lat_ = pointArraySrc[0];
    this.lng_ = pointArraySrc[1];
    if (pointArraySrc.length >= 3) {
      this.altitude_ = pointArraySrc[2];
      if (pointArraySrc.length >= 4) {
        this.altitudeMode_ = pointArraySrc[3];
      }
    }
  }

  // normalize
  this.lat_ = geo.math.normalizeLat(this.lat_);
  this.lng_ = geo.math.normalizeLng(this.lng_);
};

/**
 * The point's latitude, in degrees.
 * @type Number
 */
geo.Point.prototype.lat = function() {
  return this.lat_;
};
geo.Point.prototype.lat_ = 0;

/**
 * The point's longitude, in degrees.
 * @type Number
 */
geo.Point.prototype.lng = function() {
  return this.lng_;
};
geo.Point.prototype.lng_ = 0;

/**
 * The point's altitude, in meters.
 * @type Number
 */
geo.Point.prototype.altitude = function() {
  return this.altitude_;
};
geo.Point.prototype.altitude_ = 0;

/**
 * The point's altitude mode.
 * @type KmlAltitudeModeEnum
 */
geo.Point.prototype.altitudeMode = function() {
  return this.altitudeMode_;
};
geo.Point.prototype.altitudeMode_ = geo.ALTITUDE_RELATIVE_TO_GROUND;

/**
 * Returns the string representation of the point.
 * @type String
 */
geo.Point.prototype.toString = function() {
  return '(' + this.lat().toString() + ', ' + this.lng().toString() + ', ' +
      this.altitude().toString() + ')';
};

/**
 * Returns the 2D (no altitude) version of this point.
 * @type geo.Point
 */
geo.Point.prototype.flatten = function() {
  return new geo.Point(this.lat(), this.lng());
};

/**
 * Determines whether or not this point has an altitude component.
 * @type Boolean
 */
geo.Point.prototype.is3D = function() {
  return this.altitude_ !== 0;
};

/**
 * Determines whether or not the given point is the same as this one.
 * @param {geo.Point} otherPoint The other point.
 * @type Boolean
 */
geo.Point.prototype.equals = function(p2) {
  return this.lat() == p2.lat() &&
         this.lng() == p2.lng() &&
         this.altitude() == p2.altitude() &&
         this.altitudeMode() == p2.altitudeMode();
};

/**
 * Returns the angular distance between this point and the destination point.
 * @param {geo.Point} dest The destination point.
 * @see geo.math.angularDistance
 * @ignore
 */
geo.Point.prototype.angularDistance = function(dest) {
  return geo.math.angularDistance(this, dest);
};

/**
 * Returns the approximate sea level great circle (Earth) distance between
 * this point and the destination point using the Haversine formula and
 * assuming an Earth radius of geo.math.EARTH_RADIUS.
 * @param {geo.Point} dest The destination point.
 * @return {Number} The distance, in meters, to the destination point.
 * @see geo.math.distance
 */
geo.Point.prototype.distance = function(dest) {
  return geo.math.distance(this, dest);
};

/**
 * Calculates the initial heading/bearing at which an object at the start
 * point will need to travel to get to the destination point.
 * @param {geo.Point} dest The destination point.
 * @return {Number} The initial heading required to get to the destination
 *     point, in the [0,360) degree range.
 * @see geo.math.heading
 */
geo.Point.prototype.heading = function(dest) {
  return geo.math.heading(this, dest);
};

/**
 * Calculates an intermediate point on the geodesic between this point and the
 * given destination point.
 * @param {geo.Point} dest The destination point.
 * @param {Number} [fraction] The fraction of distance between the first
 *     and second points.
 * @return {geo.Point}
 * @see geo.math.midpoint
 */
geo.Point.prototype.midpoint = function(dest, fraction) {
  return geo.math.midpoint(this, dest, fraction);
};

/**
 * Calculates the destination point along a geodesic, given an initial heading
 * and distance, starting at this point.
 * @param {Object} options The heading and distance object literal.
 * @param {Number} options.heading The initial heading, in degrees.
 * @param {Number} options.distance The distance along the geodesic, in meters.
 * @return {geo.Point}
 * @see geo.math.destination
 */
geo.Point.prototype.destination = function(options) {
  return geo.math.destination(this, options);
};

/**
 * Returns the cartesian representation of the point, as a 3-vector,
 * assuming a spherical Earth of radius geo.math.EARTH_RADIUS.
 * @return {geo.linalg.Vector}
 */
geo.Point.prototype.toCartesian = function() {
  var sin_phi = Math.sin(this.lng().toRadians());
  var cos_phi = Math.cos(this.lng().toRadians());
  var sin_lmd = Math.sin(this.lat().toRadians());
  var cos_lmd = Math.cos(this.lat().toRadians());

  var r = geo.math.EARTH_RADIUS + this.altitude();
  return new geo.linalg.Vector([r * cos_phi * cos_lmd,
                                r * sin_lmd,
                                r * -sin_phi * cos_lmd]);
};

/**
 * A static method to create a point from a 3-vector representing the cartesian
 * coordinates of a point on the Earth, assuming a spherical Earth of radius
 * geo.math.EARTH_RADIUS.
 * @param {geo.linalg.Vector} cartesianVector The cartesian representation of
 *     the point to create.
 * @return {geo.Point} The point, or null if the point doesn't exist.
 */
geo.Point.fromCartesian = function(cartesianVector) {
  var r = cartesianVector.distanceFrom(geo.linalg.Vector.Zero(3));
  var unitVector = cartesianVector.toUnitVector();
  
  var altitude = r - geo.math.EARTH_RADIUS;
  
  var lat = Math.asin(unitVector.e(2)).toDegrees();
  if (lat > 90) {
    lat -= 180;
  }
  
  var lng = 0;
  if (Math.abs(lat) < 90) {
    lng = -Math.atan2(unitVector.e(3), unitVector.e(1)).toDegrees();
  }
  
  return new geo.Point(lat, lng, altitude);
};
/**
 * Create a new bounds object from the given parameters.
 * @param {geo.Bounds|geo.Point} [swOrBounds] Either an existing bounds object
 *     to copy, or the southwest, bottom coordinate of the new bounds object.
 * @param {geo.Point} [ne] The northeast, top coordinate of the new bounds
 *     object.
 * @constructor
 */
geo.Bounds = function() {
  // TODO: accept instances of GLatLngBounds

  // 1 argument constructor
  if (arguments.length == 1) {
    // copy constructor
    if (arguments[0].constructor === geo.Bounds) {
      var bounds = arguments[0];
      this.sw_ = new geo.Point(bounds.southWestBottom());
      this.ne_ = new geo.Point(bounds.northEastTop());

    // anything else, treated as the lone coordinate
    // TODO: accept array of points, a Path, or a Polygon
    } else {
      this.sw_ = this.ne_ = new geo.Point(arguments[0]);

    }

  // Two argument constructor -- a northwest and southeast coordinate
  } else if (arguments.length == 2) {
    var sw = new geo.Point(arguments[0]);
    var ne = new geo.Point(arguments[1]);

    // handle degenerate cases
    if (!sw && !ne) {
      return;
    } else if (!sw) {
      sw = ne;
    } else if (!ne) {
      ne = sw;
    }

    if (sw.lat() > ne.lat()) {
      throw new RangeError('Bounds southwest coordinate cannot be north of ' +
                           'the northeast coordinate');
    }

    if (sw.altitude() > ne.altitude()) {
      throw new RangeError('Bounds southwest coordinate cannot be north of ' +
                           'the northeast coordinate');
    }

    // TODO: check for incompatible altitude modes

    this.sw_ = sw;
    this.ne_ = ne;
  }
};

/**
 * The bounds' southwest, bottom coordinate.
 * @type geo.Point
 */
geo.Bounds.prototype.southWestBottom = function() {
  return this.sw_;
};
geo.Bounds.prototype.sw_ = null;

/**
 * The bounds' south coordinate.
 * @type Number
 */
geo.Bounds.prototype.south = function() {
  return !this.isEmpty() ? this.sw_.lat() : null;
};

/**
 * The bounds' west coordinate.
 * @type Number
 */
geo.Bounds.prototype.west = function() {
  return !this.isEmpty() ? this.sw_.lng() : null;
};

/**
 * The bounds' minimum altitude.
 * @type Number
 */
geo.Bounds.prototype.bottom = function() {
  return !this.isEmpty() ? this.sw_.altitude() : null;
};

/**
 * The bounds' northeast, top coordinate.
 * @type geo.Point
 */
geo.Bounds.prototype.northEastTop = function() {
  return this.ne_;
};
geo.Bounds.prototype.ne_ = null;

/**
 * The bounds' north coordinate.
 * @type Number
 */
geo.Bounds.prototype.north = function() {
  return !this.isEmpty() ? this.ne_.lat() : null;
};

/**
 * The bounds' east coordinate.
 * @type Number
 */
geo.Bounds.prototype.east = function() {
  return !this.isEmpty() ? this.ne_.lng() : null;
};

/**
 * The bounds' maximum altitude.
 * @type Number
 */
geo.Bounds.prototype.top = function() {
  return !this.isEmpty() ? this.ne_.altitude() : null;
};

/**
 * Returns whether or not the bounds intersect the antimeridian.
 * @type Boolean
 */
geo.Bounds.prototype.crossesAntimeridian = function() {
  return !this.isEmpty() && (this.sw_.lng() > this.ne_.lng());
};

/**
 * Returns whether or not the bounds have an altitude component.
 * @type Boolean
 */
geo.Bounds.prototype.is3D = function() {
  return !this.isEmpty() && (this.sw_.is3D() || this.ne_.is3D());
};

/**
 * Returns whether or not the given point is inside the bounds.
 * @param {geo.Point} point The point to test.
 * @type Boolean
 */
geo.Bounds.prototype.containsPoint = function(point) {
  point = new geo.Point(point);
  
  if (this.isEmpty()) {
    return false;
  }

  // check latitude
  if (!(this.south() <= point.lat() && point.lat() <= this.north())) {
    return false;
  }

  // check altitude
  if (this.is3D() && !(this.bottom() <= point.altitude() &&
                       point.altitude() <= this.top())) {
    return false;
  }

  // check longitude
  return this.containsLng_(point.lng());
};

/**
 * Returns whether or not the given line of longitude is inside the bounds.
 * @private
 * @param {Number} lng The longitude to test.
 * @type Boolean
 */
geo.Bounds.prototype.containsLng_ = function(lng) {
  if (this.crossesAntimeridian()) {
    return (lng <= this.east() || lng >= this.west());
  } else {
    return (this.west() <= lng && lng <= this.east());
  }
};

/**
 * Gets the longitudinal span of the given west and east coordinates.
 * @private
 * @param {Number} west
 * @param {Number} east
 */
function lngSpan_(west, east) {
  return (west > east) ? (east + 360 - west) : (east - west);
}

/**
 * Extends the bounds object by the given point, if the bounds don't already
 * contain the point. Longitudinally, the bounds will be extended either east
 * or west, whichever results in a smaller longitudinal span.
 * @param {geo.Point} point The point to extend the bounds by.
 */
geo.Bounds.prototype.extend = function(point) {
  point = new geo.Point(point);
  
  if (this.containsPoint(point)) {
    return;
  }

  if (this.isEmpty()) {
    this.sw_ = this.ne_ = point;
    return;
  }

  // extend up or down
  var newBottom = this.bottom();
  var newTop = this.top();

  if (this.is3D()) {
    newBottom = Math.min(newBottom, point.altitude());
    newTop = Math.max(newTop, point.altitude());
  }

  // extend north or south
  var newSouth = Math.min(this.south(), point.lat());
  var newNorth = Math.max(this.north(), point.lat());

  var newWest = this.west();
  var newEast = this.east();

  if (!this.containsLng_(point.lng())) {
    // try extending east and try extending west, and use the one that
    // has the smaller longitudinal span
    var extendEastLngSpan = lngSpan_(newWest, point.lng());
    var extendWestLngSpan = lngSpan_(point.lng(), newEast);

    if (extendEastLngSpan <= extendWestLngSpan) {
      newEast = point.lng();
    } else {
      newWest = point.lng();
    }
  }

  // update the bounds' coordinates
  this.sw_ = new geo.Point(newSouth, newWest, newBottom);
  this.ne_ = new geo.Point(newNorth, newEast, newTop);
};

/**
 * Returns the bounds' latitude, longitude, and altitude span as an object
 * literal.
 * @return {Object} Returns an object literal containing `lat`, `lng`, and
 *     `altitude` properties. Altitude will be null in the case that the bounds
 *     aren't 3D.
 */
geo.Bounds.prototype.span = function() {
  if (this.isEmpty()) {
    return {lat: 0, lng: 0, altitude: 0};
  }
  
  return {
    lat: (this.ne_.lat() - this.sw_.lat()),
    lng: lngSpan_(this.sw_.lng(), this.ne_.lng()),
    altitude: this.is3D() ? (this.ne_.altitude() - this.sw_.altitude()) : null
  };
};

/**
 * Determines whether or not the bounds object is empty, i.e. whether or not it
 * has no known associated points.
 * @type Boolean
 */
geo.Bounds.prototype.isEmpty = function() {
  return (this.sw_ === null && this.sw_ === null);
};

/**
 * Gets the center of the bounds.
 * @type geo.Point
 */
geo.Bounds.prototype.center = function() {
  if (this.isEmpty()) {
    return null;
  }

  return new geo.Point(
    (this.sw_.lat() + this.ne_.lat()) / 2,
    this.crossesAntimeridian() ?
        geo.math.normalizeLng(
            this.sw_.lng() +
            lngSpan_(this.sw_.lng(), this.ne_.lng()) / 2) :
        (this.sw_.lng() + this.ne_.lng()) / 2,
    (this.sw_.altitude() + this.ne_.altitude()) / 2);
};

// backwards compat
geo.Bounds.prototype.getCenter = geo.Bounds.prototype.center;

/**
 * Determines whether or not the bounds occupy the entire latitudinal range.
 * @type Boolean
 */
geo.Bounds.prototype.isFullLat = function() {
  return !this.isEmpty() && (this.south() == -90 && this.north() == 90);
};

/**
 * Determines whether or not the bounds occupy the entire longitudinal range.
 * @type Boolean
 */
geo.Bounds.prototype.isFullLng = function() {
  return !this.isEmpty() && (this.west() == -180 && this.east() == 180);
};

// TODO: equals(other)
// TODO: intersects(other)
// TODO: containsBounds(other)
/**
 * Creates a new path from the given parameters.
 * @param {geo.Path|geo.Point[]|PointSrc[]|KmlLineString|GPolyline|GPolygon}
 *     path The path data.
 * @constructor
 */
geo.Path = function() {
  this.coords_ = []; // don't use mutable objects in global defs
  var coordArraySrc = null;
  var i, n;
  
  // 1 argument constructor
  if (arguments.length == 1) {
    var path = arguments[0];
    
    // copy constructor
    if (path.constructor === geo.Path) {
      for (i = 0; i < path.numCoords(); i++) {
        this.coords_.push(new geo.Point(path.coord(i)));
      }
    
    // array constructor
    } else if (geo.util.isArray(path)) {
      coordArraySrc = path;
    
    // construct from Earth API object
    } else if (isEarthAPIObject_(path)) {
      var type = path.getType();
      
      // contruct from KmlLineString
      if (type == 'KmlLineString' ||
          type == 'KmlLinearRing') {
        n = path.getCoordinates().getLength();
        for (i = 0; i < n; i++) {
          this.coords_.push(new geo.Point(path.getCoordinates().get(i)));
        }
      
      // can't construct from the passed-in Earth object
      } else {
        throw new TypeError(
            'Could not create a path from the given arguments');
      }
    
    // GPolyline or GPolygon constructor
    } else if ('getVertex' in path && 'getVertexCount' in path) {
      n = path.getVertexCount();
      for (i = 0; i < n; i++) {
        this.coords_.push(new geo.Point(path.getVertex(i)));
      }
    
    // can't construct from the given argument
    } else {
      throw new TypeError('Could not create a path from the given arguments');
    }
  
  // Assume each argument is a PointSrc, i.e.
  // new Path(p1, p2, p3) ==>
  //    new Path([new Point(p1), new Point(p2), new Point(p3)])
  } else {
    coordArraySrc = arguments;
  }
  
  // construct from an array (presumably of PointSrcs)
  if (coordArraySrc) {
    for (i = 0; i < coordArraySrc.length; i++) {
      this.coords_.push(new geo.Point(coordArraySrc[i]));
    }
  }
};

/**#@+
  @field
*/

/**
 * The path's coordinates array.
 * @type Number
 * @private
 */
geo.Path.prototype.coords_ = null; // don't use mutable objects here

/**#@-*/

/**
 * Returns the string representation of the path.
 * @type String
 */
geo.Path.prototype.toString = function() {
  return '[' + geo.util.arrayMap(this.coords_,function(p) {
                                  return p.toString();
                                }).join(', ') + ']';
};

/**
 * Determines whether or not the given path is the same as this one.
 * @param {geo.Path} otherPath The other path.
 * @type Boolean
 */
geo.Path.prototype.equals = function(p2) {
  for (var i = 0; i < p2.numCoords(); i++) {
    if (!this.coord(i).equals(p2.coord(i))) {
      return false;
    }
  }
  
  return true;
};

/**
 * Returns the number of coords in the path.
 */
geo.Path.prototype.numCoords = function() {
  return this.coords_.length;
};

/**
 * Returns the coordinate at the given index in the path.
 * @param {Number} index The index of the coordinate.
 * @type geo.Point
 */
geo.Path.prototype.coord = function(i) {
  // TODO: bounds check
  return this.coords_[i];
};

/**
 * Prepends the given coordinate to the path.
 * @param {geo.Point|PointSrc} coord The coordinate to prepend.
 */
geo.Path.prototype.prepend = function(coord) {
  this.coords_.unshift(new geo.Point(coord));
};

/**
 * Appends the given coordinate to the path.
 * @param {geo.Point|PointSrc} coord The coordinate to append.
 */
geo.Path.prototype.append = function(coord) {
  this.coords_.push(new geo.Point(coord));
};

/**
 * Inserts the given coordinate at the i'th index in the path.
 * @param {Number} index The index to insert into.
 * @param {geo.Point|PointSrc} coord The coordinate to insert.
 */
geo.Path.prototype.insert = function(i, coord) {
  // TODO: bounds check
  this.coords_.splice(i, 0, new geo.Point(coord));
};

/**
 * Removes the coordinate at the i'th index from the path.
 * @param {Number} index The index of the coordinate to remove.
 */
geo.Path.prototype.remove = function(i) {
  // TODO: bounds check
  this.coords_.splice(i, 1);
};

/**
 * Returns a sub path, containing coordinates starting from the
 * startIndex position, and up to but not including the endIndex
 * position.
 * @type geo.Path
 */
geo.Path.prototype.subPath = function(startIndex, endIndex) {
  return this.coords_.slice(startIndex, endIndex);
};

/**
 * Reverses the order of the path's coordinates.
 */
geo.Path.prototype.reverse = function() {
  this.coords_.reverse();
};

/**
 * Calculates the total length of the path using great circle distance
 * calculations.
 * @return {Number} The total length of the path, in meters.
 */
geo.Path.prototype.distance = function() {
  var dist = 0;
  for (var i = 0; i < this.coords_.length - 1; i++) {
    dist += this.coords_[i].distance(this.coords_[i + 1]);
  }
  
  return dist;
};

/**
 * Returns whether or not the path, when closed, contains the given point.
 * Thanks to Mike Williams of http://econym.googlepages.com/epoly.htm and
 * http://alienryderflex.com/polygon/ for this code.
 * @param {geo.Point} point The point to test.
 */
geo.Path.prototype.containsPoint = function(point) {
  var oddNodes = false;
  var y = point.lat();
  var x = point.lng();
  for (var i = 0; i < this.coords_.length; i++) {
    var j = (i + 1) % this.coords_.length;
    if (((this.coords_[i].lat() < y && this.coords_[j].lat() >= y) ||
         (this.coords_[j].lat() < y && this.coords_[i].lat() >= y)) &&
        (this.coords_[i].lng() + (y - this.coords_[i].lat()) /
            (this.coords_[j].lat() - this.coords_[i].lat()) *
            (this.coords_[j].lng() - this.coords_[i].lng()) < x)) {
      oddNodes = !oddNodes;
    }
  }
  
  return oddNodes;
};

/**
 * Returns the latitude/longitude bounds wholly containing this path.
 * @type geo.Bounds
 */
geo.Path.prototype.bounds = function() {
  if (!this.numCoords()) {
    return new geo.Bounds();
  }

  var bounds = new geo.Bounds(this.coord(0));

  // TODO: optimize
  var numCoords = this.numCoords();
  for (var i = 1; i < numCoords; i++) {
    bounds.extend(this.coord(i));
  }

  return bounds;
};
// TODO: unit test

/**
 * Returns the signed approximate area of the polygon formed by the path when
 * the path is closed.
 * @see http://econym.org.uk/gmap/epoly.htm
 * @private
 */
geo.Path.prototype.signedArea_ = function() {
  var a = 0;
  var b = this.bounds();
  var x0 = b.west();
  var y0 = b.south();

  var numCoords = this.numCoords();
  for (var i = 0; i < numCoords; i++) {
    var j = (i + 1) % numCoords;
    var x1 = this.coord(i).distance(new geo.Point(this.coord(i).lat(), x0));
    var x2 = this.coord(j).distance(new geo.Point(this.coord(j).lat(), x0));
    var y1 = this.coord(i).distance(new geo.Point(y0, this.coord(i).lng()));
    var y2 = this.coord(j).distance(new geo.Point(y0, this.coord(j).lng()));
    a += x1 * y2 - x2 * y1;
  }

  return a * 0.5;
};

/**
 * Returns the approximate area of the polygon formed by the path when the path
 * is closed.
 * @return {Number} The approximate area, in square meters.
 * @see http://econym.org.uk/gmap/epoly.htm
 * @note This method only works with non-intersecting polygons.
 * @note The method is inaccurate for large regions because the Earth's
 *     curvature is not accounted for.
 */
geo.Path.prototype.area = function() {
  return Math.abs(this.signedArea_());
};
// TODO: unit test

/**
 * Returns whether or not the coordinates of the polygon formed by the path when
 * the path is closed are in counter clockwise order.
 * @type Boolean
 */
geo.Path.prototype.isCounterClockwise_ = function() {
  return Boolean(this.signedArea_() >= 0);
};
/**
 * Creates a new polygon from the given parameters.
 * @param {geo.Polygon|geo.Path} outerBoundary
 *     The polygon's outer boundary.
 * @param {geo.Path[]} [innerBoundaries]
 *     The polygon's inner boundaries, if any.
 * @constructor
 */
geo.Polygon = function() {
  this.outerBoundary_ = new geo.Path();
  this.innerBoundaries_ = [];
  var i;
  
  // 0 argument constructor
  if (arguments.length === 0) {
    
  // 1 argument constructor
  } else if (arguments.length == 1) {
    var poly = arguments[0];
    
    // copy constructor
    if (poly.constructor === geo.Polygon) {
      this.outerBoundary_ = new geo.Path(poly.outerBoundary());
      for (i = 0; i < poly.innerBoundaries().length; i++) {
        this.innerBoundaries_.push(new geo.Path(poly.innerBoundaries()[i]));
      }
    
    // construct from Earth API object
    } else if (isEarthAPIObject_(poly)) {
      var type = poly.getType();

      // construct from KmlLineString
      if (type == 'KmlLineString' ||
          type == 'KmlLinearRing') {
        this.outerBoundary_ = new geo.Path(poly);
      
      // construct from KmlPolygon
      } else if (type == 'KmlPolygon') {
        this.outerBoundary_ = new geo.Path(poly.getOuterBoundary());
        
        var ibChildNodes = poly.getInnerBoundaries().getChildNodes();
        var n = ibChildNodes.getLength();
        for (i = 0; i < n; i++) {
          this.innerBoundaries_.push(new geo.Path(ibChildNodes.item(i)));
        }
      
      // can't construct from the passed-in Earth object
      } else {
        throw new TypeError(
            'Could not create a polygon from the given arguments');
      }
    
    // treat first argument as an outer boundary path
    } else {
      this.outerBoundary_ = new geo.Path(arguments[0]);
    }
  
  // multiple argument constructor, either:
  // - arrays of numbers (outer boundary coords)
  // - a path (outer boundary) and an array of paths (inner boundaries)
  } else {
    if (arguments[0].length && typeof arguments[0][0] == 'number') {
      // ...new geo.Polygon([0,0], [1,1], [2,2]...
      this.outerBoundary_ = new geo.Path(arguments);
    } else if (arguments[1]) {
      // ...new geo.Polygon([ [0,0] ... ], [ [ [0,0], ...
      this.outerBoundary_ = new geo.Path(arguments[0]);
      if (!geo.util.isArray(arguments[1])) {
        throw new TypeError('Second argument to geo.Polygon constructor ' +
                            'must be an array of paths.');
      }
      
      for (i = 0; i < arguments[1].length; i++) {
        this.innerBoundaries_.push(new geo.Path(arguments[1][i]));
      }
    } else {
      throw new TypeError('Cannot create a path from the given arguments.');
    }
  }
};

/**#@+
  @field
*/

/**
 * The polygon's outer boundary (path).
 * @type {geo.Path}
 * @private
 */
geo.Polygon.prototype.outerBoundary_ = null;

/**
 * The polygon's inner boundaries.
 * @type {geo.Path[]}
 * @private
 */
geo.Polygon.prototype.innerBoundaries_ = null; // don't use mutable objects

/**#@-*/

/**
 * Returns the string representation of the polygon, useful primarily for
 * debugging purposes.
 * @type String
 */
geo.Polygon.prototype.toString = function() {
  return 'Polygon: ' + this.outerBoundary().toString() +
      (this.innerBoundaries().length ?
        ', (' + this.innerBoundaries().length + ' inner boundaries)' : '');
};


/**
 * Returns the polygon's outer boundary path.
 * @type geo.Path
 */
geo.Polygon.prototype.outerBoundary = function() {
  return this.outerBoundary_;
};

/**
 * Returns an array containing the polygon's inner boundaries.
 * You may freely add or remove geo.Path objects to this array.
 * @type geo.Path[]
 */
geo.Polygon.prototype.innerBoundaries = function() {
  return this.innerBoundaries_;
};
// TODO: deprecate writability to this in favor of addInnerBoundary and
// removeInnerBoundary

/**
 * Returns whether or not the polygon contains the given point.
 * @see geo.Path.containsPoint
 * @see http://econym.googlepages.com/epoly.htm
 */
geo.Polygon.prototype.containsPoint = function(point) {
  // outer boundary should contain the point
  if (!this.outerBoundary_.containsPoint(point)) {
    return false;
  }
  
  // none of the inner boundaries should contain the point
  for (var i = 0; i < this.innerBoundaries_.length; i++) {
    if (this.innerBoundaries_[i].containsPoint(point)) {
      return false;
    }
  }
  
  return true;
};

/**
 * Returns the latitude/longitude bounds wholly containing this polygon.
 * @type geo.Bounds
 */
geo.Polygon.prototype.bounds = function() {
  return this.outerBoundary_.bounds();
};

/**
 * Returns the approximate area of the polygon.
 * @return {Number} The approximate area, in square meters.
 * @see geo.Path.area
 */
geo.Polygon.prototype.area = function() {
  // start with outer boundary area
  var area = this.outerBoundary_.area();
  
  // subtract inner boundary areas
  // TODO: handle double counting of intersections
  for (var i = 0; i < this.innerBoundaries_.length; i++) {
    area -= this.innerBoundaries_[i].area();
  }
  
  return area;
};

/**
 * Returns whether or not the polygon's outer boundary coordinates are
 * in counter clockwise order.
 * @type Boolean
 */
geo.Polygon.prototype.isCounterClockwise = function() {
  return this.outerBoundary_.isCounterClockwise_();
};

/**
 * Ensures that the polygon's outer boundary coordinates are in counter
 * clockwise order by reversing them if they are counter clockwise.
 * @see geo.Polygon.isCounterClockwise
 */
geo.Polygon.prototype.makeCounterClockwise = function() {
  if (this.isCounterClockwise()) {
    this.outerBoundary_.reverse();
  }
};
/**
 * The geo.util namespace contains generic JavaScript and JS/Geo utility
 * functions.
 * @namespace
 */
geo.util = {isnamespace_:true};

/**
 * Ensures that Array.prototype.map is available
 * @param {Array} arr Array target of mapFn
 * @param {function(*, number,Array):*} mapFn Function that produces an element of the new Array from an element of the current one.
 * @param {Object=} thisp Object to use as this when executing mapFn. (optional).
 * @return {Array} A new array with the results of calling mapFn on every element in arr.
 */
geo.util.arrayMap = (function() {
  function arrayMap(arr, mapFn, thisp) {
    return arr.map(mapFn, thisp);
  }

  //see https://developer.mozilla.org/En/Core_JavaScript_1.5_Reference:Objects:Array:map
  function noArrayMap(arr, mapFn, thisp) {
    if (typeof mapFn != 'function') {
      throw new TypeError('map() requires a mapping function.');
    }

    var len = arr.length,
        res = new Array(len);

    for (var i = 0; i < len; i++) {
      if (i in arr) {
        res[i] = mapFn.call(thisp, arr[i], i, arr);
      }
    }

    return res;
  }
  
  if (!('map' in Array.prototype)) {
    return noArrayMap;
    
  } else {
    return arrayMap;
  }
})();

/**
 * Determines whether or not the object is `undefined`.
 * @param {Object} object The object to test.
 * @note Taken from Prototype JS library
 */
geo.util.isUndefined = function(object) {
  return typeof object == 'undefined';
};

/**
 * Determines whether or not the object is a JavaScript array.
 * @param {Object} object The object to test.
 * @note Taken from Prototype JS library
 */
geo.util.isArray = function(object) {
  return object !== null && typeof object == 'object' &&
      'splice' in object && 'join' in object;
};

/**
 * Determines whether or not the object is a JavaScript function.
 * @param {Object} object The object to test.
 * @note Taken from Prototype JS library
 */
geo.util.isFunction = function(object) {
  return object !== null && typeof object == 'function' &&
      'call' in object && 'apply' in object;
};

/**
 * Determines whether or not the given object is an Earth API object.
 * @param {Object} object The object to test.
 * @private
 */
function isEarthAPIObject_(object) {
  return object !== null &&
      (typeof object == 'function' || typeof object == 'object') &&
      'getType' in object;
}

/**
 * Determines whether or not the object is an object literal (a.k.a. hash).
 * @param {Object} object The object to test.
 */
geo.util.isObjectLiteral = function(object) {
  return object !== null && typeof object == 'object' &&
      object.constructor === Object && !isEarthAPIObject_(object);
};

/**
 * Determins whether or not the given object is a google.maps.LatLng object
 * (GLatLng).
 */
function isGLatLng_(object) {
  return (window.google &&
          window.google.maps &&
          window.google.maps.LatLng &&
          object.constructor === window.google.maps.LatLng);
}
window.geo = geo;
})();
/*
Copyright 2009 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
(function() {
/**
 * @class The root class/namespace hybrid for the Earth API extensions library.
 * This class groups functionality into namespaces such as
 * {@link GEarthExtensions#dom } and {@link GEarthExtensions#fx }.
 * @param {GEPlugin} pluginInstance The Google Earth Plugin instance to
 *     associate this GEarthExtensions instance with.
 * @example
 * var gex = new GEarthExtensions(ge); // ge is an instance of GEPlugin
 * gex.dom.clearFeatures(); // gex is an instance of a class, and gex.dom
 *                          // is effectively a namespace grouping
 *                          // functionality
 */
var GEarthExtensions = function(pluginInstance) {
  // create class
  var me = this;
  this.pluginInstance = pluginInstance;
  
  // bind all functions in namespaces to this GEarthExtensions instance
  /** @private */
  function bindFunction_(fn_) {
    return function() {
      return fn_.apply(me, arguments);
    };
  }

  /** @private */
  function bindNamespaceMembers_(nsParent) {
    for (var mstr in nsParent) {
      var member = nsParent[mstr];
      
      // bind this namespace's functions to the GEarthExtensions object
      if (geo.util.isFunction(member)) {
        if (member.isclass_) {
          // if it's a class constructor, give it access to this
          // GEarthExtensions instance
          member.extInstance_ = me;
        } else {
          // function's not a constructor, just bind it to this
          // GEarthExtensions instance
          nsParent[mstr] = bindFunction_(member);
        }
      }
      
      // duplicate sub-namespace objects (required for multiple instances to
      // work) and bind functions of all sub-namespaces
      if (isExtensionsNamespace_(member)) {
        var nsDuplicate = {};
        for (var subMstr in member) {
          nsDuplicate[subMstr] = member[subMstr];
        }
        
        bindNamespaceMembers_(nsDuplicate);
        
        nsParent[mstr] = nsDuplicate;
      }
    }
  }
  
  bindNamespaceMembers_(this);
};
/** @private */
var AUTO_ = Infinity; // for dom builder (auto property setters)

/** @private */
var ALLOWED_ = null;

/** @private */
var REQUIRED_ = undefined;

/**
 * Checks a given parameters object against an parameter spec,
 * throwing exceptions as necessary, and returning the resulting options object
 * with defaults filled in.
 * @param {Object} explicitParams The parameters object to check.
 * @param {Boolean} allowAll Whether or not to allow all parameters, or limit
 *     allowed parameters to those listed in the parameter spec.
 * @param {Object} paramSpec The parameter spec, which should be an object whose
 *     properties are the properties expected in the given parameters object and
 *     whose property values are REQUIRED_ if the property is
 *     required or some other value to set a default value.
 * @return Returns a shallow copy of the given parameters object, cleaned up
 *     according to the parameters spec and with default values filled in.
 * @ignore
 */
function checkParameters_(explicitParams, allowAll, paramSpec) {
  // shallow copy explicitParameters
  var finalParams = {};
  
  explicitParams = explicitParams || {};
  paramSpec = paramSpec || {};
  
  for (var member in explicitParams) {
    // if not allowing all, check that it's in the param spec
    if (!allowAll && !(member in paramSpec)) {
      var allowed = [];
      for (var m in paramSpec) {
        allowed.push(m);
      }
      
      throw new Error(
          'Unexpected parameter \'' + member + '\'. ' +
          'Allowed parameters are: ' + allowed.join(', ') + '.');
    }
    
    finalParams[member] = explicitParams[member];
  }
  
  // copy in defaults
  for (member in paramSpec) {
    if (!(member in finalParams)) {
      // if member was required, throw an exception
      if (paramSpec[member] === REQUIRED_) {
        throw new Error(
            'Required parameter \'' + member + '\' was not passed.');
      }
      
      if (paramSpec[member] != ALLOWED_ &&
          paramSpec[member] != AUTO_) {
        // ALLOWED_ and AUTO_ are placeholders,
        // not default values
        finalParams[member] = paramSpec[member];
      }
    }
  }
  
  return finalParams;
}

/**
 * Creates a new 'class' from the provided constructor function and mixes in
 * members of provided mixin classes.
 * @private
 */
function createClass_() {
  var mixins = [];
  var constructorFn = null;
  
  if (geo.util.isArray(arguments[0])) {
    mixins = arguments[0];
    constructorFn = arguments[1];
  } else {
    constructorFn = arguments[0];
  }
  
  constructorFn.isclass_ = true;
  
  for (var i = 0; i < mixins.length; i++) {
    for (var k in mixins[i].prototype) {
      constructorFn.prototype[k] = mixins[i].prototype[k];
    }
  }
  
  return constructorFn;
}

/**
 * Determines whether or not the object is a GEarthExtensions namespace.
 * @param {Object} object The object to test.
 * @private
 */
function isExtensionsNamespace_(object) {
  return object !== null && typeof object == 'object' &&
      'isnamespace_' in object && object.isnamespace_;
}

/**
 * Determines whether or not the given object is directly an instance
 * of the specified Earth API type.
 * @param {Object} object The object to test.
 * @param {String} type The Earth API type string, i.e. 'KmlPlacemark'
 */
GEarthExtensions.isInstanceOfEarthInterface = function(object, type) {
  // TODO: double check that all earth interfaces are typeof 'function'
  return object !== null &&
      (typeof object == 'object' || typeof object == 'function') &&
      'getType' in object && object.getType() == type;
};
/**
 * Contains DOM builder functions (buildXX) and DOM
 * manipulation/traversal functions.
 * @namespace
 */
GEarthExtensions.prototype.dom = {isnamespace_:true};

/**
 * This is a sort of parametrized decorator around a fundamental constructor
 * DOM builder function,
 * it calls GEPlugin's buildXX factory functions, allows for a type of
 * inheritance, provides extra functionality such as automatic property setters,
 * default arguments (i.e. fn('bar', {cat:'dog'}) == fn({foo:'bar', cat:'dog'}))
 * and checking if the parameter is an instance of the object we're constructing
 * @private
 */
function domBuilder_(params) {
  if (params.apiInterface && !geo.util.isArray(params.apiInterface)) {
    params.apiInterface = [params.apiInterface];
  }
  
  // merge in base builder params
  // TODO: detect circular base builders
  var base = params.base;
  while (base) {
    // merge in propertyspec
    if ('propertySpec' in base.builderParams) {
      if (!('propertySpec' in params)) {
        params.propertySpec = [];
      }
      
      for (var member in base.builderParams.propertySpec) {
        if (!(member in params.propertySpec)) {
          params.propertySpec[member] =
              base.builderParams.propertySpec[member];
        }
      }
    }
    
    // set Earth API interface if none was set for this builder
    if (!params.apiInterface) {
      params.apiInterface = base.builderParams.apiInterface;
    }
    
    // set Earth API factory fn if none was set for this builder
    if (!params.apiFactoryFn) {
      params.apiFactoryFn = base.builderParams.apiFactoryFn;
    }
    
    base = base.builderParams.base;
  }
  
  // merge in root dom builder property spec (only id is universal to
  // all DOM objects)
  var rootPropertySpec = {
    id: ''
  };
  
  for (member in rootPropertySpec) {
    if (!(member in params.propertySpec)) {
      params.propertySpec[member] = rootPropertySpec[member];
    }
  }
  
  /** @ignore */
  var builderFn = function() {
    var options = {};
    var i;
    
    // construct options literal to pass to constructor function
    // from arguments
    if (arguments.length === 0) {
      throw new TypeError('Cannot create object without any arguments!');
    } else if (arguments.length == 1) {
      // the argument to the function may already be an instance of the
      // interface we're trying to create... if so, then simply return the
      // instance
      
      // TODO: maybe clone the object instead of just returning it
      for (i = 0; i < params.apiInterface.length; i++) {
        if (GEarthExtensions.isInstanceOfEarthInterface(
            arguments[0], params.apiInterface[i])) {
          return arguments[0];
        }
      }
      
      // find out if the first argument is the default property or the
      // options literal and construct the final options literal to
      // pass to the constructor function
      var arg = arguments[0];
      if (geo.util.isObjectLiteral(arg)) {
        // passed in only the options literal
        options = arg;
      } else if ('defaultProperty' in params) {
        // passed in default property and no options literal
        options[params.defaultProperty] = arg;
      } else {
        throw new TypeError('Expected options object');
      }
    } else if (arguments.length == 2) {
      if ('defaultProperty' in params) {
        // first parameter is the value of the default property, and the
        // other is the options literal
        options = arguments[1];
        options[params.defaultProperty] = arguments[0];
      } else {
        throw new Error('No default property for the DOM builder');
      }
    }
    
    // check passed in options against property spec
    options = checkParameters_(options,
        false, params.propertySpec);
    
    // call Earth API factory function, i.e. createXX(...)
    var newObj = this.pluginInstance[params.apiFactoryFn](options.id);

    // call constructor fn with factory-created object and options literal
    if (!geo.util.isUndefined(params.constructor)) {
      params.constructor.call(this, newObj, options);
    }
    
    // call base builder constructor functions
    base = params.base;
    while (base) {
      // call ancestor constructor functions
      if ('constructor' in base.builderParams) {
        base.builderParams.constructor.call(this, newObj, options);
      }
      
      base = base.builderParams.base;
    }
    
    // run automatic property setters as defined in property spec
    for (var property in params.propertySpec) {
      // TODO: abstract away into isAuto()
      if (params.propertySpec[property] === AUTO_ &&
          property in options) {
        // auto setters calls newObj.setXx(options[xx]) if xx is in options
        newObj['set' + property.charAt(0).toUpperCase() + property.substr(1)](options[property]);
      }
    }
    
    return newObj;
  };
  
  builderFn.builderParams = params;
  return builderFn;
}
/** @ignore */
GEarthExtensions.prototype.dom.buildFeature_ = domBuilder_({
  propertySpec: {
    name: AUTO_,
    visibility: AUTO_,
    description: AUTO_,
    snippet: AUTO_,
    
    // allowed properties
    region: ALLOWED_
  },
  constructor: function(featureObj, options) {
    if (options.region) {
      featureObj.setRegion(this.dom.buildRegion(options.region));
    }
  }
});

/**
 * Creates a new placemark with the given parameters.
 * @function
 * @param {Object} options The parameters of the placemark to create.
 * @param {String} [options.name] The name of the feature.
 * @param {Boolean} [options.visibility] Whether or not the feature should
 *     be visible.
 * @param {String} [options.description] An HTML description for the feature;
 *     may be used as balloon text.
 * @param {PointOptions|KmlPoint} [options.point] A point geometry to use in the
 *     placemark.
 * @param {LineStringOptions|KmlLineString} [options.lineString] A line string
 *     geometry to use in the placemark.
 * @param {LinearRingOptions|KmlLinearRing} [options.linearRing] A linear ring
 *     geometry to use in the placemark.
 * @param {PolygonOptions|KmlPolygon} [options.polygon] A polygon geometry to
 *     use in the placemark.
 * @param {ModelOptions|KmlModel} [options.model] A model geometry to use
 *     in the placemark.
 * @param {MultiGeometryOptions|KmlMultiGeometry} [options.multiGeometry] A
 *     multi-geometry to use in the placemark.
 * @param {KmlGeometry[]} [options.geometries] An array of geometries to add
 *     to the placemark.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] A convenience property
 *     for the placemark geometry's altitude mode.
 * @param {String} [options.stockIcon] A convenience property to set the
 *     point placemark's icon to a stock icon, e.g. 'paddle/wht-blank'.
 *     Stock icons reside under 'http://maps.google.com/mapfiles/kml/...'. -----> No they dont. They are in local images dir
 * @param {StyleOptions|KmlStyleSelector} [options.style] The style to use for
 *     this placemark. See also GEarthExtensions.dom.buildStyle.
 * @param {StyleOptions|KmlStyleSelector} [options.highlightStyle] The
 *     highlight style to use for this placemark. If this option is used, the
 *     style and highlightStyle form a style map.
 * @param {IconStyleOptions} [options.icon] A convenience property to build the
 *     point placemark's icon style from the given options.
 * @param {String} [options.stockIcon] A convenience property to set the
 *     point placemark's icon to a stock icon, e.g. 'paddle/wht-blank'.
 *     Stock icons reside under 'http://maps.google.com/mapfiles/kml/...'. -----> No they dont. They are in local images dir
 * @type KmlPlacemark
 */
GEarthExtensions.prototype.dom.buildPlacemark = domBuilder_({
  apiInterface: 'KmlPlacemark',
  base: GEarthExtensions.prototype.dom.buildFeature_,
  apiFactoryFn: 'createPlacemark',
  propertySpec: {
    // allowed geometries
    point: ALLOWED_,
    lineString: ALLOWED_,
    linearRing: ALLOWED_,
    polygon: ALLOWED_,
    model: ALLOWED_,
    geometries: ALLOWED_,
    
    // convenience (pass through to geometry)
    altitudeMode: ALLOWED_,
    
    // styling
    stockIcon: ALLOWED_,
    icon: ALLOWED_,
    style: ALLOWED_,
    highlightStyle: ALLOWED_
  },
  constructor: function(placemarkObj, options) {
    // geometries
    var geometries = [];
    if (options.point) {
      geometries.push(this.dom.buildPoint(options.point));
    }
    if (options.lineString) {
      geometries.push(this.dom.buildLineString(options.lineString));
    }
    if (options.linearRing) {
      geometries.push(this.dom.buildLinearRing(options.linearRing));
    }
    if (options.polygon) {
      geometries.push(this.dom.buildPolygon(options.polygon));
    }
    if (options.model) {
      geometries.push(this.dom.buildModel(options.model));
    }
    if (options.multiGeometry) {
      geometries.push(this.dom.buildMultiGeometry(options.multiGeometry));
    }
    if (options.geometries) {
      geometries = geometries.concat(options.geometries);
    }
  
    if (geometries.length > 1) {
      placemarkObj.setGeometry(this.dom.buildMultiGeometry(geometries));
    } else if (geometries.length == 1) {
      placemarkObj.setGeometry(geometries[0]);
    }
  
    // set styles
    if (options.stockIcon) {
      options.icon = options.icon || {};
      options.icon.stockIcon = options.stockIcon;
    }
  
    if (options.icon) {
      if (!options.style) {
        options.style = {};
      }
    
      options.style.icon = options.icon;
    }
    
    // convenience
    if ('altitudeMode' in options) {
      placemarkObj.getGeometry().setAltitudeMode(options.altitudeMode);
    }
  
    // NOTE: for this library, allow EITHER a style or a styleUrl, not both..
    // if you want both, you'll have to do it manually
    if (options.style) {
      if (options.highlightStyle) {
        // style map
        var styleMap = this.pluginInstance.createStyleMap('');
      
        // set normal style
        if (typeof options.style == 'string') {
          styleMap.setNormalStyleUrl(options.style);
        } else {
          styleMap.setNormalStyle(this.dom.buildStyle(options.style));
        }
      
        // set highlight style
        if (typeof options.highlightStyle == 'string') {
          styleMap.setHighlightStyleUrl(options.highlightStyle);
        } else {
          styleMap.setHighlightStyle(this.dom.buildStyle(
              options.highlightStyle));
        }
      
        // assign style map
        placemarkObj.setStyleSelector(styleMap);
      } else {
        // single style
        if (typeof options.style == 'string') {
          placemarkObj.setStyleUrl(options.style);
        } else {
          placemarkObj.setStyleSelector(this.dom.buildStyle(options.style));
        }
      }
    }
  }
});

/**
 * Convenience method to build a point placemark.
 * @param {PointOptions|KmlPoint} point The point geometry.
 * @param {Object} options The parameters of the placemark to create.
 * @see GEarthExtensions#dom.buildPlacemark
 * @function
 */
GEarthExtensions.prototype.dom.buildPointPlacemark = domBuilder_({
  base: GEarthExtensions.prototype.dom.buildPlacemark,
  defaultProperty: 'point'
});

/**
 * Convenience method to build a linestring placemark.
 * @param {LineStringOptions|KmlLineString} lineString The line string geometry.
 * @param {Object} options The parameters of the placemark to create.
 * @see GEarthExtensions#dom.buildPlacemark
 * @function
 */
GEarthExtensions.prototype.dom.buildLineStringPlacemark = domBuilder_({
  base: GEarthExtensions.prototype.dom.buildPlacemark,
  defaultProperty: 'lineString'
});

/**
 * Convenience method to build a polygon placemark.
 * @param {PolygonOptions|KmlPolygon} polygon The polygon geometry.
 * @param {Object} options The parameters of the placemark to create.
 * @see GEarthExtensions#dom.buildPlacemark
 * @function
 */
GEarthExtensions.prototype.dom.buildPolygonPlacemark = domBuilder_({
  base: GEarthExtensions.prototype.dom.buildPlacemark,
  defaultProperty: 'polygon'
});


/**
 * Creates a new network link with the given parameters.
 * @function
 * @param {LinkOptions} [link] An object describing the link to use for this
 *     network link.
 * @param {Object} options The parameters of the network link to create.
 * @param {String} [options.name] The name of the feature.
 * @param {Boolean} [options.visibility] Whether or not the feature should
 *     be visible.
 * @param {String} [options.description] An HTML description for the feature;
 *     may be used as balloon text.
 * @param {LinkOptions} [options.link] The link to use.
 * @param {Boolean} [options.flyToView] Whether or not to fly to the default
 *     view of the network link'd content.
 * @param {Boolean} [options.refreshVisibility] Whether or not a refresh should
 *     reset the visibility of child features.
 * @type KmlNetworkLink
 */
GEarthExtensions.prototype.dom.buildNetworkLink = domBuilder_({
  apiInterface: 'KmlNetworkLink',
  base: GEarthExtensions.prototype.dom.buildFeature_,
  apiFactoryFn: 'createNetworkLink',
  defaultProperty: 'link',
  propertySpec: {
    link: ALLOWED_,
    
    // auto properties
    flyToView: AUTO_,
    refreshVisibility: AUTO_
  },
  constructor: function(networkLinkObj, options) {
    if (options.link) {
      networkLinkObj.setLink(this.dom.buildLink(options.link));
    }
  }
});
// TODO: unit tests

/** @ignore */
GEarthExtensions.prototype.dom.buildContainer_ = domBuilder_({
  base: GEarthExtensions.prototype.dom.buildFeature_,
  propertySpec: {
    children: ALLOWED_
  },
  constructor: function(containerObj, options) {
    // children
    if (options.children) {
      for (var i = 0; i < options.children.length; i++) {
        containerObj.getFeatures().appendChild(options.children[i]);
      }
    }  
  }
});

/**
 * Creates a new folder with the given parameters.
 * @function
 * @param {KmlFeature[]} [children] The children of this folder.
 * @param {Object} options The parameters of the folder to create.
 * @param {String} [options.name] The name of the feature.
 * @param {Boolean} [options.visibility] Whether or not the feature should
 *     be visible.
 * @param {String} [options.description] An HTML description for the feature;
 *     may be used as balloon text.
 * @param {KmlFeature[]} [options.children] The children of this folder.
 * @type KmlFolder
 */
GEarthExtensions.prototype.dom.buildFolder = domBuilder_({
  apiInterface: 'KmlFolder',
  base: GEarthExtensions.prototype.dom.buildContainer_,
  apiFactoryFn: 'createFolder',
  defaultProperty: 'children'
});
// TODO: unit tests

/**
 * Creates a new document with the given parameters.
 * @function
 * @param {KmlFeature[]} [children] The children of this document.
 * @param {Object} options The parameters of the document to create.
 * @param {String} [options.name] The name of the feature.
 * @param {Boolean} [options.visibility] Whether or not the feature should
 *     be visible.
 * @param {String} [options.description] An HTML description for the feature;
 *     may be used as balloon text.
 * @param {KmlFeature[]} [options.children] The children of this document.
 * @type KmlDocument
 */
GEarthExtensions.prototype.dom.buildDocument = domBuilder_({
  apiInterface: 'KmlDocument',
  base: GEarthExtensions.prototype.dom.buildContainer_,
  apiFactoryFn: 'createDocument',
  defaultProperty: 'children'
});
// TODO: unit tests

/** @ignore */
GEarthExtensions.prototype.dom.buildOverlay_ = domBuilder_({
  base: GEarthExtensions.prototype.dom.buildFeature_,
  propertySpec: {
    color: ALLOWED_,
    icon: ALLOWED_,
    
    // auto properties
    drawOrder: AUTO_
  },
  constructor: function(overlayObj, options) {
    // color
    if (options.color) {
      overlayObj.getColor().set(this.util.parseColor(options.color));
    }
  
    // icon
    if (options.icon) {
      var icon = this.pluginInstance.createIcon('');
      overlayObj.setIcon(icon);
    
      if (typeof options.icon == 'string') {
        // default just icon href
        icon.setHref(options.icon);
      }
    }
  }
});

/**
 * Creates a new ground overlay with the given parameters.
 * @function
 * @param {String} [icon] The URL of the overlay image.
 * @param {Object} options The parameters of the ground overlay to create.
 * @param {String} [options.name] The name of the feature.
 * @param {Boolean} [options.visibility] Whether or not the feature should
 *     be visible.
 * @param {String} [options.description] An HTML description for the feature.
 * @param {String} [options.color] A color to apply on the overlay.
 * @param {String} [options.icon] The URL of the overlay image.
 * @param {Number} [options.drawOrder] The drawing order of the overlay;
 *     overlays with higher draw orders appear on top of those with lower
 *     draw orders.
 * @param {Number} [options.altitude] The altitude of the ground overlay, in
 *     meters.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     ground overlay.
 * @param {Object} options.box The bounding box for the overlay.
 * @param {Number} options.box.north The north latitude for the overlay.
 * @param {Number} options.box.east The east longitude for the overlay.
 * @param {Number} options.box.south The south latitude for the overlay.
 * @param {Number} options.box.west The west longitude for the overlay.
 * @param {Number} [options.box.rotation] The rotation, in degrees, of the
 *     overlay.
 * @type KmlGroundOverlay
 */
GEarthExtensions.prototype.dom.buildGroundOverlay = domBuilder_({
  apiInterface: 'KmlGroundOverlay',
  base: GEarthExtensions.prototype.dom.buildOverlay_,
  apiFactoryFn: 'createGroundOverlay',
  defaultProperty: 'icon',
  propertySpec: {
    // required properties
    box: REQUIRED_,
    
    // auto properties
    altitude: AUTO_,
    altitudeMode: AUTO_
  },
  constructor: function(groundOverlayObj, options) {
    if (options.box) {
      // TODO: exception if any of the options are missing
      var box = this.pluginInstance.createLatLonBox('');
      box.setBox(options.box.north, options.box.south,
                 options.box.east, options.box.west,
                 options.box.rotation ? options.box.rotation : 0);
      groundOverlayObj.setLatLonBox(box);
    }
  }
});



/**
 * Creates a new screen overlay with the given parameters.
 * @function
 * @param {String} [icon] The URL of the overlay image.
 * @param {Object} options The parameters of the screen overlay to create.
 * @param {String} [options.name] The name of the feature.
 * @param {Boolean} [options.visibility] Whether or not the feature should
 *     be visible.
 * @param {String} [options.description] An HTML description for the feature.
 * @param {String} [options.color] A color to apply on the overlay.
 * @param {String} [options.icon] The URL of the overlay image.
 * @param {Number} [options.drawOrder] The drawing order of the overlay;
 *     overlays with higher draw orders appear on top of those with lower
 *     draw orders.
 * @param {Vec2Src} [options.overlayXY] The registration point in the overlay
 *     that will be placed at the given screenXY point and potentially
 *     rotated about. This object will be passed to
 *     GEarthExtensions#dom.setVec2. The default is the top left of the overlay.
 *     Note that the behavior of overlayXY in GEarthExtensions is KML-correct;
 *     whereas in the Earth API overlayXY and screenXY are swapped.
 * @param {Vec2Src} options.screenXY The position in the plugin window
 *     that the screen overlay should appear at. This object will
 *     be passed to GEarthExtensions#dom.setVec2.
 *     Note that the behavior of overlayXY in GEarthExtensions is KML-correct;
 *     whereas in the Earth API overlayXY and screenXY are swapped.
 * @param {Vec2Src} options.size The size of the overlay. This object will
 *     be passed to GEarthExtensions#dom.setVec2.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     ground overlay.
 * @param {Number} [options.rotation] The rotation of the overlay, in degrees.
 * @type KmlScreenOverlay
 */
GEarthExtensions.prototype.dom.buildScreenOverlay = domBuilder_({
  apiInterface: 'KmlScreenOverlay',
  base: GEarthExtensions.prototype.dom.buildOverlay_,
  apiFactoryFn: 'createScreenOverlay',
  defaultProperty: 'icon',
  propertySpec: {
    // required properties
    screenXY: REQUIRED_,
    size: REQUIRED_,

    // auto properties
    rotation: AUTO_,

    // optional properties
    overlayXY: { left: 0, top: 0 },
    rotationXY: ALLOWED_
  },
  constructor: function(screenOverlayObj, options) {
    // NOTE: un-swapped overlayXY and screenXY.
    this.dom.setVec2(screenOverlayObj.getScreenXY(), options.overlayXY);
    this.dom.setVec2(screenOverlayObj.getOverlayXY(), options.screenXY);
    this.dom.setVec2(screenOverlayObj.getSize(), options.size);

    if ('rotationXY' in options) {
      this.dom.setVec2(screenOverlayObj.getRotationXY(), options.rotationXY);
    }
  }
});
// TODO: unit tests

/**
 * @name GEarthExtensions#dom.addPlacemark
 * Convenience method that calls GEarthExtensions#dom.buildPlacemark and adds
 * the created placemark to the Google Earth Plugin DOM.
 * @function
 */
var autoDomAdd_ = ['Placemark', 'PointPlacemark', 'LineStringPlacemark',
                   'PolygonPlacemark', 'Folder', 'NetworkLink',
                   'GroundOverlay', 'ScreenOverlay', 'Style'];
for (var i = 0; i < autoDomAdd_.length; i++) {
  GEarthExtensions.prototype.dom['add' + autoDomAdd_[i]] =
    function(shortcutBase) {
      return function() {
        var obj = this.dom['build' + shortcutBase].apply(null, arguments);
        this.pluginInstance.getFeatures().appendChild(obj);
        return obj;
      };
  }(autoDomAdd_[i]); // escape closure
}
/** @ignore */
GEarthExtensions.prototype.dom.buildExtrudableGeometry_ = domBuilder_({
  propertySpec: {
    altitudeMode: AUTO_,
    extrude: AUTO_,
    tessellate: AUTO_
  }
});

/**
 * Creates a new point geometry with the given parameters.
 * @function
 * @param {PointOptions|geo.Point|KmlPoint} [point] The point data. Anything
 *     that can be passed to the geo.Point constructor.
 * @param {Object} options The parameters of the point object to create.
 * @param {PointOptions|geo.Point|KmlPoint} options.point The point data.
 *     Anything that can be passed to the geo.Point constructor.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     geometry.
 * @param {Boolean} [options.extrude] Whether or not the geometry should
 *     extrude down to the Earth's surface.
 * @type KmlPoint
 */
GEarthExtensions.prototype.dom.buildPoint = domBuilder_({
  apiInterface: 'KmlPoint',
  base: GEarthExtensions.prototype.dom.buildExtrudableGeometry_,
  apiFactoryFn: 'createPoint',
  defaultProperty: 'point',
  propertySpec: {
    point: REQUIRED_
  },
  constructor: function(pointObj, options) {
    var point = new geo.Point(options.point);
    pointObj.set(
        point.lat(),
        point.lng(),
        point.altitude(),
        ('altitudeMode' in options) ? options.altitudeMode :
                                      point.altitudeMode(),
        false,
        false);
  }
});
// TODO: unit tests

/**
 * Creates a new line string geometry with the given parameters.
 * @function
 * @param {PathOptions|geo.Path|KmlLineString} [path] The path data.
 *     Anything that can be passed to the geo.Path constructor.
 * @param {Object} options The parameters of the line string to create.
 * @param {PathOptions|geo.Path|KmlLineString} options.path The path data.
 *     Anything that can be passed to the geo.Path constructor.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     geometry.
 * @param {Boolean} [options.extrude] Whether or not the geometry should
 *     extrude down to the Earth's surface.
 * @param {Boolean} [options.tessellate] Whether or not the geometry should
 *     be tessellated (i.e. contour to the terrain).
 * @type KmlLineString
 */
GEarthExtensions.prototype.dom.buildLineString = domBuilder_({
  apiInterface: 'KmlLineString',
  base: GEarthExtensions.prototype.dom.buildExtrudableGeometry_,
  apiFactoryFn: 'createLineString',
  defaultProperty: 'path',
  propertySpec: {
    path: REQUIRED_
  },
  constructor: function(lineStringObj, options) {
    // TODO: maybe use parseKml instead of pushLatLngAlt for performance
    // purposes
    var coordsObj = lineStringObj.getCoordinates();
  
    var path = new geo.Path(options.path);
    var numCoords = path.numCoords();
    for (var i = 0; i < numCoords; i++) {
      coordsObj.pushLatLngAlt(path.coord(i).lat(), path.coord(i).lng(),
          path.coord(i).altitude());
    }
  }
});
// TODO: unit tests

/**
 * Creates a new linear ring geometry with the given parameters.
 * @function
 * @param {PathOptions|geo.Path|KmlLinearRing} [path] The path data.
 *     Anything that can be passed to the geo.Path constructor.
 *     The first coordinate doesn't need to be repeated at the end.
 * @param {Object} options The parameters of the linear ring to create.
 * @param {PathOptions|geo.Path|KmlLinearRing} options.path The path data.
 *     Anything that can be passed to the geo.Path constructor.
 *     The first coordinate doesn't need to be repeated at the end.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     geometry.
 * @param {Boolean} [options.extrude] Whether or not the geometry should
 *     extrude down to the Earth's surface.
 * @param {Boolean} [options.tessellate] Whether or not the geometry should
 *     be tessellated (i.e. contour to the terrain).
 * @type KmlLinearRing
 */
GEarthExtensions.prototype.dom.buildLinearRing = domBuilder_({
  apiInterface: 'KmlLinearRing',
  base: GEarthExtensions.prototype.dom.buildLineString,
  apiFactoryFn: 'createLinearRing',
  defaultProperty: 'path',
  constructor: function(linearRingObj, options) {
    /*
    Earth API automatically dups first coordinate at the end to complete
    the ring when using createLinearRing, but parseKml won't do that...
    so if we switch to parseKml, make sure to duplicate the last point
    */
  }
});
// TODO: unit tests

/**
 * Creates a new polygon geometry with the given parameters.
 * @function
 * @param {PolygonOptions|geo.Polygon|KmlPolygon} [polygon] The polygon data.
 *     Anything that can be passed to the geo.Polygon constructor.
 * @param {Object} options The parameters of the polygon to create.
 * @param {PolygonOptions|geo.Polygon|KmlPolygon} options.polygon The polygon
 *     data. Anything that can be passed to the geo.Polygon constructor.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     geometry.
 * @param {Boolean} [options.extrude] Whether or not the geometry should
 *     extrude down to the Earth's surface.
 * @param {Boolean} [options.tessellate] Whether or not the geometry should
 *     be tessellated (i.e. contour to the terrain).
 * @type KmlPolygon
 */
GEarthExtensions.prototype.dom.buildPolygon = domBuilder_({
  apiInterface: 'KmlPolygon',
  base: GEarthExtensions.prototype.dom.buildExtrudableGeometry_,
  apiFactoryFn: 'createPolygon',
  defaultProperty: 'polygon',
  propertySpec: {
    polygon: REQUIRED_
  },
  constructor: function(polygonObj, options) {
    var polygon = new geo.Polygon(options.polygon);
  
    polygonObj.setOuterBoundary(
        this.dom.buildLinearRing(polygon.outerBoundary()));
    if (polygon.innerBoundaries().length) {
      var innerBoundaries = polygon.innerBoundaries();
      for (var i = 0; i < innerBoundaries.length; i++) {
        polygonObj.getInnerBoundaries().appendChild(
            this.dom.buildLinearRing(innerBoundaries[i]));
      }
    }
  }
});
// TODO: unit tests

/**
 * Creates a new model geometry with the given parameters.
 * @function
 * @param {LinkOptions|KmlLink} [link] The remote link this model should use.
 * @param {Object} options The parameters of the model to create.
 * @param {LinkOptions|KmlLink} [options.link] The remote link this model
 *     should use.
 * @param {KmlAltitudeModeEnum} [options.altitudeMode] The altitude mode of the
 *     geometry.
 * @param {PointOptions|geo.Point} [options.location] The location of the model.
 * @param {Number|Number[]} [options.scale] The scale factor of the model,
 *     either as a constant scale, or a 3-item array for x, y, and z scale.
 * @param {Object} [options.orientation] The orientation of the model.
 * @param {Number} [options.orientation.heading] The model heading.
 * @param {Number} [options.orientation.tilt] The model tilt.
 * @param {Number} [options.orientation.roll] The model roll.
 * @type KmlModel
 */
GEarthExtensions.prototype.dom.buildModel = domBuilder_({
  apiInterface: 'KmlModel',
  apiFactoryFn: 'createModel',
  defaultProperty: 'link',
  propertySpec: {
    altitudeMode: AUTO_,
    
    link: ALLOWED_,
    location: ALLOWED_,
    scale: ALLOWED_,
    orientation: ALLOWED_
  },
  constructor: function(modelObj, options) {
    if (options.link) {
      modelObj.setLink(this.dom.buildLink(options.link));
    }
  
    if (options.location) {
      var pointObj = new geo.Point(options.location);
      var locationObj = this.pluginInstance.createLocation('');
      locationObj.setLatLngAlt(pointObj.lat(), pointObj.lng(),
          pointObj.altitude());
      modelObj.setLocation(locationObj);
      modelObj.setAltitudeMode(pointObj.altitudeMode());
    }
  
    if (options.scale) {
      var scaleObj = this.pluginInstance.createScale('');
      if (typeof options.scale == 'number') {
        scaleObj.set(options.scale, options.scale, options.scale);
      } else if (geo.util.isArray(options.scale)) {
        scaleObj.set(options.scale[0], options.scale[1], options.scale[2]);
      }
    
      modelObj.setScale(scaleObj);
    }
  
    if (options.orientation) {
      var orientationObj = this.pluginInstance.createOrientation('');
      if ('heading' in options.orientation &&
          'tilt' in options.orientation &&
          'roll' in options.orientation) {
        orientationObj.set(options.orientation.heading,
                           options.orientation.tilt,
                           options.orientation.roll);
      }
    
      modelObj.setOrientation(orientationObj);
    }
  }
});

/**
 * Creates a new multi-geometry with the given parameters.
 * @function
 * @param {KmlGeometry[]} [geometries] The child geometries.
 * @param {Object} options The parameters of the multi-geometry to create.
 * @param {KmlGeometry[]} [options.geometries] The child geometries.
 * @type KmlMultiGeometry
 */
GEarthExtensions.prototype.dom.buildMultiGeometry = domBuilder_({
  apiInterface: 'KmlMultiGeometry',
  apiFactoryFn: 'createMultiGeometry',
  defaultProperty: 'geometries',
  propertySpec: {
    geometries: ALLOWED_
  },
  constructor: function(multiGeometryObj, options) {
    var geometriesObj = multiGeometryObj.getGeometries();
  
    if (geo.util.isArray(options.geometries)) {
      for (var i = 0; i < options.geometries.length; i++) {
        geometriesObj.appendChild(options.geometries[i]);
      }
    }
  }
});
// TODO: unit tests
/**
 * Creates a new link object with the given parameters.
 * @function
 * @param {String} [href] The link href.
 * @param {Object} options The link parameters.
 * @param {String} [options.href] The link href.
 * @param {KmlRefreshModeEnum} [options.refreshMode] The link refresh mode.
 * @param {Number} [options.refreshInterval] The link refresh interval,
 *     in seconds.
 * @param {KmlViewRefreshModeEnum} [options.viewRefreshMode] The view-based
 *     refresh mode.
 * @type KmlLink
 */
GEarthExtensions.prototype.dom.buildLink = domBuilder_({
  apiInterface: 'KmlLink',
  apiFactoryFn: 'createLink',
  defaultProperty: 'href',
  propertySpec: {
    // auto properties
    href: AUTO_,
    refreshMode: AUTO_,
    refreshInterval: AUTO_,
    viewRefreshMode: AUTO_,
    viewBoundScale: AUTO_
  }
});

/**
 * Creates a new region with the given parameters.
 * @function
 * @param {Object} options The parameters of the region to create.
 * @param {String} options.box The bounding box of the region, defined by
 *     either N/E/S/W, or center+span, and optional altitudes.
 * @param {Number} [options.box.north] The north latitude for the region.
 * @param {Number} [options.box.east] The east longitude for the region.
 * @param {Number} [options.box.south] The south latitude for the region.
 * @param {Number} [options.box.west] The west longitude for the region.
 * @param {PointOptions|geo.Point} [options.box.center] The center point
 *     for the region's bounding box.
 * @param {Number|Number[]} [options.box.span] If using center+span region box
 *     definition, this is either a number indicating both latitude and
 *     longitude span, or a 2-item array defining [latSpan, lngSpan].
 * @param {Number} [options.box.minAltitude] The low altitude for the region.
 * @param {Number} [options.box.maxAltitude] The high altitude for the region.
 * @param {KmlAltitudeModeEnum} [options.box.altitudeMode] The altitude mode
 *     of the region, pertaining to min and max altitude.
 * @param {Number[]} [options.lod] An array of values indicating the LOD range
 *     for the region. The array can either contain 2 values, i.e.
 *     [minLodPixels, maxLodPixels], or 4 values to indicate fade extents, i.e.
 *     [minLodPixels, minFadeExtent, maxFadeExtent, maxLodPixels].
 * @type KmlRegion
 */
GEarthExtensions.prototype.dom.buildRegion = domBuilder_({
  apiInterface: 'KmlRegion',
  apiFactoryFn: 'createRegion',
  propertySpec: {
    // required properties
    box: REQUIRED_,
    
    // allowed properties
    lod: ALLOWED_
  },
  constructor: function(regionObj, options) {
    // TODO: exception if any of the options are missing
    var box = this.pluginInstance.createLatLonAltBox('');
    
    // center +/- span to calculate n/e/s/w
    if (options.box.center && options.box.span) {
      if (!geo.util.isArray(options.box.span) &&
          typeof options.box.span === 'number') {
        // use this one number as both the lat and long span
        options.box.span = [options.box.span, options.box.span];
      }
      
      var center = new geo.Point(options.box.center);
      options.box.north = center.lat() + options.box.span[0] / 2;
      options.box.south = center.lat() - options.box.span[0] / 2;
      options.box.east = center.lng() + options.box.span[1] / 2;
      options.box.west = center.lng() - options.box.span[1] / 2;
    }
    
    box.setAltBox(options.box.north, options.box.south,
                  options.box.east, options.box.west,
                  options.box.rotation || 0,
                  options.box.minAltitude || 0,
                  options.box.maxAltitude || 0,
                  options.box.altitudeMode ||
                      this.pluginInstance.ALTITUDE_CLAMP_TO_GROUND);
    
    // NOTE: regions MUST be given an Lod due to
    // http://code.google.com/p/earth-api-samples/issues/detail?id=190
    var lod = this.pluginInstance.createLod('');
    lod.set(-1, -1, 0, 0); // default Lod
    
    if (options.lod && geo.util.isArray(options.lod)) {
      // TODO: exception if it's not an array
      if (options.lod.length == 2) {
        // minpix, maxpix
        lod.set(options.lod[0], options.lod[1], 0, 0);
      } else if (options.lod.length == 4) {
        // minpix, minfade, maxfade, maxpix
        lod.set(options.lod[0], options.lod[3],
                options.lod[1], options.lod[2]);
      } else {
        // TODO: exception
      }
    }
    
    regionObj.setLatLonAltBox(box);
    regionObj.setLod(lod);
  }
});
/**
 * Creates a new style with the given parameters.
 * @function
 * @param {Object} options The style parameters.

 * @param {String|Object} [options.icon] The icon href or an icon
 *     object literal.
 * @param {String} [options.icon.href] The icon href.
 * @param {String} [options.icon.stockIcon] A convenience property to set the
 *     icon to a stock icon, e.g. 'paddle/wht-blank'.
 *     Stock icons reside under 'http://maps.google.com/mapfiles/kml/...'. -----> No they dont. They are in local images dir
 * @param {Number} [options.icon.scale] The icon scaling factor.
 * @param {ColorSpec} [options.icon.color] The color of the icon.
 * @param {ColorSpec} [options.icon.opacity] The opacity of the icon,
 *     between 0.0 and 1.0. This is a convenience property, since opacity can
 *     be defined in the color.
 * @param {Vec2Options|KmlVec2} [options.icon.hotSpot] The hot sopt of the icon,
 *     as a KmlVec2, or as an options literal to pass to3
 *     GEarthExtensions.dom.setVec2.

 * @param {ColorSpec|Object} [options.label] The label color or a label
 *     object literal.
 * @param {Number} [options.label.scale] The label scaling factor.
 * @param {ColorSpec} [options.label.color] The color of the label.
 * @param {ColorSpec} [options.icon.opacity] The opacity of the label,
 *     between 0.0 and 1.0. This is a convenience property, since opacity can
 *     be defined in the color.

 * @param {ColorSpec|Object} [options.line] The line color or a line
 *     object literal.
 * @param {Number} [options.line.width] The line width.
 * @param {ColorSpec} [options.line.color] The line color.
 * @param {ColorSpec} [options.icon.opacity] The opacity of the line,
 *     between 0.0 and 1.0. This is a convenience property, since opacity can
 *     be defined in the color.

 * @param {ColorSpec|Object} [options.poly] The polygon color or a polygon style
 *     object literal.
 * @param {Boolean} [options.poly.fill] Whether or not the polygon will be
 *     filled.
 * @param {Boolean} [options.poly.outline] Whether or not the polygon will have
 *     an outline.
 * @param {ColorSpec} [options.poly.color] The color of the polygon fill.
 * @param {ColorSpec} [options.icon.opacity] The opacity of the polygon,
 *     between 0.0 and 1.0. This is a convenience property, since opacity can
 *     be defined in the color.

 * @param {ColorSpec|Object} [options.balloon] The balloon bgColor or a balloon
 *     style object literal.
 * @param {Boolean} [options.balloon.bgColor] The balloon background color.
 * @param {Boolean} [options.balloon.textColor] The balloon text color.
 * @param {String} [options.balloon.text] The balloon text template.

 * @type KmlStyle
 */
GEarthExtensions.prototype.dom.buildStyle = domBuilder_({
  apiInterface: ['KmlStyle', 'KmlStyleMap'],
  apiFactoryFn: 'createStyle',
  propertySpec: {
    icon: ALLOWED_,
    label: ALLOWED_,
    line: ALLOWED_,
    poly: ALLOWED_,
    balloon: ALLOWED_
  },
  constructor: function(styleObj, options) {
    // set icon style
    var pad2 = function(s) {
      return ((s.length < 2) ? '0' : '') + s;
    };
    
    var me = this;
    
    var mergeColorOpacity_ = function(color, opacity) {
      color = color ? me.util.parseColor(color) : 'ffffffff';
      if (!geo.util.isUndefined(opacity)) {
        color = pad2(Math.floor(255 * opacity).toString(16)) +
            color.substring(2);
      }
      
      return color;
    };
    
    if (options.icon) {
      var iconStyle = styleObj.getIconStyle();

      if (typeof options.icon == 'string') {
        options.icon = { href: options.icon };
      }
    
      var icon = this.pluginInstance.createIcon('');
      iconStyle.setIcon(icon);
    
      // more options
      if ('href' in options.icon) {
        icon.setHref(options.icon.href);
      } else if ('stockIcon' in options.icon) {
        icon.setHref(document.location.href.replace(/\/[^\/]*$/, '/') + 'images/' +
            options.icon.stockIcon + '.png');
      } else {
        // use default icon href
        icon.setHref(document.location.href.replace(/\/[^\/]*$/, '/') + 'images/wht-blank.png');
        iconStyle.getHotSpot().set(0.5, this.pluginInstance.UNITS_FRACTION,
            0, this.pluginInstance.UNITS_FRACTION);
      }
      if ('scale' in options.icon) {
        iconStyle.setScale(options.icon.scale);
      }
      if ('heading' in options.icon) {
        iconStyle.setHeading(options.icon.heading);
      }
      if ('color' in options.icon || 'opacity' in options.icon) {
        options.icon.color = mergeColorOpacity_(options.icon.color,
                                                options.icon.opacity);
        iconStyle.getColor().set(options.icon.color);
      }
      if ('opacity' in options.icon) {
        if (!('color' in options.icon)) {
          options.icon.color = 'ffffffff';
        }
        
        options.icon.color = pad2(options.icon.opacity.toString(16)) +
            options.icon.color.substring(2);
      }
      if ('hotSpot' in options.icon) {
        this.dom.setVec2(iconStyle.getHotSpot(), options.icon.hotSpot);
      }
      // TODO: colormode
    }
  
    // set label style
    if (options.label) {
      var labelStyle = styleObj.getLabelStyle();
    
      if (typeof options.label == 'string') {
        options.label = { color: options.label };
      }
    
      // more options
      if ('scale' in options.label) {
        labelStyle.setScale(options.label.scale);
      }
      if ('color' in options.label || 'opacity' in options.label) {
        options.label.color = mergeColorOpacity_(options.label.color,
                                                 options.label.opacity);
        labelStyle.getColor().set(options.label.color);
      }
      // TODO: add colormode
    }
  
    // set line style
    if (options.line) {
      var lineStyle = styleObj.getLineStyle();
    
      if (typeof options.line == 'string') {
        options.line = { color: options.line };
      }
  
      // more options
      if ('width' in options.line) {
        lineStyle.setWidth(options.line.width);
      }
      if ('color' in options.line || 'opacity' in options.line) {
        options.line.color = mergeColorOpacity_(options.line.color,
                                                options.line.opacity);
        lineStyle.getColor().set(options.line.color);
      }
      // TODO: add colormode
    }
  
    // set poly style
    if (options.poly) {
      var polyStyle = styleObj.getPolyStyle();
    
      if (typeof options.poly == 'string') {
        options.poly = { color: options.poly };
      }
    
      // more options
      if ('fill' in options.poly) {
        polyStyle.setFill(options.poly.fill);
      }
      if ('outline' in options.poly) {
        polyStyle.setOutline(options.poly.outline);
      }
      if ('color' in options.poly || 'opacity' in options.poly) {
        options.poly.color = mergeColorOpacity_(options.poly.color,
                                                options.poly.opacity);
        polyStyle.getColor().set(options.poly.color);
      }
      // TODO: add colormode
    }
    
    // set balloon style
    if (options.balloon) {
      var balloonStyle = styleObj.getBalloonStyle();
    
      if (typeof options.balloon == 'string') {
        options.balloon = { bgColor: options.balloon };
      }
    
      // more options
      if ('bgColor' in options.balloon) {
        balloonStyle.getBgColor().set(
            me.util.parseColor(options.balloon.bgColor));
      }
      if ('textColor' in options.balloon) {
        balloonStyle.getTextColor().set(
            me.util.parseColor(options.balloon.textColor));
      }
      if ('text' in options.balloon) {
        balloonStyle.setText(options.balloon.text);
      }
    }
  }
});
// TODO: unit tests
/**
 * Removes all top-level features from the Earth object's DOM.
 */
GEarthExtensions.prototype.dom.clearFeatures = function() {
  var featureContainer = this.pluginInstance.getFeatures();
  var c;
  while ((c = featureContainer.getLastChild()) !== null) {
    featureContainer.removeChild(c);
  }
};

/**
 * Walks a KML object, calling a given visit function for each object in
 * the KML DOM. The lone argument must be either a visit function or an
 * options literal.
 * 
 * NOTE: walking the DOM can have pretty poor performance on very large
 * hierarchies, as first time accesses to KML objects from JavaScript
 * incur some overhead in the API.
 * 
 * @param {Object} [options] The walk options:
 * @param {Function} options.visitCallback The function to call upon visiting
 *     a node in the DOM. The 'this' variable in the callback function will be
 *     bound to the object being visited. The lone argument passed to this
 *     function will be an object literal for the call context. To get the
 *     current application-specific call context, use the 'current' property
 *     of the context object. To set the context for all child calls, set the
 *     'child' property of the context object.To prevent walking the children
 *     of the current object, set the 'walkChildren' property of the context
 *     object to false. To stop the walking process altogether,
 *     return false in the function.
 * @param {KmlObject} [options.rootObject] The root of the KML object hierarchy
 *     to walk. The default is to walk the entire Earth Plugin DOM.
 * @param {Boolean} [options.features=true] Descend into feature containers?
 * @param {Boolean} [options.geometries=false] Descend into geometry containers?
 * @param {Object} [options.rootContext] The application-specific context to
 *     pass to the root item.
 */
GEarthExtensions.prototype.dom.walk = function() {
  var options;
  
  // figure out the arguments
  if (arguments.length == 1) {
    if (geo.util.isObjectLiteral(arguments[0])) {
      // object literal only
      options = arguments[0];
    } else if (geo.util.isFunction(arguments[0])) {
      // callback function only
      options = { visitCallback: arguments[0] };
    } else {
      throw new TypeError('walk requires a visit callback function or ' +
                          'options literal as a first parameter');
    }
  } else {
    throw new Error('walk takes at most 1 arguments');
  }
  
  options = checkParameters_(options, false, {
    visitCallback: REQUIRED_,
    features: true,
    geometries: false,
    rootObject: this.pluginInstance,
    rootContext: ALLOWED_
  });
  
  var recurse_ = function(object, currentContext) {
    var contextArgument = {
      current: currentContext,
      child: currentContext,
      walkChildren: true
    };
    
    // walk object
    var retValue = options.visitCallback.call(object, contextArgument);
    if (!retValue && !geo.util.isUndefined(retValue)) {
      return false;
    }
    
    if (!contextArgument.walkChildren) {
      return true;
    }
    
    var objectContainer = null; // GESchemaObjectContainer
    
    // check if object is a parent
    if ('getFeatures' in object) { // GEFeatureContainer
      if (options.features) {
        objectContainer = object.getFeatures();
      }
    } else if ('getGeometry' in object) { // KmlFeature - descend into
                                          // contained geometry
      if (options.geometries && object.getGeometry()) {
        recurse_(object.getGeometry(), contextArgument.child);
      }
    } else if ('getGeometries' in object) { // GEGeometryContainer
      if (options.geometries) {
        objectContainer = object.getGeometries();
      }
    } else if ('getOuterBoundary' in object) { // KmlPolygon - descend into
                                               // outer boundary
      if (options.geometries && object.getOuterBoundary()) {
        recurse_(object.getOuterBoundary(), contextArgument.child);
        objectContainer = object.getInnerBoundaries(); // GELinearRingContainer
      }
    }
    
    // iterate through children if object is a parent and recurse so they
    // can be walked
    if (objectContainer && objectContainer.hasChildNodes()) {
      var childNodes = objectContainer.getChildNodes();
      var numChildNodes = childNodes.getLength();
      
      for (var i = 0; i < numChildNodes; i++) {
        var child = childNodes.item(i);
        
        if (!recurse_(child, contextArgument.child)) {
          return false;
        }
      }
    }
    
    return true;
  };
  
  if (options.rootObject) {
    recurse_(options.rootObject, options.rootContext);
  }
};

/**
 * Gets the object in the Earth DOM with the given id.
 * @param {String} id The id of the object to retrieve.
 * @param {Object} [options] An options literal.
 * @param {Boolean} [options.recursive=true] Whether or not to walk the entire
 *     object (true) or just its immediate children (false).
 * @param {KmlObject} [options.rootObject] The root of the KML object hierarchy
 *     to search. The default is to search the entire Earth Plugin DOM.
 * @return Returns the object with the given id, or null if it was not found.
 */
GEarthExtensions.prototype.dom.getObjectById = function(id, options) {
  options = checkParameters_(options, false, {
    recursive: true,
    rootObject: this.pluginInstance
  });
  
  // check self
  if ('getId' in options.rootObject && options.rootObject.getId() == id) {
    return options.rootObject;
  }
  
  var returnObject = null;
  
  this.dom.walk({
    rootObject: options.rootObject,
    features: true,
    geometries: true,
    visitCallback: function() {
      if ('getId' in this && this.getId() == id) {
        returnObject = this;
        return false; // stop walk
      }
    }
  });

  return returnObject;
};
// TODO: unit test

/**
 * Removes the given object from the Earth object's DOM.
 * @param {KmlObject} object The object to remove.
 */
GEarthExtensions.prototype.dom.removeObject = function(object) {
  if (!object) {
    return;
  }

  var parent = object.getParentNode();
  if (!parent) {
    throw new Error('Cannot remove an object without a parent.');
  }

  var objectContainer = null; // GESchemaObjectContainer
  
  if ('getFeatures' in parent) { // GEFeatureContainer
    objectContainer = parent.getFeatures();
  } else if ('getGeometries' in parent) { // GEGeometryContainer
    objectContainer = parent.getGeometries();
  } else if ('getInnerBoundaries' in parent) { // GELinearRingContainer
    objectContainer = parent.getInnerBoundaries();
  }
  
  objectContainer.removeChild(object);
};
// TODO: unit test (heavily)

/**
 * Sets the given KmlVec2 object to the point defined in the options.
 * @param {KmlVec2} vec2 The object to set, for example a screen overlay's
 *     screenXY.
 * @param {Object|KmlVec2} options The options literal defining the point, or
 *     an existing KmlVec2 object to copy.
 * @param {Number|String} [options.left] The left offset, in pixels (i.e. 5),
 *     or as a percentage (i.e. '25%').
 * @param {Number|String} [options.top] The top offset, in pixels or a string
 *     percentage.
 * @param {Number|String} [options.right] The right offset, in pixels or a
 *     string percentage.
 * @param {Number|String} [options.bottom] The bottom offset, in pixels or a
 *     string percentage.
 * @param {Number|String} [options.width] A convenience parameter specifying
 *     width, only useful for screen overlays, in pixels or a string percentage.
 * @param {Number|String} [options.height] A convenience parameter specifying
 *     height, only useful for screen overlays, in pixels or a string
 *     percentage.
 */
GEarthExtensions.prototype.dom.setVec2 = function(vec2, options) {
  if ('getType' in options && options.getType() == 'KmlVec2') {
    vec2.set(options.getX(), options.getXUnits(),
             options.getY(), options.getYUnits());
    return;
  }
  
  options = checkParameters_(options, false, {
    left: ALLOWED_,
    top: ALLOWED_,
    right: ALLOWED_,
    bottom: ALLOWED_,
    width: ALLOWED_, // for screen overlay size
    height: ALLOWED_ // for screen overlay size
  });
  
  if ('width' in options) {
    options.left = options.width;
  }
  
  if ('height' in options) {
    options.bottom = options.height;
  }
  
  var x = 0.0;
  var xUnits = this.pluginInstance.UNITS_PIXELS;
  var y = 0.0;
  var yUnits = this.pluginInstance.UNITS_PIXELS;
  
  // set X (origin = left)
  if ('left' in options) {
    if (typeof options.left == 'number') {
      x = options.left;
    } else if (typeof options.left == 'string' &&
               options.left.charAt(options.left.length - 1) == '%') {
      x = parseFloat(options.left) / 100;
      xUnits = this.pluginInstance.UNITS_FRACTION;
    } else {
      throw new TypeError('left must be a number or string indicating a ' +
                          'percentage');
    }
  } else if ('right' in options) {
    if (typeof options.right == 'number') {
      x = options.right;
      xUnits = this.pluginInstance.UNITS_INSET_PIXELS;
    } else if (typeof options.right == 'string' &&
               options.right.charAt(options.right.length - 1) == '%') {
      x = 1.0 - parseFloat(options.right) / 100;
      xUnits = this.pluginInstance.UNITS_FRACTION;
    } else {
      throw new TypeError('right must be a number or string indicating a ' +
                          'percentage');
    }
  }
  
  // set Y (origin = bottom)
  if ('bottom' in options) {
    if (typeof options.bottom == 'number') {
      y = options.bottom;
    } else if (typeof options.bottom == 'string' &&
               options.bottom.charAt(options.bottom.length - 1) == '%') {
      y = parseFloat(options.bottom) / 100;
      yUnits = this.pluginInstance.UNITS_FRACTION;
    } else {
      throw new TypeError('bottom must be a number or string indicating a ' +
                          'percentage');
    }
  } else if ('top' in options) {
    if (typeof options.top == 'number') {
      y = options.top;
      yUnits = this.pluginInstance.UNITS_INSET_PIXELS;
    } else if (typeof options.top == 'string' &&
               options.top.charAt(options.top.length - 1) == '%') {
      y = 1.0 - parseFloat(options.top) / 100;
      yUnits = this.pluginInstance.UNITS_FRACTION;
    } else {
      throw new TypeError('top must be a number or string indicating a ' +
                          'percentage');
    }
  }
  
  vec2.set(x, xUnits, y, yUnits);
};

/**
 * Computes the latitude/longitude bounding box for the given object.
 * Note that this method walks the object's DOM, so may have poor performance
 * for large objects.
 * @param {KmlFeature|KmlGeometry} object The feature or geometry whose bounds
 *     should be computed.
 * @type geo.Bounds
 */
GEarthExtensions.prototype.dom.computeBounds = function(object) {
  var bounds = new geo.Bounds();
  
  // Walk the object's DOM, extending the bounds as coordinates are
  // encountered.
  this.dom.walk({
    rootObject: object,
    features: true,
    geometries: true,
    visitCallback: function() {
      if ('getType' in this) {
        var type = this.getType();
        switch (type) {
          case 'KmlGroundOverlay':
            var llb = this.getLatLonBox();
            if (llb) {
              var alt = this.getAltitude();
              bounds.extend(new geo.Point(llb.getNorth(), llb.getEast(), alt));
              bounds.extend(new geo.Point(llb.getNorth(), llb.getWest(), alt));
              bounds.extend(new geo.Point(llb.getSouth(), llb.getEast(), alt));
              bounds.extend(new geo.Point(llb.getSouth(), llb.getWest(), alt));
              // TODO: factor in rotation
            }
            break;
          
          case 'KmlModel':
            bounds.extend(new geo.Point(this.getLocation()));
            break;
        
          case 'KmlLinearRing':
          case 'KmlLineString':
            var coords = this.getCoordinates();
            if (coords) {
              var n = coords.getLength();
              for (var i = 0; i < n; i++) {
                bounds.extend(new geo.Point(coords.get(i)));
              }
            }
            break;

          case 'KmlCoord': // coordinates
          case 'KmlLocation': // models
          case 'KmlPoint': // points
            bounds.extend(new geo.Point(this));
            break;
        }
      }
    }
  });
  
  return bounds;
};
/**
 * Creates a new lookat object with the given parameters.
 * @function
 * @param {PointSpec} [point] The point to look at.
 * @param {Object} options The parameters of the lookat object to create.
 * @param {PointSpec} options.point The point to look at.
 * @param {Boolean} [options.copy=false] Whether or not to copy parameters from
 *     the existing view if they aren't explicitly specified in the options.
 * @param {Number} [options.heading] The lookat heading/direction.
 * @param {Number} [options.tilt] The lookat tilt.
 * @param {Number} [options.range] The range of the camera (distance from the
 *     lookat point).
 * @type KmlLookAt
 */
GEarthExtensions.prototype.dom.buildLookAt = domBuilder_({
  apiInterface: 'KmlLookAt',
  apiFactoryFn: 'createLookAt',
  defaultProperty: 'point',
  propertySpec: {
    copy: false,
    point: REQUIRED_,
    heading: ALLOWED_,
    tilt: ALLOWED_,
    range: ALLOWED_
  },
  constructor: function(lookAtObj, options) {
    var point = new geo.Point(options.point);
  
    var defaults = {
      heading: 0,
      tilt: 0,
      range: 1000
    };
  
    if (options.copy) {
      var currentLookAt = this.util.getLookAt(defaults.altitudeMode);
      defaults.heading = currentLookAt.getHeading();
      defaults.tilt = currentLookAt.getTilt();
      defaults.range = currentLookAt.getRange();
    }
  
    options = checkParameters_(options, true, defaults);
  
    lookAtObj.set(
        point.lat(),
        point.lng(),
        point.altitude(),
        point.altitudeMode(),
        options.heading,
        options.tilt,
        options.range);
  }
});
// TODO: incrementLookAt

/**
 * Creates a new camera object with the given parameters.
 * @function
 * @param {PointSpec} [point] The point at which to place the camera.
 * @param {Object} options The parameters of the camera object to create.
 * @param {PointSpec} options.point The point at which to place the camera.
 * @param {Boolean} [options.copy=false] Whether or not to copy parameters from
 *     the existing view if they aren't explicitly specified in the options.
 * @param {Number} [options.heading] The camera heading/direction.
 * @param {Number} [options.tilt] The camera tilt.
 * @param {Number} [options.range] The camera roll.
 * @type KmlCamera
 */
GEarthExtensions.prototype.dom.buildCamera = domBuilder_({
  apiInterface: 'KmlCamera',
  apiFactoryFn: 'createCamera',
  defaultProperty: 'point',
  propertySpec: {
    copy: false,
    point: REQUIRED_,
    heading: ALLOWED_,
    tilt: ALLOWED_,
    roll: ALLOWED_
  },
  constructor: function(cameraObj, options) {
    var point = new geo.Point(options.point);
  
    var defaults = {
      heading: 0,
      tilt: 0,
      roll: 0
    };
  
    if (options.copy) {
      var currentCamera = this.util.getCamera(defaults.altitudeMode);
      defaults.heading = currentCamera.getHeading();
      defaults.tilt = currentCamera.getTilt();
      defaults.roll = currentCamera.getRoll();
    }
  
    options = checkParameters_(options, true, defaults);
  
    cameraObj.set(
        point.lat(),
        point.lng(),
        point.altitude(),
        point.altitudeMode(),
        options.heading,
        options.tilt,
        options.roll);
  }
});
// TODO: incrementLookAt
/**
 * Contains methods for allowing user-interactive editing of features inside
 * the Google Earth Plugin.
 * @namespace
 */
GEarthExtensions.prototype.edit = {isnamespace_:true};
var DRAGDATA_JSDATA_KEY = '_GEarthExtensions_dragData';

// NOTE: this is shared across all GEarthExtensions instances
var currentDragContext_ = null;

function beginDragging_(extInstance, placemark) {
  // get placemark's drag data
  var placemarkDragData = extInstance.util.getJsDataValue(
      placemark, DRAGDATA_JSDATA_KEY) || {};

  currentDragContext_ = {
    placemark: placemark,
    startAltitude: placemark.getGeometry().getAltitude(),
    draggableOptions: placemarkDragData.draggableOptions,
    dragged: false
  };
}

function makeMouseMoveListener_(extInstance) {
  return function(event) {
    if (currentDragContext_) {
      event.preventDefault();

      if (!event.getDidHitGlobe()) {
        return;
      }
      
      if (!currentDragContext_.dragged) {
        currentDragContext_.dragged = true;

        // set dragging style
        if (currentDragContext_.draggableOptions.draggingStyle) {
          currentDragContext_.oldStyle =
              currentDragContext_.placemark.getStyleSelector();
          currentDragContext_.placemark.setStyleSelector(
              extInstance.dom.buildStyle(
              currentDragContext_.draggableOptions.draggingStyle));
        }

        // animate
        if (currentDragContext_.draggableOptions.bounce) {
          extInstance.fx.cancel(currentDragContext_.placemark);
          extInstance.fx.bounce(currentDragContext_.placemark, {
            phase: 1
          });
        }

        // show 'target' screen overlay (will be correctly positioned
        // later)
        if (currentDragContext_.draggableOptions.targetScreenOverlay) {
          var overlay = extInstance.dom.buildScreenOverlay(
              currentDragContext_.draggableOptions.targetScreenOverlay);
          extInstance.pluginInstance.getFeatures().appendChild(overlay);
          currentDragContext_.activeTargetScreenOverlay = overlay;
        }
      }

      // move 'target' screen overlay
      if (currentDragContext_.activeTargetScreenOverlay) {
        // NOTE: overlayXY but we really are setting the screenXY due to
        // the two being swapped in the Earth API
        extInstance.dom.setVec2(
            currentDragContext_.activeTargetScreenOverlay.getOverlayXY(),
            { left: event.getClientX(), top: event.getClientY() });
      }

      // TODO: allow for non-point dragging (models?)
      var point = currentDragContext_.placemark.getGeometry();
      point.setLatitude(event.getLatitude());
      point.setLongitude(event.getLongitude());
      
      // show the placemark
      currentDragContext_.placemark.setVisibility(true);

      if (currentDragContext_.draggableOptions.dragCallback) {
        currentDragContext_.draggableOptions.dragCallback.call(
            currentDragContext_.placemark);
      }
    }
  };
}

function stopDragging_(extInstance, abort) {
  if (currentDragContext_) {
    if (currentDragContext_.dragged) {
      // unset dragging style
      if (currentDragContext_.oldStyle) {
        currentDragContext_.placemark.setStyleSelector(
            currentDragContext_.oldStyle);
        delete currentDragContext_.oldStyle;
      }

      // remove 'target' screen overlay
      if (currentDragContext_.activeTargetScreenOverlay) {
        extInstance.pluginInstance.getFeatures().removeChild(
            currentDragContext_.activeTargetScreenOverlay);
        delete currentDragContext_.activeTargetScreenOverlay;
      }

      // animate
      if (currentDragContext_.draggableOptions.bounce) {
        extInstance.fx.cancel(currentDragContext_.placemark);
        extInstance.fx.bounce(currentDragContext_.placemark, {
          startAltitude: currentDragContext_.startAltitude,
          phase: 2,
          repeat: 1,
          dampen: 0.3
        });
      }
    }
    
    // in case the drop callback does something with dragging, don't
    // mess with the global currentDragContext_ variable after the drop
    // callback returns
    var dragContext_ = currentDragContext_;
    currentDragContext_ = null;

    if (dragContext_.dragged &&
        dragContext_.draggableOptions.dropCallback && !abort) {
      dragContext_.draggableOptions.dropCallback.call(
          dragContext_.placemark);
    }
  }
}

/**
 * Turns on draggability for the given point placemark.
 * @param {KmlPlacemark} placemark The point placemark to enable dragging on.
 * @param {Object} [options] The draggable options.
 * @param {Boolean} [options.bounce=true] Whether or not to bounce up upon
 *     dragging and bounce back down upon dropping.
 * @param {Function} [options.dragCallback] A callback function to fire
 *     continuously while dragging occurs.
 * @param {Function} [options.dropCallback] A callback function to fire
 *     once the placemark is successfully dropped.
 * @param {StyleOptions|KmlStyle} [options.draggingStyle] The style options
 *     to apply to the placemark while dragging.
 * @param {ScreenOverlayOptions|KmlScreenOverlay} [options.targetScreenOverlay]
 *     A screen overlay to use as a drop target indicator (i.e. a bullseye)
 *     while dragging.
 */
GEarthExtensions.prototype.edit.makeDraggable = function(placemark, options) {
  this.edit.endDraggable(placemark);

  // TODO: assert this is a point placemark
  options = checkParameters_(options, false, {
    bounce: true,
    dragCallback: ALLOWED_,
    dropCallback: ALLOWED_,
    draggingStyle: ALLOWED_,
    targetScreenOverlay: ALLOWED_
  });

  var me = this;

  // create a mouse move listener for use once dragging has begun
  var mouseMoveListener = makeMouseMoveListener_(me);

  // create a mouse up listener for use once dragging has begun
  var mouseUpListener;
  mouseUpListener = function(event) {
    if (currentDragContext_ && event.getButton() === 0) {
      // remove listener for mousemove on the globe
      google.earth.removeEventListener(me.pluginInstance.getWindow(),
          'mousemove', mouseMoveListener);

      // remove listener for mouseup on the window
      google.earth.removeEventListener(me.pluginInstance.getWindow(),
          'mouseup', mouseUpListener);

      if (currentDragContext_.dragged) {
        // if the placemark was dragged, prevent balloons from popping up
        event.preventDefault();
      }

      stopDragging_(me);
    }
  };

  // create a mouse down listener
  var mouseDownListener = function(event) {
    if (event.getButton() === 0) {
      // TODO: check if getTarget() is draggable and is a placemark
      beginDragging_(me, event.getTarget());

      // listen for mousemove on the globe
      google.earth.addEventListener(me.pluginInstance.getWindow(),
          'mousemove', mouseMoveListener);

      // listen for mouseup on the window
      google.earth.addEventListener(me.pluginInstance.getWindow(),
          'mouseup', mouseUpListener);
    }
  };

  // persist drag options for use in listeners
  this.util.setJsDataValue(placemark, DRAGDATA_JSDATA_KEY, {
    draggableOptions: options,
    abortAndEndFn: function() {
      if (currentDragContext_ &&
          currentDragContext_.placemark.equals(placemark)) {
        // remove listener for mousemove on the globe
        google.earth.removeEventListener(me.pluginInstance.getWindow(),
            'mousemove', mouseMoveListener);

        // remove listener for mouseup on the window
        google.earth.removeEventListener(me.pluginInstance.getWindow(),
            'mouseup', mouseUpListener);

        stopDragging_(me, true); // abort
      }

      google.earth.removeEventListener(placemark, 'mousedown',
          mouseDownListener);
    }
  });

  // listen for mousedown on the placemark
  google.earth.addEventListener(placemark, 'mousedown', mouseDownListener);
};

/**
 * Ceases the draggability of the given placemark. If the placemark is in the
 * process of being placed via GEarthExtensions#edit.place, the placement
 * is cancelled.
 */
GEarthExtensions.prototype.edit.endDraggable = function(placemark) {
  // get placemark's drag data
  var placemarkDragData = this.util.getJsDataValue(
      placemark, DRAGDATA_JSDATA_KEY);

  // stop listening for mousedown on the window
  if (placemarkDragData) {
    placemarkDragData.abortAndEndFn.call(null);

    this.util.clearJsDataValue(placemark, DRAGDATA_JSDATA_KEY);
  }
};

/**
 * Enters a mode in which the user can place the given point placemark onto
 * the globe by clicking on the globe. To cancel the placement, use
 * GEarthExtensions#edit.endDraggable.
 * @param {KmlPlacemark} placemark The point placemark for the user to place
 *     onto the globe.
 * @param {Object} [options] The draggable options. See
 *     GEarthExtensions#edit.makeDraggable.
 */
GEarthExtensions.prototype.edit.place = function(placemark, options) {
  // TODO: assert this is a point placemark
  options = checkParameters_(options, false, {
    bounce: true,
    dragCallback: ALLOWED_,
    dropCallback: ALLOWED_,
    draggingStyle: ALLOWED_,
    targetScreenOverlay: ALLOWED_
  });

  var me = this;

  // create a mouse move listener
  var mouseMoveListener = makeMouseMoveListener_(me);
  
  // hide the placemark initially
  placemark.setVisibility(false);

  // create a mouse down listener
  var mouseDownListener;
  mouseDownListener = function(event) {
    if (currentDragContext_ && event.getButton() === 0) {
      event.preventDefault();
      event.stopPropagation();
      
      // remove listener for mousemove on the globe
      google.earth.removeEventListener(me.pluginInstance.getWindow(),
          'mousemove', mouseMoveListener);

      // remove listener for mousedown on the window
      google.earth.removeEventListener(me.pluginInstance.getWindow(),
          'mousedown', mouseDownListener);

      stopDragging_(me);
    }
  };

  // persist drag options for use in listeners
  this.util.setJsDataValue(placemark, DRAGDATA_JSDATA_KEY, {
    draggableOptions: options,
    abortAndEndFn: function() {
      if (currentDragContext_ &&
          currentDragContext_.placemark.equals(placemark)) {
        // remove listener for mousemove on the globe
        google.earth.removeEventListener(me.pluginInstance.getWindow(),
            'mousemove', mouseMoveListener);

        // remove listener for mousedown on the window
        google.earth.removeEventListener(me.pluginInstance.getWindow(),
            'mousedown', mouseDownListener);

        stopDragging_(me, true); // abort
      }
    }
  });

  // enter dragging mode right away to 'place' the placemark on the globe
  beginDragging_(me, placemark);

  // listen for mousemove on the window
  google.earth.addEventListener(me.pluginInstance.getWindow(),
      'mousemove', mouseMoveListener);

  // listen for mousedown on the window
  google.earth.addEventListener(me.pluginInstance.getWindow(),
      'mousedown', mouseDownListener);
};
var LINESTRINGEDITDATA_JSDATA_KEY = '_GEarthExtensions_lineStringEditData';
var LINESTRING_COORD_ICON = document.location.href.replace(/\/[^\/]*$/, '/') + 'images/placemark_circle.png';
var LINESTRING_COORD_ICON_SCALE = 0.85;
var LINESTRING_MIDPOINT_ICON_SCALE = 0.6;

function coordsEqual_(coord1, coord2) {
  return coord1.getLatitude() ==  coord2.getLatitude() &&
         coord1.getLongitude() == coord2.getLongitude() &&
         coord1.getAltitude() == coord2.getAltitude();
}

/**
 * Enters a mode in which the user can draw the given line string geometry
 * on the globe by clicking on the globe to create coordinates.
 * To cancel the placement, use GEarthExtensions#edit.endEditLineString.
 * This is similar in intended usage to GEarthExtensions#edit.place.
 * @param {KmlLineString|KmlLinearRing} lineString The line string geometry
 *     to allow the user to draw (or append points to).
 * @param {Object} [options] The edit options.
 * @param {Boolean} [options.bounce=true] Whether or not to enable bounce
 *     effects while drawing coordinates.
 * @param {Function} [options.drawCallback] A callback to fire when new
 *     vertices are drawn. The only argument passed will be the index of the
 *     new coordinate (it can either be prepended or appended, depending on
 *     whether or not ensuring counter-clockwisedness).
 * @param {Function} [options.finishCallback] A callback to fire when drawing
 *     is successfully completed (via double click or by clicking on the first
 *     coordinate again).
 * @param {Boolean} [options.ensureCounterClockwise=true] Whether or not to
 *     automatically keep polygon coordinates in counter clockwise order.
 */
GEarthExtensions.prototype.edit.drawLineString = function(lineString,
                                                          options) {
  options = checkParameters_(options, false, {
    bounce: true,
    drawCallback: ALLOWED_,
    finishCallback: ALLOWED_,
    ensureCounterClockwise: true
  });
  
  var lineStringEditData = this.util.getJsDataValue(
      lineString, LINESTRINGEDITDATA_JSDATA_KEY) || {};
  if (lineStringEditData) {
    this.edit.endEditLineString(lineString);
  }
  
  var me = this;

  // TODO: options: icon for placemarks

  // used to ensure counterclockwise-ness
  var isReverse = false;
  var tempPoly = new geo.Polygon();
  
  var done = false;
  var placemarks = [];
  var altitudeMode = lineString.getAltitudeMode();
  var headPlacemark = null;
  var isRing = (lineString.getType() == 'KmlLinearRing');
  var coords = lineString.getCoordinates();
  var innerDoc = this.pluginInstance.parseKml([
      '<Document>',
      '<Style id="_GEarthExtensions_regularCoordinate"><IconStyle>',
      '<Icon><href>', LINESTRING_COORD_ICON, '</href></Icon>',
      '<scale>', LINESTRING_COORD_ICON_SCALE, '</scale></IconStyle></Style>',
      '<Style id="_GEarthExtensions_firstCoordinateHighlight"><IconStyle>',
      '<Icon><href>', LINESTRING_COORD_ICON, '</href></Icon>',
      '<scale>', LINESTRING_COORD_ICON_SCALE * 1.3, '</scale>',
      '<color>ff00ff00</color></IconStyle></Style>',
      '<StyleMap id="_GEarthExtensions_firstCoordinate">',
      '<Pair><key>normal</key>',
      '<styleUrl>#_GEarthExtensions_regularCoordinate</styleUrl>',
      '</Pair><Pair><key>highlight</key>',
      '<styleUrl>#_GEarthExtensions_firstCoordinateHighlight</styleUrl>',
      '</Pair></StyleMap>',
      '</Document>'].join(''));

  var finishListener;
  
  var endFunction = function(abort) {
    google.earth.removeEventListener(me.pluginInstance.getWindow(),
        'dblclick', finishListener);
    
    // duplicate the first coordinate to the end if necessary
    var numCoords = coords.getLength();
    if (numCoords && isRing) {
      var firstCoord = coords.get(0);
      var lastCoord = coords.get(numCoords - 1);
      if (!coordsEqual_(firstCoord, lastCoord)) {
        coords.pushLatLngAlt(firstCoord.getLatitude(),
                             firstCoord.getLongitude(),
                             firstCoord.getAltitude());
      }
    }

    me.edit.endDraggable(headPlacemark);
    me.dom.removeObject(innerDoc);
    me.util.clearJsDataValue(lineString, LINESTRINGEDITDATA_JSDATA_KEY);
    placemarks = [];
    done = true;

    if (options.finishCallback && !abort) {
      options.finishCallback.call(null);
    }
  };
  
  finishListener = function(event) {
    event.preventDefault();
    endFunction.call(null);
  };
  
  var drawNext;
  drawNext = function() {
    headPlacemark = me.dom.buildPointPlacemark([0, 0], {
      altitudeMode: altitudeMode,
      style: '#_GEarthExtensions_regularCoordinate',
      visibility: false  // start out invisible
    });
    innerDoc.getFeatures().appendChild(headPlacemark);
    if (isReverse) {
      placemarks.unshift(headPlacemark);
    } else {
      placemarks.push(headPlacemark);
    }

    me.edit.place(headPlacemark, {
      bounce: options.bounce,
      dropCallback: function() {
        if (!done) {
          var coord = [headPlacemark.getGeometry().getLatitude(),
                       headPlacemark.getGeometry().getLongitude(),
                       0]; // don't use altitude because of bounce
          if (isReverse) {
            coords.unshiftLatLngAlt(coord[0], coord[1], coord[2]);
          } else {
            coords.pushLatLngAlt(coord[0], coord[1], coord[2]);
          }
          
          // ensure counterclockwise-ness
          if (options.ensureCounterClockwise) {
            if (isReverse) {
              tempPoly.outerBoundary().prepend(coord);
            } else {
              tempPoly.outerBoundary().append(coord);
            }
            
            if (!tempPoly.isCounterClockwise()) {
              tempPoly.outerBoundary().reverse();
              coords.reverse();
              isReverse = !isReverse;
            }
          }
              
          if (options.drawCallback) {
            options.drawCallback.call(null,
                isReverse ? 0 : coords.getLength() - 1);
          }

          if (placemarks.length == 1) {
            // set up a click listener on the first placemark -- if it gets
            // clicked, repeat the first coordinate and stop drawing the
            // linestring
            placemarks[0].setStyleUrl('#_GEarthExtensions_firstCoordinate');
            google.earth.addEventListener(placemarks[0], 'mousedown',
                function(firstCoord) {
                  return function(event) {
                    if (isReverse) {
                      coords.unshiftLatLngAlt(firstCoord[0], firstCoord[1],
                                              firstCoord[2]);
                    } else {
                      coords.pushLatLngAlt(firstCoord[0], firstCoord[1],
                                           firstCoord[2]);
                    }
                  
                    finishListener(event);
                  };
                }(coord));
          }

          //setTimeout(drawNext, 0);
          drawNext(); // firefox breaks if drawNext called in timeout
        }
      }
    });
  };

  drawNext.call(null);
  
  google.earth.addEventListener(me.pluginInstance.getWindow(), 'dblclick',
      finishListener);

  // display the editing UI
  this.pluginInstance.getFeatures().appendChild(innerDoc);

  // set up an abort function for use in endEditLineString
  this.util.setJsDataValue(lineString, LINESTRINGEDITDATA_JSDATA_KEY, {
    abortAndEndFn: function() {
      endFunction.call(null, true); // abort
    }
  });
};
// TODO: interactive test

/**
 * Allows the user to edit the coordinates of the given line string by
 * dragging existing points, splitting path segments/creating new points or
 * deleting existing points.
 * @param {KmlLineString|KmlLinearRing} lineString The line string or lienar
 *     ring geometry to edit. For KmlPolygon geometries, pass in an outer
 *     or inner boundary.
 * @param {Object} [options] The line string edit options.
 * @param {Function} [options.editCallback] A callback function to fire
 *     when the line string coordinates have changed due to user interaction.
 */
GEarthExtensions.prototype.edit.editLineString = function(lineString,
                                                          options) {
  options = checkParameters_(options, false, {
    editCallback: ALLOWED_
  });
  
  var lineStringEditData = this.util.getJsDataValue(
      lineString, LINESTRINGEDITDATA_JSDATA_KEY) || {};
  if (lineStringEditData) {
    this.edit.endEditLineString(lineString);
  }

  var me = this;
  
  var isRing = (lineString.getType() == 'KmlLinearRing');
  var altitudeMode = lineString.getAltitudeMode();
  var coords = lineString.getCoordinates();
  
  // number of total coords, including any repeat first coord in the case of
  // linear rings
  var numCoords = coords.getLength();
  
  // if the first coordinate isn't repeated at the end and we're editing
  // a linear ring, repeat it
  if (numCoords && isRing) {
    var firstCoord = coords.get(0);
    var lastCoord = coords.get(numCoords - 1);
    if (!coordsEqual_(firstCoord, lastCoord)) {
      coords.pushLatLngAlt(firstCoord.getLatitude(),
                           firstCoord.getLongitude(),
                           firstCoord.getAltitude());
      numCoords++;
    }
  }
  
  var innerDoc = this.pluginInstance.parseKml([
      '<Document>',
      '<Style id="_GEarthExtensions_regularCoordinate"><IconStyle>',
      '<Icon><href>', LINESTRING_COORD_ICON, '</href></Icon>',
      '<color>ffffffff</color>',
      '<scale>', LINESTRING_COORD_ICON_SCALE, '</scale></IconStyle></Style>',
      '<StyleMap id="_GEarthExtensions_midCoordinate">',
      '<Pair><key>normal</key>',
      '<Style><IconStyle>',
      '<Icon><href>', LINESTRING_COORD_ICON, '</href></Icon>',
      '<color>60ffffff</color><scale>', LINESTRING_MIDPOINT_ICON_SCALE,
      '</scale></IconStyle></Style></Pair>',
      '<Pair><key>highlight</key>',
      '<styleUrl>#_GEarthExtensions_regularCoordinate</styleUrl>',
      '</Pair></StyleMap>',
      '</Document>'].join(''));

  // TODO: options: icon for placemarks
  // TODO: it may be easier to use a linked list for all this

  var coordDataArr = [];
  
  var checkDupMidpoints_ = function() {
    if (!isRing) {
      return;
    }
    
    // handle special case for polygons w/ 2 coordinates
    if (numCoords == 3) /* including duplicate first coord */ {
      coordDataArr[1].rightMidPlacemark.setVisibility(false);
    } else if (numCoords >= 4) {
      coordDataArr[numCoords - 2].rightMidPlacemark.setVisibility(true);
    }
  };

  var makeRegularDeleteEventListener_ = function(coordData) {
    return function(event) {
      event.preventDefault();

      // get the coord info of the left coordinate, as we'll need to
      // update its midpoint placemark
      var leftCoordData = null;
      if (coordData.index > 0 || isRing) {
        var leftIndex = coordData.index - 1;
        if (leftIndex < 0) {
          leftIndex += numCoords; // wrap
        }
        
        if (isRing && coordData.index === 0) {
          // skip repeated coord at the end
          leftIndex--;
        }

        leftCoordData = coordDataArr[leftIndex];
      }

      // shift coordinates in the KmlCoordArray up
      // TODO: speed this up
      for (i = coordData.index; i < numCoords - 1; i++) {
        coords.set(i, coords.get(i + 1));
      }
      
      coords.pop();

      // user removed first coord, make the last coord equivalent
      // to the new first coord (previously 2nd coord)
      if (isRing && coordData.index === 0) {
        coords.set(numCoords - 2, coords.get(0));
      }
      
      numCoords--;

      // at the end of the line and there's no right-mid placemark.
      // the previous-to-last point's mid point should be removed too.
      if (!coordData.rightMidPlacemark && leftCoordData) {
        me.edit.endDraggable(leftCoordData.rightMidPlacemark);
        me.dom.removeObject(leftCoordData.rightMidPlacemark);
        leftCoordData.rightMidPlacemark = null;
      }

      // tear down mid placemark
      if (coordData.rightMidPlacemark) {
        me.edit.endDraggable(coordData.rightMidPlacemark);
        me.dom.removeObject(coordData.rightMidPlacemark);
      }

      // tear down this placemark
      me.edit.endDraggable(coordData.regularPlacemark);
      google.earth.removeEventListener(coordData.regularPlacemark,
          'dblclick', coordData.deleteEventListener);
      me.dom.removeObject(coordData.regularPlacemark);

      coordDataArr.splice(coordData.index, 1);

      // update all coord data indices after this removed
      // coordinate, because indices have changed
      for (i = 0; i < numCoords; i++) {
        coordDataArr[i].index = i;
      }

      // call the drag listener for the previous coordinate
      // to update the midpoint location
      if (leftCoordData) {
        leftCoordData.regularDragCallback.call(
            leftCoordData.regularPlacemark, leftCoordData);
      }
      
      checkDupMidpoints_();
      
      if (options.editCallback) {
        options.editCallback(null);
      }
    };
  };

  var makeRegularDragCallback_ = function(coordData) {
    return function() {
      // update this coordinate
      coords.setLatLngAlt(coordData.index,
          this.getGeometry().getLatitude(),
          this.getGeometry().getLongitude(),
          this.getGeometry().getAltitude());
      
      // if we're editing a ring and the first and last coords are the same,
      // keep them in sync
      if (isRing && numCoords >= 2 && coordData.index === 0) {
        var firstCoord = coords.get(0);
        var lastCoord = coords.get(numCoords - 1);
        
        // update both first and last coordinates
        coords.setLatLngAlt(0,
            this.getGeometry().getLatitude(),
            this.getGeometry().getLongitude(),
            this.getGeometry().getAltitude());
        coords.setLatLngAlt(numCoords - 1,
            this.getGeometry().getLatitude(),
            this.getGeometry().getLongitude(),
            this.getGeometry().getAltitude());
      }

      // update midpoint placemarks
      var curCoord = coords.get(coordData.index);

      if (coordData.index > 0 || isRing) {
        var leftIndex = coordData.index - 1;
        if (leftIndex < 0) {
          leftIndex += numCoords; // wrap
        }
        
        if (isRing && coordData.index === 0) {
          // skip repeated coord at the end
          leftIndex--;
        }
        
        var leftMidPt = new geo.Point(coords.get(leftIndex)).midpoint(
            new geo.Point(curCoord));
        coordDataArr[leftIndex].rightMidPlacemark.getGeometry().setLatitude(
            leftMidPt.lat());
        coordDataArr[leftIndex].rightMidPlacemark.getGeometry().setLongitude(
            leftMidPt.lng());
        coordDataArr[leftIndex].rightMidPlacemark.getGeometry().setAltitude(
            leftMidPt.altitude());
      }

      if (coordData.index < numCoords - 1 || isRing) {
        var rightCoord;
        if ((isRing && coordData.index == numCoords - 2) ||
            (!isRing && coordData.index == numCoords - 1)) {
          rightCoord = coords.get(0);
        } else {
          rightCoord = coords.get(coordData.index + 1);
        }
        
        var rightMidPt = new geo.Point(curCoord).midpoint(
            new geo.Point(rightCoord));
        coordData.rightMidPlacemark.getGeometry().setLatitude(
            rightMidPt.lat());
        coordData.rightMidPlacemark.getGeometry().setLongitude(
            rightMidPt.lng());
        coordData.rightMidPlacemark.getGeometry().setAltitude(
            rightMidPt.altitude());
      }
      
      checkDupMidpoints_();
      
      if (options.editCallback) {
        options.editCallback(null);
      }
    };
  };

  var makeMidDragCallback_ = function(coordData) {
    // vars for the closure
    var convertedToRegular = false;
    var newCoordData = null;

    return function() {
      if (!convertedToRegular) {
        // first time drag... convert this midpoint into a regular point

        convertedToRegular = true;
        var i;

        // change style to regular placemark style
        this.setStyleUrl('#_GEarthExtensions_regularCoordinate');

        // shift coordinates in the KmlCoordArray down
        // TODO: speed this up
        coords.push(coords.get(numCoords - 1));
        for (i = numCoords - 1; i > coordData.index + 1; i--) {
          coords.set(i, coords.get(i - 1));
        }

        numCoords++;

        // create a new coordData object for the newly created
        // coordinate
        newCoordData = {};
        newCoordData.index = coordData.index + 1;
        newCoordData.regularPlacemark = this; // the converted midpoint

        // replace this to-be-converted midpoint with a new midpoint
        // placemark (will be to the left of the new coord)
        coordData.rightMidPlacemark = me.dom.buildPointPlacemark({
          point: coords.get(coordData.index),
          altitudeMode: altitudeMode,
          style: '#_GEarthExtensions_midCoordinate'
        });
        innerDoc.getFeatures().appendChild(coordData.rightMidPlacemark);

        me.edit.makeDraggable(coordData.rightMidPlacemark, {
          bounce: false,
          dragCallback: makeMidDragCallback_(coordData) // previous coord
        });

        // create a new right midpoint
        newCoordData.rightMidPlacemark = me.dom.buildPointPlacemark({
          point: coords.get(coordData.index),
          altitudeMode: altitudeMode,
          style: '#_GEarthExtensions_midCoordinate'
        });
        innerDoc.getFeatures().appendChild(newCoordData.rightMidPlacemark);

        me.edit.makeDraggable(newCoordData.rightMidPlacemark, {
          bounce: false,
          dragCallback: makeMidDragCallback_(newCoordData)
        });

        // create a delete listener
        newCoordData.deleteEventListener = makeRegularDeleteEventListener_(
            newCoordData);
        google.earth.addEventListener(this, 'dblclick',
            newCoordData.deleteEventListener);

        newCoordData.regularDragCallback =
            makeRegularDragCallback_(newCoordData);

        // insert the new coordData
        coordDataArr.splice(newCoordData.index, 0, newCoordData);

        // update all placemark indices after this newly inserted
        // coordinate, because indices have changed
        for (i = 0; i < numCoords; i++) {
          coordDataArr[i].index = i;
        }
      }

      // do regular dragging stuff
      newCoordData.regularDragCallback.call(this, newCoordData);
      
      // the regular drag callback calls options.editCallback
    };
  };

  // create the vertex editing (regular and midpoint) placemarks
  me.util.batchExecute(function() {
    for (var i = 0; i < numCoords; i++) {
      var curCoord = coords.get(i);
      var nextCoord = coords.get((i + 1) % numCoords);

      var coordData = {};
      coordDataArr.push(coordData);
      coordData.index = i;

      if (isRing && i == numCoords - 1) {
        // this is a repeat of the first coord, don't make placemarks for it
        continue;
      }
      
      // create the regular placemark on the point
      coordData.regularPlacemark = me.dom.buildPointPlacemark(curCoord, {
        altitudeMode: altitudeMode,
        style: '#_GEarthExtensions_regularCoordinate'
      });
      innerDoc.getFeatures().appendChild(coordData.regularPlacemark);

      coordData.regularDragCallback = makeRegularDragCallback_(coordData);

      // set up drag handlers for main placemarks
      me.edit.makeDraggable(coordData.regularPlacemark, {
        bounce: false,
        dragCallback: coordData.regularDragCallback
      });

      coordData.deleteEventListener =
          makeRegularDeleteEventListener_(coordData);
      google.earth.addEventListener(coordData.regularPlacemark, 'dblclick',
          coordData.deleteEventListener);

      // create the next midpoint placemark
      if (i < numCoords - 1 || isRing) {
        coordData.rightMidPlacemark = me.dom.buildPointPlacemark({
          point: new geo.Point(curCoord).midpoint(
              new geo.Point(nextCoord)),
          altitudeMode: altitudeMode,
          style: '#_GEarthExtensions_midCoordinate'
        });
        innerDoc.getFeatures().appendChild(coordData.rightMidPlacemark);

        // set up drag handlers for mid placemarks
        me.edit.makeDraggable(coordData.rightMidPlacemark, {
          bounce: false,
          dragCallback: makeMidDragCallback_(coordData)
        });
      }
    }
    
    checkDupMidpoints_();

    // display the editing UI
    me.pluginInstance.getFeatures().appendChild(innerDoc);
  });

  // set up an abort function for use in endEditLineString
  me.util.setJsDataValue(lineString, LINESTRINGEDITDATA_JSDATA_KEY, {
    innerDoc: innerDoc,
    abortAndEndFn: function() {
      me.util.batchExecute(function() {
        // duplicate the first coordinate to the end if necessary
        var numCoords = coords.getLength();
        if (numCoords && isRing) {
          var firstCoord = coords.get(0);
          var lastCoord = coords.get(numCoords - 1);
          if (!coordsEqual_(firstCoord, lastCoord)) {
            coords.pushLatLngAlt(firstCoord.getLatitude(),
                                 firstCoord.getLongitude(),
                                 firstCoord.getAltitude());
          }
        }
        
        for (var i = 0; i < coordDataArr.length; i++) {
          if (!coordDataArr[i].regularPlacemark) {
            continue;
          }
          
          // teardown for regular placemark, its delete event listener
          // and its right-mid placemark
          google.earth.removeEventListener(coordDataArr[i].regularPlacemark,
              'dblclick', coordDataArr[i].deleteEventListener);

          me.edit.endDraggable(coordDataArr[i].regularPlacemark);
        
          if (coordDataArr[i].rightMidPlacemark) {
            me.edit.endDraggable(coordDataArr[i].rightMidPlacemark);
          }
        }

        me.dom.removeObject(innerDoc);
      });
    }
  });
};

/**
 * Ceases the ability for the user to edit or draw the given line string.
 */
GEarthExtensions.prototype.edit.endEditLineString = function(lineString) {
  // get placemark's drag data
  var lineStringEditData = this.util.getJsDataValue(
      lineString, LINESTRINGEDITDATA_JSDATA_KEY);

  // stop listening for mousedown on the window
  if (lineStringEditData) {
    lineStringEditData.abortAndEndFn.call(null);

    this.util.clearJsDataValue(lineString, LINESTRINGEDITDATA_JSDATA_KEY);
  }
};
/**
 * Contains various animation/effects tools for use in the Google Earth API.
 * @namespace
 */
GEarthExtensions.prototype.fx = {isnamespace_:true};
/**
 * @class Private singleton class for managing GEarthExtensions#fx animations
 * in a plugin instance.
 * @private
 */
GEarthExtensions.prototype.fx.AnimationManager_ = createClass_(function() {
  this.extInstance = arguments.callee.extInstance_;
  this.animations_ = [];

  this.running_ = false;
  this.globalTime_ = 0.0;
});

/**
 * Start an animation (deriving from GEarthExtensions#fx.Animation).
 * @ignore
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.startAnimation =
function(anim) {
  this.animations_.push({
    obj: anim,
    startGlobalTime: this.globalTime_
  });
  
  this.start_();
};

/**
 * Stop an animation (deriving from GEarthExtensions#fx.Animation).
 * @ignore
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.stopAnimation =
function(anim) {
  for (var i = 0; i < this.animations_.length; i++) {
    if (this.animations_[i].obj == anim) {
      // remove the animation from the array
      this.animations_.splice(i, 1);
      return;
    }
  }
};

/**
 * Private, internal function to start animating
 * @ignore
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.start_ = function() {
  if (this.running_) {
    return;
  }
  
  this.startTimeStamp_ = Number(new Date());
  this.tick_();
  
  for (var i = 0; i < this.animations_.length; i++) {
    this.animations_[i].obj.renderFrame(0);
  }
  
  var me = this;
  this.frameendListener_ = function(){ me.tick_(); };
  this.tickInterval_ = window.setInterval(this.frameendListener_, 100);
  google.earth.addEventListener(this.extInstance.pluginInstance,
      'frameend', this.frameendListener_);
  this.running_ = true;
};

/**
 * Private, internal function to stop animating
 * @ignore
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.stop_ = function() {
  if (!this.running_) {
    return;
  }
  
  google.earth.removeEventListener(this.extInstance.pluginInstance,
      'frameend', this.frameendListener_);
  this.frameendListener_ = null;
  window.clearInterval(this.tickInterval_);
  this.tickInterval_ = null;
  this.running_ = false;
  this.globalTime_ = 0.0;
};

/**
 * Internal tick handler (frameend)
 * @ignore
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.tick_ = function() {
  if (!this.running_) {
    return;
  }
  
  this.globalTime_ = Number(new Date()) - this.startTimeStamp_;
  this.renderCurrentFrame_();
};

/**
 * Private function to render current animation frame state (by calling
 * registered Animations' individual frame renderers.
 * @ignore
 */
GEarthExtensions.prototype.fx.AnimationManager_.prototype.renderCurrentFrame_ =
function() {
  for (var i = this.animations_.length - 1; i >= 0; i--) {
    var animation = this.animations_[i];
    if (!! animation && !! animation.obj) {
        animation.obj.renderFrame(this.globalTime_ - animation.startGlobalTime);
    } else {
        console.log('bad animation obj?'); // IE failing here
    }
  }
  
  if (this.animations_.length === 0) {
    this.stop_();
  }
};

/**
 * Returns the singleton animation manager for the plugin instance.
 * @private
 */
GEarthExtensions.prototype.fx.getAnimationManager_ = function() {
  if (!this.fx.animationManager_) {
    this.fx.animationManager_ = new this.fx.AnimationManager_();
  }
  
  return this.fx.animationManager_;
};

/**
 * @class Base class for all GEarthExtensions#fx animations. Animations of this
 * base class are not bounded by a given time duration and must manually be
 * stopped when they are 'complete'.
 * @param {Function} renderCallback A method that will be called to render
 *     a frame of the animation. Its sole parameter will be the time, in
 *     seconds, of the frame to render.
 * @param {Function} [completionCallback] A callback method to fire when the
 *     animation is completed/stopped. The callback will receive an object
 *     literal argument that will contain a 'cancelled' boolean value that will
 *     be true if the effect was cancelled.
 */
GEarthExtensions.prototype.fx.Animation = createClass_(function(renderFn,
                                                                completionFn) {
  this.extInstance = arguments.callee.extInstance_;
  this.renderFn = renderFn;
  this.completionFn = completionFn || function(){};
});

/**
 * Start this animation.
 */
GEarthExtensions.prototype.fx.Animation.prototype.start = function() {
  this.extInstance.fx.getAnimationManager_().startAnimation(this);
};

/**
 * Stop this animation.
 * @param {Boolean} [completed=true] Whether or not the animation is being
 *     stopped due to a successful completion. If not, the stop call is treated
 *     as a cancellation of the animation.
 */
GEarthExtensions.prototype.fx.Animation.prototype.stop = function(completed) {
  this.extInstance.fx.getAnimationManager_().stopAnimation(this);
  this.completionFn({
    cancelled: !Boolean(completed || geo.util.isUndefined(completed))
  });
};

/**
 * Stop and rewind the animation to the frame at time t=0.
 */
GEarthExtensions.prototype.fx.Animation.prototype.rewind = function() {
  this.renderFrame(0);
  this.stop(false);
};

/**
 * Render the frame at the given time after the animation was started.
 * @param {Number} time The time in seconds of the frame to render.
 */
GEarthExtensions.prototype.fx.Animation.prototype.renderFrame = function(t) {
  this.renderFn.call(this, t);
};

/**
 * @class Generic class for animations of a fixed duration.
 * @param {Number} duration The length of time for which this animation should
 *     run, in seconds.
 * @param {Function} renderCallback A method that will be called to render
 *     a frame of the animation. Its sole parameter will be the time, in
 *     seconds, of the frame to render.
 * @param {Function} [completionCallback] A callback method to fire when the
 *     animation is completed/stopped. The callback will receive an object
 *     literal argument that will contain a 'cancelled' boolean value that will
 *     be true if the effect was cancelled.
 * @extends GEarthExtensions#fx.Animation
 */
GEarthExtensions.prototype.fx.TimedAnimation = createClass_(
  [GEarthExtensions.prototype.fx.Animation],
function(duration, renderFn, completionFn) {
  this.extInstance = arguments.callee.extInstance_;
  this.duration = duration;
  this.renderFn = renderFn;
  this.complete = false;
  this.completionFn = completionFn || function(){};
});

/**
 * Render the frame at the given time after the animation was started.
 * @param {Number} time The time of the frame to render, in seconds.
 */
GEarthExtensions.prototype.fx.TimedAnimation.prototype.renderFrame =
function(t) {
  if (this.complete) {
    return;
  }
  
  if (t > this.duration) {
    this.renderFn.call(this, this.duration);
    this.stop();
    this.complete = true;
    return;
  }
  
  this.renderFn.call(this, t);
};
/**
 * Bounces a point placemark by animating its altitude.
 * @param {KmlPlacemark} placemark The point placemark to bounce.
 * @param {Object} [options] The bounce options.
 * @param {Number} [options.duration=300] The duration of the initial bounce,
 *     in milliseconds.
 * @param {Number} [options.startAltitude] The altitude at which to start the
 *     bounce, in meters. The default is the point's current altitude.
 * @param {Number} [options.altitude] The altitude by which the placemark
 *     should rise at its peak, in meters. The default is the computed based
 *     on the current plugin viewport.
 * @param {Number} [options.phase] The bounce phase. If no phase is specified,
 *     both ascent and descent are performed. If phase=1, then only the ascent
 *     is performed. If phase=2, then only the descent and repeat are performed.
 * @param {Number} [options.repeat=0] The number of times to repeat the bounce.
 * @param {Number} [options.dampen=0.3] The altitude and duration dampening
 *     factor that repeat bounces should be scaled by.
 * @param {Function} [options.callback] A callback function to be triggered
 *     after the bounce is completed. The callback's 'this' variable will be
 *     bound to the placemark object, and it will receive a single boolean
 *     argument that will be true if the bounce was cancelled.
 *     Note that the callback is not fired if phase=2.
 */
GEarthExtensions.prototype.fx.bounce = function(placemark, options) {
  options = checkParameters_(options, false, {
    duration: 300,
    startAltitude: ALLOWED_,
    altitude: this.util.getCamera().getAltitude() / 5,
    phase: ALLOWED_,
    repeat: 0,
    dampen: 0.3,
    callback: function(){}
  });
  
  var me = this;
  this.fx.rewind(placemark);
  
  // double check that we're given a placemark with a point geometry
  if (!'getGeometry' in placemark ||
      !placemark.getGeometry() ||
      placemark.getGeometry().getType() != 'KmlPoint') {
    throw new TypeError('Placemark must be a KmlPoint geometry');
  }
  
  var point = placemark.getGeometry();
  var origAltitudeMode = point.getAltitudeMode();

  // changing altitude if the mode is clamp to ground does nothing, so switch
  // to relative to ground
  if (origAltitudeMode == this.pluginInstance.ALTITUDE_CLAMP_TO_GROUND) {
    point.setAltitude(0);
    point.setAltitudeMode(this.pluginInstance.ALTITUDE_RELATIVE_TO_GROUND);
  }
  
  if (origAltitudeMode == this.pluginInstance.ALTITUDE_CLAMP_TO_SEA_FLOOR) {
    point.setAltitude(0);
    point.setAltitudeMode(this.pluginInstance.ALTITUDE_RELATIVE_TO_SEA_FLOOR);
  }

  if (typeof options.startAltitude != 'number') {
    options.startAltitude = point.getAltitude();
  }
  
  // setup the animation phases
  var phase1, phase2;
  
  // up
  phase1 = function() {
    me.fx.animateProperty(point, 'altitude', {
      duration: options.duration / 2,
      end: options.startAltitude + options.altitude,
      easing: 'out',
      featureProxy: placemark,
      callback: phase2 || function(){}
    });
  };
  
  // down and repeats
  phase2 = function(e) {
    if (e && e.cancelled) {
      return;
    }
    
    me.fx.animateProperty(point, 'altitude', {
      duration: options.duration / 2,
      start: options.startAltitude + options.altitude,
      end: options.startAltitude,
      easing: 'in',
      featureProxy: placemark,
      callback: function(e2) {
        point.setAltitudeMode(origAltitudeMode);

        if (e2.cancelled) {
          point.setAltitude(options.startAltitude);
          options.callback.call(placemark, e2);
          return;
        }

        // done with this bounce, should we bounce again?
        if (options.repeat >= 1) {
          --options.repeat;
          options.altitude *= options.dampen;
          options.duration *= Math.sqrt(options.dampen);
          options.phase = 0; // do all phases
          me.fx.bounce(placemark, options);
        } else {
          options.callback.call(placemark, e2);
        }
      }
    });
  };
  
  // animate the bounce
  if (options.phase === 1) {
    phase2 = null;
    phase1.call();
  } else if (options.phase === 2) {
    phase2.call();
  } else {
    phase1.call();
  }
};
/**
 * Cancel all animations on a given feature, potentially leaving them in an
 * intermediate visual state.
 */
GEarthExtensions.prototype.fx.cancel = function(feature) {
  // TODO: verify that feature is a KmlFeature
  var animations = this.util.getJsDataValue(feature,
                       '_GEarthExtensions_anim') || [];
  for (var i = 0; i < animations.length; i++) {
    animations[i].stop(false);
  }
};

/**
 * Cancel all animations on a given feature and revert them to their t = 0
 * state.
 */
GEarthExtensions.prototype.fx.rewind = function(feature) {
  // TODO: verify that feature is a KmlFeature
  var animations = this.util.getJsDataValue(feature,
                       '_GEarthExtensions_anim') || [];
  for (var i = 0; i < animations.length; i++) {
    animations[i].rewind();
  }
};

/**
 * Animate a numeric property on a plugin object.
 * @param {KmlObject} object The plugin object whose property to animate.
 * @param {String} property The property to animate. This should match 1:1 to
 *     the getter/setter methods on the plugin object. For example, to animate
 *     a KmlPoint latitude, pass in `latitude`, since the getter/setters are
 *     `getLatitude` and `setLatitude`.
 * @param {Object} options The property animation options.
 * @param {Number} [options.duration=500] The duration, in milliseconds, of the
 *     animation.
 * @param {Number} [options.start] The value of the property to set at the
 *     start of the animation.
 * @param {Number} [options.end] The desired end value of the property.
 * @param {Number} [options.delta] If end is not specified, you may set this
 *     to the desired change in the property value.
 * @param {String|Function} [options.easing='none'] The easing function to use
 *     during the animation. Valid values are 'none', 'in', 'out', or 'both'.
 *     Alternatively, an easy function mapping `[0.0, 1.0] -> [0.0, 1.0]` can
 *     be specified. No easing is `f(x) = x`.
 * @param {Function} [options.callback] A callback method to fire when the
 *     animation is completed/stopped. The callback will receive an object
 *     literal argument that will contain a 'cancelled' boolean value that will
 *     be true if the effect was cancelled.
 * @param {KmlFeature} [options.featureProxy] A feature to associate with this
 *     property animation for use with GEarthExtensions#fx.cancel or
 *     GEarthExtensions#fx.rewind.
 */
GEarthExtensions.prototype.fx.animateProperty =
function(obj, property, options) {
  options = checkParameters_(options, false, {
    duration: 500,
    start: ALLOWED_,
    end: ALLOWED_,
    delta: ALLOWED_,
    easing: 'none',
    callback: ALLOWED_,
    featureProxy: ALLOWED_
  });
  
  // http://www.timotheegroleau.com/Flash/experiments/easing_function_generator.htm
  // TODO: ensure easing function exists
  // get the easing function
  if (typeof options.easing == 'string') {
    options.easing = {
      'none': function(t) {
        return t;
      },
      'in': function(t) { // cubic in
        return t*t*t;
      },
      'out': function(t) { // cubic out
        var ts = t*t;
        var tc = ts*t;
        return tc - 3*ts + 3*t;
      },
      'both': function(t) { // quintic in-out
        var ts = t*t;
        var tc = ts*t;
        return 6*tc*ts - 15*ts*ts + 10*tc;
      }
    }[options.easing];
  }

  var propertyTitleCase = property.charAt(0).toUpperCase() +
                          property.substr(1);

  var me = this;
  
  /** @private */
  var doAnimate_;
  if (property == 'color') {
    // KmlColor blending
    if (options.delta) {
      throw new Error('Cannot use delta with color animations.');
    }
    
    var colorObj = obj.getColor() || {get: function(){ return ''; }};
    
    // use start/end
    if (!options.start) {
      options.start = colorObj.get();
    }

    if (!options.end) {
      options.end = colorObj.get();
    }
  
    /** @private */
    doAnimate_ = function(f) {
      colorObj.set(me.util.blendColors(options.start, options.end,
          options.easing.call(null, f)));
    };
  } else {
    // numerical property blending
    var getter = function() {
      return obj['get' + propertyTitleCase]();
    };
  
    var setter = function(val) {
      return obj['set' + propertyTitleCase](val);
    };
    
    // use EITHER start/end or delta
    if (!isFinite(options.start) && !isFinite(options.end)) {
      // use delta
      if (!isFinite(options.delta)) {
        options.delta = 0.0;
      }
    
      options.start = getter();
      options.end = getter() + options.delta;
    } else {
      // use start/end
      if (!isFinite(options.start)) {
        options.start = getter();
      }

      if (!isFinite(options.end)) {
        options.end = getter();
      }
    }
  
    /** @private */
    doAnimate_ = function(f) {
      setter(options.start + (options.end - options.start) *
                             options.easing.call(null, f));
    };
  }
  
  var anim = new this.fx.TimedAnimation(options.duration,
    function(t) {
      // render callback
      doAnimate_(1.0 * t / options.duration);
    },
    function(e) {
      // completion callback
      
      // remove this animation from the list of animations on the object
      var animations = me.util.getJsDataValue(options.featureProxy || obj,
          '_GEarthExtensions_anim');
      if (animations) {
        for (var i = 0; i < animations.length; i++) {
          if (animations[i] == this) {
            animations.splice(i, 1);
            break;
          }
        }
        
        if (!animations.length) {
          me.util.clearJsDataValue(options.featureProxy || obj,
              '_GEarthExtensions_anim');
        }
      }

      if (options.callback) {
        options.callback.call(obj, e);
      }
    });
  
  // add this animation to the list of animations on the object
  var animations = this.util.getJsDataValue(options.featureProxy || obj,
      '_GEarthExtensions_anim');
  if (animations) {
    animations.push(anim);
  } else {
    this.util.setJsDataValue(options.featureProxy || obj,
        '_GEarthExtensions_anim', [anim]);
  }
  
  anim.start();
  return anim;
};
/**
 * Contains methods for 3D math, including linear algebra/geo bindings.
 * @namespace
 */
GEarthExtensions.prototype.math3d = {isnamespace_:true};
/**
 * Converts an array of 3 Euler angle rotations to matrix form.
 * NOTE: Adapted from 'Graphics Gems IV', Chapter III.5,
 * "Euler Angle Conversion" by Ken Shoemake.
 * @see http://vered.rose.utoronto.ca/people/spike/GEMS/GEMS.html
 * @param {Number[]} eulerAngles An array of 3 frame-relative Euler rotation
 *     angles, each in radians.
 * @return {geo.linalg.Matrix} A matrix representing the transformation.
 * @private
 */
function eulerAnglesToMatrix_(eulerAngles) {
  var I = 2; // used for roll, in radians
  var J = 0; // heading, in radians
  var K = 1; // tilt

  var m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

  var cos_ti = Math.cos(eulerAngles[0]);
  var cos_tj = Math.cos(eulerAngles[1]);
  var cos_th = Math.cos(eulerAngles[2]);

  var sin_ti = Math.sin(eulerAngles[0]);
  var sin_tj = Math.sin(eulerAngles[1]);
  var sin_th = Math.sin(eulerAngles[2]);

  var cos_c = cos_ti * cos_th;
  var cos_s = cos_ti * sin_th;
  var sin_c = sin_ti * cos_th;
  var sin_s = sin_ti * sin_th;

  m[I][I] = cos_tj * cos_th;
  m[I][J] = sin_tj * sin_c - cos_s;
  m[I][K] = sin_tj * cos_c + sin_s;

  m[J][I] = cos_tj * sin_th;
  m[J][J] = sin_tj * sin_s + cos_c;
  m[J][K] = sin_tj * cos_s - sin_c;

  m[K][I] = -sin_tj;
  m[K][J] = cos_tj * sin_ti;
  m[K][K] = cos_tj * cos_ti;

  return new geo.linalg.Matrix(m);
}

/**
 * Converts a matrix to an array of 3 Euler angle rotations.
 * NOTE: Adapted from 'Graphics Gems IV', Chapter III.5,
 * "Euler Angle Conversion" by Ken Shoemake.
 * @see http://vered.rose.utoronto.ca/people/spike/GEMS/GEMS.html
 * @param {geo.linalg.Matrix} matrix A homogenous matrix representing a
 *     transformation.
 * @return {Number[]} An array of 3 frame-relative Euler rotation angles
 *     representing the transformation, each in radians.
 * @private
 */
function matrixToEulerAngles_(matrix) {
  var I = 2 + 1; // + 1 because Sylvester uses 1-based indices.
  var J = 0 + 1;
  var K = 1 + 1;
  var FLT_EPSILON = 1e-6;

  var cy = Math.sqrt(matrix.e(I, I) * matrix.e(I, I) +
                     matrix.e(J, I) * matrix.e(J, I));

  if (cy <= 16 * FLT_EPSILON) {
    return [Math.atan2(-matrix.e(J, K), matrix.e(J, J)),
            Math.atan2(-matrix.e(K, I), cy),
            0];
  }

  return [Math.atan2( matrix.e(K, J), matrix.e(K, K)),
          Math.atan2(-matrix.e(K, I), cy),
          Math.atan2( matrix.e(J, I), matrix.e(I, I))];
}

/**
 * Converts heading, tilt, and roll (HTR) to a local orientation matrix
 * that transforms global direction vectors to local direction vectors.
 * @param {Number[]} htr A heading, tilt, roll array, where each angle is in
 *     degrees.
 * @return {geo.linalg.Matrix} A local orientation matrix.
 */
GEarthExtensions.prototype.math3d.htrToLocalFrame = function(htr) {
  return eulerAnglesToMatrix_([
      htr[0].toRadians(), htr[1].toRadians(), htr[2].toRadians()]);
};

/**
 * Converts a local orientation matrix (right, dir, up vectors) in local
 * cartesian coordinates to heading, tilt, and roll.
 * @param {geo.linalg.Matrix} matrix A local orientation matrix.
 * @return {Number[]} A heading, tilt, roll array, where each angle is in
 *     degrees.
 */
GEarthExtensions.prototype.math3d.localFrameToHtr = function(matrix) {
  var htr = matrixToEulerAngles_(matrix);
  return [htr[0].toDegrees(), htr[1].toDegrees(), htr[2].toDegrees()];
};
/**
 * Creates an orthonormal orientation matrix for a given set of object direction
 * and up vectors. The matrix rows will each be unit length and orthogonal to
 * each other. If the dir and up vectors are collinear, this function will fail
 * and return null.
 * @param {geo.linalg.Vector} dir The object direction vector.
 * @param {geo.linalg.Vector} up The object up vector.
 * @return {geo.linalg.Matrix} Returns the orthonormal orientation matrix,
 *     or null if none is possible.
 */
GEarthExtensions.prototype.math3d.makeOrthonormalFrame = function(dir, up) {
  var newRight = dir.cross(up).toUnitVector();
  if (newRight.eql(geo.linalg.Vector.Zero(3))) {
    // dir and up are collinear.
    return null;
  }
  
  var newDir = up.cross(newRight).toUnitVector();
  var newUp = newRight.cross(newDir);
  return new geo.linalg.Matrix([newRight.elements,
                                newDir.elements,
                                newUp.elements]);
};

/**
 * Creates a local orientation matrix that can transform direction vectors
 * local to a given point to global direction vectors. The transpose of the
 * returned matrix performs the inverse transformation.
 * @param {geo.Point} point The world point at which local coordinates are to
 *     be transformed.
 * @return {geo.linalg.Matrix} An orientation matrix that can transform local
 *     coordinate vectors to global coordinate vectors.
 */
GEarthExtensions.prototype.math3d.makeLocalToGlobalFrame = function(point) {
  var vertical = point.toCartesian().toUnitVector();
  var east = new geo.linalg.Vector([0, 1, 0]).cross(vertical).toUnitVector();
  var north = vertical.cross(east).toUnitVector();
  return new geo.linalg.Matrix([east.elements,
                                north.elements,
                                vertical.elements]);
};
/**
 * This class/namespace hybrid contains miscellaneous
 * utility functions and shortcuts for the Earth API.
 * @namespace
 */
GEarthExtensions.prototype.util = {isnamespace_:true};
GEarthExtensions.NAMED_COLORS = {
  'aqua': 'ffffff00',
  'black': 'ff000000',
  'blue': 'ffff0000',
  'fuchsia': 'ffff00ff',
  'gray': 'ff808080',
  'green': 'ff008000',
  'lime': 'ff00ff00',
  'maroon': 'ff000080',
  'navy': 'ff800000',
  'olive': 'ff008080',
  'purple': 'ff800080',
  'red': 'ff0000ff',
  'silver': 'ffc0c0c0',
  'teal': 'ff808000',
  'white': 'ffffffff',
  'yellow': 'ff00ffff'
};

/**
 * Converts between various color formats, i.e. `#rrggbb`, to the KML color
 * format (`aabbggrr`)
 * @param {String|Number[]} color The source color value.
 * @param {Number} [opacity] An optional opacity to go along with CSS/HTML style
 *     colors, from 0.0 to 1.0.
 * @return {String} A string in KML color format (`aabbggrr`), or null if
 *     the color could not be parsed.
 */
GEarthExtensions.prototype.util.parseColor = function(arg, opacity) {
  // detect #rrggbb and convert to kml color aabbggrr
  // TODO: also accept 'rgb(0,0,0)' format using regex, maybe even hsl?
  var pad2_ = function(s) {
    return ((s.length < 2) ? '0' : '') + s;
  };
  
  if (geo.util.isArray(arg)) {
    // expected array as [r,g,b] or [r,g,b,a]

    return pad2_(((arg.length >= 4) ? arg[3].toString(16) : 'ff')) +
           pad2_(arg[2].toString(16)) +
           pad2_(arg[1].toString(16)) +
           pad2_(arg[0].toString(16));
  } else if (typeof arg == 'string') {
    // parsing a string
    if (arg.toLowerCase() in GEarthExtensions.NAMED_COLORS) {
      return GEarthExtensions.NAMED_COLORS[arg.toLowerCase()];
    } if (arg.length > 7) {
      // large than a possible CSS/HTML-style color, maybe it's already a KML
      // color
      return arg.match(/^[0-9a-f]{8}$/i) ? arg : null;
    } else {
      // assume it's given as an HTML color
      var kmlColor = null;
      if (arg.length > 4) {
        // try full HTML color
        kmlColor = arg.replace(
            /#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i,
            'ff$3$2$1').toLowerCase();
      } else {
        // try shorthand HTML/CSS color (#fff)
        kmlColor = arg.replace(
            /#?([0-9a-f])([0-9a-f])([0-9a-f])/i,
            'ff$3$3$2$2$1$1').toLowerCase();
      }
      
      if (kmlColor == arg) {
        return null; // no replacement done, so can't parse
      }
      
      if (!geo.util.isUndefined(opacity)) {
        kmlColor = pad2_(Math.floor(255 * opacity).toString(16)) +
            kmlColor.substring(2);
      }
      
      return kmlColor;
    }
  }
  
  return null; // couldn't parse, not a string or array
};


/**
 * Calculates a simple composite of the two given colors.
 * @param {String|Number[]} color1 The first ('source') color. Anthing that can
 *     be parsed with GEarthExtensions#util.parseColor.
 * @param {String|Number[]} color2 The second ('destination') color. Anything
 *     that can be parsed with GEarthExtensions#util.parseColor.
 * @param {Number} [fraction=0.5] The amount of color2 to composite onto/blend
 *     with color1, as a fraction from 0.0 to 1.0.
 * @type String
 */
GEarthExtensions.prototype.util.blendColors = function(color1, color2,
                                                       fraction) {
  if (geo.util.isUndefined(fraction) || fraction === null) {
    fraction = 0.5;
  }
  
  color1 = this.util.parseColor(color1);
  color2 = this.util.parseColor(color2);

  var pad2_ = function(s) {
    return ((s.length < 2) ? '0' : '') + s;
  };

  var blendHexComponent_ = function(c1, c2) {
    c1 = parseInt(c1, 16);
    c2 = parseInt(c2, 16);

    return pad2_(Math.floor((c2 - c1) * fraction + c1).toString(16));
  };

  return blendHexComponent_(color1.substr(0,2), color2.substr(0,2)) +
         blendHexComponent_(color1.substr(2,2), color2.substr(2,2)) +
         blendHexComponent_(color1.substr(4,2), color2.substr(4,2)) +
         blendHexComponent_(color1.substr(6,2), color2.substr(6,2));
};
// TODO: unit test
// NOTE: this is shared across all GEarthExtensions instances
// dictionary mapping objects's jstag (uuid) to an object literal
// { object: <object>, data: <object's js data dictionary> }
var jsData_ = {};

/* randomUUID.js - Version 1.0
*
* Copyright 2008, Robert Kieffer
*
* This software is made available under the terms of the Open Software License
* v3.0 (available here: http://www.opensource.org/licenses/osl-3.0.php )
*
* The latest version of this file can be found at:
* http://www.broofa.com/Tools/randomUUID.js
*
* For more information, or to comment on this, please go to:
* http://www.broofa.com/blog/?p=151
*/

/**
* Create and return a "version 4" RFC-4122 UUID string.
* @private
*/
function randomUUID_() {
  var s = [], itoh = '0123456789ABCDEF', i = 0;

  // Make array of random hex digits. The UUID only has 32 digits in it, but we
  // allocate an extra items to make room for the '-'s we'll be inserting.
  for (i = 0; i < 36; i++) {
    s[i] = Math.floor(Math.random()*0x10);
  }

  // Conform to RFC-4122, section 4.4
  s[14] = 4;  // Set 4 high bits of time_high field to version
  s[19] = (s[19] & 0x3) | 0x8;  // Specify 2 high bits of clock sequence

  // Convert to hex chars
  for (i = 0; i < 36; i++) {
    s[i] = itoh.charAt(s[i]);
  }

  // Insert '-'s
  s[8] = s[13] = s[18] = s[23] = '-';

  return s.join('');
}

/** @private */
function getJsTag_(object) {
  // TODO: use unique id from Earth API
  for (var tag in jsData_) {
    if (jsData_[tag].object.equals(object)) {
      return tag;
    }
  }

  return null;
}

/**
 * Returns whether or not the KmlObject has any JS-side data.
 * @param {KmlObject} object The plugin object to inquire about.
 * @public
 */
GEarthExtensions.prototype.util.hasJsData = function(object) {
  return getJsTag_(object) ? true : false;
};

/**
 * Clears all JS-side data for the given KmlObject.
 * @param {KmlObject} object The plugin object to clear data on.
 */
GEarthExtensions.prototype.util.clearAllJsData = function(object) {
  var jsTag = getJsTag_(object);
  if (jsTag) {
    delete jsData_[jsTag];
  }
};

/**
 * Gets the JS-side data for the given KmlObject associated with the given
 * key.
 * @param {KmlObject} object The plugin object to get data for.
 * @param {String} key The JS data key to request.
 * @public
 */
GEarthExtensions.prototype.util.getJsDataValue = function(object, key) {
  var jsTag = getJsTag_(object);
  if (jsTag && key in jsData_[jsTag].data) {
    return jsData_[jsTag].data[key];
  }

  // TODO: null or undefined?
  return undefined;
};

/**
 * Sets the JS-side data for the given KmlObject associated with the given
 * key to the passed in value.
 * @param {KmlObject} object The object to get data for.
 * @param {String} key The JS data key to set.
 * @param {*} value The value to store for this key.
 * @public
 */
GEarthExtensions.prototype.util.setJsDataValue =
function(object, key, value) {
  var jsTag = getJsTag_(object);
  if (!jsTag) {
    // no current data dictionary, create a jstag for this object
    jsTag = null;
    while (!jsTag || jsTag in jsData_) {
      jsTag = randomUUID_();
    }

    // create an empty data dict
    jsData_[jsTag] = { object: object, data: {} };
  }

  // set the data
  jsData_[jsTag].data[key] = value;
};

/**
 * Clears the JS-side data for the given KmlObject associated with the given
 * key.
 * @param {KmlObject} object The plugin object to clear data on.
 * @param {String} key The JS data key whose value should be cleared.
 */
GEarthExtensions.prototype.util.clearJsDataValue = function(object, key) {
  var jsTag = getJsTag_(object);
  if (jsTag &&
      key in jsData_[jsTag].data) {
    delete jsData_[jsTag].data[key];

    // check if the data dict is empty... if so, cleanly remove it
    for (var k in jsData_[jsTag].data) {
      return; // not empty
    }

    // data dict is empty
    this.util.clearAllJsData(object);
  }
};
/**
 * Loads and shows the given KML URL in the Google Earth Plugin instance.
 * @param {String} url The URL of the KML content to show.
 * @param {Object} [options] KML display options.
 * @param {Boolean} [options.cacheBuster=false] Enforce freshly downloading the
 *     KML by introducing a cache-busting query parameter.
 * @param {Boolean} [options.flyToView=false] Fly to the document-level abstract
 *     view in the loaded KML after loading it. If no explicit view is
 *     available, a default bounds view will be calculated and used unless
 *     options.flyToBoundsFallback is false.
 *     See GEarthExtensions#util.flyToObject for more information.
 * @param {Boolean} [options.flyToBoundsFallback=true] If options.flyToView is
 *     true and no document-level abstract view is explicitly defined,
 *     calculate and fly to a bounds view.
 */
GEarthExtensions.prototype.util.displayKml = function(url, options) {
  options = checkParameters_(options, false, {
    cacheBuster: false,
    flyToView: false,
    flyToBoundsFallback: true,
    aspectRatio: 1.0
  });
  
  if (options.cacheBuster) {
    url += (url.match(/\?/) ? '&' : '?') + '_cacheBuster=' +
        Number(new Date()).toString();
  }

  // TODO: option to choose network link or fetchKml
  var me = this;
  google.earth.fetchKml(me.pluginInstance, url, function(kmlObject) {
    if (kmlObject) {
      me.pluginInstance.getFeatures().appendChild(kmlObject);
      
      if (options.flyToView) {
        me.util.flyToObject(kmlObject, {
          boundsFallback: options.flyToBoundsFallback,
          aspectRatio: options.aspectRatio
        });
      }
    }
  });
};

/**
 * Loads and shows the given KML string in the Google Earth Plugin instance.
 * @param {String} str The KML string to show.
 * @param {Object} [options] KML display options.
 * @param {Boolean} [options.flyToView=false] Fly to the document-level abstract
 *     view in the parsed KML. If no explicit view is available,
 *     a default bounds view will be calculated and used unless
 *     options.flyToBoundsFallback is false.
 *     See GEarthExtensions#util.flyToObject for more information.
 * @param {Boolean} [options.flyToBoundsFallback=true] If options.flyToView is
 *     true and no document-level abstract view is explicitly defined,
 *     calculate and fly to a bounds view.
 * @return Returns the parsed object on success, or null if there was an error.
 */
GEarthExtensions.prototype.util.displayKmlString = function(str, options) {
  options = checkParameters_(options, false, {
    flyToView: false,
    flyToBoundsFallback: true,
    aspectRatio: 1.0
  });
  
  var kmlObject = this.pluginInstance.parseKml(str);
  if (kmlObject) {
    this.pluginInstance.getFeatures().appendChild(kmlObject);
    
    if (options.flyToView) {
      this.util.flyToObject(kmlObject, {
        boundsFallback: options.flyToBoundsFallback,
        aspectRatio: options.aspectRatio
      });
    }
  }
  
  return kmlObject;
};
/**
 * Creates a KmlLookAt and sets it as the Earth plugin's view. This function
 * takes the same parameters as GEarthExtensions#dom.buildLookAt.
 */
GEarthExtensions.prototype.util.lookAt = function() {
  this.pluginInstance.getView().setAbstractView(
      this.dom.buildLookAt.apply(null, arguments));
};

/**
 * Gets the current view as a KmlLookAt.
 * @param {Number} [altitudeMode=ALTITUDE_ABSOLUTE] The altitude mode
 *     that the resulting LookAt should be in.
 * @type KmlLookAt
 * @return Returns the current view as a KmlLookAt.
 */
GEarthExtensions.prototype.util.getLookAt = function(altitudeMode) {
  if (geo.util.isUndefined(altitudeMode)) {
    altitudeMode = this.pluginInstance.ALTITUDE_ABSOLUTE;
  }
  
  return this.pluginInstance.getView().copyAsLookAt(altitudeMode);
};

/**
 * Gets the current view as a KmlCamera.
 * @param {Number} [altitudeMode=ALTITUDE_ABSOLUTE] The altitude mode
 *     that the resulting camera should be in.
 * @type KmlCamera
 * @return Returns the current view as a KmlCamera.
 */
GEarthExtensions.prototype.util.getCamera = function(altitudeMode) {
  if (geo.util.isUndefined(altitudeMode)) {
    altitudeMode = this.pluginInstance.ALTITUDE_ABSOLUTE;
  }
  
  return this.pluginInstance.getView().copyAsCamera(altitudeMode);
};

/**
 * Flies to an object; if the object is a feature and has an explicitly defined
 * abstract view, that view is used. Otherwise, attempts to calculate a bounds
 * view of the object and flies to that (assuming options.boundsFallback is
 * true).
 * @param {KmlObject} obj The object to fly to.
 * @param {Object} [options] Flyto options.
 * @param {Boolean} [options.boundsFallback=true] Whether or not to attempt to
 *     calculate a bounding box view of the object if it doesn't have an
 *     abstract view.
 * @param {Number} [options.aspectRatio=1.0] When calculating a bounding box
 *     view, this should be the current aspect ratio of the plugin window.
 */
GEarthExtensions.prototype.util.flyToObject = function(obj, options) {
  options = checkParameters_(options, false, {
    boundsFallback: true,
    aspectRatio: 1.0
  });
  
  if (!obj) {
    throw new Error('flyToObject was given an invalid object.');
  }
  
  if ('getAbstractView' in obj && obj.getAbstractView()) {
    this.pluginInstance.getView().setAbstractView(
        obj.getAbstractView());
  } else if (options.boundsFallback) {
    var bounds = this.dom.computeBounds(obj);
    if (bounds && !bounds.isEmpty()) {
      this.view.setToBoundsView(bounds, {
        aspectRatio: options.aspectRatio
      });
    }
  }
};

/**
 * Executes the given function quickly using a Google Earth API callback
 * hack. Future versions of this method may use other methods for batch
 * execution.
 * @param {Function} batchFn The function containing batch code to execute.
 * @param {Object} [context] Optional context parameter to pass to the
 *     function.
 */
GEarthExtensions.prototype.util.batchExecute = function(batchFn, context) {
  var me = this;
  google.earth.executeBatch(this.pluginInstance, function() {
    batchFn.call(me, context);
  });
};

/**
 * Enables or disables full camera ownership mode, which sets fly to speed
 * to teleport, disables user mouse interaction, and hides the navigation
 * controls.
 * @param {Boolean} enable Whether to enable or disable full camera ownership.
 */
GEarthExtensions.prototype.util.takeOverCamera = function(enable) {
  if (enable || geo.util.isUndefined(enable)) {
    if (this.cameraControlOldProps_) {
      return;
    }
    
    this.cameraControlOldProps_ = {
      flyToSpeed: this.pluginInstance.getOptions().getFlyToSpeed(),
      mouseNavEnabled:
          this.pluginInstance.getOptions().getMouseNavigationEnabled(),
      navControlVis: this.pluginInstance.getNavigationControl().getVisibility()
    };
    
    this.pluginInstance.getOptions().setFlyToSpeed(
        this.pluginInstance.SPEED_TELEPORT);
    this.pluginInstance.getOptions().setMouseNavigationEnabled(false);
    this.pluginInstance.getNavigationControl().setVisibility(
        this.pluginInstance.VISIBILITY_HIDE);
  } else {
    if (!this.cameraControlOldProps_) {
      return;
    }
    
    this.pluginInstance.getOptions().setFlyToSpeed(
        this.cameraControlOldProps_.flyToSpeed);
    this.pluginInstance.getOptions().setMouseNavigationEnabled(
        this.cameraControlOldProps_.mouseNavEnabled);
    this.pluginInstance.getNavigationControl().setVisibility(
        this.cameraControlOldProps_.navControlVis);
    
    delete this.cameraControlOldProps_;
  }
};
// modified base64 for url
// http://en.wikipedia.org/wiki/Base64
var ALPHABET_ =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// These algorithms are based on the Maps aPI polyline encoding algorithm:
// http://code.google.com/apis/maps/documentation/include/polyline.js

/**
 * Encodes an array of signed numbers into a string.
 * @param {Number[]} arr An array of signed numbers.
 * @type String
 * @return An encoded string representing the array of numbers.
 */
GEarthExtensions.prototype.util.encodeArray = function(arr) {
  var s = '';
  for (var i = 0; i < arr.length; i++) {
    var sgn_num = arr[i] << 1;
    sgn_num = (arr[i] < 0) ? ~sgn_num : sgn_num;

    while (sgn_num >= 0x20) {
      s += ALPHABET_.charAt(0x20 | (sgn_num & 0x1f));
      sgn_num >>= 5;
    }

    s += ALPHABET_.charAt(sgn_num);
  }

  return s;
};

/**
 * Decodes a string representing an array of signed numbers encoded with
 * GEarthExtensions#util.encodeArray.
 * @param {String} str The encoded string.
 * @type Number[]
 */
GEarthExtensions.prototype.util.decodeArray = function(str) {
  var len = str.length;
  var index = 0;
  var array = [];

  while (index < len) {
    var b;
    var shift = 0;
    var result = 0;
    do {
      b = ALPHABET_.indexOf(str.charAt(index++));
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    array.push(((result & 1) ? ~(result >> 1) : (result >> 1)));
  }

  return array;
};
/**
 * This class/namespace hybrid contains various camera/view
 * related.
 * @namespace
 */
GEarthExtensions.prototype.view = {isnamespace_:true};
/**
 * Creates a KmlAbstractView from a bounding box.
 * @param {geo.Bounds} bounds The bounding box for which to create a view.
 * @param {Object} options The parameters of the bounds view.
 * @param {Number} options.aspectRatio The aspect ratio (width : height)
 *     of the plugin viewport.
 * @param {Number} [options.defaultRange=1000] The default lookat range to use
 *     when creating a view for a degenerate, single-point bounding box.
 * @param {Number} [options.scaleRange=1.5] A scaling factor by which
 *     to multiple the lookat range.
 * @type KmlAbstractView
 */
GEarthExtensions.prototype.view.createBoundsView = function(bounds, options) {
  options = checkParameters_(options, false, {
    aspectRatio: REQUIRED_,
    
    defaultRange: 1000,
    scaleRange: 1.5
  });
  
  var center = bounds.center();
  var lookAtRange = options.defaultRange;
  
  var boundsSpan = bounds.span();
  if (boundsSpan.lat || boundsSpan.lng) {
    var distEW = new geo.Point(center.lat(), bounds.east())
       .distance(new geo.Point(center.lat(), bounds.west()));
    var distNS = new geo.Point(bounds.north(), center.lng())
       .distance(new geo.Point(bounds.south(), center.lng()));
    
    var aspectRatio = Math.min(Math.max(options.aspectRatio,
                                        distEW / distNS),
                               1.0);
    
    // Create a LookAt using the experimentally derived distance formula.
    var alpha = (45.0 / (aspectRatio + 0.4) - 2.0).toRadians();
    var expandToDistance = Math.max(distNS, distEW);
    var beta = Math.min((90).toRadians(),
                        alpha + expandToDistance / (2 * geo.math.EARTH_RADIUS));
    
    lookAtRange = options.scaleRange * geo.math.EARTH_RADIUS *
        (Math.sin(beta) * Math.sqrt(1 + 1 / Math.pow(Math.tan(alpha), 2)) - 1);
  }
  
  return this.dom.buildLookAt(
      new geo.Point(center.lat(), center.lng(),
                    bounds.top(), bounds.northEastTop().altitudeMode()),
      { range: lookAtRange });
};

/**
 * Creates a bounds view and sets it as the Earth plugin's view. This function
 * takes the same parameters as GEarthExtensions#view.createBoundsView.
 */
GEarthExtensions.prototype.view.setToBoundsView = function() {
  this.pluginInstance.getView().setAbstractView(
      this.view.createBoundsView.apply(this, arguments));
};
var ENC_OVERFLOW_ = 1073741824;

function encodeCamera_(extInstance, cam) {
  var alt = Math.floor(cam.altitude * 1e1);
  return extInstance.util.encodeArray([
    Math.floor(geo.math.constrainValue(cam.lat, [-90, 90]) * 1e5),
    Math.floor(geo.math.wrapValue(cam.lng, [-180, 180]) * 1e5),
    Math.floor(alt / ENC_OVERFLOW_),
    (alt >= 0) ? alt % ENC_OVERFLOW_
               : (ENC_OVERFLOW_ - Math.abs(alt) % ENC_OVERFLOW_),
    Math.floor(geo.math.wrapValue(cam.heading, [0, 360]) * 1e1),
    Math.floor(geo.math.wrapValue(cam.tilt, [0, 180]) * 1e1),
    Math.floor(geo.math.wrapValue(cam.roll, [-180, 180]) * 1e1)
  ]);
}

function decodeCamera_(extInstance, str) {
  var arr = extInstance.util.decodeArray(str);
  return {
    lat: geo.math.constrainValue(arr[0] * 1e-5, [-90, 90]),
    lng: geo.math.wrapValue(arr[1] * 1e-5, [-180, 180]),
    altitude: (ENC_OVERFLOW_ * arr[2] + arr[3]) * 1e-1,
    heading: geo.math.wrapValue(arr[4] * 1e-1, [0, 360]),
    tilt: geo.math.wrapValue(arr[5] * 1e-1, [0, 180]),
    roll: geo.math.wrapValue(arr[6] * 1e-1, [-180, 180])
  };
}

/**
 * Serializes the current plugin viewport into a modified base64 alphabet
 * string. This method is platform and browser agnostic, and is safe to
 * store and distribute to others.
 * @return {String} A string representing the current viewport.
 * @see http://code.google.com/apis/maps/documentation/include/polyline.js
 *     for inspiration.
 */
GEarthExtensions.prototype.view.serialize = function() {
  var camera = this.pluginInstance.getView().copyAsCamera(
      this.pluginInstance.ALTITUDE_ABSOLUTE);
  return '0' + encodeCamera_(this, {
    lat: camera.getLatitude(),
    lng: camera.getLongitude(),
    altitude: camera.getAltitude(),
    heading: camera.getHeading(),
    tilt: camera.getTilt(),
    roll: camera.getRoll()
  });
};

/**
 * Sets the current plugin viewport to the view represented by the given
 * string.
 * @param {String} viewString The modified base64 alphabet string representing
 *     the view to fly to. This string should've previously been calculated
 *     using GEarthExtensions#view.serialize.
 */
GEarthExtensions.prototype.view.deserialize = function(s) {
  if (s.charAt(0) != '0') {  // Magic number.
    throw new Error('Invalid serialized view string.');
  }

  var cameraProps = decodeCamera_(this, s.substr(1));
  var camera = this.pluginInstance.createCamera('');
  
  // TODO: isFinite checks
  camera.set(cameraProps.lat, cameraProps.lng, cameraProps.altitude,
      this.pluginInstance.ALTITUDE_ABSOLUTE, cameraProps.heading,
      cameraProps.tilt, cameraProps.roll);
  this.pluginInstance.getView().setAbstractView(camera);
};

// Backwards compatibility.
GEarthExtensions.prototype.util.serializeView =
    GEarthExtensions.prototype.view.serialize;
GEarthExtensions.prototype.util.deserializeView =
    GEarthExtensions.prototype.view.deserialize;
/**
 * Creates an abstract view with the viewer at the given camera point, looking
 * towards the given look at point. For best results, use ALTITUDE_ABSOLUTE
 * camera and look at points.
 * @param {PointOptions|geo.Point} cameraPoint The viewer location.
 * @param {PointOptions|geo.Point} lookAtPoint The location to look at/towards.
 * @type KmlAbstractView
 */
GEarthExtensions.prototype.view.createVantageView = function(cameraPoint,
                                                             lookAtPoint) {
  // TODO: handle case where lookat point is directly below camera.
  cameraPoint = new geo.Point(cameraPoint);
  lookAtPoint = new geo.Point(lookAtPoint);
  
  var heading = cameraPoint.heading(lookAtPoint);
  var roll = 0;
  
  // Tilt is the hard part:
  // 
  // Put the positions in world space and get a local orientation matrix for the
  // camera position. The matrix is used to figure out the angle between the
  // upside up vector of the local frame and the direction towards the
  // placemark. This is used for tilt.
  // 
  // Tilt is complicated for two reasons:
  //   1. tilt = 0 is facing down instead of facing towards horizon. This is 
  //      opposite of KML model behavior.
  //   2. tilt is relative to the current position of the camera. Not relative
  //      to say, the North Pole or some other global axis. Tilt is *relative*.
  var cameraCartesian = cameraPoint.toCartesian();
  var lookAtCartesian = lookAtPoint.toCartesian();
  var frame = this.math3d.makeLocalToGlobalFrame(cameraPoint);

  // Create the unit direction vector from the camera to the look at point.
  var lookVec = lookAtCartesian.subtract(cameraCartesian).toUnitVector();

  // Take the angle from the negative upside down vector.
  // See tilt complication reason (1).
  var downVec = new geo.linalg.Vector(frame.elements[2]).multiply(-1);

  // Figure out the tilt angle in degrees.
  var tilt = Math.acos(downVec.dot(lookVec)).toDegrees();

  return this.dom.buildCamera(cameraPoint, {heading: heading, tilt: tilt});
};
window.GEarthExtensions = GEarthExtensions;
})();
/*jslint continue: true, passfail: true, plusplus: true, maxerr: 50, indent: 4, unparam: true*/
/*global window, jQuery, document*/

// Color picker inspired by http://www.web2media.net/laktek/?p=96
// and taken almost as is from AMSO project
(function ($) {
    "use strict";
    var that = {},
        hide,
        toHex = function (color) {
            //if valid HEX code is entered - else rgb color value is entered (by selecting a swatch)
            if (color.match(/[0-9a-fA-F]{3}$/) || color.match(/[0-9a-fA-F]{6}$/)) {
                color = (color.charAt(0) === "#") ? color : ("#" + color);
            } else if (color.match(/^rgb\(([0-9]|[1-9][0-9]|[1][0-9]{2}|[2][0-4][0-9]|[2][5][0-5]),[ ]{0,1}([0-9]|[1-9][0-9]|[1][0-9]{2}|[2][0-4][0-9]|[2][5][0-5]),[ ]{0,1}([0-9]|[1-9][0-9]|[1][0-9]{2}|[2][0-4][0-9]|[2][5][0-5])\)$/)) {
                var c = ([parseInt(RegExp.$1, 10), parseInt(RegExp.$2, 10), parseInt(RegExp.$3, 10)]),
                    r,
                    g,
                    b,
                    pad = function (str) {
                        var i,
                            len;
                        if (str.length < 2) {
                            for (i = 0, len = 2 - str.length; i < len; i++) {
                                str = '0' + str;
                            }
                        }
                        return str;
                    };

                if (c.length === 3) {
                    r = pad(c[0].toString(16));
                    g = pad(c[1].toString(16));
                    b = pad(c[2].toString(16));
                    color = '#' + r + g + b;
                }
            } else {
                color = null;
            }
            return color;
        },
        changeColor = function (newColor) {
            var hex = toHex(newColor);
            hex = hex || 'transparent';
            that.selector.css('background-color', hex);
            hide(true, hex);
        },
        buildPicker = function (useShim) {
            that.control = $("<div class='color-picker'></div>");

            //add color pallete
            var addSwatch = function (swatch) {
                swatch.bind({
                    click: function (e) {
                        changeColor(swatch.css("background-color"));
                    },
                    mouseover: function (e) {
                        swatch.css("border-color", "#598FEF");
                    },
                    mouseout: function (e) {
                        swatch.css("border-color", "#000");
                    }
                });

                that.control.append(swatch);
            };

            $.each($.fn.colorPicker.defaultColors, function (i) {
                var swatch = $("<div class='color_swatch'>&nbsp;</div>");
                swatch.css("background-color", "#" + this);
                addSwatch(swatch);
            });

            addSwatch($("<div class='nocolor'>transparent</div>"));

            $('body').append(that.control);

            if (useShim) {
                that.iframeShim = document.createElement('iframe');
                that.iframeShim.frameBorder = 0;
                that.iframeShim.scrolling = 'no';
                that.iframeShim.src = ['javascript', ':false;'].join(''); // join to avoid jslint complaint about javascript url
                that.iframeShim.style.position = 'absolute';
                that.iframeShim.style.width = that.control.width() + 'px';
                that.iframeShim.style.height = that.control.height() + 'px';
                $('body').append(that.iframeShim);
            }
        },
        checkMouse = function (event) {
            // mouse click elsewhere causes it to be hidden
            if (event.target === that.control || $(event.target).parent()[0] === that.control[0]) {
                return;
            }

            hide();
        },
        resetHeight = function () {
            that.control.css('height', ''); // jquery bug? stop during a slide keeps current height forever!
        },
        show = function (element, callback, useShim) {
            that.selector = element;

            if (!that.control) {
                buildPicker(useShim);
            }

            hide();

            var pos = element.offset(),
                top = Math.max(0, pos.top - that.control.height()), // dont go off top
                winder = $(window),
                left = Math.max(0, pos.left); // dont go off left
            top = Math.min(top, winder.height() - that.control.height()); // dont go off bottom
            left = Math.min(left, winder.width() - that.control.width()); // dont go off right

            that.control.css({
                left: left + 'px',
                top: top + 'px'
            });

            if (that.iframeShim) {
                that.iframeShim.style.left = left + 'px';
                that.iframeShim.style.top = top + 'px';
                that.iframeShim.style.zIndex = that.control.css('z-index') - 1;
            }

            that.control.slideDown("slow");
            that.callback = callback;
            $('body').bind("mousedown", checkMouse);
        };

    hide = function (animate, newColor) {
        that.control.stop(true);
        if (animate) {
            that.control.slideUp("slow", function () {
                resetHeight();
            });
        } else {
            that.control.hide();
            resetHeight();
        }
        $('body').unbind("mousedown", checkMouse);

        if (that.iframeShim) {
            that.iframeShim.style.zIndex = -500;
        }

        if (that.callback) {
            that.callback(newColor);
            delete that.callback;
        }
    };

    $.fn.colorPicker = function (color, callback, useShim) {
        var it = this;

        return this.css('background-color', color)
            .bind("mouseover", function (e) {
                it.css("border-color", "#598FEF");
            })
            .bind("mouseout", function (e) {
                it.css("border-color", "#000");
            })
            .click(function () {
                show(it, callback, useShim);
            });
    };

    $.fn.colorPicker.hide = function (animate) {
        hide(animate);
    };

    $.fn.colorPicker.defaultColors = ['000000', '993300', '333300', '000080', '333399', '333333', '800000', 'FF6600', '808000', '008000', '008080', '0000FF', '666699', '808080', 'FF0000', 'FF9900', '99CC00', '339966', '33CCCC', '3366FF', '800080', '999999', 'FF00FF', 'FFCC00', 'FFFF00', '00FF00', '00FFFF', '00CCFF', '993366', 'C0C0C0', 'FF99CC', 'FFCC99', 'FFFF99', 'CCFFFF', '99CCFF', 'FFFFFF', '15428B', 'DFE8F6'];
}(jQuery));/*jslint continue: true, passfail: true, plusplus: true, maxerr: 50, indent: 4, unparam: true*/
/*global $, document, util, jc2cui*/

// Note: borrows heavily from http://earth-api-samples.googlecode.com/svn/trunk/demos/myearth/index.html

util.namespace('jc2cui.mapWidget'); // var jc2cui = jc2cui || {}; no longer passes JSlint :(
jc2cui.mapWidget.featureEditor = (function () {
    "use strict";

    var useShim,
        data,
        MARKER_ICONS_PER_ROW = 7,
        markerIconUrls = (function () {
            var urls = [],
                styles = [
                    '-circle.png',
                    '-blank.png',
                    '-pushpin.png'
                ],
                colors = ['blu', 'red', 'grn', 'ltblu', 'ylw', 'purple', 'pink'],
                shapes = [
                    'dining', 'coffee', 'bars', 'snack_bar', 'tram', 'lodging', 'wheel_chair_accessible',
                    'shopping', 'movies', 'convenience', 'grocery', 'arts', 'homegardenbusiness', 'electronics',
                    'mechanic', 'partly_cloudy', 'realestate', 'salon', 'dollar', 'parking_lot', 'gas_stations',
                    'cabs', 'bus', 'truck', 'rail', 'airports', 'ferry', 'heliport',
                    'subway', 'info', 'flag', 'earthquake', 'webcam', 'post_office', 'police',
                    'firedept', 'hospitals', 'info_circle', 'phone', 'caution', 'falling_rocks', 'camera',
                    'parks', 'campfire', 'picnic', 'campground', 'ranger_station', 'toilets', 'poi',
                    'hiker', 'cycling', 'motorcycling', 'horsebackriding', 'play', 'golf', 'trail',
                    'water', 'snowflake_simple', 'marina', 'fishing', 'sailing', 'swimming', 'ski',
                    'woman', 'man', 'rainy', 'volcano', 'sunny', 'euro', 'yen'
                ],
                i,
                j,
                color;

            for (i = 0; i < styles.length; i++) {
                for (j = 0; j < colors.length; j++) {
                    color = colors[j];
                    urls.push([jc2cui.mapWidget.getAppPath(), 'images/', color, styles[i]].join(''));
                }
            }

            for (i = 0; i < shapes.length; i++) {
                urls.push([jc2cui.mapWidget.getAppPath(), 'images/', shapes[i], '.png'].join(''));
            }
            return urls;
        }());

    function populateMarkerCharacteristics(characteristics) {
        var iconDiv = $('<div id="marker-icons">').appendTo(characteristics),
            i,
            bgPos,
            getIconClickFunc = function (href) {
                return function (icon) {
                    data.iconUrl = href;
                    $('#characteristicsButton', characteristics.parent()).attr("src", data.iconUrl);

                    $('.marker-icon', iconDiv).removeClass('selected');
                    $(this).addClass('selected');
                };
            };

        for (i = 0; i < markerIconUrls.length; i++) {
            bgPos = [-(i % MARKER_ICONS_PER_ROW) * 32, -Math.floor(i / MARKER_ICONS_PER_ROW) * 32];
            $('<a class="marker-icon" tabindex="1"></a>')
                .css('background-position', bgPos[0] + 'px ' + bgPos[1] + 'px')
                .appendTo(iconDiv)
                .click(getIconClickFunc(markerIconUrls[i]));
        }
    }

    function populateLineCharacteristics(characteristics) {
        var div = $('<div><label>line color <input id="strokeColor" type="text"></label><label>line width (pixels) <input id="strokeWeight" type="text"></label><label>line opacity <input id="strokeOpacity" type="text"></label></div>').appendTo(characteristics);
        $('#strokeColor', div).colorPicker(data.strokeColor, function (color) {
            data.strokeColor = color;
            $('#mask', characteristics.parent()).css({
                'background-color': data.type === 'line' ? data.strokeColor : data.fillColor,
                'border-color': data.strokeColor
            });
        }, useShim);
        $('#strokeWeight', div)
            .val(data.strokeWeight)
            .change(function () {
                var strokeWeight = parseInt($(this).val(), 10);
                if (!isNaN(strokeWeight)) {
                    data.strokeWeight = strokeWeight;
                }
            });
        $('#strokeOpacity', div)
            .val(Math.floor(100 * data.strokeOpacity))
            .change(function () {
                var strokeOpacity = parseInt($(this).val(), 10);
                if (!isNaN(strokeOpacity)) {
                    strokeOpacity = Math.max(0, Math.min(100, strokeOpacity)) / 100;
                    data.strokeOpacity = strokeOpacity;
                }
            });
    }

    function populateShapeCharacteristics(characteristics) {
        var div = $('<div><label>fill color <input id="fillColor" type="text"></label><label>fill opacity <input id="fillOpacity" type="text"></label></div>').appendTo(characteristics);
        $('#fillColor', div).colorPicker(data.fillColor, function (color) {
            data.fillColor = color;
            $('#mask', characteristics.parent()).css({
                'background-color': data.type === 'line' ? data.strokeColor : data.fillColor
            });
        }, useShim);
        $('#fillOpacity', div)
            .val(Math.floor(100 * data.fillOpacity))
            .change(function () {
                var fillOpacity = parseInt($(this).val(), 10);
                if (!isNaN(fillOpacity)) {
                    fillOpacity = Math.max(0, Math.min(100, fillOpacity)) / 100;
                    data.fillOpacity = fillOpacity;
                }
            });
    }

    function getCharacteristics(type, container) {
        var characteristics = $('<div id="characteristics""><div id="back">back</div></div>').appendTo(container);

        switch (type) {
        case 'marker':
            populateMarkerCharacteristics(characteristics);
            break;
        case 'line':
            populateLineCharacteristics(characteristics);
            break;
        case 'shape':
            populateLineCharacteristics(characteristics);
            populateShapeCharacteristics(characteristics);
            break;
        }

        return characteristics;
    }

    return {
        useShim: function (val) { // should color picker use shim (earth plugin in IE for example)
            useShim = val;
        },
        getEditFeatureHtml: function (props, callbacks) {
            data = props;
            var content = $([
                    '<div class="editFeature">',
                    '<div id="outer">',
                    '<div id="basic">',
                    '<div class="bold top">Title <input id="title" type="text" id="title" />',
                    '<div id="mask"><img id="characteristicsButton" src="',
                    data.iconUrl,
                    '" title="Click to set ',
                    data.type,
                    ' characteristics">',
                    '</div>',
                    '</div>',
                    '<div class="bold section">Description',
                    '</div>',
                    '<textarea id="description"></textarea>',
                    '</div>',
                    '</div>',
                    '<div class="buttons"><span id="delete" class="button">delete</span><span id="cancel" class="button">cancel</span><span id="ok" class="button">ok</span>',
                    '</div>',
                    '</div>'
                ].join('')),
                basic,
                characteristics;

            $('#title', content).val(data.title || '');
            $('#description', content).val(data.description || '');

            $('#characteristicsButton', content).click(function () {
                if (!basic) {
                    basic = $('#basic', content);
                }
                if (!characteristics) {
                    characteristics = getCharacteristics(data.type, $('#outer', content));
                }
                $('#back', characteristics).click(function () {
                    characteristics.hide();
                    basic.show();
                });
                basic.hide();
                characteristics.show();
            });

            $('#mask', content).css({
                'background-color': data.type === 'marker' ? 'transparent' : data.type === 'line' ? data.strokeColor : data.fillColor,
                'border-color': data.type === 'marker' ? 'transparent' : data.strokeColor
            });

            $('#delete', content).click(function () {
                if (callbacks && callbacks.deleted) {
                    callbacks.deleted();
                }
            });
            $('#ok', content).click(function () {
                if (callbacks && callbacks.updated) {
                    data.title = $('#title', content).val();
                    data.description = $('#description', content).val();
                    callbacks.updated(data);
                }
            });
            $('#cancel', content).click(function () {
                if (callbacks && callbacks.canceled) {
                    callbacks.canceled();
                }
            });

            return content[0];
        }
    };
}());



/*jslint continue: true, passfail: true, plusplus: true, regexp: true, maxerr: 50, indent: 4, unparam: true*/
/*global $, google, GEarthExtensions, geo, console, document, window, setTimeout, clearTimeout, setInterval, clearInterval, util, jc2cui*/

// Note: drawing support borrows heavily from http://earth-api-samples.googlecode.com/svn/trunk/demos/myearth/index.html

var OWF;

function googleLoaded() {
    "use strict";
    jc2cui.mapWidget.renderer.googleReady();
}

function earthLoaded() {
    "use strict";
    jc2cui.mapWidget.renderer.earthReady();
}

util.namespace('jc2cui.mapWidget'); // var jc2cui = jc2cui || {}; no longer passes JSlint :(
jc2cui.mapWidget.renderer = (function () {
    "use strict";
    var config,
        ge,
        mapDiv = $('#map'),
        idToUUIDMap = {}, // part of KmlFolder.release not working hack
        UUIDtoIdMap = {}, // part of KmlFolder.release not working hack
        usedIds = {}, // part of KmlFolder.release not working hack
        gex,
        viewTimeout,
        handButton,
        markerButton,
        lineButton,
        polyButton,
        drawingMode,
        createdFeatures = {},
        featureInCreation,
        MARKER_DRAG_TARGET = {
            icon: jc2cui.mapWidget.getAppPath() + 'images/cross-hairs.png',
            overlayXY: { left: '50%', top: '50%' },
            screenXY: { left: 0, top: 0 },
            size: { left: 32, bottom: 32 }
        },
        DEFAULT_FEATURE_STYLE = {
            icon: {
                href: jc2cui.mapWidget.getDefaultDrawingIcon(),
                hotSpot: { bottom: 0, left: '50%' }
            },
            line: {
                width: 3,
                color: 'CC8B4215'
            },
            poly: {
                color: '99F6E8DF'
            }
        },
        setDrawingMode,
        numberDrawn = { marker: 0, shape: 0, line: 0 },
        makeFeatureEditable,
        visibleOverlays = {}, // earth requires parents to be visible if any child is to be visible, need to know if they really arent
        objectToId = {},  // mapping of ids to KmlObjects.
        overlayToId = {}, // mapping of overlays the last numeric id used when mapping its child nodes to ids.
        nwLinkObjs = {}, // mapping of overlays to the nwLinkObjs used with network links in each overlay
        getNetworkLinkReloadFunction,
        wmsBackgroundDrawOrderIndex = -10000, // keep wms background layers drawn on bottom (in order of load)
        currentView,
        defaultLayers = { layers: [], idMap: {} },
        saveDefaultLayers,
        scale,
        apiRootFolder,
        globalLoadMorePlacemarks,
        featureLoadMorePlacemarks = {},
        waitingForUser,
        maxPlacemarks;

    // 3 functions added as hack to work around bug - google earth KmlFolder.release not working and reusing same id causes error
    function getUniqueId(id) {
        var uuid = idToUUIDMap[id];
        if (uuid > 2) {
            id += (--uuid);
        }
        return id;
    }

    function getExistingFolder(id, parent) {
        var container = parent || apiRootFolder;
        return container.getElementById(getUniqueId(id));
    }

    function getOrCreateFolder(id, name, parentOverlayId) {
        var idToUse = id,
            uuid,
            folder,
            parent,
            visible = true;

        if (parentOverlayId) {
            parent = getOrCreateFolder(parentOverlayId);
        } else {
            parent = apiRootFolder;
        }
        folder = getExistingFolder(idToUse, parent);
        if (!folder) {
            while (usedIds[idToUse]) { // in case of overlay1 and overlay12 type scenarios
                uuid = idToUUIDMap[id] || 1;
                if (uuid > 1) {
                    idToUse += uuid.toString(10);
                }
                uuid++;
                idToUUIDMap[id] = uuid;
            }
            UUIDtoIdMap[idToUse] = id;
            usedIds[idToUse] = true;
            folder = ge.createFolder(idToUse);
            folder.setName(name || id);

            if (parentOverlayId) {
                visible = visibleOverlays[parentOverlayId];
            }
            if (!visible) {
                folder.setVisibility(false);
            }
            visibleOverlays[id] = visible;
            parent.getFeatures().appendChild(folder);
        }
        return folder;
    }
    // End hack

    function kmlColorToCssColor(kmlColor) {
        var replaced = kmlColor.replace(/^(..)(..)(..)(..)$/, '#$4$3$2');
        return (replaced === kmlColor) ? 'transparent' : replaced;
    }

    function kmlColorToOpacity(kmlColor) {
        var replaced = kmlColor.replace(/^(..)(..)(..)(..)$/, '$1');
        return (replaced === kmlColor) ? 1.0 : parseInt(replaced, 16) / 255;
    }

    function isObjectVisible(kmlObject) {
        var parent = kmlObject;
        while (parent) {
            if (parent.getType() === 'GEGlobe') {
                break;
            }
            if (!parent.getVisibility()) {
                return false;
            }
            parent = parent.getParentNode();
        }
        return true;
    }

    function showFeatureBalloon(feature) {
        var data = { title: feature.title, description: feature.description, type: feature.type },
            styleSelector,
            editFeatureHtml,
            balloon,
            style;

        styleSelector = feature.earthObject.getStyleSelector() || ge.createStyle('');

        if (feature.type === 'marker') {
            data.iconUrl = styleSelector.getIconStyle().getIcon().getHref();
        } else {
            data.iconUrl = jc2cui.mapWidget.getAppPath() + (feature.type === 'line' ? 'images/lineMask.png' : 'images/polyMask.png');

            style = styleSelector.getLineStyle();
            if (style) {
                data.strokeWeight = style.getWidth();
                data.strokeColor = kmlColorToCssColor(style.getColor().get());
                data.strokeOpacity = kmlColorToOpacity(style.getColor().get());
            }

            if (feature.type === 'shape') {
                style = styleSelector.getPolyStyle();
                if (style) {
                    data.fillColor = kmlColorToCssColor(style.getColor().get());
                    data.fillOpacity = kmlColorToOpacity(style.getColor().get());
                }
            }
        }

        editFeatureHtml = jc2cui.mapWidget.featureEditor.getEditFeatureHtml(data, {
            deleted: function () {
                makeFeatureEditable(feature, false);
                //gex.dom.removeObject(feature.featureFolder); // mapWidget calls back to removeKml
                //feature.featureFolder.release();
                delete createdFeatures[feature.id];
                jc2cui.mapWidget.deleteDrawing(feature.id);
                ge.setBalloon(null);
            },
            updated: function (updateProps) {
                feature.title = updateProps.title;
                feature.description = updateProps.description;
                feature.earthObject.setName(feature.title);
                feature.earthObject.setDescription(feature.description);

                if (feature.type === 'marker') {
                    feature.earthObject.setStyleSelector(gex.dom.buildStyle({ icon: { href: updateProps.iconUrl, hotSpot: DEFAULT_FEATURE_STYLE.icon.hotSpot} }));
                } else {
                    var styleSelector = feature.earthObject.getStyleSelector();
                    if (!styleSelector) {
                        styleSelector = ge.createStyle('');
                        feature.earthObject.setStyleSelector(styleSelector);
                    }
                    styleSelector.getLineStyle().getColor().set(gex.util.parseColor(updateProps.strokeColor, updateProps.strokeOpacity));
                    styleSelector.getLineStyle().setWidth(updateProps.strokeWeight);

                    if (feature.type === 'shape') {
                        styleSelector.getPolyStyle().getColor().set(gex.util.parseColor(updateProps.fillColor, updateProps.fillOpacity));
                    }
                }
                ge.setBalloon(null);
                setTimeout(function () { // or kml includes ballonVisibility === 1
                    jc2cui.mapWidget.publishDrawing(feature.earthObject.getKml(), feature.id, feature.title, isObjectVisible(feature.earthObject));
                }, 1);
            },
            canceled: function () {
                ge.setBalloon(null);
            }
        });

        balloon = ge.createHtmlDivBalloon('');
        balloon.setFeature(feature.earthObject);
        balloon.setContentDiv(editFeatureHtml);
        balloon.setMinHeight(224); // bigger in case horizontal scrollbar needed and earth bug doesnt account for scrollbar height
        balloon.setMinWidth(256);
        balloon.setMaxWidth(256);
        ge.setBalloon(balloon);
    }

    makeFeatureEditable = function (feature, editable) {
        if (feature.editable === editable) {
            return;
        }

        var editFeatureCallback = function () {
            if (feature.editTimeout) {
                window.clearTimeout(feature.editTimeout);
            }
            feature.editTimeout = window.setTimeout(function () {
                delete feature.editTimeout;
                jc2cui.mapWidget.publishDrawing(feature.earthObject.getKml(), feature.id, feature.title, isObjectVisible(feature.earthObject));
            }, 500);
        };

        if (editable && !feature.clickFeatureCallback) {
            feature.clickFeatureCallback = function (event) {
                if (event.getButton() !== 0) {
                    return;
                }
                event.preventDefault();
                showFeatureBalloon(feature);
            };
        }

        if (editable) {
            google.earth.addEventListener(feature.earthObject, 'click', feature.clickFeatureCallback);
        } else {
            google.earth.removeEventListener(feature.earthObject, 'click', feature.clickFeatureCallback);
        }

        switch (feature.type) {
        case 'marker':
            if (editable) {
                gex.edit.makeDraggable(feature.earthObject, {
                    targetScreenOverlay: MARKER_DRAG_TARGET,
                    dropCallback: editFeatureCallback
                });
            } else {
                gex.edit.endDraggable(feature.earthObject);
            }
            break;

        case 'line':
            if (editable) {
                gex.edit.editLineString(feature.earthObject.getGeometry(), {
                    editCallback: editFeatureCallback
                });
            } else {
                gex.edit.endEditLineString(feature.earthObject.getGeometry());
            }
            break;

        case 'shape':
            if (editable) {
                gex.edit.editLineString(feature.earthObject.getGeometry().getOuterBoundary(), {
                    editCallback: editFeatureCallback
                });
            } else {
                gex.edit.endEditLineString(feature.earthObject.getGeometry().getOuterBoundary());
            }
            break;
        }

        feature.editable = editable;
    };

    function abortCreateFeature() {
        if (!featureInCreation) {
            return;
        }
        switch (drawingMode) {
        case 'marker':
            gex.edit.endDraggable(featureInCreation.earthObject);
            break;
        case 'line':
            gex.edit.endEditLineString(featureInCreation.earthObject.getGeometry());
            break;
        case 'shape':
            gex.edit.endEditLineString(featureInCreation.earthObject.getGeometry().getOuterBoundary());
            break;
        }
        gex.dom.removeObject(featureInCreation.featureFolder);
        featureInCreation.featureFolder.release();
        featureInCreation = null;
    }

    function finishCreateFeature() {
        var folder = featureInCreation.featureFolder,
            parentNode,
            it;
        if (folder) {
            folder.setVisibility(true);
            parentNode = folder.getParentNode();
            if (parentNode) {
                parentNode.setVisibility(true);
            }
        }
        jc2cui.mapWidget.publishDrawing(featureInCreation.earthObject.getKml(), featureInCreation.id, featureInCreation.title, isObjectVisible(featureInCreation.earthObject));
        makeFeatureEditable(featureInCreation, true);
        createdFeatures[featureInCreation.id] = featureInCreation;
        it = featureInCreation;
        window.setTimeout(function () { // featureInCreation.earthObject apparently not usable during drop of marker
            showFeatureBalloon(it);
        }, 1000); // firefox often freezes if attempts to zoom and show info at same time
        featureInCreation = null;
        setDrawingMode('hand');
    }

    setDrawingMode = function (mode) {
        var id = jc2cui.mapWidget.getNewId(),
            folder,
            placemark,
            geom;
        getOrCreateFolder(jc2cui.mapWidget.USER_DRAWN_OVERLAY, jc2cui.mapWidget.USER_DRAWN_OVERLAY);
        folder = getOrCreateFolder('_f.' + id, '', jc2cui.mapWidget.USER_DRAWN_OVERLAY);
        abortCreateFeature();
        drawingMode = mode;
        handButton.setSelected(drawingMode === 'hand');
        markerButton.setSelected(drawingMode === 'marker');
        lineButton.setSelected(drawingMode === 'line');
        polyButton.setSelected(drawingMode === 'shape');
        if (drawingMode === 'hand') {
            return;
        }

        featureInCreation = {
            id: id,
            title: mode + ' ' + (++numberDrawn[mode]),
            kml: null,
            earthObject: null,
            featureFolder: folder,
            type: mode,
            dirty: true
        };

        switch (mode) {
        case 'marker':
            placemark = gex.dom.buildPointPlacemark(
                [0, 0, 0, ge.ALTITUDE_CLAMP_TO_SEA_FLOOR],
                {
                    name: featureInCreation.title,
                    style: { icon: DEFAULT_FEATURE_STYLE.icon },
                    id: featureInCreation.id
                }
            );
            folder.getFeatures().appendChild(placemark);
            featureInCreation.earthObject = placemark;
            gex.edit.place(placemark, {
                targetScreenOverlay: MARKER_DRAG_TARGET,
                dropCallback: function () {
                    // give time for the abort to happen if the user clicks the
                    // hand tool in the geometry toolbox
                    window.setTimeout(finishCreateFeature, 100);
                },
                bounce: false
            });
            break;
        case 'line':
        case 'shape':
            placemark = gex.dom.buildPlacemark({
                lineString: (mode === 'line') ? [] : undefined,
                polygon: (mode === 'shape') ? [] : undefined,
                name: featureInCreation.title,
                style: { line: DEFAULT_FEATURE_STYLE.line, poly: DEFAULT_FEATURE_STYLE.poly },
                id: featureInCreation.id
            });
            folder.getFeatures().appendChild(placemark);
            featureInCreation.earthObject = placemark;
            geom = (mode === 'line') ? placemark.getGeometry() : placemark.getGeometry().getOuterBoundary();
            placemark.getGeometry().setAltitudeMode(ge.ALTITUDE_CLAMP_TO_GROUND);
            geom.setAltitudeMode(ge.ALTITUDE_CLAMP_TO_GROUND);
            geom.setTessellate(true);
            gex.edit.drawLineString(geom, {
                finishCallback: function () {
                    // give time for the abort to happen if the user clicks the
                    // hand tool in the geometry toolbox
                    window.setTimeout(finishCreateFeature, 100);
                },
                bounce: false
            });
            break;
        }
    };

    function createScreenOverlayButton(image, x, y, width, height) {
        var addOverlayForState = function (suffix, drawOrder, visible) {
                var icon = ge.createIcon(''),
                    overlay = ge.createScreenOverlay('');
                icon.setHref(jc2cui.mapWidget.getAppPath() + 'images/' + image + suffix + '.png');
                overlay.setDrawOrder(drawOrder || 0);
                overlay.setVisibility(visible || false);
                overlay.setIcon(icon);
                overlay.getOverlayXY().set(x, ge.UNITS_PIXELS, y, ge.UNITS_INSET_PIXELS);
                overlay.getScreenXY().set(0, ge.UNITS_FRACTION, 1, ge.UNITS_FRACTION);
                overlay.getSize().set(width, ge.UNITS_PIXELS, height, ge.UNITS_PIXELS);
                ge.getFeatures().appendChild(overlay);
                return overlay;
            },
            overlayReg = addOverlayForState('u', 1, true),
            overlayDown = addOverlayForState('d', 2, false),
            isMouseOnButton = function (mx, my) {
                return x <= mx && mx <= x + width && y <= my && my <= y + height;
            },
            selected = false;

        return {
            isMouseOnButton: function (mx, my) {
                return isMouseOnButton(mx, my);
            },
            getVisibility: function () {
                return overlayReg.getVisibility();
            },
            setVisibility: function (state) {
                overlayReg.setVisibility(state);
                overlayDown.setVisibility(state ? selected : false);
            },
            setSelected: function (state) {
                selected = state;
                overlayDown.setVisibility(selected);
            }
        };
    }

    function setDrawingToolsVisibility(show) {
        if (show) {
            if (!handButton) {
                handButton = createScreenOverlayButton('Bs', 100, 10, 31, 31);
                markerButton = createScreenOverlayButton('Bm', 131, 10, 31, 31);
                lineButton = createScreenOverlayButton('Bl', 162, 10, 31, 31);
                polyButton = createScreenOverlayButton('Bp', 193, 10, 31, 31);
            } else {
                handButton.setVisibility(true);
                markerButton.setVisibility(true);
                lineButton.setVisibility(true);
                polyButton.setVisibility(true);
            }
            setDrawingMode('hand');
        } else {
            setDrawingMode('hand');
            handButton.setVisibility(false);
            markerButton.setVisibility(false);
            lineButton.setVisibility(false);
            polyButton.setVisibility(false);
        }
        $.each(createdFeatures, function (index, feature) {
            makeFeatureEditable(feature, show);
        });
    }

    function getCurrentView() {
        var view = ge.getView();
        return {
            lookAt: view.copyAsLookAt(ge.ALTITUDE_RELATIVE_TO_GROUND), // TBD - Should this be ABSOLUTE?
            bounds: view.getViewportGlobeBounds(),
            camera: view.copyAsCamera(ge.ALTITUDE_RELATIVE_TO_GROUND) // TBD - Should this be ABSOLUTE?
        };
    }

    function getViewStatus() {
        if (!currentView) {
            currentView = getCurrentView();
        }
        return jc2cui.mapWidget.createViewStatus(currentView.bounds.getSouth(), currentView.bounds.getWest(), currentView.bounds.getNorth(), currentView.bounds.getEast(), currentView.lookAt.getLatitude(), currentView.lookAt.getLongitude(), currentView.lookAt.getRange());
    }

    function getSelectedData(item) {
        var parent = item.getParentNode(),
            featureFolder,
            folderId,
            featureId,
            overlayFolder;

        while (parent.getType() !== 'GEGlobe') {
            featureFolder = parent;
            folderId = featureFolder.getId();
            if (UUIDtoIdMap[folderId]) {
                break;
            }
            parent = parent.getParentNode();
        }

        if (!featureFolder) {
            return;
        }

        featureId = UUIDtoIdMap[featureFolder.getId()];
        featureId = featureId.substr(3); // chop off _f.
        overlayFolder = featureFolder.getParentNode();

        if (!overlayFolder) {
            return;
        }

        return {
            selectedId: item.getId() || '',
            selectedName: item.getName() || '',
            featureId: featureId,
            overlayId: UUIDtoIdMap[overlayFolder.getId()]
        };
    }

    function contains(bounds, lat, lon) {
        var tol = 0.000001;

        return lat >= bounds.south - tol
            && lat <= bounds.north + tol
            && lon >= bounds.west - tol
            && lon <= bounds.east + tol;
    }

    function doBoundsIntersect(bounds1, bounds2) {
        return contains(bounds1, bounds2.south, bounds2.west)
            || contains(bounds1, bounds2.north, bounds2.west)
            || contains(bounds1, bounds2.north, bounds2.east)
            || contains(bounds1, bounds2.south, bounds2.east)
            || contains(bounds2, bounds1.south, bounds1.west)
            || contains(bounds2, bounds1.north, bounds1.west)
            || contains(bounds2, bounds1.north, bounds1.east)
            || contains(bounds2, bounds1.south, bounds1.east);
    }

    // haversine - using nice fast implementation from extensions - not calling directly since it requires point objects
    function calcDistance(lat1, lon1, lat2, lon2) {
        var phi1 = lat1.toRadians(),
            phi2 = lat2.toRadians(),
            d_phi = (lat2 - lat1).toRadians(),
            d_lmd = (lon2 - lon1).toRadians(),
            A = Math.pow(Math.sin(d_phi / 2), 2) +
                Math.cos(phi1) * Math.cos(phi2) *
                  Math.pow(Math.sin(d_lmd / 2), 2);

        return geo.math.EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A));
    }

    // See http://stackoverflow.com/questions/9707159/google-earth-plugin-api-how-can-i-get-the-current-map-scale
    function getSomethingResemblingScale() {
        var hw = mapDiv.width() / 2,
            hh = mapDiv.height() / 2,
            view = ge.getView(),
            hitTest1 = view.hitTest(hw - 15, ge.UNITS_PIXELS, hh, ge.UNITS_PIXELS, ge.HIT_TEST_GLOBE),
            hitTest2 = view.hitTest(hw + 15, ge.UNITS_PIXELS, hh, ge.UNITS_PIXELS, ge.HIT_TEST_GLOBE),
            dist;

        if (!hitTest1 || !hitTest2) {
            console.log('Unable to determine scale');
            return 0;
        }
        dist = calcDistance(hitTest1.getLatitude(), hitTest1.getLongitude(), hitTest2.getLatitude(), hitTest2.getLongitude());
        return dist / 30;
    }

    //mimicking isRegionActive in mapsV2 and mapsV3
    // seems slow when using plugin region objects so storing regions as javascript objects instead
    function isRegionActive(region, bounds) {
        if (!region) {
            return false;
        }

        var distWidth,
            distHeight,
            pixelWidth,
            pixelHeight,
            squareRoot;

        if (!doBoundsIntersect(bounds, region)) {
            //return RegionCodes.OUT_OF_AREA;
            return false;
        }

        distWidth = calcDistance(region.south, region.west, region.south, region.east);
        distHeight = calcDistance(region.south, region.west, region.north, region.west);

        pixelWidth = distWidth / scale;
        pixelHeight = distHeight / scale;

        squareRoot = (Math.round(Math.sqrt(pixelWidth * pixelHeight))).toFixed(0);

        if (region.lod) {
            // TBD - Should these checks be <= and >= ???????
            if (squareRoot < region.lod.minLodPixels) {
                return false; // RegionCodes.MIN_LOD;
            }

            if (region.lod.maxLodPixels >= 0 && squareRoot > region.lod.maxLodPixels) {
                return false; // RegionCodes.MAX_LOD;
            }
        }

        return true; // RegionCodes.ACTIVE;
    }

    function closeBalloon(mapObject) {
        var parent,
            kmlLinks,
            i,
            balloonFeature,
            featureUrl,
            theHref,
            indexOf,
            urlSubstr;
        if (ge && ge.getBalloon() && ge.getBalloon().getFeature()) {
            balloonFeature = ge.getBalloon().getFeature();
            if (balloonFeature === mapObject) {
                ge.setBalloon(null);
            } else {
                parent = ge.getBalloon().getFeature().getParentNode();
                while (parent && parent.getType() !== 'GEGlobe') {
                    if (parent === mapObject) {
                        ge.setBalloon(null);
                        break;
                    }
                    parent = parent.getParentNode();
                }

                // if balloon didn't get closed by previous code, try this...
                if (ge.getBalloon() && balloonFeature) {
                    kmlLinks = mapObject.getElementsByType('KmlLink');
                    if (kmlLinks) {
                        featureUrl = balloonFeature.getUrl();
                        indexOf = featureUrl.lastIndexOf('#');
                        urlSubstr = featureUrl.slice(0, indexOf);
                        if (indexOf !== -1) {
                            for (i = 0; i < kmlLinks.getLength(); i++) {
                                theHref = kmlLinks.item(i).getHref();
                                if (theHref === urlSubstr) {
                                    ge.setBalloon(null);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    //populate nwlObjs with nwlObj and all its children
    function populateWithAllNwlObjects(nwlObj, nwlObjs) {
        var childIndex;
        if (!nwlObj || !nwlObjs) {
            return;
        }

        nwlObjs.push(nwlObj);

        if (!nwlObj.children) {
            return;
        }

        for (childIndex = 0; childIndex < nwlObj.children.length; ++childIndex) {
            populateWithAllNwlObjects(nwlObj.children[childIndex], nwlObjs);
        }
    }

    function getAllNestedFolderIds(overlayId, overlays, folder) {
        var i,
            folders,
            folderId;

        overlays.push(overlayId);

        if (!folder) {
            folder = getExistingFolder(overlayId);
        }

        if (folder) {
            folders = folder.getElementsByType('KmlFolder');
            for (i = 0; i < folders.getLength(); i++) {
                folderId = folders.item(i).getId();
                if (folderId.length) {
                    if (UUIDtoIdMap[folderId]) {
                        folderId = UUIDtoIdMap[folderId];
                    }
                    overlays.push(folderId);
                }
            }
        }
    }

    function formatView(format) {
        if (!currentView) {
            currentView = getCurrentView();
        }
        format = format.replace('[bboxWest]', currentView.bounds.getWest());
        format = format.replace('[bboxSouth]', currentView.bounds.getSouth());
        format = format.replace('[bboxEast]', currentView.bounds.getEast());
        format = format.replace('[bboxNorth]', currentView.bounds.getNorth());

        format = format.replace('[lookatLon]', currentView.lookAt.getLongitude());
        format = format.replace('[lookatLat]', currentView.lookAt.getLatitude());
        format = format.replace('[lookatRange]', currentView.lookAt.getRange());
        format = format.replace('[lookatTilt]', currentView.lookAt.getTilt());
        format = format.replace('[lookatHeading]', currentView.lookAt.getHeading());

        // point on the terrain in degrees/meters that <LookAt> is viewing - TBD - Probably wrong to have both lookAt and lookAtTerrain based off same lookAt. One should probably be absolute and one ground level
        format = format.replace('[lookatTerrainLon]', currentView.lookAt.getLongitude());
        format = format.replace('[lookatTerrainLat]', currentView.lookAt.getLatitude());
        format = format.replace('[lookatTerrainAlt]', currentView.lookAt.getAltitude());

        format = format.replace('[cameraLon]', currentView.camera.getLongitude());
        format = format.replace('[cameraLat]', currentView.camera.getLatitude());
        format = format.replace('[cameraAlt]', currentView.camera.getAltitude());

        format = format.replace('[horizFov]', 60); // earth horizFov is usually fixed at 60
        format = format.replace('[vertFov]', 60); // earth vertFov changes dynamically but no easy way to get
        format = format.replace('[horizPixels]', mapDiv.width());
        format = format.replace('[vertPixels]', mapDiv.height());

        var terrain = ge.getLayerRoot().getLayerById(ge.LAYER_TERRAIN); // what about on SIPR?
        format = format.replace('[terrainEnabled]', terrain && terrain.getVisibility() ? '1' : '0');
        return format;
    }

    function getNetworkLinkHref(link) {
        var href = link.getHref() || '',
            viewFormat = link.getViewFormat();
        if (viewFormat && viewFormat.length) {
            if (href.indexOf('?') < 0) {
                href += '?';
            } else {
                href += '&';
            }
            href += formatView(viewFormat);
        }
        return href;
    }

    function getCompareData(kmlObject, parentCompareData) {
        var compareData,
            i,
            item,
            childNodes;

        if (kmlObject.getType() === 'KmlFolder' || kmlObject.getType() === 'KmlDocument' || kmlObject.getType() === 'KmlNetworkLink') {
            childNodes = kmlObject.getFeatures().getChildNodes();
            parentCompareData.idMap = {};
            parentCompareData.nameMap = {};

            for (i = 0; i < childNodes.getLength(); i++) {
                item = childNodes.item(i);

                compareData = {
                    select: item.getVisibility() && parentCompareData.select,
                    expand: item.getOpen()
                };

                if (item.getId() && item.getId().length > 0) {
                    parentCompareData.idMap[item.getId()] = compareData;
                } else if (item.getName() && item.getName().length > 0) {
                    parentCompareData.nameMap[item.getName()] = compareData;
                } else {
                    compareData = parentCompareData;
                }
                getCompareData(item, compareData);
            }
        }
    }

    function processDefaultLayer(layer, parent, parentId) {
        var id = layer.getId() || (parentId + '_' + jc2cui.mapWidget.getNewId()), // According to google sample KmlLayers sometimes have no id due to plugin bug
            name = layer.getName(),
            type = layer.getType(),
            layerData = { name: name, id: id, type: type, visibility: false, children: [], mapObject: layer },
            childFeatures,
            folderChildLayers,
            numChildLayers,
            i;

        parent.children.push(layerData);
        defaultLayers.idMap[id] = layerData;

        if (type === 'KmlFolder') {// && !ge[id]) {
            childFeatures = layer.getFeatures();
            folderChildLayers = childFeatures.getChildNodes();
            numChildLayers = folderChildLayers.getLength();
            for (i = 0; i < numChildLayers; ++i) {
                processDefaultLayer(folderChildLayers.item(i), layerData, id);
            }
        }
    }

    function getDefaultLayerVisibility(callback) {
        OWF.Preferences.getUserPreference({
            namespace: 'jc2cui.mapWidget',
            name: 'defaultLayers',
            onSuccess: function (pref) {
                var defaultLayerVisibility;
                if (pref && pref.value) {
                    defaultLayerVisibility = JSON.parse(pref.value);
                }
                callback(defaultLayerVisibility);
            },
            onFailure: function (error, status) {
                if (status !== undefined && error !== "undefined : undefined") { // OWF 3.5 bug causes timeout instead of 404 when preference doesnt exist  
                    jc2cui.mapWidget.showError("Got an error getting preferences! Status Code: " + status + " . Error message: " + error);
                    return;
                }
                callback(); // nothing visible
            }
        });
    }

    function saveDefaultLayerVisibility() {
        clearTimeout(saveDefaultLayers);
        saveDefaultLayers = setTimeout(function () {
            var visibleLayers = {};
            $.each(defaultLayers.idMap, function (index, layer) {
                if (layer.visibility) {
                    visibleLayers[layer.id] = true;
                }
            });
            OWF.Preferences.setUserPreference({
                namespace: 'jc2cui.mapWidget',
                name: 'defaultLayers',
                value: JSON.stringify(visibleLayers),
                onFailure: function (error, status) {
                    jc2cui.mapWidget.showError("Error updating preferences. Status Code: " + status + " . Error message: " + error);
                }
            });
        }, 100);
    }

    function setDefaultLayerVisibility(layer, visibility, localOnly) {
        var i,
            link,
            href;
        if (layer.type === 'KmlDocument') {
            layer.mapObject.setVisibility(visibility);
        } else if (layer.type === 'KmlNetworkLink') {
            if (visibility) {
                link = layer.mapObject.getLink();
                href = link.getHref();
                if (!layer.loading) {
                    layer.loading = true;
                    //console.log('loading network link from ' + href);
                    try {
                        google.earth.fetchKml(ge, href, function (obj) {
                            if (obj) {
                                ge.getFeatures().appendChild(obj);
                                obj.setVisibility(layer.visibility);
                                layer.mapObject = obj;
                                layer.type = obj.getType();
                                if (layer.name !== obj.getName()) {
                                    console.log('need to rename ' + layer.name + ' to ' + obj.getName());
                                }
                                //console.log('Successfully loaded network link from ' + href);
                            }/* else {
                                console.log('Got no kml object from ' + href);
                            }*/
                            layer.loading = false; // may want to try again if failed
                        });
                    } catch (err) {
                        layer.loading = false; // may want to try again
                        console.log('Failed to load kml from ' + href + ': ' + err);
                    }
                }/* else {
                    console.log('Already loading network link from ' + href);
                }*/
            }
        } else {
            ge.getLayerRoot().enableLayerById(layer.id, visibility);
        }
        layer.visibility = visibility;
        for (i = 0; i < layer.children.length; i++) {
            setDefaultLayerVisibility(layer.children[i], visibility, localOnly);
        }
        if (!localOnly) {
            saveDefaultLayerVisibility();
        }
    }

    function getNumberOfEntities(root) {
        root = root || apiRootFolder;
        var types = ['KmlDocument', 'KmlFolder', 'KmlNetworkLink', 'KmlGroundOverlay', 'KmlScreenOverlay', 'KmlPlacemark'],
            i,
            numberOfEntities = 0;
        google.earth.executeBatch(ge, function () {
            for (i = 0; i < types.length; i++) {
                numberOfEntities += root.getElementsByType(types[i]).getLength();
            }
        });
        return numberOfEntities;
    }

    function getGoNoGo(theMessage, title, callback) {
        if (globalLoadMorePlacemarks !== undefined) {
            callback(globalLoadMorePlacemarks);
            return;
        }
        if (waitingForUser) {
            setTimeout(function () {
                getGoNoGo(theMessage, title, callback);
            }, 1000);
            return;
        }
        waitingForUser = true;
        if (typeof theMessage === 'function') {
            theMessage = theMessage();
        }
        var msg = $('<div>' + theMessage + '<br><br><div><input type="checkbox" id="global">Dont show again, apply to all overlays<br></div>');
        jc2cui.mapWidget.showDialog(msg, title, 220, 300, {
            'Yes': function () {
                msg.dialog('close');
                callback(true, $('#global', msg).is(':checked'));
            },
            'No': function () {
                msg.dialog('close');
                callback(false, $('#global', msg).is(':checked'));
            }
        }, function () {
            waitingForUser = false;
        });
    }

    function doFetchKml(url, callback, featureId) {
        var fetch = function () {
                google.earth.fetchKml(ge, url, function (kmlFeature) {
                    if (maxPlacemarks && !featureLoadMorePlacemarks[featureId] && !globalLoadMorePlacemarks) {
                        var oldPlacemarks = getNumberOfEntities(),
                            newPlacemarks = getNumberOfEntities(kmlFeature) || 1;
                        if (oldPlacemarks + newPlacemarks > maxPlacemarks) {
                            getGoNoGo(function () {
                                var msg = ['Overlay contains approximately '];
                                msg.push(newPlacemarks);
                                msg.push(' entities. There are currently approximately ');
                                msg.push(oldPlacemarks);
                                msg.push(' entities already loaded. ');
                                msg.push('Loading the additional entities may cause the browser to become unresponsive. Continue loading anyway?');
                                return msg.join('');
                            }, 'Warning - Large Number Of Entities', function (userChoice, global) {
                                if (global) {
                                    globalLoadMorePlacemarks = userChoice;
                                }
                                featureLoadMorePlacemarks[featureId] = userChoice;
                                callback(userChoice ? kmlFeature : undefined);
                            });
                            return;
                        }
                    }
                    callback(kmlFeature);
                });
            },
            numPlacemarks;

        if (maxPlacemarks && !featureLoadMorePlacemarks[featureId] && !globalLoadMorePlacemarks) {
            numPlacemarks = getNumberOfEntities();
            if (numPlacemarks > maxPlacemarks) {
                getGoNoGo(function () {
                    var msg = ['There are currently approximately '];
                    msg.push(numPlacemarks);
                    msg.push(' entities already loaded. ');
                    msg.push('Loading additional entities may cause the browser to become unresponsive. Continue loading anyway?');
                    return msg.join('');
                }, 'Warning - Large Number Of Entities', function (userChoice, global) {
                    if (global) {
                        globalLoadMorePlacemarks = userChoice;
                    }
                    featureLoadMorePlacemarks[featureId] = userChoice;
                    if (userChoice) {
                        fetch();
                    } else {
                        callback();
                    }
                });
                return;
            }
        }

        fetch();
    }

    function initEarth() {
        try {
            google.earth.createInstance(
                "map",
                function (instance) {
                    var cssUrl,
                        layerRoot,
                        features,
                        childLayers,
                        numChildren,
                        i,
                        navControl;

                    ge = instance;
                    ge.getOptions().setScaleLegendVisibility(true);
                    gex = new GEarthExtensions(ge);

                    navControl = ge.getNavigationControl();
                    navControl.setVisibility(ge.VISIBILITY_AUTO);
                    navControl.getScreenXY().setXUnits(ge.UNITS_PIXELS);
                    navControl.getScreenXY().setYUnits(ge.UNITS_INSET_PIXELS);
                    ge.getWindow().setVisibility(true);

                    google.earth.addEventListener(ge.getWindow(), 'mousedown', function (event) { // TBD - why not click?
                        var target = event.getTarget(),
                            item,
                            mode,
                            x,
                            y;

                        if (target.getType() === 'KmlPlacemark') {
                            item = getSelectedData(target);
                            setTimeout(function () {
                                jc2cui.mapWidget.itemSelected(item);
                            }, 1000);
                        } else {
                            // Handle left clicks on drawing tools if drawing tools showing
                            if (event.getButton() === 0 && handButton && handButton.getVisibility()) {
                                x = event.getClientX();
                                y = event.getClientY();
                                mode = handButton.isMouseOnButton(x, y) ? 'hand' : null;
                                if (!mode) {
                                    mode = markerButton.isMouseOnButton(x, y) ? 'marker' : null;
                                }
                                if (!mode) {
                                    mode = lineButton.isMouseOnButton(x, y) ? 'line' : null;
                                }
                                if (!mode) {
                                    mode = polyButton.isMouseOnButton(x, y) ? 'shape' : null;
                                }
                                if (mode) {
                                    setDrawingMode(mode);
                                    event.preventDefault();
                                    event.stopPropagation();
                                    return false;
                                }
                            }
                        }
                    });

                    google.earth.addEventListener(ge.getWindow(), 'click', function (event) {
                        var ignoreClick = false,
                            target = event.getTarget(),
                            x,
                            y,
                            balloon,
                            div,
                            descStr;

                        if (event.getDidHitGlobe()) {
                            // Ignore clicks on drawing tools
                            if (event.getButton() === 0 && handButton && handButton.getVisibility()) {
                                x = event.getClientX();
                                y = event.getClientY();
                                ignoreClick = handButton.isMouseOnButton(x, y) ||
                                    markerButton.isMouseOnButton(x, y) ||
                                    lineButton.isMouseOnButton(x, y) ||
                                    polyButton.isMouseOnButton(x, y);
                            }
                            if (!ignoreClick) {
                                jc2cui.mapWidget.mapClicked(event.getLatitude(), event.getLongitude(), 1, event.getButton(), event.getShiftKey(), event.getCtrlKey(), event.getAltKey());
                            } else {
                                event.preventDefault();
                                return;
                            }
                        }

                        if (!featureInCreation && target.getType() === 'KmlPlacemark') { // if not currently drawing and placemark clicked on
                            if (createdFeatures[target.getId()] && createdFeatures[target.getId()].editable) { // if clicked on editable feature show edit info window - not regular
                                event.preventDefault();
                                showFeatureBalloon(target);
                            } else {
                                descStr = target.getBalloonHtmlUnsafe();
                                if (descStr.length) { // dont show empty info windows (including for line editing handles!)
                                    event.preventDefault();
                                    balloon = ge.createHtmlDivBalloon('');
                                    div = document.createElement('DIV');
                                    balloon.setFeature(target);

                                    balloon.setContentDiv(div);
                                    ge.setBalloon(balloon);

                                    // For some reason passing true as second param to parseHTML not enough to make scripts to work...
                                    $(div).css('font-size', '0.75em').append($.parseHTML(descStr, true)).find('script').each(function () {
                                        $.globalEval(this.text || this.textContent || this.innerHTML || '');
                                    });
                                }
                            }
                        }
                    });

                    google.earth.addEventListener(ge.getWindow(), 'dblclick', function (event) {
                        var ignoreClick = false,
                            x,
                            y;

                        if (event.getDidHitGlobe()) {
                            // Ignore clicks on drawing tools
                            if (event.getButton() === 0 && handButton && handButton.getVisibility()) {
                                x = event.getClientX();
                                y = event.getClientY();
                                ignoreClick = handButton.isMouseOnButton(x, y) ||
                                    markerButton.isMouseOnButton(x, y) ||
                                    lineButton.isMouseOnButton(x, y) ||
                                    polyButton.isMouseOnButton(x, y);
                            }
                            if (!ignoreClick) {
                                jc2cui.mapWidget.mapClicked(event.getLatitude(), event.getLongitude(), 2, event.getButton());
                            } else {
                                event.preventDefault();
                                return;
                            }
                        }
                    });

                    google.earth.addEventListener(ge.getView(), 'viewchangeend', function (event) {
                        clearTimeout(viewTimeout);
                        viewTimeout = setTimeout(function () {
                            var onStop,
                                bounds,
                                theView = getCurrentView();

                            if (currentView && currentView.bounds.getSouth() === theView.bounds.getSouth() &&
                                    currentView.bounds.getWest() === theView.bounds.getWest() &&
                                    currentView.bounds.getNorth() === theView.bounds.getNorth() &&
                                    currentView.bounds.getEast() === theView.bounds.getEast() &&
                                    currentView.lookAt.getLatitude() === theView.lookAt.getLatitude() &&
                                    currentView.lookAt.getLongitude() === theView.lookAt.getLongitude() &&
                                    currentView.lookAt.getRange() === theView.lookAt.getRange()) {
                                return; //currentView didn't change
                            }
                            currentView = theView;
                            scale = getSomethingResemblingScale();
                            jc2cui.mapWidget.publishView(getViewStatus());

                            bounds = { north: theView.bounds.getNorth(), south: theView.bounds.getSouth(), east: theView.bounds.getEast(), west: theView.bounds.getWest() };

                            //loop through KmlNetworkLinks via nwLinkObjs
                            $.each(nwLinkObjs, function (index, overlay) {
                                $.each(overlay, function (i, feature) {
                                    $.each(feature, function (j, obj) {
                                        var nwlObjs = [];
                                        populateWithAllNwlObjects(obj, nwlObjs);
                                        $.each(nwlObjs, function (k, nwLinkObj) {
                                            if (nwLinkObj.loaded) {
                                                return true; // continue;
                                            }

                                            if (nwLinkObj.kmlObject && nwLinkObj.link) {
                                                onStop = (nwLinkObj.link.getViewRefreshMode() === ge.VIEW_REFRESH_ON_STOP);

                                                if (onStop) {
                                                    // Before we refresh the link, we close any exisiting balloon.
                                                    // Really , we could've waited for getNetworkLinkReloadFunction code to close balloon.
                                                    // However, being that based on ViewRefreshTime there can be a delay till that 
                                                    // code gets called, we might as well close the balloons here already.
                                                    closeBalloon(nwLinkObj.kmlObject);
                                                }

                                                // We fetch in two cases. Number one: If its an 'onRegion' network link that is active, and it wasn't yet loaded.
                                                // Number two: If the view refresh mode is 'onStop'
                                                if ((!nwLinkObj.loaded && isRegionActive(nwLinkObj.region, bounds)) ||
                                                        (onStop && nwLinkObj.link.getViewRefreshTime() <= 1)) {

                                                    //The assumption is that for onRegion,  we only want to load it once.
                                                    // When user zooms in and out, google earth will take care of itself - showing and hiding the placemarks.
                                                    if (nwLinkObj.region) {
                                                        nwLinkObj.loaded = true;
                                                    }
                                                    doFetchKml(getNetworkLinkHref(nwLinkObj.link), getNetworkLinkReloadFunction(nwLinkObj.kmlObject, nwLinkObj.overlayId, nwLinkObj.featureId, nwLinkObj.hierarchy.slice(0), nwLinkObj.link), nwLinkObj.featureId);
                                                } else if (onStop && nwLinkObj.link.getViewRefreshTime() > 1) {
                                                    // The reason we do -1 is because to get here in the code, the function already waited a second 
                                                    setTimeout(function () {
                                                        var compareData = {};
                                                        if (!nwLinkObj.kmlObject.getRefreshVisibility()) { // A value of false leaves the visibility of features within the control of the Google Earth user
                                                            compareData.select = isObjectVisible(nwLinkObj.kmlObject);
                                                            getCompareData(nwLinkObj.kmlObject, compareData);
                                                        }
                                                        doFetchKml(getNetworkLinkHref(nwLinkObj.link), getNetworkLinkReloadFunction(nwLinkObj.kmlObject, nwLinkObj.overlayId, nwLinkObj.featureId, nwLinkObj.hierarchy.slice(0), nwLinkObj.link, false, compareData), nwLinkObj.featureId);
                                                    }, (nwLinkObj.link.getViewRefreshTime() - 1) * 1000);
                                                }
                                            }
                                        });
                                    });
                                });
                            });
                        }, 1000);
                    });

                    // In IE dynamically inserted style urls apparently are relative to root directory. Rather then hardcoding that, doing this...
                    // other browsers are happy starting with url = 'css/'
                    cssUrl = document.location.href;
                    cssUrl = cssUrl.substring(0, cssUrl.lastIndexOf('/') + 1);
                    cssUrl += 'css/google.earth.all.min.css';

                    $('<link rel="stylesheet" type="text/css" href="' + cssUrl + '" >').appendTo("head");

                    //Displays a status bar at the bottom of the Earth window, 
                    //containing geographic coordinates and altitude of the terrain below the current cursor position, 
                    //as well as the range from which the user is viewing the Earth.
                    ge.getOptions().setStatusBarVisibility(true);

                    jc2cui.mapWidget.featureEditor.useShim(true); // or color picker chopped off in IE

                    // create a top level folder for all API loaded features - easier to count that way
                    apiRootFolder = ge.createFolder('api_root');
                    ge.getFeatures().appendChild(apiRootFolder);

                    // Pull out layers included wth earth
                    layerRoot = ge.getLayerRoot();
                    features = layerRoot.getFeatures();
                    childLayers = features.getChildNodes();
                    numChildren = childLayers.getLength();
                    if (numChildren) {
                        defaultLayers.layers.push({ id: 'defaultLayers', name: 'Map Layers', children: [] });
                        for (i = 0; i < numChildren; i++) {
                            processDefaultLayer(childLayers.item(i), defaultLayers.layers[0], 'root');
                        }

                        // Make sure all are off FIRST (setDefaultLayerVisibility is recursive!)
                        for (i = 0; i < defaultLayers.layers[0].children.length; i++) {
                            setDefaultLayerVisibility(defaultLayers.layers[0].children[i], false, true);
                        }

                        // Now turn on any user previously had on
                        getDefaultLayerVisibility(function (defaultVisibility) {
                            if (defaultVisibility) {
                                $.each(defaultVisibility, function (id, val) {
                                    setDefaultLayerVisibility(defaultLayers.idMap[id], true, true);
                                });
                            } else { // If user never played with layers turn on these few by default
                                if (defaultLayers.idMap[ge.LAYER_TERRAIN]) { // terrain makes earth interesting on internet
                                    setDefaultLayerVisibility(defaultLayers.idMap[ge.LAYER_TERRAIN], true);
                                } else if (defaultLayers.idMap.imagery) { // imagery is base map background layer on SIPR
                                    setDefaultLayerVisibility(defaultLayers.idMap.imagery, true);
                                }
                            }
                            jc2cui.mapWidget.rendererReady(defaultLayers.layers);
                        });
                    } else {
                        jc2cui.mapWidget.rendererReady();
                    }
                    console.log('Plugin version ' + ge.getPluginVersion());
                    console.log('API version ' + ge.getApiVersion());
                },
                function (errorCode) {
                    jc2cui.mapWidget.showError('Failed to create Google Earth instance. Error Code: ' + errorCode);
                },
                config.earthApiUrl ? { database: config.earthApiUrl.database} : {}
            );
        } catch (err) {
            jc2cui.mapWidget.showError('Failed to create Google Earth instance. Error: ' + err);
        }
    }

    function loadEarth() {
        google.load("earth", "1", {
            callback: function () {
                initEarth();
            }
        });
    }

    // cant stop if find one on since no guarantee all descendants on
    function turnOnObjectRecursive(kmlObject) {
        kmlObject.setVisibility(true);
        if (kmlObject.getType() === 'KmlFolder' || kmlObject.getType() === 'KmlDocument' || kmlObject.getType() === 'KmlNetworkLink') {
            var childNodes = kmlObject.getFeatures().getChildNodes(),
                i;
            for (i = 0; i < childNodes.getLength(); i++) {
                turnOnObjectRecursive(childNodes.item(i));
            }
        }
    }

    // since parent is turning on, need to ensure childrens flags are set to be off.
    // all should be off since none could have been showing with parent off.
    function turnParentOnWithoutTurningOnChildren(parent, except) {
        var childNodes = parent.getFeatures().getChildNodes(),
            i,
            child;
        for (i = 0; i < childNodes.getLength(); i++) {
            child = childNodes.item(i);
            if (child !== except) {
                child.setVisibility(false);
            }
        }
        parent.setVisibility(true);
    }

    function setVisible(kmlObject, visible) {
        google.earth.executeBatch(ge, function () {
            if (!visible) {
                kmlObject.setVisibility(false);
                return;
            }

            // turn on this object and all descendants
            turnOnObjectRecursive(kmlObject);
            if (visible) {
                var parent = kmlObject.getParentNode(),
                    parents = [],
                    indexOfLastOff = -1,
                    i;

                // find highest parent that is off
                while (parent && parent.getType() !== 'GEGlobe') {
                    if (!parent.getVisibility()) {
                        indexOfLastOff = parents.length;
                    }
                    parents.push(parent);
                    parent = parent.getParentNode();
                }

                // and turn on all parents till it.
                if (indexOfLastOff > -1) {
                    for (i = 0; i <= indexOfLastOff; i++) {
                        turnParentOnWithoutTurningOnChildren(parents[i], i > 0 ? parents[i - 1] : kmlObject);
                    }
                }
            }
        });
    }

    function getRefreshMode(refreshModeStr) {
        var retVal;
        if (refreshModeStr === 'onChange') {
            retVal = ge.REFRESH_ON_CHANGE;
        } else if (refreshModeStr === 'onInterval') {
            retVal = ge.REFRESH_ON_INTERVAL;
        } else if (refreshModeStr === 'onExpire') {
            retVal = ge.REFRESH_ON_EXPIRE;
        } else {
            retVal = ge.REFRESH_ON_CHANGE;
        }
        return retVal;
    }

    function getViewRefreshMode(viewRefreshModeStr) {
        var retVal;
        if (viewRefreshModeStr === 'never') {
            retVal = ge.VIEW_REFRESH_NEVER;
        } else if (viewRefreshModeStr === 'onStop') {
            retVal = ge.VIEW_REFRESH_ON_STOP;
        } else if (viewRefreshModeStr === 'onRequest') {
            retVal = ge.VIEW_REFRESH_ON_REQUEST;
        } else if (viewRefreshModeStr === 'onRegion') {
            retVal = ge.VIEW_REFRESH_ON_REGION;
        } else {
            retVal = ge.VIEW_REFRESH_NEVER;
        }
        return retVal;
    }

    function pathIsAbsolute(path) {
        var regexp = /(ftp|http|https):/;
        if (regexp.test(path)) {
            return true;
        }
        if (path.indexOf("\\") === 0) {
            return true;
        }
        return false;
    }

    function getFullHref(href, parentUrl) {
        var path,
            index;
        //check if the href is an absolute path.
        //If not, get path from parentUrl and prepend to href.
        if (!pathIsAbsolute(href)) {
            if (parentUrl) {
                index = parentUrl.lastIndexOf('/');
                if (index === -1) {
                    index = parentUrl.lastIndexOf('\\');
                }
                path = parentUrl.substring(0, index + 1);

                href = path + href;
            }
        }

        return href;
    }

    // getTextValue and findAndGetTextValue is copied from kmlParser.js
    function getTextValue(node) {
        var text = '',
            i;
        if (node) {
            if (node.nodeType === 2 || node.nodeType === 3 || node.nodeType === 4) { // attribute, text, cdata
                text = node.nodeValue;
            } else if (node.nodeType === 1 || node.nodeType === 9 || node.nodeType === 11) { // element, document, document fragment
                for (i = 0; i < node.childNodes.length; ++i) {
                    text += getTextValue(node.childNodes[i]);
                }
            }
        }
        return $.trim(text);
    }

    function findAndGetTextValue(node, tag) {
        if (node) {
            var childNode = node.getElementsByTagName(tag);
            if (childNode.length) {
                return getTextValue(childNode[0]);
            }
        }
        return "";
    }

    function clearTimerIncludingAllChildren(timerObject, onlyChildren) {
        var childIndex;
        if (!onlyChildren) {
            clearInterval(timerObject.timer);
        }

        if (!timerObject.children) {
            return;
        }
        for (childIndex = 0; childIndex < timerObject.children.length; ++childIndex) {
            clearTimerIncludingAllChildren(timerObject.children[childIndex], false);
        }
    }

    function processNwlObj(nwlObj, kmlObject, onlyChildren) {
        var childIndex;

        if (nwlObj.kmlObject === kmlObject) {
            clearTimerIncludingAllChildren(nwlObj, onlyChildren);
            return true;
        }

        if (!nwlObj.children) {
            return false;
        }
        for (childIndex = 0; childIndex < nwlObj.children.length; ++childIndex) {
            if (processNwlObj(nwlObj.children[childIndex], kmlObject, onlyChildren)) {
                if (!onlyChildren) {
                    nwlObj.children.splice(childIndex, 1);
                } else {
                    delete nwlObj.children[childIndex].children;
                }
                break;
            }
        }

        return false;
    }

    function clearNWObjects(kmlObject, overlayId, featureId, onlyChildren) {
        var index,
            nwlObj;
        for (index = 0; index < nwLinkObjs[overlayId][featureId].length; ++index) {
            nwlObj = nwLinkObjs[overlayId][featureId][index];
            if (processNwlObj(nwlObj, kmlObject, onlyChildren)) {
                if (!onlyChildren) {
                    nwLinkObjs[overlayId][featureId].splice(index, 1);
                } else {
                    delete nwlObj.children;
                }
                return true;
            }
        }
        return false;
    }

    function findAndClearTopLevelNWLinkObjects(kmlObject, overlayId, featureId) {
        var childNodes,
            item,
            i;

        if (kmlObject.getType() === 'KmlNetworkLink' && clearNWObjects(kmlObject, overlayId, featureId, false)) {
            return;
        }

        if (kmlObject.getType() === 'KmlFolder' || kmlObject.getType() === 'KmlDocument' || kmlObject.getType() === 'KmlNetworkLink') {
            childNodes = kmlObject.getFeatures().getChildNodes();
            for (i = 0; i < childNodes.getLength(); i++) {
                item = childNodes.item(i);
                findAndClearTopLevelNWLinkObjects(item, overlayId, featureId);
            }
        }
    }

    function getNWLinkObject(kmlObject, nwlObj, overlayId, featureId) {
        var childIndex,
            tempNwlObj;
        if (kmlObject === nwlObj.kmlObject) {
            return nwlObj;
        }
        if (!nwlObj.children) {
            return null;
        }
        for (childIndex = 0; childIndex < nwlObj.children.length; ++childIndex) {
            tempNwlObj = getNWLinkObject(kmlObject, nwlObj.children[childIndex], overlayId, featureId);
            if (tempNwlObj !== null) {
                return tempNwlObj;
            }
        }
        return null;
    }

    function addObjectToParent(parentObject, childObject, parentNode) {
        var childIndex;

        if (parentObject.kmlObject === parentNode) {
            if (!parentObject.children) {
                parentObject.children = [];
            }
            parentObject.children.push(childObject);
            return true;
        }

        if (!parentObject.children) {
            return false;
        }

        for (childIndex = 0; childIndex < parentObject.children.length; ++childIndex) {
            if (addObjectToParent(parentObject.children[childIndex], childObject, parentNode)) {
                return true;
            }
        }

        return false;
    }

    // TBD - Dont duplicate here and in sidebar
    function validateId(id) {
        var regexp = /[A-Za-z]/;
        if (!regexp.test(id)) {
            id = 'a' + id;
        }
        id = id.replace(/[^\-A-Za-z0-9_:.]/g, "_");
        return id;
    }

    function populateData(kmlObject, parentData, overlayId, featureId, hierarchy, compareData) {
        var childNodes,
            i,
            item,
            featureData,
            oids = objectToId[overlayId] || {},
            ids = oids[featureId] || {},
            theLink,
            fetchNow = true,
            kmlStr,
            kmlAsXml,
            nodes,
            theUrl,
            region,
            regionG,
            latLonBox,
            lod,
            theView,
            bounds,
            nwLinkObj,
            theParentNode,
            found = false,
            tempNWLink,
            tempParentNode,
            childCompareData = compareData;

        nwLinkObjs[overlayId] = nwLinkObjs[overlayId] || {};
        nwLinkObjs[overlayId][featureId] = nwLinkObjs[overlayId][featureId] || [];
        overlayToId[overlayId] = overlayToId[overlayId] || 0;

        if (kmlObject.getType() !== 'KmlDocument' || (kmlObject.getName() && kmlObject.getName().length > 0)) {
            featureData = {
                title: kmlObject.getName() || '[no name]',
                //tooltip: 'click to zoom to',
                key: validateId(overlayId + overlayToId[overlayId])
            };
            switch (kmlObject.getType()) {
            case 'KmlDocument':
            case 'KmlFolder':
            case 'KmlNetworkLink':
                featureData.tooltip = 'click to zoom to';
                featureData.isFolder = true;
                break;
                // placemarks arent folders
            }
            if (compareData) {
                if (kmlObject.getId() && kmlObject.getId().length > 0) {
                    if (compareData.idMap && compareData.idMap[kmlObject.getId()]) {
                        childCompareData = compareData.idMap[kmlObject.getId()];
                    }
                } else if (kmlObject.getName() && kmlObject.getName().length > 0) {
                    if (compareData.nameMap && compareData.nameMap[kmlObject.getName()]) {
                        childCompareData = compareData.nameMap[kmlObject.getName()];
                    }
                }
                if (childCompareData !== compareData) {
                    featureData.select = childCompareData.select;
                    featureData.expand = childCompareData.expand;

                    if (featureData.select !== (kmlObject.getVisibility() && parentData.select)) {
                        setVisible(kmlObject, featureData.select);
                    }
                    if (featureData.expand !== kmlObject.getOpen()) {
                        kmlObject.setOpen(featureData.expand);
                    }
                }
            }
            if (featureData.select === undefined) {
                featureData.select = kmlObject.getVisibility() && parentData.select;
            }
            if (kmlObject.getType() === 'KmlFolder' || kmlObject.getType() === 'KmlDocument' || kmlObject.getType() === 'KmlNetworkLink') {
                if (featureData.expand === undefined) {
                    featureData.expand = kmlObject.getOpen() ? true : false;
                }

                hierarchy.push(featureData.key);
            }

            ids[featureData.key] = kmlObject; // investigate. Was - ids[overlayToId[overlayId]] = kmlObject;
            overlayToId[overlayId]++;
            oids[featureId] = ids;
            objectToId[overlayId] = oids;

            if (!parentData.children) {
                parentData.children = [];
            }
            parentData.children.push(featureData);
        } else {
            featureData = parentData;
        }

        if (kmlObject.getType() === 'KmlFolder' || kmlObject.getType() === 'KmlDocument') {
            childNodes = kmlObject.getFeatures().getChildNodes();
            for (i = 0; i < childNodes.getLength(); i++) {
                item = childNodes.item(i);
                populateData(item, featureData, overlayId, featureId, hierarchy.slice(0), childCompareData);
            }
        } else if (kmlObject.getType() === 'KmlNetworkLink') {
            getNetworkLinkReloadFunction = function (netWorkLinkObject, nwOverlayId, nwFeatureId, nwHierarchy, kmlLink, timerWasSet, nwCompareData) {
                var getIntervalFunction;
                return function (theKmlObject) {
                    var nwData,
                        existingKml,
                        timer,
                        index,
                        nwlObj;
                    try {
                        // Need to check that in the interim, the overlay / feature was not deleted.
                        if (nwLinkObjs[nwOverlayId] && nwLinkObjs[nwOverlayId][nwFeatureId]) {
                            if (theKmlObject) {
                                // At one point, it made sense that the last param should be timerWasSet.
                                // However, at this moment I can't remember why. 
                                // I am leaving it there in a comment in case the reason comes back.
                                clearNWObjects(netWorkLinkObject, nwOverlayId, nwFeatureId, /*timerWasSet*/true);

                                for (index = 0; index < nwLinkObjs[nwOverlayId][nwFeatureId].length; ++index) {
                                    nwlObj = getNWLinkObject(netWorkLinkObject, nwLinkObjs[nwOverlayId][nwFeatureId][index], nwOverlayId, nwFeatureId);
                                    if (nwlObj) {
                                        break;
                                    }
                                }

                                // The next few test protects us against interval issues (where the parent node
                                // called clearInterval on the child timer, yet the timer already called fetchKml
                                // before it was killed. If such a situation happened, the following lines will
                                // let us return before any harm is done.
                                if (!nwlObj) {
                                    return;
                                }
                                if (nwlObj.hierarchy.length !== nwHierarchy.length) {
                                    console.log('Mismatched hierarchy length! Not loading !!!');
                                    return;
                                }
                                for (index = 0; index < nwlObj.hierarchy.length; ++index) {
                                    if (nwlObj.hierarchy[index] !== nwHierarchy[index]) {
                                        console.log('Mismatched hierarchies! Not loading !!!');
                                        return;
                                    }
                                }

                                // remove old kml with same id if it exists - reload
                                existingKml = netWorkLinkObject.getFeatures().getChildNodes();
                                if (existingKml.getLength()) {
                                    closeBalloon(existingKml.item(0));
                                    netWorkLinkObject.getFeatures().removeChild(existingKml.item(0));
                                }
                                netWorkLinkObject.getFeatures().appendChild(theKmlObject);

                                nwData = {
                                    title: netWorkLinkObject.getName() || '[no name]',
                                    select: isObjectVisible(netWorkLinkObject),
                                    expand: netWorkLinkObject.getOpen() ? true : false,
                                    isFolder: true,
                                    key: nwHierarchy[nwHierarchy.length - 1], /// ????
                                    tooltip: 'click to zoom to'
                                    //hierarchy: nwHierarchy.slice(0)
                                };
                                //setTimeout(function () { // Dont do this - problems with links automatically being loaded by earth before we take control - e.g. weather
                                populateData(theKmlObject, nwData, nwOverlayId, nwFeatureId, nwHierarchy.slice(0), nwCompareData);
                                jc2cui.mapWidget.addTreeItems(nwData, nwOverlayId, nwFeatureId, nwHierarchy[nwHierarchy.length - 1]);
                                //}, 1);

                                getIntervalFunction = function (nwKmlLink, intervalNetworkLinkObject, intervalOverlayId, intervalFeatureId, internalHierarchy) {
                                    return function () {
                                        var theCompareData = {};
                                        // Need to check that in the interim, the overlay / feature was not deleted.
                                        if (nwLinkObjs[intervalOverlayId] && nwLinkObjs[intervalOverlayId][intervalFeatureId]) {
                                            if (!intervalNetworkLinkObject.getRefreshVisibility()) { // A value of false leaves the visibility of features within the control of the Google Earth user
                                                // get the visibility and expanded for compareData
                                                theCompareData.select = isObjectVisible(intervalNetworkLinkObject);
                                                getCompareData(intervalNetworkLinkObject, theCompareData);
                                            }
                                            doFetchKml(getNetworkLinkHref(nwKmlLink), getNetworkLinkReloadFunction(intervalNetworkLinkObject, intervalOverlayId, intervalFeatureId, internalHierarchy.slice(0), nwKmlLink, true, theCompareData), intervalFeatureId);
                                        }
                                    };
                                };

                                if (!timerWasSet && kmlLink && kmlLink.getRefreshMode() === ge.REFRESH_ON_INTERVAL && kmlLink.getRefreshInterval() > 0.0) {
                                    if (nwlObj && nwLinkObjs[nwOverlayId] && nwLinkObjs[nwOverlayId][nwFeatureId]) {
                                        timer = setInterval(getIntervalFunction(kmlLink, netWorkLinkObject, nwOverlayId, nwFeatureId, nwHierarchy.slice(0)), kmlLink.getRefreshInterval() * 1000);
                                        nwlObj.timer = timer;
                                    }
                                }
                            } else {
                                console.log('In else. Failed to create KML object.');

                                nwData = {
                                    title: (netWorkLinkObject.getName() || '[no name]') + ' - LOAD FAILED',
                                    select: isObjectVisible(netWorkLinkObject),
                                    expand: netWorkLinkObject.getOpen() ? true : false,
                                    isFolder: true,
                                    key: nwHierarchy[nwHierarchy.length - 1]
                                };
                                jc2cui.mapWidget.addTreeItems(nwData, nwOverlayId, nwFeatureId, nwHierarchy[nwHierarchy.length - 1]);
                            }
                        } else {
                            console.log('In else. Overlay or feature no longer loaded...');
                        }
                    } catch (err) {
                        console.log('In catch. Failed to create KML object: ' + err);
                        nwData = {
                            title: (netWorkLinkObject.getName() || '[no name]') + ' - LOAD FAILED',
                            select: isObjectVisible(netWorkLinkObject),
                            expand: netWorkLinkObject.getOpen() ? true : false,
                            isFolder: true,
                            key: nwHierarchy[nwHierarchy.length - 1]
                        };
                        jc2cui.mapWidget.addTreeItems(nwData, nwOverlayId, nwFeatureId, nwHierarchy[nwHierarchy.length - 1]);
                    }
                };
            };
            regionG = kmlObject.getRegion();
            if (regionG) {
                latLonBox = regionG.getLatLonAltBox();
                if (latLonBox) {
                    region = {
                        north: latLonBox.getNorth(),
                        south: latLonBox.getSouth(),
                        east: latLonBox.getEast(),
                        west: latLonBox.getWest(),
                        minAltitude: latLonBox.getMinAltitude(),
                        altitudeMode: latLonBox.getAltitudeMode()
                    };
                    lod = regionG.getLod();
                    if (lod) {
                        region.lod = {
                            minLodPixels: lod.getMinLodPixels(),
                            maxLodPixels: lod.getMaxLodPixels()
                        };
                    }
                }
            }

            if (!kmlObject.getLink()) {
                kmlStr = kmlObject.getKml();
                kmlAsXml = $.parseXML(kmlStr);
                nodes = kmlAsXml.getElementsByTagName('Url');
                if (nodes.length) {
                    theUrl = nodes[0];
                    if (theUrl) {
                        theLink = gex.dom.buildLink({
                            href: getFullHref(findAndGetTextValue(theUrl, 'href'), kmlObject.getUrl()),
                            refreshMode: getRefreshMode(findAndGetTextValue(theUrl, 'refreshMode')),
                            viewRefreshMode: getViewRefreshMode(findAndGetTextValue(theUrl, 'viewRefreshMode'))
                        });
                        if (!isNaN(parseFloat(findAndGetTextValue(theUrl, 'refreshInterval')))) {
                            theLink.setRefreshInterval(parseFloat(findAndGetTextValue(theUrl, 'refreshInterval')));
                        } else {
                            theLink.setRefreshInterval(4); // the default value in the KmlReference
                        }
                        if (!isNaN(parseFloat(findAndGetTextValue(theUrl, 'viewRefreshTime')))) {
                            theLink.setViewRefreshTime(parseFloat(findAndGetTextValue(theUrl, 'viewRefreshTime')));
                        } else {
                            theLink.setViewRefreshTime(4); // the default value in the KmlReference
                        }
                        theLink.setViewFormat(findAndGetTextValue(theUrl, 'viewFormat'));

                        //If this network link is 'onRegion', yet the region is not active, do not fetch now.
                        if (region) {
                            theView = ge.getView().getViewportGlobeBounds();
                            bounds = { north: theView.getNorth(), south: theView.getSouth(), east: theView.getEast(), west: theView.getWest() };
                            if (!isRegionActive(region, bounds)) {
                                fetchNow = false;
                            }
                        }
                        tempNWLink = gex.dom.buildNetworkLink({
                            name: kmlObject.getName(),
                            visibility: isObjectVisible(kmlObject),
                            description: kmlObject.getDescription(),
                            link: null,
                            flyToView: kmlObject.getFlyToView(),
                            refreshVisibility: kmlObject.getRefreshVisibility(),
                            id: kmlObject.getId()
                        });
                        tempNWLink.setRegion(regionG);
                        tempNWLink.setOpen(kmlObject.getOpen());

                        tempParentNode = kmlObject.getParentNode();
                        if (tempParentNode) {
                            tempParentNode.getFeatures().removeChild(kmlObject);
                            tempParentNode.getFeatures().appendChild(tempNWLink);
                            kmlObject = tempNWLink;

                            //being that 'kmlObject' changed, we need to update the data in the next three lines  
                            ids[featureData.key] = kmlObject;
                            oids[featureId] = ids;
                            objectToId[overlayId] = oids;
                        }
                    }
                }
            } else {
                theLink = gex.dom.buildLink({
                    href: getFullHref(kmlObject.getLink().getHref(), kmlObject.getUrl()),
                    refreshMode: kmlObject.getLink().getRefreshMode(),
                    refreshInterval: kmlObject.getLink().getRefreshInterval(),
                    viewRefreshMode: kmlObject.getLink().getViewRefreshMode(),
                    viewBoundScale: kmlObject.getLink().getViewBoundScale()
                });
                theLink.setViewRefreshTime(kmlObject.getLink().getViewRefreshTime());
                theLink.setViewFormat(kmlObject.getLink().getViewFormat());

                //If this network link has a region, and the region is not active, do not fetch now. 
                if (region) {
                    if (!theView) {
                        theView = ge.getView().getViewportGlobeBounds();
                        if (theView) {
                            bounds = { north: theView.getNorth(), south: theView.getSouth(), east: theView.getEast(), west: theView.getWest() };
                        }
                    }
                    if (!isRegionActive(region, bounds)) {
                        fetchNow = false;
                    }
                }
                kmlObject.setLink(null);
            }

            if (theLink) {
                // For on stop only kml spec defines default view format
                if (theLink.getViewRefreshMode() === ge.VIEW_REFRESH_ON_STOP && (!theLink.getViewFormat() || !theLink.getViewFormat().length)) {
                    theLink.setViewFormat('BBOX=[bboxWest],[bboxSouth],[bboxEast],[bboxNorth]');
                }

                // Doesnt seem to be any way to request links set to refresh on request to refresh.
                // Lets change them into on stop links so they refresh whenever map view changes (same as we do in 2d)
                if (theLink.getViewRefreshMode() === ge.VIEW_REFRESH_ON_REQUEST) {
                    theLink.setViewRefreshMode(ge.VIEW_REFRESH_ON_STOP);
                    theLink.setViewRefreshTime(4);
                }

                //setting up the 'nwLinkObj' which is stored in 'nwLinkObjs'.
                nwLinkObj = { kmlObject: kmlObject, link: theLink, hierarchy: hierarchy.slice(0), overlayId: overlayId, featureId: featureId, region: region };
                if (fetchNow && region) {
                    nwLinkObj.loaded = true;
                }
                theParentNode = kmlObject.getParentNode();
                while (theParentNode && theParentNode.getType() !== 'GEGlobe') {
                    for (i = 0; i < nwLinkObjs[overlayId][featureId].length; ++i) {
                        if (addObjectToParent(nwLinkObjs[overlayId][featureId][i], nwLinkObj, theParentNode)) {
                            found = true;
                            break;
                        }
                    }
                    if (found) {
                        break;
                    }
                    theParentNode = theParentNode.getParentNode();
                }

                if (!found) {
                    nwLinkObjs[overlayId][featureId].push(nwLinkObj);
                }

                if (fetchNow) {
                    doFetchKml(getNetworkLinkHref(theLink), getNetworkLinkReloadFunction(kmlObject, overlayId, featureId, hierarchy.slice(0), theLink), featureId);
                }
            }
        }
    }

    /*Really, extension.js has a function computeBounds. However, that function slows down alot when dealing with kml 
    that has a ton of coordinates. In cases of very large kml files with lots of coordinates, it even crashes google earth.
    The following function (calculateBounds) is largely influenced by computeBounds, with the exception that 
    instead of getting the coordinates by querying the kml object, we get the coordinates by parsing the kml itself.*/
    function calculateBounds(kmlObject, bounds) {
        var kmlStr,
            kmlAsXml,
            nodes,
            childNodes,
            i,
            item,
            coordinatesText,
            path,
            coords,
            lon,
            lat,
            alt,
            llb;

        if (kmlObject.getType() === 'KmlFolder' || kmlObject.getType() === 'KmlDocument' || kmlObject.getType() === 'KmlNetworkLink') {
            childNodes = kmlObject.getFeatures().getChildNodes();
            for (i = 0; i < childNodes.getLength(); i++) {
                item = childNodes.item(i);
                calculateBounds(item, bounds);
            }
        } else if (kmlObject.getType() === 'KmlGroundOverlay') {
            /*
            Currently we follow the lead of 'computeBounds' and get
            the data via kmlObject.getLatLonBox(). If we see down the road
            that it is causing a bottleneck, we can uncomment the code below
            that gets the data via parsing the kml.
        
            kmlStr = kmlObject.getKml();
            kmlAsXml = $.parseXML(kmlStr);

            north = parseFloat(findAndGetTextValue(kmlAsXml, 'north'));
            east = parseFloat(findAndGetTextValue(kmlAsXml, 'east'));
            south = parseFloat(findAndGetTextValue(kmlAsXml, 'south'));
            west = parseFloat(findAndGetTextValue(kmlAsXml, 'west'));
            alt = parseFloat(findAndGetTextValue(kmlAsXml, 'altitude'));
        
            bounds.extend(new geo.Point(north, east, alt));
            bounds.extend(new geo.Point(north, west, alt));
            bounds.extend(new geo.Point(south, east, alt));
            bounds.extend(new geo.Point(south, west, alt));*/
            llb = kmlObject.getLatLonBox();
            if (llb) {
                alt = kmlObject.getAltitude();
                bounds.extend(new geo.Point(llb.getNorth(), llb.getEast(), alt));
                bounds.extend(new geo.Point(llb.getNorth(), llb.getWest(), alt));
                bounds.extend(new geo.Point(llb.getSouth(), llb.getEast(), alt));
                bounds.extend(new geo.Point(llb.getSouth(), llb.getWest(), alt));
            }
        } else {
            kmlStr = kmlObject.getKml();
            kmlAsXml = $.parseXML(kmlStr);
            nodes = kmlAsXml.getElementsByTagName('coordinates');
            // Note: the code to parse the coordinates has mostly been taken
            // from kmlParser.js 'parseCoordinates'
            $.each(nodes, function (index, node) {
                coordinatesText = getTextValue(node);
                coordinatesText = coordinatesText.replace(/,\s+/g, ',');
                path = coordinatesText.split(/\s+/g);
                for (i = 0; i < path.length; i++) {
                    coords = path[i].split(',');
                    if (coords.length > 1) {
                        lon = parseFloat(coords[0]);
                        lat = parseFloat(coords[1]);
                        alt = parseFloat(coords[2]);

                        bounds.extend(new geo.Point(lat, lon, alt));
                    }
                }
            });

            /* When we implement KmlModel in kmlParser, we should uncomment following code.

            // Getting location from KmlModel geometries.
            nodes = kmlAsXml.getElementsByTagName('Location');
            
            $.each(nodes, function (index, node) {
                lon = parseFloat(findAndGetTextValue(node, 'longitude'));
                lat = parseFloat(findAndGetTextValue(node, 'latitude'));
                alt = parseFloat(findAndGetTextValue(node, 'altitude'));

                bounds.extend(new geo.Point(lat, lon, alt));
            });
            */
        }
    }

    function loadWms(overlayId, featureId, name, url, params, background, sender, msg) {
        var wmsFolder,
            srs = "EPSG:4326",
            center = ge.getView().copyAsLookAt(ge.ALTITUDE_RELATIVE_TO_GROUND),
            north = center.getLatitude() + 0.35,
            south = center.getLatitude() - 0.35,
            east = center.getLongitude() + 0.55,
            west = center.getLongitude() - 0.55,
            rotation = 0,
            groundOverlay = ge.createGroundOverlay(''),
            latLonBox = ge.createLatLonBox(''),
            first = true,
            postParams,
            featureData,
            old,
            oldObject;

        getOrCreateFolder(overlayId);
        wmsFolder = getOrCreateFolder('_f.' + featureId, '', overlayId);

        // Not needed but code elsewhere assumes these exist. Fix assumptions instead?
        nwLinkObjs[overlayId] = nwLinkObjs[overlayId] || {};
        nwLinkObjs[overlayId][featureId] = nwLinkObjs[overlayId][featureId] || [];
        //overlayToId[overlayId] = overlayToId[overlayId] || 0;

        params = params || {};
        params.service = params.service || 'WMS';
        params.version = params.version || '1.1.1';
        if (params.version === '1.1.1' || params.version === '1.1.0' || params.version === '1.0.0') {
            params.srs = srs;
            //params.bbox = ulw.lng() + ',' + ulw.lat() + ',' + lrw.lng() + ',' + lrw.lat();
        } else { // 1.3.0
            params.crs = srs;
            //params.bbox = ulw.lat() + ',' + ulw.lng() + ',' + lrw.lat() + ',' + lrw.lng();
        }

        params.format = params.format || 'image%2Fpng'; //'image%2Fjpeg';
        params.request = params.request || 'GetMap';
        params.exceptions = params.exceptions || 'INIMAGE';
        params.transparent = params.transparent || 'TRUE';

        params.width = '256';
        params.height = '256';

        $.each(params, function (param, val) {
            if (first) {
                postParams = '?';
                first = false;
            } else {
                postParams += '&';
            }
            postParams += param.toUpperCase();
            postParams += '=';
            postParams += val;
        });

        latLonBox.setBox(north, south, east, west, rotation);
        groundOverlay.setIcon(ge.createIcon(''));
        groundOverlay.getIcon().setHref(url + postParams);
        groundOverlay.setLatLonBox(latLonBox);
        groundOverlay.getIcon().setViewRefreshMode(ge.VIEW_REFRESH_ON_STOP);


        // TBD - Should we order non background layers in order of load?
        // TBD - Should we reorder both background and non background (separately) when layers are turned on and off?
        // Meanwhile at least make sure background layers are in back
        if (background) { // keep wms background layers drawn on bottom (in order of load)
            groundOverlay.setDrawOrder(wmsBackgroundDrawOrderIndex++);
        }

        // remove old with same id if it exists - reload
        // probably no need for clearing network links and closing info window but theoretically
        // possible same id last used for kml...
        old = wmsFolder.getFeatures().getChildNodes();
        if (old.getLength()) {
            oldObject = old.item(0);
            findAndClearTopLevelNWLinkObjects(oldObject, overlayId, featureId);
            closeBalloon(oldObject);
            wmsFolder.getFeatures().removeChild(oldObject);
        }
        wmsFolder.getFeatures().appendChild(groundOverlay);

        featureData = {
            key: featureId,
            title: name,
            isFeature: true,
            select: isObjectVisible(wmsFolder)
        };
        jc2cui.mapWidget.addTreeItems(featureData, overlayId);
    }

    function fetchKml(overlayId, featureId, name, url, zoom, sender, msg) {
        var parentFolder = getOrCreateFolder(overlayId),
            errMsg,
            featureData;
        try {
            doFetchKml(url, function (kmlFeature) {
                try {
                    if (kmlFeature) {
                        var theParentFolder = getExistingFolder(overlayId),
                            kmlFolder = getOrCreateFolder('_f.' + featureId, '', overlayId),
                            existingKml,
                            kmlObject,
                            i,
                            bounds,
                            links,
                            l,
                            doZoom,
                            hierarchy = [overlayId, featureId];

                        if (theParentFolder !== parentFolder) { // quick user removed overlay before it finished loading
                            return;
                        }

                        // remove old kml with same id if it exists - reload
                        existingKml = kmlFolder.getFeatures().getChildNodes();
                        if (existingKml.getLength()) {
                            kmlObject = existingKml.item(0);
                            findAndClearTopLevelNWLinkObjects(kmlObject, overlayId, featureId);
                            closeBalloon(kmlObject);
                            kmlFolder.getFeatures().removeChild(kmlObject);
                        }
                        kmlFolder.getFeatures().appendChild(kmlFeature);

                        //First we extract the id and name of the kml feature and store it
                        //in the featureData object.
                        //Then we loop through all the children and extract their data
                        //into this featureData object as well. Finally, we send it to the tree via 
                        //addTreeItems
                        featureData = {
                            title: name || '[no name]',
                            tooltip: 'click to zoom to',
                            isFolder: true,
                            expand: kmlFolder.getOpen() ? true : false,
                            select: isObjectVisible(kmlFolder),
                            isFeature: true,
                            key: featureId
                        };

                        //setTimeout(function () { // Dont do this - problems with links automatically being loaded by earth before we take control - e.g. weather
                        if (overlayId !== jc2cui.mapWidget.USER_DRAWN_OVERLAY) {
                            populateData(kmlFeature, featureData, overlayId, featureId, hierarchy);
                        }
                        jc2cui.mapWidget.addTreeItems(featureData, overlayId, featureId);
                        //}, 1);

                        // Doesnt seem to be any way to request links set to refresh on request to refresh.
                        // Lets change them into on stop links so they refresh whenever map view changes (same as we do in 2d)
                        links = kmlFolder.getElementsByType('KmlLink');
                        for (i = 0; i < links.getLength(); i++) {
                            l = links.item(i);
                            if (l.getViewRefreshMode() === ge.VIEW_REFRESH_ON_REQUEST) {
                                l.setViewRefreshMode(ge.VIEW_REFRESH_ON_STOP);
                                l.setViewRefreshTime(4);
                            }
                        }

                        if (zoom && isObjectVisible(parentFolder)) {
                            // Unfortunately there is no callback when network links loaded
                            // and we cant zoom until they load. 
                            // If any found, wait a few seconds and hope for the best
                            links = kmlFolder.getElementsByType('KmlNetworkLink');
                            doZoom = function () {
                                if (kmlFeature.getAbstractView()) {
                                    ge.getView().setAbstractView(kmlFeature.getAbstractView());
                                } else {
                                    google.earth.executeBatch(ge, function () {
                                        bounds = new geo.Bounds();
                                        calculateBounds(kmlFeature, bounds);
                                        if (!bounds.isEmpty()) {
                                            gex.view.setToBoundsView(bounds, { aspectRatio: mapDiv.width() / mapDiv.height() });
                                        }
                                    });
                                }
                            };
                            if (links.getLength() > 0) {
                                setTimeout(doZoom, 5000);
                            } else {
                                doZoom();
                            }
                        }
                    } else {
                        featureData = {
                            title: name + ' - LOAD FAILED',
                            isFolder: true,
                            key: featureId,
                            select: isObjectVisible(getExistingFolder(overlayId))
                        };
                        jc2cui.mapWidget.addTreeItems(featureData, overlayId, featureId);
                        jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.plot', msg: msg, error: 'Failed to create KML object.' });
                    }
                } catch (err) {
                    errMsg = 'Failed to create KML object';
                    if (err) {
                        errMsg += ': ' + err;
                    }
                    featureData = {
                        title: name + ' - LOAD FAILED',
                        isFolder: true,
                        key: featureId,
                        select: isObjectVisible(getExistingFolder(overlayId))
                    };
                    jc2cui.mapWidget.addTreeItems(featureData, overlayId, featureId);
                    jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.plot', msg: msg, error: errMsg });
                }
            }, featureId);
        } catch (err) {
            featureData = {
                title: name + ' - LOAD FAILED',
                isFolder: true,
                key: featureId,
                select: isObjectVisible(getExistingFolder(overlayId))
            };
            jc2cui.mapWidget.addTreeItems(featureData, overlayId, featureId);
            errMsg = 'Failed to load KML';
            if (err) {
                errMsg += ': ' + err;
            }
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.plot', msg: msg, error: errMsg });
        }
    }

    function parseKml(overlayId, featureId, kml, name, zoom, sender, msg) {
        var errMsg,
            kmlObject,
            existingKml,
            oldKml,
            i,
            bounds,
            links,
            l,
            doZoom,
            hierarchy = [overlayId, featureId],
            featureData,
            parentFolder = getOrCreateFolder(overlayId),
            kmlFolder = getOrCreateFolder('_f.' + featureId, '', overlayId);
        try {
            kmlObject = ge.parseKml(kml);

            // remove old kml with same id if it exists - reload
            existingKml = kmlFolder.getFeatures().getChildNodes();
            if (existingKml.getLength()) {
                oldKml = existingKml.item(0);
                findAndClearTopLevelNWLinkObjects(oldKml, overlayId, featureId);
                closeBalloon(oldKml);
                kmlFolder.getFeatures().removeChild(oldKml);
            }
            kmlFolder.getFeatures().appendChild(kmlObject);

            //First we extract the id and name of the kml feature and store it
            //in the featureData object.
            //Then we loop through all the children and extract their data
            //into this featureData object as well. Finally, we send it to the tree via 
            //addTreeItems
            featureData = {
                key: featureId,
                title: name || '[no name]',
                isFeature: true,
                isFolder: true,
                tooltip: 'click to zoom to',
                select: isObjectVisible(kmlFolder),
                expand: kmlFolder.getOpen() ? true : false
            };
            //setTimeout(function () { // Dont do this - problems with links automatically being loaded by earth before we take control - e.g. weather
            if (overlayId !== jc2cui.mapWidget.USER_DRAWN_OVERLAY) {
                populateData(kmlObject, featureData, overlayId, featureId, hierarchy);
            }
            jc2cui.mapWidget.addTreeItems(featureData, overlayId, featureId);
            //}, 1);

            // Doesnt seem to be any way to request links set to refresh on request to refresh.
            // Lets change them into on stop links so they refresh whenever map view changes (same as we do in 2d)
            links = kmlFolder.getElementsByType('KmlLink');
            for (i = 0; i < links.getLength(); i++) {
                l = links.item(i);
                if (l.getViewRefreshMode() === ge.VIEW_REFRESH_ON_REQUEST) {
                    l.setViewRefreshMode(ge.VIEW_REFRESH_ON_STOP);
                    l.setViewRefreshTime(4);
                }
            }

            if (zoom && isObjectVisible(parentFolder)) {
                // Unfortunately there is no callback when network links loaded
                // and we cant zoom until they load. 
                // If any found, wait a few seconds and hope for the best
                links = kmlFolder.getElementsByType('KmlNetworkLink');
                doZoom = function () {
                    if (kmlObject.getAbstractView()) {
                        ge.getView().setAbstractView(kmlObject.getAbstractView());
                    } else {
                        google.earth.executeBatch(ge, function () {
                            bounds = new geo.Bounds();
                            calculateBounds(kmlObject, bounds);
                            if (!bounds.isEmpty()) {
                                gex.view.setToBoundsView(bounds, { aspectRatio: mapDiv.width() / mapDiv.height() });
                            }
                        });
                    }
                };
                if (links.getLength() > 0) {
                    setTimeout(doZoom, 4000);
                } else {
                    doZoom();
                }
            }
        } catch (err) {
            errMsg = 'Failed to plot KML.';
            if (err) {
                errMsg += ': ' + err;
            }
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.plot', msg: msg, error: errMsg });
        }
    }

    function findItem(overlayId, theId) {
        var oids = objectToId[overlayId],
            theItem;

        if (oids) {
            $.each(oids, function (featureId, items) {
                $.each(items, function (key, item) {
                    if (key.toString() === theId.toString()) {
                        theItem = item;
                        return false;
                    }
                });
                return !theItem;
            });
        }
        return theItem;
    }

    function setOverlayVisibility(id, visibility, sender, msg) {
        var folder = getExistingFolder(id),
            parent,
            i;
        if (!folder) {
            folder = defaultLayers.idMap[id];
            if (folder) {
                setDefaultLayerVisibility(folder, visibility);
            } else if (id === 'defaultLayers') { // special case - top level
                for (i = 0; i < defaultLayers.layers[0].children.length; i++) {
                    setDefaultLayerVisibility(defaultLayers.layers[0].children[i], visibility);
                }
            } else {
                jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.overlay.' + (visibility ? 'show' : 'hide'), msg: msg, error: 'No overlay with id ' + id + ' found to ' + (visibility ? 'show.' : 'hide.') });
            }
            return;
        }
        if (!visibility) {
            closeBalloon(folder);
        }

        setVisible(folder, visibility);
        visibleOverlays[id] = visibility;

        // Unlike google earth not all parents have to be explicitly turned on to see child - we turn on parents automatically
        if (visibility) {
            parent = folder.getParentNode();
            while (parent) {
                if (parent.getType() === 'GEGlobe') {
                    break;
                }
                parent.setVisibility(true);
                parent = parent.getParentNode();
            }
        }
    }

    function isOverlayVisible(id) {
        return visibleOverlays[id] || (defaultLayers.idMap[id] && defaultLayers.idMap[id].visibility);
    }

    function removeFeature(data, sender, msg) {
        var folder = getExistingFolder(data.overlayId),
            existingFeature;

        if (!folder) {
            folder = defaultLayers.idMap[data.featureId];
            if (folder) {
                setDefaultLayerVisibility(folder, false);
            } else {
                jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.unplot', msg: msg, error: 'Unable to find overlay ' + data.overlayId });
            }
            return;
        }

        existingFeature = folder.getElementById(getUniqueId('_f.' + data.featureId));

        if (!existingFeature) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.unplot', msg: msg, error: 'Unable to find feature with featureId ' + data.featureId });
            return;
        }

        delete featureLoadMorePlacemarks[data.featureId];

        closeBalloon(existingFeature);
        folder.getFeatures().removeChild(existingFeature);
        existingFeature.release();

        if (objectToId[data.overlayId]) {
            delete objectToId[data.overlayId][data.featureId];
        }
        if (overlayToId[data.overlayId]) {
            delete overlayToId[data.overlayId];
        }

        if (nwLinkObjs[data.overlayId]) {
            $.each(nwLinkObjs[data.overlayId][data.featureId], function (i, timerObject) {
                clearTimerIncludingAllChildren(timerObject);
            });
            delete nwLinkObjs[data.overlayId][data.featureId];
        }
    }

    function showFeature(data, sender, msg) {
        var folder = getExistingFolder(data.overlayId),
            parent = folder,
            existingFeature;

        if (!folder) {
            folder = defaultLayers.idMap[data.featureId];
            if (folder) {
                setDefaultLayerVisibility(folder, true);
            } else {
                jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.show', msg: msg, error: 'Unable to find overlay ' + data.overlayId });
            }
            return;
        }

        existingFeature = folder.getElementById(getUniqueId('_f.' + data.featureId));

        if (!existingFeature) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.show', msg: msg, error: 'Unable to find feature with featureId ' + data.featureId });
            return;
        }

        setVisible(existingFeature, true);

        // Unlike google earth not all parents have to be explicitly turned on to see child - we turn on parents automatically
        while (parent) {
            if (parent.getType() === 'GEGlobe') {
                break;
            }
            parent.setVisibility(true);
            parent = parent.getParentNode();
        }

        // Dont do this. MapWidget calls showFeature followed by centerOnFeature - auto if zoom requested
        /*if (data.zoom) {
            if (existingFeature.getAbstractView()) {
                ge.getView().setAbstractView(existingFeature.getAbstractView());
            } else {
                google.earth.executeBatch(ge, function () {
                    bounds = new geo.Bounds();
                    calculateBounds(existingFeature, bounds);
                    if (!bounds.isEmpty()) {
                        gex.view.setToBoundsView(bounds, { aspectRatio: mapDiv.width() / mapDiv.height() });
                    }
                });
            }
        }*/
    }

    function hideFeature(data, sender, msg) {
        var folder = getExistingFolder(data.overlayId),
            existingFeature;

        if (!folder) {
            folder = defaultLayers.idMap[data.featureId];
            if (folder) {
                setDefaultLayerVisibility(folder, false);
            } else {
                jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.hide', msg: msg, error: 'Unable to find overlay ' + data.overlayId });
            }
            return;
        }

        existingFeature = folder.getElementById(getUniqueId('_f.' + data.featureId));

        if (!existingFeature) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.feature.hide', msg: msg, error: 'Unable to find feature with featureId ' + data.featureId });
            return;
        }
        closeBalloon(existingFeature);
        setVisible(existingFeature, false);
    }

    function showItem(data) {
        var existingItem = findItem(data.overlayId, data.itemId),
            bounds;

        if (existingItem) {
            setVisible(existingItem, true);

            if (data.zoom) {
                bounds = gex.dom.computeBounds(existingItem);
                if (!bounds.isEmpty()) {
                    gex.view.setToBoundsView(bounds, { aspectRatio: mapDiv.width() / mapDiv.height() });
                }
            }
        }
    }

    function hideItem(data) {
        var existingItem = findItem(data.overlayId, data.itemId);

        if (existingItem) {
            closeBalloon(existingItem);
            setVisible(existingItem, false);
        }
    }

    function removeOverlay(id, sender, msg) {
        var folder = getExistingFolder(id),
            overlayIds = [],
            i;
        if (!folder) {
            folder = defaultLayers.idMap[id];
            if (folder) {
                setDefaultLayerVisibility(folder, false);
            } else if (id === 'defaultLayers') { // special case - top level
                for (i = 0; i < defaultLayers.layers[0].children.length; i++) {
                    setDefaultLayerVisibility(defaultLayers.layers[0].children[i], false);
                }
            } else {
                jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.overlay.remove', msg: msg, error: 'No overlay with id ' + id + ' found to remove.' });
            }
            return;
        }
        closeBalloon(folder);
        if (id === jc2cui.mapWidget.USER_DRAWN_OVERLAY) {
            $.each(createdFeatures, function (index, feature) {
                makeFeatureEditable(feature, false);
            });
            createdFeatures = {};
        }

        //1. Get all the sub folder ids (they might be overlays or features).
        //2. If the id exists as an overlay in 'nwLinkObjs' clear the timers.
        getAllNestedFolderIds(id, overlayIds, folder);
        $.each(overlayIds, function (i, overlayId) {
            if (overlayId.length > 3) {
                delete featureLoadMorePlacemarks[overlayId.substr(3)]; // chop off _f.
            }
            if (nwLinkObjs[overlayId]) {
                $.each(nwLinkObjs[overlayId], function (j, feature) {
                    $.each(feature, function (k, timerObject) {
                        clearTimerIncludingAllChildren(timerObject);
                    });
                });
                delete nwLinkObjs[overlayId];
            }
        });
        folder.getParentNode().getFeatures().removeChild(folder);
        folder.release();

        delete objectToId[id];
        delete overlayToId[id];
    }

    function centerOnLocation(location, zoom) {
        var look = ge.getView().copyAsLookAt(ge.ALTITUDE_RELATIVE_TO_GROUND),
            range;
        if (location) {
            look.setLatitude(location.lat);
            look.setLongitude(location.lon);
        }
        if (zoom !== undefined && zoom !== null) { // maybe 0
            if (zoom === 'auto') {
                range = 0;
            } else {
                range = zoom;
            }
        }
        if (range !== undefined) {
            look.setRange(range);
        }
        ge.getView().setAbstractView(look);
    }

    function centerOnBounds(bounds, zoom) {
        if (zoom === 'auto') {
            gex.view.setToBoundsView(bounds, { aspectRatio: mapDiv.width() / mapDiv.height() });
        } else {
            var center = bounds.center();
            centerOnLocation({ lat: center.lat(), lon: center.lng() }, zoom);
        }
    }

    function centerOnOverlay(id, zoom) {
        var folder = getExistingFolder(id),
            bounds,
            lookAt,
            temp;

        if (!folder) {
            console.log('earth configured map widget. No overlay with id ' + id + ' found to zoom to.');
            return;
        }

        lookAt = folder.getAbstractView();
        if (lookAt) {
            // unlikely to ever happen as code currently never attempts to get lower level features 
            // lookAts under any circumstances - unlike maps implementation which does under 
            // certain conditions (not necessarily correct conditions - havent reviewed that yet)
            if (zoom !== 'auto') {
                temp = ge.getView().copyAsLookAt(ge.ALTITUDE_RELATIVE_TO_GROUND); // cant copy existingKML lookAt for some reason. get error
                temp.setLatitude(lookAt.getLatitude());
                temp.setLongitude(lookAt.getLongitude());
                lookAt = temp;
                if (zoom !== undefined && zoom !== null) { // maybe 0
                    lookAt.setRange(zoom);
                }
            }
            ge.getView().setAbstractView(lookAt);
        } else {
            google.earth.executeBatch(ge, function () {
                bounds = new geo.Bounds();
                calculateBounds(folder, bounds);
                centerOnBounds(bounds, zoom);
            });
        }
    }

    function centerOnFeature(data, sender, msg) {
        var folder = getExistingFolder(data.overlayId),
            existingKml,
            bounds,
            selectionData,
            lookAt,
            temp;

        if (!folder) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.view.center.feature', msg: msg, error: 'Unable to find overlay ' + data.overlayId });
            return;
        }

        existingKml = folder.getElementById(getUniqueId('_f.' + data.featureId));

        if (!existingKml) {
            jc2cui.mapWidget.error({ sender: sender ? sender.id : '', type: 'map.view.center.feature', msg: msg, error: 'Unable to find feature with featureId ' + data.featureId });
            return;
        }

        lookAt = existingKml.getAbstractView();
        if (lookAt) {
            // unlikely to ever happen as code currently never attempts to get lower level features 
            // lookAts under any circumstances - unlike maps implementation which does under 
            // certain conditions (not necessarily correct conditions - havent reviewed that yet)
            if (data.zoom !== 'auto') {
                temp = ge.getView().copyAsLookAt(ge.ALTITUDE_RELATIVE_TO_GROUND); // cant copy existingKML lookAt for some reason. get error
                temp.setLatitude(lookAt.getLatitude());
                temp.setLongitude(lookAt.getLongitude());
                lookAt = temp;
                if (data.zoom !== undefined && data.zoom !== null) { // maybe 0
                    lookAt.setRange(data.zoom);
                }
            }
            ge.getView().setAbstractView(lookAt);
        } else {
            google.earth.executeBatch(ge, function () {
                bounds = new geo.Bounds();
                calculateBounds(existingKml, bounds);
                centerOnBounds(bounds, data.zoom);
            });
        }

        if (data.select) { // user drawn placemark
            existingKml = existingKml.getElementById(data.featureId);
            if (existingKml) {
                selectionData = {
                    selectedId: data.featureId || '', // or existingKml.getId()
                    selectedName: existingKml.getName() || '',
                    featureId: data.featureId,
                    overlayId: data.overlayId
                };
                jc2cui.mapWidget.itemSelected(selectionData);
            }
        }
    }

    function centerOnItem(data) {
        var existingItem = findItem(data.overlayId, data.itemId),
            bounds,
            selectionData,
            lookAt,
            temp;

        if (existingItem) {
            lookAt = existingItem.getAbstractView();
            if (lookAt) {
                if (data.zoom !== 'auto') {
                    temp = ge.getView().copyAsLookAt(ge.ALTITUDE_RELATIVE_TO_GROUND); // cant copy existingKML lookAt for some reason. get error
                    temp.setLatitude(lookAt.getLatitude());
                    temp.setLongitude(lookAt.getLongitude());
                    lookAt = temp;
                    if (data.zoom !== undefined && data.zoom !== null) { // maybe 0
                        lookAt.setRange(data.zoom);
                    }
                }
                ge.getView().setAbstractView(lookAt);
            } else {
                google.earth.executeBatch(ge, function () {
                    bounds = new geo.Bounds();
                    calculateBounds(existingItem, bounds);
                    centerOnBounds(bounds, data.zoom);
                });
            }

            if (data.select) {
                selectionData = getSelectedData(existingItem);
                jc2cui.mapWidget.itemSelected(selectionData);
            }
        }
    }

    function zoomToRange(range) {
        centerOnLocation(null, range);
    }

    function selected(data) {
        var folder = getExistingFolder(data.overlayId),
            selectedItem,
            bounds,
            elements,
            numberOfElements,
            i,
            j,
            lookAt,
            center,
            selectableTypes = ['KmlGroundOverlay', 'KmlPlacemark'];

        if (!folder) {
            console.log('earth configured map widget unable to find overlay ' + data.overlayId + ' for selected item with id ' + data.selectedId + ' and name ' + data.selectedName);
            return;
        }

        // TBD - only look for selected in feature identified by featureId
        // TBD - If no selectedId and selectedName included but featureId contains only one feature, it is selected

        if (data.selectedId && data.selectedId.length > 0) {
            //selectedItem = folder.getElementById(data.selectedId); -- why doesnt this simple statement work??????

            for (j = 0; j < selectableTypes.length; j++) {
                elements = folder.getElementsByType(selectableTypes[j]);
                numberOfElements = elements.getLength();
                for (i = 0; i < numberOfElements; i++) {
                    if (elements.item(i).getId() === data.selectedId) {
                        selectedItem = elements.item(i);
                        break;
                    }
                }
                if (selectedItem) {
                    break;
                }
            }
        }

        if (!selectedItem && data.selectedName && data.selectedName.length > 0) {
            for (j = 0; j < selectableTypes.length; j++) {
                elements = folder.getElementsByType(selectableTypes[j]);
                numberOfElements = elements.getLength();
                for (i = 0; i < numberOfElements; i++) {
                    if (elements.item(i).getName() === data.selectedName) {
                        selectedItem = elements.item(i);
                        break;
                    }
                }
                if (selectedItem) {
                    break;
                }
            }
        }

        if (selectedItem) {
            // Zooming to selected often VERY annoying. Lets try no zooming
            /*if (selectedItem.getAbstractView()) {
            ge.getView().setAbstractView(selectedItem.getAbstractView());
            } else {
            bounds = gex.dom.computeBounds(selectedItem);
            if (!bounds.isEmpty()) {
            gex.view.setToBoundsView(bounds, { aspectRatio: mapDiv.width() / mapDiv.height() });
            }
            }*/

            // As per comment above zoom on itemSelection very annoying. Should perhaps try to go to abstarct view location without applying rest of view
            /*if (selectedItem.getAbstractView() !== null) {
                ge.getView().setAbstractView(selectedItem.getAbstractView());
            } else {*/
            google.earth.executeBatch(ge, function () {
                bounds = new geo.Bounds();
                calculateBounds(selectedItem, bounds);
                if (!bounds.isEmpty()) {
                    center = bounds.getCenter();

                    lookAt = ge.getView().copyAsLookAt(ge.ALTITUDE_RELATIVE_TO_GROUND);
                    lookAt.setLatitude(center.lat());
                    lookAt.setLongitude(center.lng());

                    // Update the view in Google Earth
                    ge.getView().setAbstractView(lookAt);
                }
            });
            //}
        } else {
            console.log('earth configured map widget unable to find selected item with id ' + data.selectedId + ' and name ' + data.selectedName);
        }
    }

    function setExpanded(overlayId, itemId, expanded) {
        var existingItem = findItem(overlayId, itemId);

        if (existingItem) {
            existingItem.setOpen(expanded);
        }
    }

    return {
        init: function (configSettings) {
            config = configSettings;
            if (!config) {
                jc2cui.mapWidget.showError('Missing config file. Unable to load Google Earth API');
                return;
            }

            if (config.ajaxLoadUrl) {
                var urlToUse = config.ajaxLoadUrl + '?';
                if (config.key) {
                    urlToUse += 'key=' + config.key + '&';
                } else {
                    console.log("No Earth API key provided!");
                }
                $.ajax({
                    url: urlToUse + 'callback=googleLoaded',
                    dataType: 'script',
                    timeout: 20000, // At least as of jQuery 1.7.1 no longer getting error callbacks if cross domain script loading fails
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        var msg = 'Error initializing Google Earth';
                        if (textStatus && textStatus !== 'error') {
                            msg += ': ' + textStatus;
                        }
                        jc2cui.mapWidget.showError(msg);
                    }
                });
            } else if (config.earthApiUrl) {
                $.ajax({
                    url: config.earthApiUrl.url,
                    dataType: 'script',
                    timeout: 20000, // At least as of jQuery 1.7.1 no longer getting error callbacks if cross domain script loading fails
                    success: function (data, textStatus) {
                        window.google = window.google || {};
                        window.google.loader = window.google.loader || {};
                        window.google.earth = window.google.earth || {};
                        if (config.key) {
                            window.google.loader.ApiKey = config.key;
                        } else {
                            console.log("No Earth API key provided!");
                        }
                        window.google.loader.KeyVerified = true;
                        if (config.earthApiUrl.errorUrl) {
                            window.google.earth.setErrorUrl(config.earthApiUrl.errorUrl);
                        } else {
                            console.log("No config.earthApiUrl.errorUrl provided!");
                        }

                        if (!config.earthApiUrl.database) {
                            console.log("No config.earthApiUrl.database provided!");
                        }

                        var loadingImageUrl = document.location.href;
                        loadingImageUrl = loadingImageUrl.substring(0, loadingImageUrl.lastIndexOf('/') + 1);
                        loadingImageUrl += 'images/loading.gif';
                        window.google.earth.setLoadingImageUrl(loadingImageUrl);

                        initEarth();
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        var msg = 'Error initializing Google Earth';
                        if (textStatus && textStatus !== 'error') {
                            msg += ': ' + textStatus;
                        }
                        jc2cui.mapWidget.showError(msg);
                    }
                });
            } else {
                jc2cui.mapWidget.showError('Config file includes neither a ajax load url or a direct Google Earth API url. Unable to load Google Earth API');
                return;
            }
            maxPlacemarks = config.constraints ? config.constraints.maxPlacemarks : undefined;
        },
        createOverlay: function (data, sender, msg) {
            getOrCreateFolder(data.overlayId, data.name, data.parentId);
        },
        removeOverlay: function (id, sender, msg) {
            removeOverlay(id, sender, msg);
        },
        setOverlayVisibility: function (id, visibility, sender, msg) {
            setOverlayVisibility(id, visibility, sender, msg);
        },
        isOverlayVisible: function (id) {
            return isOverlayVisible(id);
        },
        updateOverlay: function (data, sender, msg) {
            var folder = getExistingFolder(data.overlayId),
                parent,
                wasVisible,
                newParentIsVisible;
            if (!folder) {
                return false;
            }
            if (data.parentId) {
                parent = getExistingFolder(data.parentId);
                if (!parent) {
                    return false;
                }
                if (parent !== folder.getParentNode()) {
                    wasVisible = isObjectVisible(folder);
                    folder.getParentNode().getFeatures().removeChild(folder);
                    parent.getFeatures().appendChild(folder);
                    newParentIsVisible = isObjectVisible(parent);
                    if (wasVisible !== newParentIsVisible) {
                        if (wasVisible) {
                            turnParentOnWithoutTurningOnChildren(parent, folder);
                        } else {
                            folder.setVisibility(false);
                        }
                    }
                }
            }
            return true;
        },
        loadKml: function (data, sender, msg) {
            fetchKml(data.overlayId, data.featureId, (data.name || data.featureName || data.url), data.url, data.zoom, sender, msg);
        },
        loadWms: function (data, sender, msg) {
            loadWms(data.overlayId, data.featureId, (data.name || data.featureName || data.url), data.url, data.params, data.background, sender, msg);
        },
        parseKml: function (data, sender, msg) {
            parseKml(data.overlayId, data.featureId, data.feature, (data.name || data.featureName || 'kml'), data.zoom, sender, msg);
        },
        removeFeature: function (data, sender, msg) {
            removeFeature(data, sender, msg);
        },
        updateFeature: function (data, errors, sender, msg) {
            var folder,
                feature,
                parent,
                wasVisible,
                newParentIsVisible;

            if (data.newOverlayId) {
                folder = getExistingFolder(data.overlayId);
                if (!folder) {
                    errors.push('Unable to find overlay ' + data.overlayId);
                    return false;
                }
                feature = folder.getElementById(getUniqueId('_f.' + data.featureId));
                if (!feature) {
                    errors.push('Unable to find feature ' + data.featureId + ' in overlay ' + data.overlayId);
                    return false;
                }
                parent = getExistingFolder(data.newOverlayId);
                if (!parent) {
                    errors.push('Unable to find overlay ' + data.newOverlayId);
                    return false;
                }
                if (parent !== feature.getParentNode()) {
                    wasVisible = isObjectVisible(feature);
                    feature.getParentNode().getFeatures().removeChild(feature);
                    parent.getFeatures().appendChild(feature);

                    nwLinkObjs[data.newOverlayId] = nwLinkObjs[data.newOverlayId] || {};
                    nwLinkObjs[data.newOverlayId][data.featureId] = nwLinkObjs[data.overlayId][data.featureId];
                    delete nwLinkObjs[data.overlayId][data.featureId];

                    objectToId[data.newOverlayId] = objectToId[data.newOverlayId] || {};
                    objectToId[data.newOverlayId][data.featureId] = objectToId[data.overlayId][data.featureId];
                    delete objectToId[data.overlayId][data.featureId];

                    //overlayToId

                    newParentIsVisible = isObjectVisible(parent);
                    if (wasVisible !== newParentIsVisible) {
                        if (wasVisible) {
                            turnParentOnWithoutTurningOnChildren(parent, feature);
                        } else {
                            feature.setVisibility(false);
                        }
                    }
                }
            }
            return true;
        },
        showFeature: function (data, sender, msg) {
            showFeature(data, sender, msg);
        },
        hideFeature: function (data, sender, msg) {
            hideFeature(data, sender, msg);
        },
        showItem: function (data) {
            showItem(data);
        },
        hideItem: function (data) {
            hideItem(data);
        },
        centerOnOverlay: function (data, sender, msg) {
            centerOnOverlay(data.overlayId, data.zoom);
        },
        centerOnFeature: function (data, sender, msg) {
            centerOnFeature(data, sender, msg);
        },
        centerOnItem: function (data) {
            centerOnItem(data);
        },
        centerOnLocation: function (data, sender, msg) {
            centerOnLocation(data.location, data.zoom);
        },
        fitToBounds: function (bounds) {
            centerOnBounds(bounds, 'auto');
        },
        centerOnBounds: function (data, sender, msg) {
            var bounds = new geo.Bounds([data.bounds.southWest.lat, data.bounds.southWest.lon], [data.bounds.northEast.lat, data.bounds.northEast.lon]);
            centerOnBounds(bounds, data.zoom);
        },
        zoomToRange: function (data, sender, msg) {
            zoomToRange(data.range);
        },
        selected: function (data, sender, msg) {
            selected(data);
        },
        getViewStatus: function (data, sender, msg) {
            return getViewStatus(data, sender, msg);
        },
        getDropLocation: function () {
            console.log('earth drop not yet supported by OWF');
            return { lat: 0, lon: 0 };
        },
        checkResize: function () {
            ge.getWindow().setVisibility(false);
            ge.getWindow().setVisibility(true);
        },
        setDrawingToolsVisibility: function (show) {
            setDrawingToolsVisibility(show);
        },
        setExpanded: function (overlayId, itemId, expanded) {
            setExpanded(overlayId, itemId, expanded);
        },
        optionChanged: function (option, value) {
            return;
        },
        googleReady: function () {// ajax API load
            loadEarth();
        },
        earthReady: function () {// direct API load
            initEarth();
        },
        info: function () {
            return { name: 'Google Earth Plugin ' + ge.getPluginVersion(), type: '3D', entities: 'Approximately ' + getNumberOfEntities() + ' entities loaded' };
        }
    };
}());



