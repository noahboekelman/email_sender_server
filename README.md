# AI generated Word of the Day Email Server

## Prerequisites

- Email account and password.
- OpenAI API Key.
- AI instructions.

## Project Description

- An Express server is running locally, using Node.
- Nodemailer is utilized to send emails to addresses, specified in an array in the `list.json` file.
- Node-schedule is running CRON jobs and executing emails everyday at 18:00:00.
- - Uses AI to generate word of the day, descrription and example sentences. Text is generated through OpenAI API, using a GPT-3 assistant utilizing functions.

### Guide

To successfully clone and use this repo, the following needs to be included.

- `.env` file with variables:
  - `SENDER_EMAIL`
  - `SENDER_PASSWORD`
  - `OPENAI_API_KEY`
  - `AI_INSTRUCTIONS`
- `list.json` file with a simple array, containing the email addresses.
- `usedWords.json` file with a simple array with an empty string as starting point.
