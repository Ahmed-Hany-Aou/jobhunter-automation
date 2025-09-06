JobHunter v1.0
A weekend project to automate the tedious parts of applying for "Easy Apply" jobs on LinkedIn. This browser script navigates job listings, clicks on positions, and fills out application forms with human-like delays.

✨ Key Features
Automated Job Browsing: Sequentially navigates through job cards on a LinkedIn search page.

Smart Application: Identifies and processes "Easy Apply" jobs.

Intelligent Form Filling: Populates common fields (name, email, phone) and handles basic multiple-choice questions.

UI Controller: A simple, non-intrusive floating button to start and stop the automation process.

Human-like Behavior: Implements randomized delays between actions to mimic a real user and avoid detection.

💡 The Motivation
This project was born out of a weekend of inspiration, sparked by a post on "vibe coding with AI." As a full-time Software Engineer, I wanted to challenge myself to build something practical and learn on the fly, even with a packed schedule.

The result is this script, which is already capable of handling 50 sequential jobs. The moment I tested it on 10 and my phone buzzed with 10 "Application Sent" notifications in a row was a fantastic proof of concept!

⚠️ Disclaimer
This is a work-in-progress and was built as a personal learning project. LinkedIn's website structure changes frequently, which may break the script's functionality. Use this script responsibly and at your own risk. It is intended as a proof-of-concept and a portfolio piece.

🛠️ Getting Started
As this is not yet a packaged browser extension, you can run the script manually using your browser's developer tools.

Get the Code:

Navigate to the jobhunter_script.js file in this repository.

Click the "Copy raw file" button to copy the entire script to your clipboard.

Run on LinkedIn:

Open a new tab and navigate to a LinkedIn Jobs search results page (e.g., https://www.linkedin.com/jobs/search/...).

Open the Developer Console by pressing F12 or Ctrl+Shift+I (Windows/Linux) or Cmd+Opt+I (Mac).

Select the Console tab.

Paste the entire script into the console and press Enter.

📖 How to Use
After pasting the script into the console, you should see a green circular button appear on the top right of the page.

Click this button to start the auto-browsing and application process. The UI will update to show its active status.

A control panel will appear, showing the current job being processed and the overall progress.

To stop the process at any time, simply click the red button on the main UI or the stop button in the control panel.

🗺️ Roadmap: The Future is AI
This is just the first step. The ultimate vision for JobHunter is to make it even smarter.

🧠 AI Integration: The next major goal is to integrate a generative AI model. The AI will be tasked with analyzing more complex, open-ended questions on applications and crafting unique answers based on the user's resume and professional information. God willing, this will take the project to the next level.

⚙️ Enhanced Error Handling: Improve the script's ability to recover from unexpected pop-ups, modal dialogs, or UI changes.

📦 Chrome Extension: Package the script into a user-friendly Chrome Extension for easy installation and use.

📜 License
This project is licensed under the MIT License - see the LICENSE file for details.
