import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest } from "next/server";
import { StreamingTextResponse } from "ai";
import { sendMessageValidator } from "@/lib/validators/SendMessagevalidators";
import { GeminiEmbeddings } from "@/lib/geminiEmbeddings";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

// import { Chroma } from "@langchain/community/vectorstores/chroma";
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
    // Assuming `results.matches` contains the data structure shown above
    console.log(results)
    // metadata is an object we need to pass that here , by watching the api data we have
    const context = results.matches
    .map((match) => {
      const content = match.metadata?.pageContent || "No content";
      return `Score: ${match.score}\nContent: ${content}`;
    })
    .join("\n\n");
  
    console.log("Generated Context:", context);
    // Step 4: Create a prompt for the AI model
    const prompt = 
     `Based on the following context, answer the user's question concisely.accordign to the entyered prompt
    
     
     User Question: ${message}`
   ;
  // console.log(contextMetadata.userId)
  // console.log(contextMetadata.userId)


    // Step 5: Generate a response using Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const genratedContentNatural = await model.generateContent(prompt);
    // https://docs.pinecone.io/guides/data/query-data
    if (!genratedContentNatural) {
      return new Response("Failed to generate response from Gemini AI", {
        status: 500,
      });
    }
    const assistantResponse = genratedContentNatural.response.text();
    // Save the assistant's response to the database
    await db.message.create({
      data: {
        text: assistantResponse,
        isUserMessage: false,
        userId,
        fileId,
      },
    });
    // Save the assistant's response to the database
    const prevMessages = await db.message.findMany({
      where: {
        fileId,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 6,
    });
    const formattedPrevMessages = prevMessages.map((msg) => ({
      role: msg.isUserMessage ? ("user" as const) : ("assistant" as const),
      content: msg.text,
    }));
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(genratedContentNatural.response.text());
        controller.close();
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
