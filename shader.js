// shader.js

// Vertex Shader (geralmente o mesmo para muitos efeitos 2D)
export const vert = `
precision highp float;
attribute vec3 aPosition;
attribute vec2 aTexCoord;
varying vec2 vTexCoord;

void main() {
  vTexCoord = aTexCoord;
  vec4 positionVec4 = vec4(aPosition, 1.0);
  positionVec4.xy = positionVec4.xy * 2.0 - 1.0; // Normaliza para coordenadas de clip WebGL
  gl_Position = positionVec4;
}
`;

// Novo Fragment Shader para Distorção da Imagem
export const DistortFrag = `
precision highp float;
varying vec2 vTexCoord;

uniform sampler2D originalImage; // A imagem carregada
uniform vec2 mouse;          // Posição do mouse normalizada (0-1)
uniform float time;
uniform vec2 canvasSize;
uniform vec2 texelSize;      // 1.0 / canvasSize

uniform float noiseStrength; // Quão forte é a distorção
uniform float effectRadius;  // Raio de influência do mouse

// Função de ruído simples (substitua por uma melhor se desejar, ex: Simplex via textura)
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
}
// Fim da função de ruído simples

float smoothstep_glsl(float edge0, float edge1, float x) {
    x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return x * x * (3.0 - 2.0 * x);
}

void main() {
  vec2 uv = vTexCoord;
  // As coordenadas de textura em p5.js WebGL podem precisar ser invertidas em Y
  // dependendo de como a textura é carregada/desenhada.
  // Se a imagem aparecer invertida, descomente:
  // uv.y = 1.0 - uv.y;

  vec2 mouseTexCoord = vec2(mouse.x, 1.0 - mouse.y); // Mouse Y é invertido em p5 canvas
  float distToMouse = distance(uv, mouseTexCoord);

  float influence = 1.0 - smoothstep_glsl(0.0, effectRadius, distToMouse);
  influence = pow(influence, 2.0); // Torna a queda mais acentuada

  // Usa a função de ruído simples. O ruído Simplex do JS não pode ser usado diretamente aqui.
  // Para ruído mais complexo, você precisaria de uma implementação GLSL de Simplex
  // ou passar uma textura de ruído pré-gerada.
  float noiseValX = noise(uv * 5.0 + time * 0.1); // Altere os multiplicadores para diferentes padrões
  float noiseValY = noise(uv * 5.0 - time * 0.1 + vec2(10.0));

  vec2 offset = vec2(noiseValX - 0.5, noiseValY - 0.5) * noiseStrength * influence * texelSize * 100.0;
  // O texelSize ajuda a tornar o deslocamento relativo ao pixel. O 100.0 é um ajuste.

  vec2 distortedUv = uv + offset;

  gl_FragColor = texture2D(originalImage, distortedUv);
}
`;

// Mantenha seus shaders originais (TexFrag pode não ser mais necessário)
export const TexFrag = `
precision highp float;
varying vec2 vTexCoord;
uniform float time;
uniform vec2 mouse;
uniform vec2 canvasSize;
uniform float scale;

// Exemplo simples: poderia ser um gerador de ruído ou padrão
// Se você não for mais usar uma textura procedural de fundo, pode remover este.
// Por enquanto, vou deixar um placeholder.
float random (vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233)))* 43758.5453123);
}

void main() {
  vec2 uv = vTexCoord;
  // uv.y = 1.0 - uv.y; // Flip Y if necessary
  float color = random(uv * scale + time * 0.1 + mouse * 0.5);
  gl_FragColor = vec4(color, color, color, 1.0);
}
`;

export const BlurFrag = `
// Seu BlurFrag original aqui...
// Exemplo (você já tem o seu):
precision highp float;
varying vec2 vTexCoord;
uniform sampler2D tex0;
uniform vec2 texelSize;
uniform vec2 direction; // (1,0) for horizontal, (0,1) for vertical
uniform vec2 canvasSize; // Não usado neste blur simples, mas mantido por consistência

void main() {
    vec4 color = vec4(0.0);
    // Simple box blur for demonstration
    // A Gaussian blur would be better
    float kernel[3] = float[](0.25, 0.5, 0.25); // Kernel simples
    if (direction.x > 0.5) { // Horizontal
        color += texture2D(tex0, vTexCoord - vec2(texelSize.x, 0.0)) * kernel[0];
        color += texture2D(tex0, vTexCoord)                         * kernel[1];
        color += texture2D(tex0, vTexCoord + vec2(texelSize.x, 0.0)) * kernel[2];
    } else { // Vertical
        color += texture2D(tex0, vTexCoord - vec2(0.0, texelSize.y)) * kernel[0];
        color += texture2D(tex0, vTexCoord)                         * kernel[1];
        color += texture2D(tex0, vTexCoord + vec2(0.0, texelSize.y)) * kernel[2];
    }
    gl_FragColor = color;
}
`;

export const GrainFrag = `
// Seu GrainFrag original aqui...
// Exemplo:
precision highp float;
varying vec2 vTexCoord;
uniform sampler2D tex0;
uniform float time;
uniform vec2 canvasSize; // Não usado, mas mantido

float random (vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233)))* 43758.5453123);
}

void main() {
    vec2 uv = vTexCoord;
    // uv.y = 1.0 - uv.y;
    vec4 color = texture2D(tex0, uv);
    float grain = (random(uv + fract(time)) - 0.5) * 0.15; // Ajuste a força do grão
    color.rgb += grain;
    gl_FragColor = color;
}
`;

export const MixFrag = `
// Seu MixFrag original aqui...
// Exemplo:
precision highp float;
varying vec2 vTexCoord;
uniform sampler2D tex0; // Base (imagem original ou textura procedural)
uniform sampler2D tex1; // Blend (imagem processada/distorcida)
uniform vec3 color;     // Cor para tingir/misturar
uniform float time;     // Não usado aqui, mas mantido
uniform vec2 canvasSize;// Não usado aqui, mas mantido

void main() {
    vec2 uv = vTexCoord;
    // uv.y = 1.0 - uv.y;
    vec4 baseColor = texture2D(tex0, uv);
    vec4 blendColor = texture2D(tex1, uv);

    // Exemplo de mistura: screen blend com a cor sobre a imagem processada
    // vec3 mixed = 1.0 - (1.0 - baseColor.rgb) * (1.0 - blendColor.rgb); // Screen blend base and blend
    // gl_FragColor = vec4(mixed * color, baseColor.a);

    // Ou mais simples: tingir a imagem processada
    gl_FragColor = vec4(blendColor.rgb * color, blendColor.a);

    // Ou misturar base com blend
    // gl_FragColor = mix(baseColor, blendColor, 0.7); // 0.7 é a força da mistura
}
`;
