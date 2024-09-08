import maplibregl from 'maplibre-gl';

export function addTriangleLayer(map) {
  console.log("Adding Triangle Layer");

  // Remove existing layer if it exists
  if (map.getLayer('highlight')) {
    map.removeLayer('highlight');
  }

  const highlightLayer = {
    id: 'highlight',
    type: 'custom',

    onAdd(map, gl) {
      const vertexSource = `#version 300 es
        uniform mat4 u_matrix;
        in vec2 a_pos;
        void main() {
            gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
        }`;

      const fragmentSource = `#version 300 es
        out highp vec4 fragColor;
        void main() {
            fragColor = vec4(1.0, 0.0, 0.0, 0.5);
        }`;

      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, vertexSource);
      gl.compileShader(vertexShader);

      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragmentShader, fragmentSource);
      gl.compileShader(fragmentShader);

      this.program = gl.createProgram();
      gl.attachShader(this.program, vertexShader);
      gl.attachShader(this.program, fragmentShader);
      gl.linkProgram(this.program);

      this.aPos = gl.getAttribLocation(this.program, 'a_pos');

      const capeTown = maplibregl.MercatorCoordinate.fromLngLat({
        lng: 18.4241,
        lat: -33.9249
      });
      const durban = maplibregl.MercatorCoordinate.fromLngLat({
        lng: 31.0218,
        lat: -29.8587
      });
      const johannesburg = maplibregl.MercatorCoordinate.fromLngLat({
        lng: 28.0473,
        lat: -26.2041
      });

      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          capeTown.x, capeTown.y,
          durban.x, durban.y,
          johannesburg.x, johannesburg.y
        ]),
        gl.STATIC_DRAW
      );
    },

    render(gl, matrix) {
      gl.useProgram(this.program);
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.program, 'u_matrix'),
        false,
        matrix
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.enableVertexAttribArray(this.aPos);
      gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
    }
  };

  map.addLayer(highlightLayer);
  console.log("Triangle Layer added successfully");
}