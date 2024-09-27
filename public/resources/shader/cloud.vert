attribute vec2 a_pos;
uniform mat4 u_matrix;
varying vec2 v_tex_pos;
 
void main() {
    v_tex_pos = a_pos;
    gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
}
