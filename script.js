const fileInput = document.getElementById('file-input');
const textDisplay = document.getElementById('text-display');
const readButton = document.getElementById('read-button');
const syncButton = document.getElementById('sync-button');
const progressBar = document.getElementById('progress-bar');
const speedDial = document.getElementById('speed-dial');

let fullText = '';
let pages = [];
let currentPage = 0;
const WORDS_PER_PAGE = 300;

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
        const textToRead = pages[pageNumber];
        const utterance = new SpeechSynthesisUtterance(textToRead);
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
        utterance.rate = speedDial.value;
        speechSynthesis.speak(utterance);
    } else {
        readPage(currentPage);
    }
});

syncButton.addEventListener('click', () => {
    readPage(currentPage);
});
