import schedule from "node-schedule";
import nodemailer from "nodemailer";
import emailList from "./list.json" assert { type: "json" };
import usedWords from "./usedWords.json" assert { type: "json" };
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import OpenAI from "openai";

const dayStrings = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// loading env variables
dotenv.config();
const senderEmail = process.env.SENDER_EMAIL;
const senderPassword = process.env.SENDER_PASSWORD;
const openAIApiKey = process.env.OPENAI_API_KEY;
const envInstructions = process.env.AI_INSTRUCTIONS;

// reading html email template file
const template = fs.readFileSync("./template.html", "utf8");

const openai = new OpenAI({
  apiKey: openAIApiKey,
  timeout: 30000,
});

const app = express();

// adds environment variable instructions
const instructions = envInstructions;

const tools = [
  {
    type: "function",
    function: {
      name: "getWordOfTheDay",
      description:
        "Get word of the day, a description of the word and 3 example sentences",
      parameters: {
        type: "object",
        properties: {
          wordOfTheDay: {
            type: "string",
            description: `This is the word of the day. THE WORD WILL NOT BE THE SAME WORD AS A WORD IN THE LIST: ${usedWords.toString()}`,
          },
          wordDescription: {
            type: "string",
            description: "An informative description of what the word means.",
          },
          exampleSentences: {
            type: "array",
            description:
              "An array of 3 example sentences using the word of the day",
              items: {
                type: "string"
              }
          },
        },
        required: ["wordOfTheDay", "wordDescription", "exampleSentences"],
      },
    },
  },
];

const messages = [
  {
    role: "system",
    content: instructions,
  },
];

const queryAgent = async () => {
  const completion = await openai.chat.completions.create({
    messages: messages,
    model: "gpt-3.5-turbo-1106", // $1/1M tokens instead of $10/1M tokens
    max_tokens: 200,
    tools: tools,
  });
  if (completion.choices[0].message.tool_calls)
    return completion.choices[0].message.tool_calls[0];
  return completion.choices[0];
};

// sends emails to each email in list.json
const sendEmails = (args) => {
  // checks the args
  // args.exampleSentences is now an array of sentence strings
  if (!args.wordOfTheDay || args.wordOfTheDay.length <= 0
    || !args.exampleSentences || args.exampleSentences.length <= 0
    || !args.wordDescription || args.wordDescription.length <= 0) {
      return;
    }
    const dayInt = new Date().getDay();
    const dayString = dayStrings[dayInt];
    // capitalizes the first letter of the word of the day
    const wordArr = args.wordOfTheDay.split("");
    const capitalizedWord = wordArr[0].toUpperCase() + wordArr.slice(1).join("");
    // capitalizes the description
    const capitalizedDescription = args.wordDescription.charAt(0).toUpperCase() + args.wordDescription.slice(1);
    // returns array with html content
    const listHtml = args.exampleSentences.map((sentence) => `<li>${sentence}</li>`);

  // replaces the placeholders in the html file string
  let emailHTML = template
    .replace("{{word}}", capitalizedWord)
    .replace("{{description}}", capitalizedDescription)
    .replace("{{listItems}}", listHtml.join(" "));

  // iterates through the email list
  for (const email of emailList) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: senderEmail,
        pass: senderPassword,
      },
    });

    const mailOptions = {
      from: {
        name: "Noah's Daily Word Service",
        address: senderEmail,
      },
      to: email,
      subject: `${dayString}'s word of the day`,
      html: emailHTML,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log`Email sent to ${email}`
        console.log("Email sent response: ", info.response);
      }
    });
  }
};

// cron job runs the email outreach everyday at 09:00
// gets data from agent
// adds used word to usedWords.json file
// sends emails
const runJob = async () => {
  schedule.scheduleJob("0 0 18 * * *", async function () {
    const data = await queryAgent();
    let parsedArguments;
    if (data && data.function && data.function.arguments) {
      parsedArguments = JSON.parse(data.function.arguments);
    }
    if (parsedArguments) {
      // adds the new word to used words json file
      let wordsCopy = [...usedWords];
      if(parsedArguments.wordOfTheDay && parsedArguments.wordOfTheDay.length > 0) {
        // pushes to usedWords array
        wordsCopy.push(parsedArguments.wordOfTheDay);
      }
      try {
        if (wordsCopy.length > usedWords.length) {
          fs.writeFile("./usedWords.json", JSON.stringify(wordsCopy), "utf8", (err) => {
            if (err) {
              console.error('Error writing to file:', err);
              return;
            }
            console.log('Word added!');
          });
          sendEmails(parsedArguments);
          console.log("Sent emails!");
        }
      } catch (err) {
        console.log(
          "An error occurred when trying to add new used word: ",
          err
        );
      }
    }
  });
};

// the listener mainly triggers jobs and provides logs
app.listen(3001, () => {
  console.log("Server started!");
  runJob();
});
