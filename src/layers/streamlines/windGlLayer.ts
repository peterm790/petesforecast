import maplibregl from "maplibre-gl"; 
import abstractGlLayer from "./abstractGlLayer";
import ExtProgram from "./util/ExtProgram";
// import { fetch, loadImage } from "./util/util";


type WindInfo = {
  width: number;
  height: number;
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
};

const defaultRampColors: { [key: number]: string } = {
  0.0: '#3288bd',
  0.1: '#66c2a5',
  0.2: '#abdda4',
  0.3: '#e6f598',
  0.4: '#fee08b',
  0.5: '#fdae61',
  0.6: '#f46d43',
  1.0: '#d53e4f'
};

function getColorRamp(colors: { [key: number]: string }): Uint8Array {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  canvas.width = 256;
  canvas.height = 1;

  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  for (const stop in colors) {
    if (colors.hasOwnProperty(stop)) {
      gradient.addColorStop(parseFloat(stop), colors[stop]);
    }
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);

  return new Uint8Array(ctx.getImageData(0, 0, 256, 1).data);
}

export default class WindGlLayer extends abstractGlLayer {
  fadeOpacity = 0.95;
  speedFactor = 0.4;
  dropRate = 0.003;
  dropRateBump = 0.01;
  numParticles = 2 ** 14;
  particleStateResolution = 0;

  isZoom = false;

  drawProgram?: ExtProgram;
  screenProgram?: ExtProgram;
  updateProgram?: ExtProgram;

  quadBuffer?: WebGLBuffer;
  framebuffer: WebGLBuffer | null = null;

  colorRampTexture?: WebGLTexture;
  backgroundTexture?: WebGLTexture;
  screenTexture?: WebGLTexture;
  particleStateTexture0?: WebGLTexture;
  particleStateTexture1?: WebGLTexture;

  particleIndexBuffer?: WebGLBuffer;

  windData: WindInfo[] = [];
  windTexture: WebGLTexture[] = [];
  windMix = 0;

  constructor(shaders: string[], map: maplibregl.Map, gl: WebGLRenderingContext) {
    super(shaders, map, gl);
    this.init();
  }

