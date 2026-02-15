const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadZipBtn');
const canvas = document.getElementById('vhsCanvas');
const ctx = canvas.getContext('2d');
const videoHelper = document.getElementById('videoHelper');
const aiStatus = document.getElementById('aiStatus');

let metadataResult = null;

async function captureVideoFrame(file) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        videoHelper.src = url;
        videoHelper.onloadeddata = () => { videoHelper.currentTime = 2; };
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

function renderLabel(data) {
    const style = document.getElementById('vhsStyle').value;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.fillStyle = "#000";
    ctx.font = style === 'homevideo' ? "italic bold 40px 'Comic Sans MS'" : "bold 45px Arial";
    ctx.fillText(data.cleanTitle.toUpperCase(), 40, 80);

    ctx.font = "18px monospace";
    ctx.fillText(`ANO: ${data.year} | ESTÚDIO: ${data.distributor}`, 40, 130);
    ctx.fillText(`ESTILO: Animação 2D Cel (Original Print)`, 40, 160);
    
    // Simular desgaste de fita velha
    for(let i=0; i<80; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
        ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 2, 1);
    }
}

generateBtn.addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value;
    const title = document.getElementById('movieTitle').value;
    const videoFile = document.getElementById('videoFile').files[0];

    if (!apiKey) return alert("Por favor, insira sua API Key!");

    aiStatus.innerText = "⏳ Gemini está criando sua animação fictícia...";
    
    try {
        // PROMPT ATUALIZADO PARA FOCO EM ANIMAÇÃO 2D CEL
        let promptBase = `Atue como um historiador de animações perdidas. O título é "${title}". 
        Crie metadados fictícios de um desenho animado estilo "2D Cel Animation" dos anos 80/90. 
        Retorne APENAS um JSON: {"cleanTitle": "Nome", "year": "198x", "distributor": "Nome do Estúdio", "description": "Sinopse nostálgica"}`;

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
        metadataResult = JSON.parse(rawText.match(/\{.*\}/s)[0]);

        renderLabel(metadataResult);
        aiStatus.innerText = "✅ Pack de Animação Criado!";
        downloadBtn.disabled = false;

    } catch (err) {
        aiStatus.innerText = "❌ Erro. Verifique sua chave ou conexão.";
        console.error(err);
    }
});

downloadBtn.addEventListener('click', async () => {
    const zip = new JSZip();
    const folderName = metadataResult.cleanTitle.replace(/\s+/g, '_');
    const folder = zip.folder(folderName);

    const labelData = canvas.toDataURL('image/png').split(',')[1];
    folder.file("label.png", labelData, {base64: true});

    folder.file("info.json", JSON.stringify({
        Title: metadataResult.cleanTitle,
        Year: metadataResult.year,
        Description: metadataResult.description + " [Estilo: Animação 2D Cel Tradicional]",
        Media: "VHS"
    }, null, 2));

    const videoFile = document.getElementById('videoFile').files[0];
    if (videoFile) { folder.file(`${folderName}.mp4`, videoFile); }

    const content = await zip.generateAsync({type:"blob"});
    saveAs(content, `${folderName}_VHS_Animação.zip`);
});
