import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/db";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { getPineconeClient } from "@/lib/pinecone";
import { PineconeStore } from "langchain/vectorstores/pinecone";
///import { gemini } from "@/lib/gemini";
//import { HuggingFaceInference } from "langchain/llms/hf";
//import { HfInference } from "@huggingface/inference";
import { Embeddings, EmbeddingsParams } from "langchain/embeddings/base";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AxiosError } from "axios";
// import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
// import { VectorOperationsApi } from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch';
// Custom Gemini Embeddings Class
export class GeminiEmbeddings extends Embeddings {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string, params?: EmbeddingsParams) {
    super(params || {});
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  // Method to embed a query
  async embedQuery(query: string): Promise<number[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const result = await model.embedContent(query);
      const embedding = result?.embedding?.values;
      if (!embedding) {
        throw new Error("Failed to retrieve query embeddings.");
      }
      return embedding;
    } catch (error) {
      this.handleError(error);
      throw new Error("Failed to generate query embeddings.");
    }
  }

  // Method to embed multiple documents
  async embedDocuments(documents: string[]): Promise<number[][]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const embeddings: number[][] = [];
      for (const doc of documents) {
        const result = await model.embedContent(doc);
        const embedding = result?.embedding?.values;
        if (!embedding) {
          throw new Error("Failed to retrieve document embeddings.");
        }
        embeddings.push(embedding);
      }
      console.log(embeddings)
      return embeddings;
    } catch (error) {
      this.handleError(error);
      throw new Error("Failed to generate document embeddings.");
    }
  }

  // Error handling method
  private handleError(error: any) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      console.error(
        "Error fetching embedding from Gemini API:",
        axiosError.response.data
      );
    } else {
      console.error("Request failed:", error);
    }
  }
}

const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_S3_REGION || " ",
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || " ",
  },
});

async function uploadFileToS3(file: Buffer, fileName: string): Promise<string> {
  const fileBuffer = file;

  const params = {
    Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
    Key: `${fileName}`,
    Body: fileBuffer,
    ContentType: "application/pdf",
  };

  const command = new PutObjectCommand(params);
  await s3Client.send(command);

  return fileName;
}
async function upsertWithRetry(pineconeIndex:any, vectors:any, maxRetries = 5, delay = 500) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      await pineconeIndex.upsert({ vectors });
      return;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} to upsert failed:`, error);
      attempt++;
      if (attempt < maxRetries) await new Promise(res => setTimeout(res, delay * 2 ** attempt));
      else throw new Error("Failed after multiple retries.");
    }
  }
}


// --------------this is the API for posting the data------------------//
///console.log("File upload initiated");
export async function POST(request: any, userId: string): Promise<any> {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = await uploadFileToS3(buffer, file.name);
    // console.log("Processing request:", { userId, request });
    // Update the database with the file information
    const uploadedFile = await db.file.create({
      data: {
        key: fileName,
        name: file.name,
        userId: "kp_37e2a1af91f44861946a081d10112f5c",
        url: `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_S3_REGION}.amazonaws.com/${file.name}`,
        uploadStatus: "PROCESSING",
      },
    });
    //console.log("File uploaded successfully:", uploadedFile);

    try {
      const response = await fetch(
        `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_S3_REGION}.amazonaws.com/${file.name}`
      );
      //console.log("file is fetched successfully")
      const blob = await response.blob();
      const loader = new PDFLoader(blob);
      console.log("Loading PDF content...");
      const pageLevelDocs = await loader.load();
      console.log("PDF loaded. Number of pages:", pageLevelDocs.length);
      //console.log(typeof pageLevelDocs)
      // we change this to the array
      const pinecone = await getPineconeClient();
      const pineconeIndex = pinecone.Index("vishalnewaccount");
      console.log("Connected to Pinecone Index: vishalnewaccount"); // updated name by docdec , insted the docdecode , because we have to give the name of the index not
      // if(pineconeIndex) console.log("Index is correct")
      // else { console.log("mistale is at the pinecone")}
      //https://python.langchain.com/docs/integrations/text_embedding/openai/
      // NOTE  OpenAIEmbeddings is only the model of the langchain that is collab with the openai , so we can direcly use it for the answer of the query and also for the embeddings , by passing the model or openaiapieky to it
      // generate the vector from the text of pdf
      //this method is comes with the embedDocument and the embedQuery method so we dont get the error for the storing the data in the pinecone
      //but for the gemini we dont have this direct method so we have to make or find the solution
      // const embeddings = new OpenAIEmbeddings({
      //   openAIApiKey: process.env.OPEN_AI_KEY,
      // });
      // code with the for loop
      // Iterate through the pages and generate embeddings using Gemini API
      // turning text into the vectors
      // await PineconeStore.fromDocuments(pageLevelDocs, embeddings, {
      //   pineconeIndex,
      //   namespace: uploadedFile.id,
      // });


      const geminiEmbeddings = new GeminiEmbeddings(
        process.env.GEMINI_API_KEY!,
        "text-embedding-004"
      );

      // Use PineconeStore with Gemini embeddings
      await PineconeStore.fromDocuments(pageLevelDocs, geminiEmbeddings, {
        pineconeIndex,
        namespace: uploadedFile.id,
      });
      console.log("Embeddings stored successfully in Pinecone.");
      await db.file.update({
        data: {
          uploadStatus: "SUCCESS",
        },
        where: {
          id: uploadedFile.id,
        },
      });
    } catch (error) {
      console.error("Error during Pinecone operations:", error);
      await db.file.update({
        data: {
          uploadStatus: "FAILED",
        },
        where: {
          id: uploadedFile.id,
        },
      });
    }

    return NextResponse.json({ success: true, key: fileName, uploadedFile });
  } catch (error) {
    return NextResponse.json({ error });
  }
}

