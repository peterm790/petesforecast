import abstractCustomLayer from "./abstractCustomLayer";
import WindGlLayer from "./windGlLayer";
import { ShaderType } from "./util/util";

export default class WindLayer extends abstractCustomLayer {
  shaders: Promise<string[]>;
  private numParticles: number = 2 ** 11.5; // Kept your original setting
  private dataURL: string;

  constructor(map?: maplibregl.Map, dataURL?: string) {
    super("wind", map);
    this.visible = true; // Set visible to true by default
    this.dataURL = dataURL || '';
    this.shaders = Promise.all([
      this.loadShaderSource(ShaderType.VERTEX, "draw"),
      this.loadShaderSource(ShaderType.VERTEX, "quad"),
      this.loadShaderSource(ShaderType.FRAGMENT, "draw"),
      this.loadShaderSource(ShaderType.FRAGMENT, "screen"),
      this.loadShaderSource(ShaderType.FRAGMENT, "update"),
    ]);
  }

  async onAdd(map: maplibregl.Map, gl: WebGLRenderingContext): Promise<void> {
    console.log("Adding wind layer");
    const shaders = await this.shaders;
    const layer = new WindGlLayer(shaders, map, gl);
    this.layer = layer;

    this.setNumParticles();
    this.addListener(map, ["zoomstart", "mousedown"], () => {
      if (this.visible) this.toggle();
    });
    this.addListener(map, ["zoomend", "mouseup"], () => {
      if (!this.visible) this.toggle();
    });

    const f = (): void => {
      if (this.visible) {
        this.toggle();
        setTimeout(this.toggle.bind(this), 200);
      }
    };
    document.addEventListener("fullscreenchange", f);
    this.handler.push(() =>
      document.removeEventListener("fullscreenchange", f)
    );

    await this.loadForecast();
  }

  toggle(): void {
    super.toggle();
    if (this.layer) {
      const layer = this.layer as WindGlLayer;
      layer.clear();
      layer.map.triggerRepaint();
    }
  }

  private async loadForecast(): Promise<void> {
    if (this.layer) {
      const layer = this.layer as WindGlLayer;
      await layer.loadWindData(this.dataURL); // Kept "HIGH" as in your original code
    }
  }

  private setNumParticles(): void {
    if (this.layer) {
      const layer = this.layer as WindGlLayer;
      layer.setNumParticles(this.numParticles);
    }
  }

  onRemove(): void {
    super.onRemove();
    if (this.layer) {
      const layer = this.layer as WindGlLayer;
      layer.clear();
    }
  }
}