const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadZipBtn');
const canvas = document.getElementById('vhsCanvas');
const ctx = canvas.getContext('2d');
const videoHelper = document.getElementById('videoHelper');
const aiStatus = document.getElementById('aiStatus');

let metadataResult = null;

// Função para extrair frame do vídeo
async function captureVideoFrame(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        videoHelper.src = url;
        videoHelper.onloadeddata = () => { videoHelper.currentTime = 1; };
        videoHelper.onseeked = () => {
            try {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = videoHelper.videoWidth;
                tempCanvas.height = videoHelper.videoHeight;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(videoHelper, 0, 0);
                const base64 = tempCanvas.toDataURL('image/jpeg', 0.7).split(',')[1];
                resolve(base64);
            } catch (e) { reject("Erro ao processar frame."); }
        };
        videoHelper.onerror = () => reject("Vídeo incompatível.");
    });
}

function renderLabel(data) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    ctx.fillStyle = "#000";
    ctx.font = "bold 40px Arial";
    const title = data.cleanTitle ? data.cleanTitle.toUpperCase() : "SEM TÍTULO";
    ctx.fillText(title, 40, 80);
    
    ctx.font = "18px monospace";
    ctx.fillText(`ANO: ${data.year || "19XX"} | ESTÚDIO: ${data.distributor || "RETRÔ"}`, 40, 130);
    
    // Efeito visual de desgaste da etiqueta
    for(let i=0; i<60; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 1);
    }
}

generateBtn.addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    const title = document.getElementById('movieTitle').value;
    const videoFile = document.getElementById('videoFile').files[0];

    if (!apiKey) return alert("Insira a API Key!");
    if (!title) return alert("Defina um título!");

    aiStatus.innerHTML = "⏳ Conectando via API v1 (Stable)...";

    try {
        let parts = [{ text: `Atue como historiador. Título: "${title}". Gere um JSON para VHS: {"cleanTitle": "", "year": "", "distributor": "", "description": "", "videoPrompt": ""}. Responda apenas o JSON puro.` }];

        if (videoFile) {
            aiStatus.innerHTML = "⏳ Analisando visual do vídeo...";
            try {
                const frame = await captureVideoFrame(videoFile);
                parts.push({ inline_data: { mime_type: "image/jpeg", data: frame } });
            } catch (vErr) { console.warn("Prosseguindo sem imagem."); }
        }

        // MUDANÇA CRUCIAL: v1beta -> v1 para evitar o erro NOT_FOUND
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }] })
        });

        const resData = await response.json();

        if (resData.error) {
            throw new Error(`Google diz: ${resData.error.message}`);
        }

        let rawText = resData.candidates[0].content.parts[0].text;
        
        // Limpeza de blocos de código markdown que o Gemini às vezes envia
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const jsonMatch = rawText.match(/\{.*\}/s);
        if (!jsonMatch) throw new Error("A resposta da IA não contém um JSON válido.");
        
        metadataResult = JSON.parse(jsonMatch[0]);
        renderLabel(metadataResult);
        
        aiStatus.innerHTML = `✅ <strong>Sucesso!</strong><br>Prompt para Kling AI:<br><code style="background:#000; color:#ffcc00; display:block; padding:10px; margin-top:5px; border:1px solid #333;">${metadataResult.videoPrompt}</code>`;
        downloadBtn.disabled = false;

    } catch (err) {
        aiStatus.innerHTML = `<div style="color:#ff5555">❌ ${err.message}</div>`;
        console.error("Erro detalhado:", err);
    }
});

downloadBtn.addEventListener('click', async () => {
    if (!metadataResult) return;
    const zip = new JSZip();
    const name = metadataResult.cleanTitle.replace(/\s+/g, '_');
    const folder = zip.folder(name);
    
    folder.file("label.png", canvas.toDataURL('image/png').split(',')[1], {base64: true});
    folder.file("info.json", JSON.stringify(metadataResult, null, 2));
    
    const videoFile = document.getElementById('videoFile').files[0];
    if (videoFile) folder.file(`${name}.mp4`, videoFile);
    
    const content = await zip.generateAsync({type:"blob"});
    saveAs(content, `${name}_Pack_EmuVR.zip`);
});
