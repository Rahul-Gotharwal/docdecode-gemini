// src/lib/geminiEmbeddings.ts

import { Embeddings, EmbeddingsParams } from "langchain/embeddings/base";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AxiosError } from "axios";

export class GeminiEmbeddings extends Embeddings {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string, params?: EmbeddingsParams) {
    super(params || {});
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

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
     // console.log("Generated embeddings:", JSON.stringify(embeddings));
      return embeddings;
    } catch (error) {
      this.handleError(error);
      throw new Error("Failed to generate document embeddings.");
    }
  }

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
