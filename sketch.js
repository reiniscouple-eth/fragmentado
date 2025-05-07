import { mountFlex } from "https://cdn.jsdelivr.net/npm/p5.flex@0.2.0/src/p5.flex.min.mjs"
import { mountControl } from "./Controls.js"
import { createNoise3D } from "https://cdn.skypack.dev/simplex-noise@4.0.0" // Ainda usado pelo TexPass implicitamente, pode ser removido se TexPass for simplificado
import { vert, TexFrag, BlurFrag, GrainFrag, MixFrag, ImageDistortFrag } from "./shader.js"

mountFlex(p5)
mountControl(p5)

new p5((p) => {
	// const snoiseSeed = { x: p.random(), y: p.random() } // Não diretamente usado pela distorção da imagem, mas TexPass pode usar algo similar.
	// const snoiseX3D = createNoise3D(() => snoiseSeed.x)
	// const snoiseY3D = createNoise3D(() => snoiseSeed.y)

	const [WIDTH, HEIGHT] = [600, 600]
	const PIXEL_DENSITY = 1
	const CANVAS_SIZE = [WIDTH, HEIGHT]
	const TEXEL_SIZE = [1 / (WIDTH * PIXEL_DENSITY), 1 / (HEIGHT * PIXEL_DENSITY)]

	let TexPass, BlurPass, GrainPass, MixPass, ImageDistortPass
	let tex, gfx
	let t, color

	// SUA IMAGEM: Descomente a linha abaixo e a função preload() para usar sua imagem
	// let suaImagemCarregada;
	let minhaImagemPlaceholder; // Placeholder até você carregar sua imagem

	const palette = ["#560100", "#060626", "#151f05", "#331d00", "#2c0033"] // Adicionei mais cores
	
	// Parâmetros para a distorção da imagem
	const IMAGE_NOISE_STRENGTH = 0.05 // Quão forte é a distorção pelo ruído
	const IMAGE_MOUSE_INFLUENCE_SCALE = 2.0 // Escala da influência do mouse na distorção (similar ao antigo SCALE)
	const ANIMATION_SPEED = 0.3 // Velocidade da animação do ruído na distorção

	const NO_SHADER = false // Mantenha false para ver os efeitos
	const UNREAL = p.random([false, true]) // Efeitos finais opcionais

	// IMPORTANTE: Para carregar sua própria imagem:
	// 1. Crie uma pasta 'assets' (ou qualquer nome) no seu projeto e coloque sua imagem lá.
	// 2. Descomente a função preload() abaixo.
	// 3. Mude 'caminho/para/sua/imagem.jpg' para o caminho real da sua imagem.
	// 4. Em setup(), remova a linha 'minhaImagemPlaceholder = createPlaceholderImage(p);'
	// 5. Em draw(), substitua 'gfx.image(minhaImagemPlaceholder, 0, 0, WIDTH, HEIGHT);'
	//    por 'gfx.image(suaImagemCarregada, 0, 0, WIDTH, HEIGHT);'

	
	p.preload = () => {
		suaImagemCarregada = p.loadImage('/your-image.jpg');
	}
	

	// Função para criar uma imagem placeholder (substitua pelo carregamento da sua imagem)
	/*const createPlaceholderImage = (pg) => {
		let placeholder = pg.createGraphics(WIDTH, HEIGHT);
		placeholder.background(p.random(100, 200), p.random(100, 200), p.random(100, 200));
		placeholder.noStroke();
		for (let i = 0; i < 15; i++) {
			placeholder.fill(p.random(150, 255), p.random(150, 255), p.random(150, 255), p.random(150,220));
			placeholder.ellipse(p.random(WIDTH), p.random(HEIGHT), p.random(50, 150), p.random(50, 150));
		}
		placeholder.fill(0);
		placeholder.textSize(32);
		placeholder.textAlign(pg.CENTER, pg.CENTER);
		placeholder.text("Use sua Imagem Aqui!", WIDTH / 2, HEIGHT / 2);
		return placeholder;
	};*/

	p.setup = () => {
		p.createCanvas(WIDTH, HEIGHT)
		p.flex({ container: { padding: "20px" } })
		p.containerBgColor(51)
		p.parentBgColor(51)
		p.pixelDensity(PIXEL_DENSITY)

		tex = p.createGraphics(WIDTH, HEIGHT, p.WEBGL)
		gfx = p.createGraphics(WIDTH, HEIGHT, p.WEBGL)

		// Carrega os shaders
		TexPass = p.createShader(vert, TexFrag)
		ImageDistortPass = p.createShader(vert, ImageDistortFrag)
		BlurPass = p.createShader(vert, BlurFrag)
		GrainPass = p.createShader(vert, GrainFrag)
		MixPass = p.createShader(vert, MixFrag)

		initTex() // Inicializa a textura base em 'tex'

		// Cria a imagem placeholder (REMOVA ISSO SE USAR p.loadImage() em preload)
		/*minhaImagemPlaceholder = createPlaceholderImage(p);*/

		color = hex2rgb(p.random(palette))

		p.PressLoopToggle(" ") // Pausa/resume com Espaço
		
		p.describe(`Image art with shader distortion effects. Based on "Hilbert" by Zaron Chen.`)
	}

	p.draw = () => {
		t = (p.frameCount / 60) * ANIMATION_SPEED

		p.background(0) // Limpa o canvas principal
		gfx.clear()    // Limpa o buffer gfx

		// 1. Desenha a imagem (placeholder ou a sua carregada) no buffer gfx
		// Se você carregou 'suaImagemCarregada' em preload(), use-a aqui:
		// gfx.image(suaImagemCarregada, 0, 0, WIDTH, HEIGHT);
		gfx.image(suaImagemCarregada, 0, 0, WIDTH, HEIGHT);


		if (NO_SHADER) {
			p.image(gfx, 0, 0) // Se não houver shaders, apenas desenha a imagem
			return
		}

		// Início do Pipeline de Shaders aplicados a 'gfx'
		// 'gfx' é lido e o resultado é escrito de volta em 'gfx' para o próximo passo

		// 2. Aplica distorção de imagem baseada em ruído
		applyImageDistort(gfx);

		// 3. Aplica blur horizontal
		applyBlur(gfx, [1, 0]);

		// 4. Aplica blur vertical (à imagem já com blur horizontal)
		applyBlur(gfx, [0, 1]);

		// 5. Aplica efeito de granulação
		applyGrain(gfx);

		// 6. Mistura a textura base ('tex') com a imagem processada em 'gfx'
		applyMix(tex, gfx, color);
		
		// 7. Desenha o resultado final de 'gfx' no canvas principal
		p.image(gfx, 0, 0)

		// 8. Efeitos "Unreal" opcionais (aplicados ao canvas principal)
		if (UNREAL) {
			p.filter(p.DILATE)
			p.filter(p.POSTERIZE, 4)
		}
	}

	const hex2rgb = (hex) => {
		const bigint = parseInt(hex.replace("#", ""), 16)
		return [
			((bigint >> 16) & 255) / 255,
			((bigint >> 8) & 255) / 255,
			(bigint & 255) / 255,
		]
	}

	const commonUniform = (shaderInstance) => {
		shaderInstance.setUniform("canvasSize", CANVAS_SIZE)
		shaderInstance.setUniform("texelSize", TEXEL_SIZE)
		shaderInstance.setUniform("mouse", [p.mouseX / WIDTH, p.mouseY / HEIGHT])
		shaderInstance.setUniform("time", t)
		// 'scale' não é mais um uniform global, mas específico para shaders que o usam.
		// Para ImageDistortPass, passaremos IMAGE_MOUSE_INFLUENCE_SCALE
		// Para BlurPass e GrainPass, o 'scale' original era 2.0. Vamos manter isso ou tornar configurável.
	}

	const initTex = () => {
		tex.shader(TexPass)
		commonUniform(TexPass)
		// TexPass pode usar 'scale' se definido no shader, aqui não estamos passando um específico
		tex.quad(-1, 1, 1, 1, 1, -1, -1, -1)
	}

	const applyImageDistort = (inputOutputTex) => {
		gfx.shader(ImageDistortPass)
		commonUniform(ImageDistortPass) // Passa time, mouse, canvasSize, texelSize
		ImageDistortPass.setUniform("tex0", inputOutputTex)
		ImageDistortPass.setUniform("noiseStrength", IMAGE_NOISE_STRENGTH)
		ImageDistortPass.setUniform("mouseInfluenceScale", IMAGE_MOUSE_INFLUENCE_SCALE)
		gfx.quad(-1, 1, 1, 1, 1, -1, -1, -1)
	}

	const applyBlur = (inputOutputTex, direction) => {
		gfx.shader(BlurPass)
		commonUniform(BlurPass)
		BlurPass.setUniform("tex0", inputOutputTex)
		BlurPass.setUniform("direction", direction)
		BlurPass.setUniform("scale", 2.0); // O 'scale' original para blur/grain. Pode ser o IMAGE_MOUSE_INFLUENCE_SCALE também
		gfx.quad(-1, 1, 1, 1, 1, -1, -1, -1)
	}

	const applyGrain = (inputOutputTex) => {
		gfx.shader(GrainPass)
		commonUniform(GrainPass)
		GrainPass.setUniform("tex0", inputOutputTex)
		GrainPass.setUniform("scale", 2.0); // O 'scale' original para blur/grain.
		gfx.quad(-1, 1, 1, 1, 1, -1, -1, -1)
	}

	const applyMix = (baseTex, blendTex, mixColor) => {
		gfx.shader(MixPass)
		commonUniform(MixPass) // MixPass não usa 'time' ou 'mouse' diretamente, mas commonUniform é inofensivo
		MixPass.setUniform("tex0", baseTex)  // Textura de fundo (do TexPass)
		MixPass.setUniform("tex1", blendTex) // Textura da imagem processada (de GrainPass)
		MixPass.setUniform("color", mixColor)   // Cor para misturar
		gfx.quad(-1, 1, 1, 1, 1, -1, -1, -1)
	}
})
