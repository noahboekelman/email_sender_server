#

# AI generated Word of the Day Email Server

#

## Prerequisites

- Email account and password.
- OpenAI API Key.
- AI instructions.

## Project Description

- An **Express server running locally, using **Node.
- Uses AI generated text, through **OpenAI API, using assistants and functions.
- **Nodemailer is utilized to send emails to addresses, specified in an array in the list.json file.
- **Node-schedule is running CRON jobs and executing emails everyday at 18:00:00.

### Guide

To successfully clone and use this repo, the following needs to be included.
- .env file with variables;
- - SENDER_EMAIL
  - SENDER_PASSWORD
  - OPENAI_API_KEY
  - AI_INSTRUCTIONS
- list.json file with simple array, containing the email addresses.
- usedWords.json file with simple array with empty string as starting point.
