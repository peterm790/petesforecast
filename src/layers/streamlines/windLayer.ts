import abstractCustomLayer from "./abstractCustomLayer";
import WindGlLayer from "./windGlLayer";
import { ShaderType } from "./util/util";

export default class windLayer extends abstractCustomLayer {
  shaders: Promise<string[]>;
  visibleCheckbox: boolean;
  resolutionSelect: string;
  forecastSelect: string;
  playButton: boolean;
  playInterval?: any;

  constructor(map?: maplibregl.Map) {
    super("wind", map);
    this.shaders = Promise.all([
      this.loadShaderSource(ShaderType.VERTEX, "draw"),
      this.loadShaderSource(ShaderType.VERTEX, "quad"),
      this.loadShaderSource(ShaderType.FRAGMENT, "draw"),
      this.loadShaderSource(ShaderType.FRAGMENT, "screen"),
      this.loadShaderSource(ShaderType.FRAGMENT, "update"),
    ]);

    this.visibleCheckbox = true;
    this.resolutionSelect = 'HIGH'; 
    this.forecastSelect = '20240909_00';
    this.playButton = true;
  }

  async onAdd(map: maplibregl.Map, gl: WebGLRenderingContext): Promise<void> {
    const shaders = await this.shaders;
    const layer = new WindGlLayer(shaders, map, gl);

    // Load wind data immediately with static values
    const forecast = '20240909_00'; // Static forecast value
    const resolution = 'HIGH'; // Static resolution value
    await layer.loadWindData(forecast, resolution); // Load the wind data

    // Set the number of particles
    this.layer = layer; // Store the layer instance
    layer.setNumParticles(1000); 

  }
}