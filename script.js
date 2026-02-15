const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadZipBtn');
const canvas = document.getElementById('vhsCanvas');
const ctx = canvas.getContext('2d');
const videoHelper = document.getElementById('videoHelper');
const aiStatus = document.getElementById('aiStatus');

let metadataResult = null;

// Função para extrair frame do vídeo para análise multimodal
async function captureVideoFrame(file) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        videoHelper.src = url;
        videoHelper.onloadeddata = () => { videoHelper.currentTime = 1; };
        videoHelper.onseeked = () => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = videoHelper.videoWidth;
            tempCanvas.height = videoHelper.videoHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(videoHelper, 0, 0);
            const base64 = tempCanvas.toDataURL('image/jpeg', 0.7).split(',')[1];
            resolve(base64);
        };
    });
}

// Renderiza a etiqueta com estilo de desgaste e metadados
function renderLabel(data) {
    const style = document.getElementById('vhsStyle').value;
    
    // Fundo da etiqueta
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Borda preta clássica
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Título (com variação de fonte se for caseiro)
    ctx.fillStyle = "#000";
    ctx.font = style === 'homevideo' ? "italic bold 40px 'Comic Sans MS'" : "bold 45px Arial";
    ctx.fillText(data.cleanTitle.toUpperCase(), 40, 80);

    // Detalhes técnicos
    ctx.font = "18px monospace";
    ctx.fillText(`ANO: ${data.year} | ESTÚDIO: ${data.distributor}`, 40, 130);
    ctx.fillText(`ESTILO: Animação 2D Cel (Original Master)`, 40, 160);
    
    // Simulação de desgaste físico da etiqueta (Ruído)
    for(let i=0; i<85; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 1);
    }
}

generateBtn.addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value;
    const title = document.getElementById('movieTitle').value;
    const videoFile = document.getElementById('videoFile').files[0];

    if (!apiKey) return alert("Por favor, insira sua Gemini API Key!");

    aiStatus.innerHTML = "⏳ Gemini está concebendo sua animação e preparando o prompt do Kling...";
    
    try {
        // Prompt robusto que solicita dados e o comando de vídeo
        let promptBase = `O título é "${title}". Atue como um historiador de animações perdidas.
        1. Crie metadados fictícios (cleanTitle, year, distributor, description) para uma animação 2D Cel dos anos 80/90.
        2. Crie um PROMPT em INGLÊS para o Kling AI gerar um vídeo dessa animação com estética VHS, 2D cel style, hand-drawn.
        Retorne APENAS o JSON: {"cleanTitle": "", "year": "", "distributor": "", "description": "", "videoPrompt": ""}`;

        let parts = [{ text: promptBase }];

        if (videoFile) {
            const frameBase64 = await captureVideoFrame(videoFile);
            parts.push({ inline_data: { mime_type: "image/jpeg", data: frameBase64 } });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }] })
        });

        const resData = await response.json();
        const rawText = resData.candidates[0].content.parts[0].text;
        
        // Extração e parse do JSON da resposta
        metadataResult = JSON.parse(rawText.match(/\{.*\}/s)[0]);

        // Atualiza a Label e a Interface
        renderLabel(metadataResult);
        
        aiStatus.innerHTML = `
            <p>✅ <strong>Pack Planejado!</strong></p>
            <div style="background:#000; padding:12px; border:1px solid #00f2ff; margin-top:10px; border-radius:4px;">
                <p style="color:#00f2ff; margin:0 0 8px 0; font-size:12px;">🚀 COPIE PARA O KLING AI:</p>
                <code style="color:#fff; word-break:break-all; font-size:13px;">${metadataResult.videoPrompt}</code>
            </div>
            <p style="margin-top:10px;"><small>Após gerar o vídeo, selecione-o no campo de arquivo e baixe seu Pack ZIP.</small></p>
        `;
        
        downloadBtn.disabled = false;

    } catch (err) {
        aiStatus.innerText = "❌ Erro na conexão. Verifique a chave ou o título.";
        console.error(err);
    }
});

downloadBtn.addEventListener('click', async () => {
    if(!metadataResult) return;

    const zip = new JSZip();
    const folderName = metadataResult.cleanTitle.replace(/\s+/g, '_');
    const folder = zip.folder(folderName);

    // Salva a imagem da label
    const labelData = canvas.toDataURL('image/png').split(',')[1];
    folder.file("label.png", labelData, {base64: true});

    // Salva os metadados para o EmuVR
    const emuInfo = {
        Title: metadataResult.cleanTitle,
        Year: metadataResult.year,
        Description: metadataResult.description + " [Estilo: Animação 2D Cel Gerada por IA]",
        Media: "VHS"
    };
    folder.file("info.json", JSON.stringify(emuInfo, null, 2));

    // Inclui o vídeo no pacote se o usuário tiver anexado
    const videoFile = document.getElementById('videoFile').files[0];
    if (videoFile) {
        folder.file(`${folderName}.mp4`, videoFile);
    }

    // Gera e baixa o ZIP
    const content = await zip.generateAsync({type: "blob"});
    saveAs(content, `${folderName}_EmuVR_Pack.zip`);
});
