# AI generated Word of the Day Email Server

* An **Express server running locally, using **Node.
* Uses AI generated text, through **OpenAI API, using assistants and functions.
* **Nodemailer is utilized to send emails to addresses, specified in an array in the list.json file.
* **Node-schedule is running CRON jobs and executing emails everyday at 18:00:00.
---
_list.json and _usedWords.json are included in .gitignore, and should be added as json files containing arrays.
