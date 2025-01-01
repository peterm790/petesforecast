import abstractCustomLayer from "./abstractCustomLayer";
import WindGlLayer from "./windGlLayer";
import { ShaderType } from "./util/util";

export default class WindLayer extends abstractCustomLayer {
  shaders: Promise<string[]>;
  private numParticles: number = 2 ** 10; 
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

    // Set initial visibility based on zoom level
    this.updateVisibility(map.getZoom());

    this.setNumParticles(map);
    this.addListener(map, ["movestart", "zoomstart", "mousedown", "touchstart"], () => {
      if (this.visible) this.toggle();
    });
    this.addListener(map, ["moveend", "zoomend", "mouseup", "touchend"], () => {
      if (!this.visible) this.toggle();
    });

    // Add event listener for zoom events to update visibility
    map.on('zoom', () => {
      this.updateVisibility(map.getZoom());
      this.setNumParticles(map);
      console.log("Zoom level:", map.getZoom());
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

  private setNumParticles(map: maplibregl.Map): void {
    if (this.layer) {
      const layer = this.layer as WindGlLayer;
      const zoom = map.getZoom();
      this.numParticles = zoom > 9 ? 2 ** 9 : zoom > 5 ? 2 ** 10 : 2 ** 11;
      layer.setNumParticles(this.numParticles);
    }
  }

  private updateVisibility(zoom: number): void {
    this.visible = zoom <= 10;
  }

  onRemove(): void {
    super.onRemove();
    if (this.layer) {
      const layer = this.layer as WindGlLayer;
      layer.clear();
    }
  }
}