  async init(): Promise<void> {
    const gl = this.gl;
    const [drawVert, quadVert, drawFrag, screenFrag, updateFrag] = this.shaders;

    this.drawProgram = this.createProgram(drawVert, drawFrag);
    this.screenProgram = this.createProgram(quadVert, screenFrag);
    this.updateProgram = this.createProgram(quadVert, updateFrag);

    this.quadBuffer = this.createBuffer(
      new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1])
    );
    this.framebuffer = gl.createFramebuffer();

    this.colorRampTexture = this.createTexture(gl.LINEAR, getColorRamp(defaultRampColors));

    this.clear();
  }

  clear(): void {
    this.setNumParticles(this.numParticles);
    const width = this.gl.canvas.width;
    const height = this.gl.canvas.height;
    const emptyPixels = new Uint8Array(width * height * 4);
    this.screenTexture = this.createTexture(
      this.gl.NEAREST,
      emptyPixels,
      width,
      height
    );
    this.backgroundTexture = this.createTexture(
      this.gl.NEAREST,
      emptyPixels,
      width,
      height
    );
  }

  prerender(matrix: number[]): void {
    if (!this.windData.length || this.isZoom) {
      return;
    }
    this.bindTextures();
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    if (this.framebuffer) {
      this.bindFramebuffer(this.framebuffer, this.screenTexture);
    }

    if (this.backgroundTexture) {
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.drawTexture(this.backgroundTexture, this.fadeOpacity);
      this.gl.disable(this.gl.BLEND);
    }
    this.drawParticles(matrix);
    this.updateParticles();
  }

  render(): void {
    if (!this.windData.length || this.isZoom) {
      return;
    }
    const gl = this.gl;
    this.bindTextures();

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (this.screenTexture) {
      this.drawTexture(this.screenTexture, 0.8);
    }
    gl.disable(gl.BLEND);

    // save the current screen as the background for the next frame
    const temp = this.backgroundTexture;
    this.backgroundTexture = this.screenTexture;
    this.screenTexture = temp;

    this.map.triggerRepaint();
  }

  private bindTextures(): void {
    // current wind texture
    if (this.windTexture[0]) {
      this.bindTexture(this.windTexture[0], 0);
    }
    // previous wind texture for blending
    if (this.windTexture[1]) {
      this.bindTexture(this.windTexture[1], 3);
    }
    if (this.particleStateTexture0) {
      this.bindTexture(this.particleStateTexture0, 1);
    }
  }

  private drawTexture(texture: WebGLTexture, opacity: number): void {
    const gl = this.gl;
    if (this.screenProgram) {
      const prog = this.screenProgram;
      gl.useProgram(prog.getProgram());
      const aPos = prog.getAttribute("a_pos");

      if (this.quadBuffer) {
        this.bindAttribute(this.quadBuffer, aPos, 2);
      }
      this.bindTexture(texture, 2);
      gl.uniform1i(prog.getUniform("u_screen"), 2);
      gl.uniform1f(prog.getUniform("u_opacity"), opacity);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  private drawParticles(matrix: number[]): void {
    const gl = this.gl;
    if (this.drawProgram && this.windData.length) {
      const prog = this.drawProgram;
      gl.useProgram(prog.getProgram());
      const aIndex = prog.getAttribute("a_index");

      if (this.particleIndexBuffer) {
        this.bindAttribute(this.particleIndexBuffer, aIndex, 1);
      }
      if (this.colorRampTexture) {
        this.bindTexture(this.colorRampTexture, 2);
      }

      gl.uniform1i(prog.getUniform("u_wind"), 0);
      gl.uniform1i(prog.getUniform("u_previous"), 3);
      gl.uniform1i(prog.getUniform("u_particles"), 1);
      gl.uniform1i(prog.getUniform("u_color_ramp"), 2);
      gl.uniformMatrix4fv(prog.getUniform("u_matrix"), false, matrix);

      gl.uniform1f(prog.getUniform("u_velocity"), this.windMix);
      gl.uniform1f(
        prog.getUniform("u_particles_res"),
        this.particleStateResolution
      );
      gl.uniform2f(
        prog.getUniform("u_wind_min"),
        this.windData[0].uMin,
        this.windData[0].vMin
      );
      gl.uniform2f(
        prog.getUniform("u_wind_max"),
        this.windData[0].uMax,
        this.windData[0].vMax
      );
      if (this.windData[1]) {
        gl.uniform2f(
          prog.getUniform("u_previous_min"),
          this.windData[1].uMin,
          this.windData[1].vMin
        );
        gl.uniform2f(
          prog.getUniform("u_previous_max"),
          this.windData[1].uMax,
          this.windData[1].vMax
        );
      }

      gl.drawArrays(gl.POINTS, 0, this.numParticles);
    }
  }

  private updateParticles(): void {
    if (!this.updateProgram || !this.windData.length) {
      return;
    }
    const gl = this.gl;

    if (this.framebuffer && this.particleStateTexture1) {
      this.bindFramebuffer(this.framebuffer, this.particleStateTexture1);
      gl.viewport(
        0,
        0,
        this.particleStateResolution,
        this.particleStateResolution
      );
    }

    const prog = this.updateProgram;
    gl.useProgram(prog.getProgram());
    const aPos = prog.getAttribute("a_pos");

    if (this.quadBuffer) {
      this.bindAttribute(this.quadBuffer, aPos, 2);
    }

    gl.uniform1i(prog.getUniform("u_wind"), 0);
    gl.uniform1i(prog.getUniform("u_particles"), 1);
    gl.uniform1i(prog.getUniform("u_previous"), 3);

    gl.uniform1f(prog.getUniform("u_velocity"), this.windMix);
    this.windMix = Math.max(0, this.windMix - 0.015);
    gl.uniform1f(prog.getUniform("u_rand_seed"), Math.random());
    gl.uniform2f(
      prog.getUniform("u_wind_res"),
      this.windData[0].width,
      this.windData[0].height
    );
    gl.uniform2f(
      prog.getUniform("u_wind_min"),
      this.windData[0].uMin,
      this.windData[0].vMin
    );
    gl.uniform2f(
      prog.getUniform("u_wind_max"),
      this.windData[0].uMax,
      this.windData[0].vMax
    );
    if (this.windData[1]) {
      gl.uniform2f(
        prog.getUniform("u_previous_res"),
        this.windData[1].width,
        this.windData[1].height
      );
      gl.uniform2f(
        prog.getUniform("u_previous_min"),
        this.windData[1].uMin,
        this.windData[1].vMin
      );
      gl.uniform2f(
        prog.getUniform("u_previous_max"),
        this.windData[1].uMax,
        this.windData[1].vMax
      );
    }
    gl.uniform1f(
      prog.getUniform("u_speed_factor"),
      this.speedFactor / (2 * this.map.getZoom() + 5)
    );
    gl.uniform1f(prog.getUniform("u_drop_rate"), this.dropRate);
    gl.uniform1f(prog.getUniform("u_drop_rate_bump"), this.dropRateBump);

    const bounds = this.map.getBounds();
    const nw = maplibregl.MercatorCoordinate.fromLngLat(bounds.getNorthWest());
    const se = maplibregl.MercatorCoordinate.fromLngLat(bounds.getSouthEast());
    gl.uniform2f(
      prog.getUniform("u_nw"),
      Math.min(1, Math.max(nw.x, 0)),
      Math.min(1, Math.max(nw.y, 0))
    );
    gl.uniform2f(
      prog.getUniform("u_se"),
      Math.min(1, Math.max(se.x, 0)),
      Math.min(1, Math.max(se.y, 0))
    );

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const temp = this.particleStateTexture0;
    this.particleStateTexture0 = this.particleStateTexture1;
    this.particleStateTexture1 = temp;
  }

  async loadWindData(forecast?: string, resolution = "high"): Promise<void> {
    const args = `?resolution=${resolution}&forecast=${forecast ?? ""}`;

    console.log(`/api/loadWindData${args}`);

    const response = await fetch(`/api/loadWindData${args}`);
    const data = await response.json();

    console.log(data[1]);
    console.log(typeof data[1]);

    const { jsonData, imgData } = data as {
      jsonData: any;
      imgData: string; // should be Uint8Array | HTMLImageElement;
    };

    // Convert base64 string to Uint8Array
    const binaryString = atob(imgData);
    const len = binaryString.length;
    const imgDataArray = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      imgDataArray[i] = binaryString.charCodeAt(i);
    } 

    console.log(jsonData);
    console.log(imgDataArray);

    console.log('windData 1', this.windData);
    this.windData = rotate(this.windData, JSON.parse(jsonData));
    console.log('windData 2', this.windData);

    //console.log('imgData', imgData);
    const img = await loadBase64Image(imgData);
    //console.log('img', img);

    this.windTexture = rotate(
      this.windTexture,
      this.createTexture(this.gl.LINEAR, img)
    );
    this.windMix = 1;

    function rotate<T>(arr: T[], data: T): T[] {
      if (!arr.length) {
        return [data, data];
      } else {
        arr.unshift(data);
        return arr.slice(0, 2);
      }
    }
  }

  setNumParticles(numParticles: number): void {
    const gl = this.gl;
    const particleRes = (this.particleStateResolution = Math.ceil(
      Math.sqrt(numParticles)
    ));
    this.numParticles = particleRes * particleRes;

    const particleState = new Uint8Array(this.numParticles * 4);
    for (let i = 0; i < particleState.length; i++) {
      particleState[i] = Math.floor(Math.random() * 256);
    }
    this.particleStateTexture0 = this.createTexture(
      gl.NEAREST,
      particleState,
      particleRes,
      particleRes
    );
    this.particleStateTexture1 = this.createTexture(
      gl.NEAREST,
      particleState,
      particleRes,
      particleRes
    );

    const particleIndices = new Float32Array(this.numParticles);
    for (let i = 0; i < this.numParticles; i++) {
      particleIndices[i] = i;
    }
    this.particleIndexBuffer = this.createBuffer(particleIndices);
  }
}

export function loadBase64Image(base64String: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Cannot load image on server-side'));
    } else {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = `data:image/png;base64,${base64String}`;
    }
  });
}