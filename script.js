const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadZipBtn');
const canvas = document.getElementById('vhsCanvas');
const ctx = canvas.getContext('2d');
const videoHelper = document.getElementById('videoHelper');
const aiStatus = document.getElementById('aiStatus');

let metadataResult = null;

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
            } catch (e) { reject("Erro no frame."); }
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

    aiStatus.innerHTML = "⏳ Tentando conexão estável (v1/latest)...";

    try {
        let parts = [{ text: `Título: "${title}". Gere um JSON para VHS: {"cleanTitle": "", "year": "", "distributor": "", "description": "", "videoPrompt": ""}. Responda apenas o JSON.` }];

        if (videoFile) {
            aiStatus.innerHTML = "⏳ Analisando vídeo...";
            try {
                const frame = await captureVideoFrame(videoFile);
                parts.push({ inline_data: { mime_type: "image/jpeg", data: frame } });
            } catch (vErr) { console.warn("Pulando frame."); }
        }

        // URL ATUALIZADA PARA v1 COM MODELO LATEST
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts: parts }] 
            })
        });

        const resData = await response.json();

        if (resData.error) {
            throw new Error(`Google diz: ${resData.error.message} (${resData.error.status})`);
        }

        let rawText = resData.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const jsonMatch = rawText.match(/\{.*\}/s);
        if (!jsonMatch) throw new Error("Falha ao ler dados da IA.");
        
        metadataResult = JSON.parse(jsonMatch[0]);
        renderLabel(metadataResult);
        
        aiStatus.innerHTML = `✅ <strong>Sucesso!</strong><br>Copie o prompt para o Kling AI:<br><code style="background:#000; color:#ffcc00; display:block; padding:10px; margin-top:5px; border:1px solid #333;">${metadataResult.videoPrompt}</code>`;
        downloadBtn.disabled = false;

    } catch (err) {
        aiStatus.innerHTML = `<div style="color:#ff5555">❌ ${err.message}</div>`;
        console.error("Erro:", err);
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
    saveAs(content, `${name}_Pack.zip`);
});
