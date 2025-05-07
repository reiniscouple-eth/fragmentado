import * as Shox from "https://cdn.jsdelivr.net/npm/shox@1.1.0/src/Shox.js"

// Vertex Shader Padrão (sem alterações)
export const vert = `#version 300 es
	in vec4 aPosition;
	in vec2 aTexCoord;
	out vec2 vTexCoord;
	void main() {
		vTexCoord = aTexCoord;
		gl_Position = aPosition;
	}
`

// Fragment Shader para Textura Inicial (sem grandes alterações, pode ser simplificado se não quiser o ruído sutil)
export const TexFrag = `#version 300 es
	precision mediump float;

	uniform vec2 texelSize;
	uniform vec2 canvasSize;
	// uniform float time; // Não usado aqui, mas commonUniform pode passar
	// uniform vec2 mouse; // Não usado aqui

	${Shox.noiseMath}
	${Shox.snoise3D}
	${Shox.snoise3DImage}

	in vec2 vTexCoord;
	out vec4 fragColor;
	void main() {
		vec2 uv = vTexCoord;

		float noise = 1.;
		noise *= 1.-.02*snoise3DImage(uv*vec2(.05, 1.), 200., 1.5, .5, vec3(0.)).r;
		noise *= 1.-.02*snoise3DImage(uv*vec2(1., .05), 200., 1.5, .5, vec3(0.)).r;
		noise *= 1.-.02*snoise3DImage(uv*vec2(1.,  1.),  10., 1.5, .5, vec3(0.)).r;

		fragColor = vec4(vec3(noise)*vec3(1., .95, .95), 1.);
		fragColor *= fragColor; // Deixa mais escuro
	}
`

// NOVO Fragment Shader para Distorção da Imagem
export const ImageDistortFrag = `#version 300 es
	precision mediump float;

	uniform sampler2D tex0; // Imagem de entrada
	uniform vec2 texelSize;
	uniform vec2 canvasSize;
	uniform vec2 mouse;     // Posição do mouse (0 a 1)
	uniform float time;
	uniform float noiseStrength; // Para controlar a intensidade da distorção
	uniform float mouseInfluenceScale; // Escala da influência do mouse (quão espalhada é a influência)

	${Shox.noiseMath} // Para smoothstep
	${Shox.snoise3D} 

	in vec2 vTexCoord;
	out vec4 fragColor;

	void main() {
		vec2 uv = vTexCoord;

		// Influência do mouse: maior quando o mouse está perto do pixel (uv)
		// 'mouseInfluenceScale' ajusta o raio de influência.
		// smoothstep(edge0, edge1, x): 0 se x <= edge0, 1 se x >= edge1
		// length(uv - mouse) é a distância do pixel ao mouse.
		// Queremos que 'influence' seja 1 perto do mouse e 0 longe.
		// A 'mouseInfluenceScale' aqui pode ser pensada como o 'raio' de influência.
		// Se mouseInfluenceScale for, por exemplo, 0.5, a influência total (1.0) ocorre a uma distância 0
		// e decai para 0 a uma distância de 0.5.
		float dist_to_mouse = length(uv - mouse);
		float influence = smoothstep(mouseInfluenceScale, 0.0, dist_to_mouse);


		// Gera um deslocamento 2D usando ruído Simplex 3D (x,y,tempo)
		float offsetX = snoise3D(vec3(uv * 5.0, time)) * 2.0 - 1.0; // range -1 a 1
		float offsetY = snoise3D(vec3(uv * 5.0 + vec2(23.4, -15.6), time)) * 2.0 - 1.0; // semente diferente para Y
		vec2 noise_offset = vec2(offsetX, offsetY);

		// Aplica o deslocamento, modulado pela força do ruído e influência do mouse
		vec2 distorted_uv = uv + noise_offset * noiseStrength * influence;

		fragColor = texture(tex0, distorted_uv);
	}
`

// Fragment Shader para Blur (sem alterações)
export const BlurFrag = `#version 300 es
	precision mediump float;

	uniform sampler2D tex0;
	uniform vec2 texelSize;
	uniform vec2 canvasSize;
	uniform vec2 mouse;
	uniform float time;
	uniform float scale; // Usado para a influência do mouse no blur
	uniform vec2 direction;

	${Shox.blur(3)} // Kernel de blur, ex: 3x3

	in vec2 vTexCoord;
	out vec4 fragColor;
	void main() {
		vec2 uv = vTexCoord;
		// 'scale' aqui afeta o quão espalhada é a influência do mouse para o blur
		float weight = smoothstep(1.5 / scale, 0., length(uv-mouse)); // Ajustado para que 'scale' aumente a área de efeito
		vec4 originalColor = texture(tex0, uv);
		vec4 blurredColor = blur(uv, tex0, texelSize, direction);
		fragColor = mix(originalColor, blurredColor, weight);
	}
`

// Fragment Shader para Grain (sem alterações)
export const GrainFrag = `#version 300 es
	precision mediump float;

	uniform sampler2D tex0;
	uniform vec2 texelSize;
	uniform vec2 canvasSize;
	uniform vec2 mouse;
	uniform float time;
	uniform float scale; // Usado para a influência do mouse no grain

	${Shox.displace}
	${Shox.hash}

	float brightness(vec3 color) {
		return dot(color, vec3(0.2126, 0.7152, 0.0722));
	}

	in vec2 vTexCoord;
	out vec4 fragColor;
	void main() {
		vec2 uv = vTexCoord;
		float weight = smoothstep(1.5 / scale, 0., length(uv-mouse)); // Ajustado
		vec2 random_hash = (2.*hash22(uv*31415.926)-1.)*weight; // Ruído aleatório influenciado pelo mouse
		vec2 displaced_uv = displace(uv, random_hash, 0., .02); // Pequeno deslocamento
		vec3 color = texture(tex0, displaced_uv).rgb;
		fragColor = vec4(vec3(brightness(color)), 1.); // Converte para tons de cinza
	}
`

// Fragment Shader para Mix (sem alterações)
export const MixFrag = `#version 300 es
	precision mediump float;

	uniform sampler2D tex0; // Textura base (do TexPass)
	uniform vec2 texelSize;
	uniform vec2 canvasSize;
	uniform sampler2D tex1; // Textura da imagem processada (do GrainPass, em tons de cinza)
	uniform vec3 color;     // Cor para misturar

	in vec2 vTexCoord;
	out vec4 fragColor;
	void main() {
		vec2 uv = vTexCoord;
		vec4 base_color = texture(tex0, uv);
		vec4 blend_texture_color = texture(tex1, uv); // .r contém a intensidade de cinza
		
		// Mistura a cor base com a 'color' uniforme, usando a intensidade de 'blend_texture_color' como máscara
		fragColor = mix(base_color, vec4(color, 1.0), blend_texture_color.r);
	}
`
