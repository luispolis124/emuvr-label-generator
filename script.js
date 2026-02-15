const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadZipBtn');
const canvas = document.getElementById('vhsCanvas');
const ctx = canvas.getContext('2d');
const videoHelper = document.getElementById('videoHelper');
const aiStatus = document.getElementById('aiStatus');

let metadataResult = null;

// Função para extrair frame do vídeo (Multimodalidade)
async function captureVideoFrame(file) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        videoHelper.src = url;
        videoHelper.onloadeddata = () => {
            videoHelper.currentTime = 2; // Pega o frame aos 2 segundos
        };
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

// Desenha a Label no Canvas baseada na resposta da IA
function renderLabel(data) {
    const style = document.getElementById('vhsStyle').value;
    
    // Fundo
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Bordas e Design
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Título principal
    ctx.fillStyle = "#000";
    ctx.font = style === 'homevideo' ? "italic bold 45px 'Comic Sans MS'" : "bold 50px Arial";
    ctx.fillText(data.cleanTitle.toUpperCase(), 40, 80);

    // Informações Técnicas
    ctx.font = "20px monospace";
    ctx.fillText(`ANO: ${data.year}`, 40, 130);
    ctx.fillText(`DISTRIB: ${data.distributor}`, 40, 160);
    ctx.fillText(`REF: ${Math.random().toString(36).substring(7).toUpperCase()}`, 40, 190);

    // "Ruído" Visual
    for(let i=0; i<100; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
        ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 2, 2);
    }
}

generateBtn.addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value;
    const title = document.getElementById('movieTitle').value;
    const videoFile = document.getElementById('videoFile').files[0];

    if (!apiKey) return alert("Por favor, insira sua API Key!");

    aiStatus.innerText = "⏳ Gemini está analisando sua fita...";
    
    try {
        let parts = [{ text: `Analise este título: "${title}". Gere um JSON com os campos: cleanTitle, year, distributor, description. Retorne apenas o JSON.` }];

        if (videoFile) {
            const frameBase64 = await captureVideoFrame(videoFile);
            parts.push({
                inline_data: { mime_type: "image/jpeg", data: frameBase64 }
            });
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
        aiStatus.innerText = "✅ Label e metadados gerados!";
        downloadBtn.disabled = false;

    } catch (err) {
        aiStatus.innerText = "❌ Erro ao consultar Gemini.";
        console.error(err);
    }
});

downloadBtn.addEventListener('click', async () => {
    const zip = new JSZip();
    const folderName = metadataResult.cleanTitle.replace(/\s+/g, '_');
    const folder = zip.folder(folderName);

    // Arte do VHS
    const labelData = canvas.toDataURL('image/png').split(',')[1];
    folder.file("label.png", labelData, {base64: true});

    // EmuVR info.json
    const emuJson = {
        Title: metadataResult.cleanTitle,
        Year: metadataResult.year,
        Description: metadataResult.description
    };
    folder.file("info.json", JSON.stringify(emuJson, null, 2));

    // Incluir Vídeo se existir
    const videoFile = document.getElementById('videoFile').files[0];
    if (videoFile) {
        folder.file(`${folderName}.mp4`, videoFile);
    }

    const content = await zip.generateAsync({type:"blob"});
    saveAs(content, `${folderName}_EmuVR.zip`);
});
