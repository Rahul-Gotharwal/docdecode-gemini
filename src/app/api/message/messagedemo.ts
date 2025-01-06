import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest } from "next/server";
import { StreamingTextResponse } from "ai";
import { sendMessageValidator } from "@/lib/validators/SendMessagevalidators";
import { GeminiEmbeddings } from "@/lib/geminiEmbeddings";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
export const POST = async (req: NextRequest) => {
  // endpoint for asking a question to a pdf file
  try {
    const body = await req.json();

    const { getUser } = getKindeServerSession();
    const user = getUser();

    const { id: userId } = user;

    if (!userId) return new Response("Unauthorized", { status: 401 });

    const { fileId, message } = sendMessageValidator.parse(body);

    const file = await db.file.findFirst({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!file) return new Response("Not found", { status: 404 });

    await db.message.create({
      data: {
        text: message,
        isUserMessage: true,
        userId,
        fileId,
      },
    });

    // Initialize Gemini embeddings
    const geminiEmbeddings = new GeminiEmbeddings(
      process.env.GEMINI_API_KEY!,
      "text-embedding-004"
    );
    // Step 1: Generate embeddings for the user message
    const userMessageEmbedding = await geminiEmbeddings.embedQuery(message);
    // console.log(userMessageEmbedding);
    // Step 2: Store the user message embedding in Pinecone
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const index = pc.index(
      process.env.PINECONE_INDEX_NAME!,
      process.env.PINECONE_HOST_URL!
    );
    // Step 3: Upsert the user message embedding into Pinecone
    const upsertResponse = await index.namespace(file.id).upsert([
      {
        id: `${file.id}-${Date.now()}`,
        values: userMessageEmbedding,
        metadata: {
          userId,
          fileId,
          message,
        },
      },
    ]);
    //  console.log("Upsert Response:",upsertResponse);
    // Perform similarity search to find relevant results, based on the same fileid
    // for streaming chunks go to the  https://v03.api.js.langchain.com/classes/_langchain_google_genai.ChatGoogleGenerativeAI.html

    const results = await index.namespace(file.id).query({
      topK: 10,
      vector: userMessageEmbedding,
      includeMetadata: true,
      includeValues: false,
    });
    console.log(results);

    const context = results.matches
      .map((match) => {
        const content = match.metadata?.pageContent || "No content";
        return `Score: ${match.score}\nContent: ${content}`;
      })
      .join("\n\n");

    // Fetch previous 6 messages from the database
    const prevMessages = await db.message.findMany({
      where: { fileId },
      orderBy: { createdAt: "asc" },
      take: 6,
    });

    const formattedPrevMessages = prevMessages.map((msg) => ({
      role: msg.isUserMessage ? "user" : "assistant",
      content: msg.text,
    }));

    // Create a prompt including context and previous messages
    const prompt = `
  Based on the following context and previous messages, answer the user's question concisely.

  Context:
  ${context}

  Previous Messages:
  ${formattedPrevMessages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n")}

  User Question: ${message}
  `;

    // Streaming response using ChatGoogleGenerativeAI
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash",
      temperature: 0.7,
      maxRetries: 2,
      apiKey:process.env.GEMINI_API_KEY!,
      streaming:true
    });
    const stream = llm.stream(prompt);
    let assistantResponse = "";
    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of await stream) {
            assistantResponse += chunk.content;
            controller.enqueue(chunk.content || ""); // Push each chunk to the stream
          }
          controller.close();
        } catch (err) {
          console.error("Streaming error:", err);
          controller.error(err);
        }
      },
    });

    // Save assistant response to database after streaming
    await db.message.create({
      data: {
        text: assistantResponse,
        isUserMessage: false,
        userId,
        fileId,
      },
    });

    return new StreamingTextResponse(responseStream);
   
   
  } catch (error) {
    console.error("Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
