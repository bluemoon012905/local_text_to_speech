# Local Text-to-Speech

A simple, locally-run application to read text from PDF and TXT files aloud.

## Features

*   **Text-to-Speech:** Converts text from files into speech using a standard machine voice.
*   **File Support:** Supports both `.pdf` and `.txt` files.
*   **PDF Text Extraction:** Automatically extracts text from PDF files.
*   **Text Selection:** Allows users to select a specific portion of the text to be read.
*   **Pause/Resume:** Allows pausing and resuming the speech.
*   **Reading Progress:**
    *   Displays text in paginated sections, like a book.
    *   Includes an adjustable progress bar to navigate through the text.
*   **Bookmarking:** Save your reading position to resume later.

## Tech Stack

*   **Frontend:** HTML, CSS, JavaScript
*   **Text-to-Speech:** Browser's built-in `SpeechSynthesis` API
*   **PDF Handling:** `pdf.js` library to extract text from PDF files.

## How to Use

1.  Clone this repository.
2.  Open the `index.html` file in your web browser.
3.  Click the "Choose File" button to select a `.txt` or `.pdf` file.
4.  The text will be displayed, and you can use the controls to have it read to you.