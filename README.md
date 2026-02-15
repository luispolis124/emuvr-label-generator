# 📼 EmuVR Retro Pack Maker (Gemini AI Edition)

Este é um projeto web experimental que utiliza a **IA Gemini (Google)** para automatizar a criação de etiquetas (labels) e metadados para fitas VHS customizadas no **EmuVR**.

O sistema permite gerar o pacote `.zip` completo estruturado para o EmuVR, incluindo a arte da etiqueta gerada em tempo real via Canvas 2D e análise multimodal de vídeo.

## ✨ Funcionalidades

* **Análise Multimodal:** Carregue um vídeo ou imagem e a IA identificará o conteúdo para gerar metadados precisos.
* **Gerador de Labels 2D:** Cria etiquetas com visual retrô (estilo "escrito à mão" ou "Blockbuster") automaticamente.
* **Exportação para EmuVR:** Gera um arquivo ZIP com a estrutura de pastas correta:
    * `info.json` (Metadados lidos pelo EmuVR)
    * `label.png` (A arte da fita)
    * `video.mp4` (O seu arquivo de mídia renomeado)

## 🚀 Como Usar

1.  **Obtenha uma API Key:** Acesse o [Google AI Studio](https://aistudio.google.com/) e crie uma chave gratuita para o Gemini.
2.  **Configure o Projeto:**
    * Abra a `index.html` no seu navegador.
    * Cole sua API Key no campo indicado.
3.  **Gere o Conteúdo:**
    * Digite um título ou faça upload de um arquivo de vídeo.
    * Clique em **"Gerar Label"**. A IA processará os dados e desenhará a etiqueta no Canvas.
4.  **Instale no EmuVR:**
    * Clique em **"Baixar Pack"**.
    * Extraia o conteúdo do ZIP dentro da sua pasta `EmuVR/Games/`.
    * Execute o **Scanner** do EmuVR.

## 🛠️ Tecnologias Utilizadas

* **HTML5 / CSS3** (Visual Retro UI)
* **JavaScript (ES6+)**
* **Gemini 1.5 Flash API** (Processamento de Texto e Imagem)
* **JSZip & FileSaver** (Para criação do pacote de download)
* **HTML5 Canvas** (Para renderização da arte da etiqueta)

## ⚠️ Nota de Segurança

Este projeto é **Client-Side Only**. Isso significa que a sua `Gemini API Key` não é enviada para nenhum servidor externo além da própria API oficial do Google. Ela permanece apenas na memória do seu navegador durante o uso.

---
*Desenvolvido para entusiastas de retro-gaming e nostalgia.*
