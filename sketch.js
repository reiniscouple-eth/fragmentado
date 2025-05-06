// sketch.js

import { mountFlex } from "https://cdn.jsdelivr.net/npm/p5.flex@0.2.0/src/p5.flex.min.mjs";
// Certifique-se que Controls.js existe ou remova a importação se não for usá-lo.
// Se Controls.js for um módulo ES6, ele deve ser importado corretamente.
// Se for um script global p5, pode não precisar de 'import'.
// import { mountControl } from "./Controls.js"; 
import { vert, DistortFrag, BlurFrag, GrainFrag, MixFrag } from "./shader.js"; // Removi TexFrag pois não estava claro seu uso final aqui

// mountFlex(p5);
// mountControl(p5); // Descomente se Controls.js estiver configurado

new p5((p) => {
    let WIDTH, HEIGHT;
	let PIXEL_DENSITY = 1; // Ajuste para performance (menor = mais rápido)
	let CANVAS_SIZE;
	let TEXEL_SIZE;

	let DistortPass, BlurPass, GrainPass, MixPass;
	let originalImageBuffer, processedImageBuffer, tempBlurBuffer; // Buffers gráficos
	let t, selectedColorTint;
    let userImage;

	const palette = ["#560100", "#060626", "#151f05", "#FFFFFF", "#FF69B4", "#00FFFF"]; // Paleta de cores
    const DISTORT_STRENGTH = 70; // Quão forte a distorção
    const MOUSE_EFFECT_RADIUS = 0.25; // Raio de influência do mouse (0.0 a 1.0+)
	const NO_SHADER = false; // Defina como true para desabilitar shaders para depuração
	const UNREAL = p.random([false, true]); // Aplicar filtros p5 extras?
	const SCALE = 1.0; // Escala geral para shaders (se usado)
	const SPEED = 0.3; // Velocidade da animação do tempo (t)

    const IMAGE_PATH = 'your-image.jpg'; // <--- COLOQUE O CAMINHO DA SUA IMAGEM AQUI

    // Função para atualizar dimensões e recriar recursos dependentes
    function updateSizing() {
        WIDTH = p.windowWidth;
        HEIGHT = p.windowHeight;
        CANVAS_SIZE = [WIDTH, HEIGHT];
        TEXEL_SIZE = [1 / (WIDTH * PIXEL_DENSITY), 1 / (HEIGHT * PIXEL_DENSITY)];
    }

    // Função para criar/recriar buffers gráficos
    function setupGraphicsBuffers() {
        // Remove buffers antigos se existirem (para windowResized)
        if (originalImageBuffer) originalImageBuffer.remove();
        if (processedImageBuffer) processedImageBuffer.remove();
        if (tempBlurBuffer) tempBlurBuffer.remove();

        originalImageBuffer = p.createGraphics(WIDTH, HEIGHT, p.WEBGL);
		processedImageBuffer = p.createGraphics(WIDTH, HEIGHT, p.WEBGL);
        tempBlurBuffer = p.createGraphics(WIDTH, HEIGHT, p.WEBGL); // Para ping-pong de blur

        // Anti-aliasing pode melhorar a qualidade visual
        originalImageBuffer.setAttributes('antialias', true);
        processedImageBuffer.setAttributes('antialias', true);
        tempBlurBuffer.setAttributes('antialias', true);
    }

    p.preload = () => {
        userImage = p.loadImage(IMAGE_PATH,
            () => console.log("Imagem carregada com sucesso!"),
            (e) => {
                console.error(`Erro ao carregar imagem: ${IMAGE_PATH}`, e);
                // Você pode carregar uma imagem padrão aqui ou mostrar uma mensagem
                // userImage = p.loadImage('fallback-image.jpg');
            }
        );
    }

	p.setup = () => {
        updateSizing(); // Define WIDTH, HEIGHT, etc.
		p.createCanvas(WIDTH, HEIGHT);
		p.pixelDensity(PIXEL_DENSITY);

        // Se você usa p5.flex, pode querer configurá-lo aqui,
        // mas para um canvas fullscreen simples, não é estritamente necessário.
        // p.flex({ container: { padding: "0px" } });

        setupGraphicsBuffers(); // Cria os buffers com os tamanhos corretos

        // Criar shaders (o objeto shader pode ser criado uma vez)
		DistortPass = originalImageBuffer.createShader(vert, DistortFrag);
		BlurPass = originalImageBuffer.createShader(vert, BlurFrag);
		GrainPass = originalImageBuffer.createShader(vert, GrainFrag);
		MixPass = originalImageBuffer.createShader(vert, MixFrag);

		initOriginalImageBuffer(); // Desenha a imagem carregada no buffer inicial

		selectedColorTint = hex2rgb(p.random(palette));

        // Se você tiver mountControl e PressLoopToggle:
		// p.PressLoopToggle(" "); // Pausa/retoma com espaço

		p.describe(`Uma imagem é interativamente distorcida pela posição do mouse, com efeitos de pós-processamento como blur e granulação. A imagem ocupa toda a tela.`);
	}

    p.windowResized = () => {
        updateSizing();
        p.resizeCanvas(WIDTH, HEIGHT);
        setupGraphicsBuffers(); // Recria buffers com novo tamanho
        initOriginalImageBuffer(); // Redesenha a imagem no buffer redimensionado
        console.log("Janela redimensionada. Canvas e buffers atualizados.");
    }

	p.draw = () => {
        // Verifica se a imagem foi carregada e os buffers estão prontos
        if (!userImage || !userImage.width || !originalImageBuffer || !processedImageBuffer || !tempBlurBuffer) {
            p.background(10, 0, 0); // Fundo escuro se algo estiver faltando
            p.fill(255);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(20);
            p.text("Carregando recursos ou erro ao carregar imagem...\nVerifique o console.", p.width / 2, p.height / 2);
            return;
        }

		t = (p.frameCount / 60) * SPEED;

		p.background(0); // Limpa o canvas principal (não estritamente necessário se a imagem final cobrir tudo)

        // 1. Distorcer a imagem original
        // Lê de originalImageBuffer, escreve em processedImageBuffer
        applyDistortion(originalImageBuffer, processedImageBuffer);

		if (NO_SHADER) { // Se shaders estão desabilitados, mostra apenas a imagem distorcida
            p.image(processedImageBuffer, 0, 0, WIDTH, HEIGHT);
            return;
        }

        // Pipeline de Efeitos:
        // Pass 2: Blur Horizontal (lê de processedImageBuffer, escreve em tempBlurBuffer)
        applyBlur(processedImageBuffer, tempBlurBuffer, [1, 0]);

        // Pass 3: Blur Vertical (lê de tempBlurBuffer, escreve em processedImageBuffer)
        applyBlur(tempBlurBuffer, processedImageBuffer, [0, 1]);

        // Pass 4: Grain (lê de processedImageBuffer, escreve em tempBlurBuffer)
        // Usamos tempBlurBuffer como saída para não sobrescrever processedImageBuffer antes do Mix
        applyGrain(processedImageBuffer, tempBlurBuffer);

        // Pass 5: Mix
        // Mistura 'originalImageBuffer' (imagem original sem distorção)
        // com 'tempBlurBuffer' (imagem distorcida + blur + grain)
        // Escreve o resultado final em 'processedImageBuffer'
        applyMix(originalImageBuffer, tempBlurBuffer, processedImageBuffer, selectedColorTint);

        // Desenha o resultado final do pipeline no canvas principal
        p.image(processedImageBuffer, 0, 0, WIDTH, HEIGHT);

		if (UNREAL) { // Aplica filtros p5.js padrão se UNREAL for true
            p.filter(p.DILATE);
            p.filter(p.POSTERIZE, 4);
        }
	}

	const hex2rgb = (hex) => {
		const bigint = parseInt(hex.replace("#", ""), 16);
		return [
			((bigint >> 16) & 255) / 255,
			((bigint >> 8) & 255) / 255,
			(bigint & 255) / 255,
		];
	}

    // Função helper para definir uniformes comuns aos shaders
	const commonUniform = (shaderInstance) => {
        if (!shaderInstance) { // Guarda para caso o shader não tenha sido carregado
            console.warn("Tentativa de definir uniformes em shader nulo.");
            return;
        }
		shaderInstance.setUniform("canvasSize", CANVAS_SIZE);
		shaderInstance.setUniform("texelSize", TEXEL_SIZE);
		// Normaliza mouseX/mouseY para o shader. MouseY é frequentemente invertido em shaders (0 no topo).
        // O shader DistortFrag já lida com a inversão de mouse.y se necessário (mouseTexCoord).
		shaderInstance.setUniform("mouse", [p.mouseX / WIDTH, p.mouseY / HEIGHT]);
		shaderInstance.setUniform("time", t);
		shaderInstance.setUniform("scale", SCALE);
	}

    // Desenha a imagem do usuário no buffer 'originalImageBuffer'
	const initOriginalImageBuffer = () => {
        if (!userImage || !userImage.width) {
            if (originalImageBuffer) { // Se o buffer existe, mostra mensagem de erro nele
                originalImageBuffer.background(20,0,0);
                originalImageBuffer.fill(220);
                originalImageBuffer.textSize(Math.min(WIDTH, HEIGHT) / 25);
                originalImageBuffer.textAlign(p.CENTER, p.CENTER);
                originalImageBuffer.text(`Erro: Imagem\n"${IMAGE_PATH}"\nnão encontrada ou inválida.`, WIDTH/2, HEIGHT/2);
            }
            console.warn("Imagem do usuário não carregada ou inválida para initOriginalImageBuffer.");
            return;
        }
        originalImageBuffer.push();
        originalImageBuffer.translate(-WIDTH / 2, -HEIGHT / 2); // Ajusta para desenhar do canto 0,0 em WEBGL
		originalImageBuffer.image(userImage, 0, 0, WIDTH, HEIGHT); // Estica/encolhe imagem para caber
        originalImageBuffer.pop();
	}

    // Aplica o shader de distorção
    const applyDistortion = (inputTex, outputBuffer) => {
        if (!DistortPass) return; // Shader não carregado
        outputBuffer.shader(DistortPass);
        commonUniform(DistortPass);
        DistortPass.setUniform("originalImage", inputTex); // Passa a textura de entrada
        DistortPass.setUniform("noiseStrength", DISTORT_STRENGTH);
        DistortPass.setUniform("effectRadius", MOUSE_EFFECT_RADIUS);
        outputBuffer.clear(); // Limpa o buffer de saída (importante para transparência/artefatos)
        outputBuffer.rect(0, 0, WIDTH, HEIGHT); // Desenha um quad para executar o shader sobre todo o buffer
    }

    // Aplica o shader de blur
	const applyBlur = (inputTex, outputBuffer, directionVec) => {
        if (!BlurPass) return;
		outputBuffer.shader(BlurPass);
		commonUniform(BlurPass);
		BlurPass.setUniform("tex0", inputTex);
		BlurPass.setUniform("direction", directionVec);
        outputBuffer.clear();
		outputBuffer.rect(0, 0, WIDTH, HEIGHT);
	}

    // Aplica o shader de granulação
	const applyGrain = (inputTex, outputBuffer) => {
        if (!GrainPass) return;
		outputBuffer.shader(GrainPass);
		commonUniform(GrainPass);
		GrainPass.setUniform("tex0", inputTex);
        outputBuffer.clear();
		outputBuffer.rect(0, 0, WIDTH, HEIGHT);
	}

    // Aplica o shader de mistura
	const applyMix = (baseTex, blendTex, outputBuffer, tint) => {
        if (!MixPass) return;
		outputBuffer.shader(MixPass);
		commonUniform(MixPass);
		MixPass.setUniform("tex0", baseTex);  // Imagem original (ou textura base)
		MixPass.setUniform("tex1", blendTex); // Imagem processada (distorcida, com blur, etc.)
		MixPass.setUniform("color", tint);    // Cor para tingir ou misturar
        outputBuffer.clear();
		outputBuffer.rect(0, 0, WIDTH, HEIGHT);
	}
});
