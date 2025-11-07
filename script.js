const fileInput = document.getElementById('file-input');
const textDisplay = document.getElementById('text-display');
const readButton = document.getElementById('read-button');
const pauseButton = document.getElementById('pause-button');
const syncButton = document.getElementById('sync-button');
const progressBar = document.getElementById('progress-bar');
const speedDial = document.getElementById('speed-dial');
const speedValue = document.getElementById('speed-value');
const voiceSelect = document.getElementById('voice-select');
const aiReadButton = document.getElementById('ai-read-button');
const openAIApiKeyInput = document.getElementById('openai-api-key');

let fullText = '';
let pages = [];
let currentPage = 0;
let isPaused = false;
let voices = [];
const WORDS_PER_PAGE = 300;

function populateVoiceList() {
    voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = '';
    if (voices.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No voices available';
        voiceSelect.appendChild(option);
        return;
    }
    for (const voice of voices) {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.setAttribute('data-lang', voice.lang);
        option.setAttribute('data-name', voice.name);
        voiceSelect.appendChild(option);
    }
}

voiceSelect.innerHTML = '<option>Loading voices...</option>';
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
}
speechSynthesis.getVoices();

fileInput.addEventListener('change', (event) => {
    currentPage = 0;
    const file = event.target.files[0];
    if (file) {
        if (file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (e) => {
                fullText = e.target.result;
                paginateText(fullText);
                displayPage(currentPage);
            };
            reader.readAsText(file);
        } else if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const typedarray = new Uint8Array(e.target.result);
                pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                    let text = '';
                    const numPages = pdf.numPages;
                    let promises = [];
                    for (let i = 1; i <= numPages; i++) {
                        promises.push(pdf.getPage(i).then(page => {
                            return page.getTextContent().then(content => {
                                let lastY = -1;
                                let textLine = '';
                                let pageText = '';
                                for (const item of content.items) {
                                    if (lastY !== -1 && item.transform[5] !== lastY) {
                                        pageText += textLine + '\n';
                                        textLine = '';
                                    }
                                    textLine += item.str;
                                    lastY = item.transform[5];
                                }
                                pageText += textLine;
                                return pageText;
                            });
                        }));
                    }
                    Promise.all(promises).then(pagesText => {
                        fullText = pagesText.join('\n\n');
                        paginateText(fullText);
                        displayPage(currentPage);
                    });
                });
            };
            reader.readAsArrayBuffer(file);
        }
    }
});

function paginateText(text) {
    const words = text.split(/\s+/);
    pages = [];
    for (let i = 0; i < words.length; i += WORDS_PER_PAGE) {
        pages.push(words.slice(i, i + WORDS_PER_PAGE).join(' '));
    }
    progressBar.max = pages.length > 0 ? pages.length - 1 : 0;
}

function displayPage(pageNumber) {
    if (pageNumber >= 0 && pageNumber < pages.length) {
        textDisplay.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = pages[pageNumber];
        textDisplay.appendChild(p);
        progressBar.value = pageNumber;
        currentPage = pageNumber;
    }
}

progressBar.addEventListener('input', (event) => {
    speechSynthesis.cancel();
    const newPage = parseInt(event.target.value, 10);
    displayPage(newPage);
});

function readPage(pageNumber) {
    if (pageNumber >= 0 && pageNumber < pages.length) {
        speechSynthesis.cancel();
        isPaused = false;
        pauseButton.textContent = 'Pause';
        const textToRead = pages[pageNumber];
        const utterance = new SpeechSynthesisUtterance(textToRead);
        const selectedVoiceName = voiceSelect.selectedOptions[0].getAttribute('data-name');
        utterance.voice = voices.find(voice => voice.name === selectedVoiceName);
        utterance.rate = speedDial.value;
        utterance.onend = () => {
            if (currentPage < pages.length - 1) {
                const newPage = currentPage + 1;
                displayPage(newPage);
                readPage(newPage);
            }
        };
        speechSynthesis.speak(utterance);
    }
}

readButton.addEventListener('click', () => {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
        const utterance = new SpeechSynthesisUtterance(selectedText);
        const selectedVoiceName = voiceSelect.selectedOptions[0].getAttribute('data-name');
        utterance.voice = voices.find(voice => voice.name === selectedVoiceName);
        utterance.rate = speedDial.value;
        speechSynthesis.speak(utterance);
    } else {
        readPage(currentPage);
    }
    isPaused = false;
    pauseButton.textContent = 'Pause';
});

pauseButton.addEventListener('click', () => {
    if (speechSynthesis.speaking && !isPaused) {
        speechSynthesis.pause();
        isPaused = true;
        pauseButton.textContent = 'Resume';
    } else if (speechSynthesis.speaking && isPaused) {
        speechSynthesis.resume();
        isPaused = false;
        pauseButton.textContent = 'Pause';
    }
});

syncButton.addEventListener('click', () => {
    readPage(currentPage);
});

speedDial.addEventListener('input', () => {
    speedValue.textContent = `${parseFloat(speedDial.value).toFixed(1)}x`;
    if (speechSynthesis.speaking) {
        readPage(currentPage);
    }
});

aiReadButton.addEventListener('click', async () => {
    const apiKey = openAIApiKeyInput.value.trim();
    if (!apiKey) {
        alert('Please enter your OpenAI API key.');
        return;
    }

    const textToRead = pages[currentPage];
    if (!textToRead) {
        alert('No text to read.');
        return;
    }

    aiReadButton.disabled = true;
    aiReadButton.textContent = 'Reading...';

    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: textToRead,
                voice: 'alloy',
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();

        audio.onended = () => {
            aiReadButton.disabled = false;
            aiReadButton.textContent = 'Read with AI Voice';
        };

    } catch (error) {
        console.error('Error with OpenAI TTS:', error);
        alert(`An error occurred: ${error.message}`);
        aiReadButton.disabled = false;
        aiReadButton.textContent = 'Read with AI Voice';
    }
});
