precision mediump float;

uniform sampler2D u_screen;
uniform float u_opacity;

varying vec2 v_tex_pos;

void main() {
    vec4 color = texture2D(u_screen, 1.0 - v_tex_pos);
    // a hack to guarantee opacity fade out even with a value close to 1.0
    vec4 finalColor = vec4(floor(255.0 * color * u_opacity) / 255.0);
    // set opacity to 1 if above a threshold
    if (finalColor.a > 0.95) {
        finalColor.a = 1.00;
    }
    gl_FragColor = finalColor;
}
