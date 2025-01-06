import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/db";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { GeminiEmbeddings } from "@/lib/geminiEmbeddings";
import { Pinecone } from "@pinecone-database/pinecone";
import { metadata } from "@/app/layout";
const CHUNK_SIZE = 559; // Adjust this to manage request size
function chunkArray(array: any[], size: number) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
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
    //  console.log(pageLevelDocs)
      //console.log(typeof pageLevelDocs)
      const geminiEmbeddings = new GeminiEmbeddings(
        process.env.GEMINI_API_KEY!,
        "text-embedding-004"
      );
     const pc = new Pinecone({
     apiKey:process.env.PINECONE_API_KEY!,
     })
     const index = pc.index(process.env.PINECONE_INDEX_NAME!, process.env.PINECONE_HOST_URL!);
      console.log("Generating embeddings...");
      const textDocumnets = pageLevelDocs.map(doc => doc.pageContent)
      const vectors = await geminiEmbeddings.embedDocuments(textDocumnets);
      console.log("Embedding shape" , vectors.map((vec)=>vec.length));
       // Ensure all vectors are of the required dimensionality
      const validVectors = vectors.filter((vec) => vec.length === 768);

      //console.log("Vector length:", vectors[0].length);  // Log first vector length
      if (validVectors.length !== vectors.length) {
        console.warn("Some embeddings were discarded due to inconsistent dimensions.");
      }
      // Chunk and upsert only valid embeddings
      const upsertData = validVectors.map((vector, index) => ({
        id:`${uploadedFile.id}-${index}`,
        values: vector,
        metadata:{
          source: "blob",
          blobType: 'application/pdf',
          pdfContent: pageLevelDocs.map((doc)=>doc.pageContent).join("\n"), // Store content for future reference
          authorName: uploadedFile.name,
        }
      }));
      //console.dir(pageLevelDocs.map((doc)=>doc.pageContent),{depth:null})
      // const namespace = uploadedFile.id; // Use file ID as namespace
      // console.log("Using namespace:", namespace);
      console.log("Chunking embeddings for upsert...");
      const chunks = chunkArray(upsertData, CHUNK_SIZE);
      for (const chunk of chunks) {
        const chunks = chunkArray(upsertData, CHUNK_SIZE);
        for (const chunk of chunks) {
          try {
            await index.namespace(uploadedFile.id).upsert(chunk)
            console.log(`Successfully upserted a batch of ${chunk.length} embeddings.`);
          } catch (error) {
            console.error("Error upserting chunk:", error);
            await db.file.update({
              data: { uploadStatus: "FAILED" },
              where: { id: uploadedFile.id },
            });
            throw error;
          }
        }
        
    }
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

