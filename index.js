import schedule from "node-schedule";
import nodemailer from "nodemailer";
import emailList from "./list.json" assert { type: "json" };
import usedWords from "./usedWords.json" assert { type: "json" };
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import OpenAI from "openai";

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

// adds environment variable instructions and used words as instructions
// response logic is in env and usedWords is used for the agent to not repeat words
const instructions = `${envInstructions} ${usedWords.toString()}`;

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
            description: `This is the word of the day, with the first letter capitalized and the word WILL NOT BE THE SAME WORD AS A WORD IN THE LIST: ${usedWords.toString()}`,
          },
          wordDescription: {
            type: "string",
            description: "A description of what the word means",
          },
          exampleSentences: {
            type: "string",
            description:
              "A string of 3 example sentences where the word of the day is used, separated by a dot",
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
    model: "gpt-4-1106-preview",
    max_tokens: 200,
    response_format: { type: "json_object" },
    tools: tools,
  });
  if (completion.choices[0].message.tool_calls)
    return completion.choices[0].message.tool_calls[0];
  return completion.choices[0];
};

// sends emails to each email in list.json
const sendEmails = (args) => {
  // capitalizes the first letter of the word of the day
  const wordArr = args.wordOfTheDay.split("");
  const capitalizedWord = wordArr[0].toUpperCase() + wordArr.slice(1).join("");
  // splits the args example sentences string
  const splitSentencesArr = args.exampleSentences.split(". ");
  // returns array with html content
  const listHtml = splitSentencesArr.map((sentence) => `<li>${sentence}</li>`);

  // replaces the placeholders in the html file string
  let emailHTML = template
    .replace("{{word}}", capitalizedWord)
    .replace("{{description}}", args.wordDescription)
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
        name: "Noah's Daily Email Service",
        address: senderEmail,
      },
      to: email,
      subject: "Another day, another word",
      html: emailHTML,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      console.log("MailOptions: ", mailOptions);
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: ", info.response);
      }
    });
  }
};

// runs the email outreach with 6h intervals
// gets data from agent
// adds used word to usedWords.json file
// sends emails
const runJob = async () => {
  schedule.scheduleJob("0 0 */6 * * *", async function () {
    const data = await queryAgent();
    let parsedArguments;
    if (data && data.function && data.function.arguments) {
      parsedArguments = JSON.parse(data.function.arguments);
    }
    if (parsedArguments) {
      // adds the new word to used words json file
      let wordsCopy = usedWords;
      wordsCopy.push(parsedArguments.wordOfTheDay);
      const newWords = JSON.stringify(wordsCopy);
      try {
        fs.writeFile("./usedWords.json", newWords, "utf8", () => {
          console.log("Word added!");
        });
      } catch (err) {
        console.log(
          "An error occurred when trying to add new used word: ",
          err
        );
      }

      sendEmails(parsedArguments);
      console.log("Sent emails!");
    }
  });
};

// the listener mainly triggers jobs and provides logs
app.listen(3003, () => {
  console.log("Server started!");
  runJob();
});
