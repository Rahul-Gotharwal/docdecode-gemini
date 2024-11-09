//------------------ hugging face code ---------------------------//

/** 
 export class CustomEmbeddings extends Embeddings {
  private model: HuggingFaceInference;

  constructor(apiKey: string, modelName: string, params?: EmbeddingsParams) {
    super(params || {});
    this.model = new HuggingFaceInference({
      model: modelName,
      apiKey: apiKey,
    });
  }

  async embedQuery(query: string): Promise<number[]> {
    console.log("Generating embeddings for query:", query);
    const embedding = await this.model.invoke([query]);
    if (!Array.isArray(embedding) || !embedding.length) {
      console.error("Failed to generate embeddings for query.");
      throw new Error("Failed to generate embeddings.");
    }
    console.log("Generated query embeddings:", embedding[0]);
    return embedding[0] as number[];
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    //console.log(process.env.HUGGINGFACE_API_KEY);
    //console.log("Type of documents:", typeof documents);
    // Ensure all documents are strings
    //console.log("Documents:", documents); // Check actual content
  if (!Array.isArray(documents) || !documents.every(doc => typeof doc === 'string')) {
    console.error("Invalid input: documents should be an array of strings.");
  //   documents.forEach((doc, index) => {
  //     console.log(`Document ${index} type: ${typeof doc}, value:`, doc);
  // });
    throw new Error("Invalid input: documents should be an array of strings.");
  }
  console.log("Number of documents received:", documents.length);
  //console.log("Generating embeddings for documents:", documents);
   const textContentArray = []
   for (const pageText of documents) {
    textContentArray.push(pageText);
  }

   if (textContentArray.length === 0) {
    console.error("No valid text content to embed.");
    throw new Error("No valid text content to embed.");
  }
   // console.log("Generating embeddings for documents:", documents);
   try {
    console.log("Generating embeddings for processed documents...");
    const embeddings = await this.model.invoke(textContentArray);
    if (!Array.isArray(embeddings) || embeddings.length !== documents.length) {
      console.error("Failed to generate embeddings for all documents.");
      throw new Error("Failed to generate embeddings for all documents.");
    }
    console.log("Successfully generated embeddings for documents:", embeddings);
    return embeddings as number[][];
   } catch (error) {
    console.error("Error generating document embeddings:", error);
    throw new Error("An error occurred while generating document embeddings.");
   }
 
  }
}

       //we can also use the => nvidia/NV-Embed-v2 or more at => https://huggingface.co/models?library=sentence-transformers

      //NOTE - there are three textembeddings model of lanchain => https://python.langchain.com/docs/how_to/embed_text/ , first is openai , secoond is cohre , and third is the huggingface
    
        The base Embeddings class in LangChain provides two methods: one for embedding documents and one for embedding a query. The former, .embed_documents, takes as input multiple texts, while the latter, .embed_query, takes a single text. The reason for having these as two separate methods is that some embedding providers have different embedding methods for documents (to be searched over) vs queries (the search query itself). .embed_query will return a list of floats, whereas .embed_documents returns a list of lists of floats.
       
// all the model for the embeddings =>https://python.langchain.com/docs/integrations/text_embedding/
// NOTE -> https://js.langchain.com/docs/integrations/text_embedding/google_generativeai/
// Above link has same fucntonality as we have in the OpenAiEmbeddings
//https://v03.api.js.langchain.com/classes/_langchain_google_genai.GoogleGenerativeAIEmbeddings.html
// this is  the important link for the langchain embedDocument and embedQuery
// const model = new HuggingFaceInference({
//   model: "sentence-transformers/all-MiniLM-L6-v2",
//   apiKey: process.env.HUGGINGFACE_API_KEY,
// });
// //model: "sentence-transformers/all-MiniLM-L6-v2"
// //Initialize custom embeddings
// const embeddings = new CustomEmbeddings(
//   process.env.HUGGINGFACE_API_KEY!,
//   "sentence-transformers/all-MiniLM-L6-v2"
// );
// console.log("Initialized Hugging Face embeddings.");

// // Extract text contents from pageLevelDocs
// // Prepare an array of page contents
// // const textContents = pageLevelDocs.map((doc) => doc.pageContent || "")
// // if (textContents.length === 0) {
// //   throw new Error("No valid page contents extracted.");
// // }
// const textContents = getTextContents(pageLevelDocs) // this fucntion at the last of this file 
// console.log("PDF loaded. Number of pages:", textContents.length);
// console.log("Generating embeddings for PDF pages..." , typeof textContents);
// const pageEmbeddings = await embeddings.embedDocuments(textContents);
// //Iterate through the documents and store them in Pinecone along with their embeddings
// console.log("Storing embeddings in Pinecone...");
// for (let i = 0; i < pageLevelDocs.length; i++) {
//   const doc = pageLevelDocs[i];
//   const embedding = pageEmbeddings[i];

//   await PineconeStore.fromDocuments([doc], embeddings, {
//     pineconeIndex,
//     namespace: uploadedFile.id,
//   });
// }
***/
//----------------------------------------//--------------------------//



//function for flatten the pdf content in the text or strings without the spcae or errors
//import { flattenDeep } from "lodash";
// function getTextContents(pageLevelDocs: any): string[] {
//   const documents = Array.isArray(pageLevelDocs)
//     ? pageLevelDocs
//     : [pageLevelDocs];
//   // Extract text contents robustly
//   const textContents = documents.map((doc) => {
//     if (doc && typeof doc.pageContent === "string") {
//       return doc.pageContent.trim(); // Trim whitespace
//     }
//     return ""; // Return empty string for missing or invalid content
//   });

//   // Flatten nested arrays if necessary
//   return flattenDeep(textContents);
// }

// ---------this code is call the gemini.ts file code for embeddings ---------------//
      // https://v03.api.js.langchain.com/classes/_langchain_pinecone.PineconeStore.html website for the operations of pinecone
      // code with the without the for loop
      // Generate embeddings for the entire document using Gemini API
      // Iterate through the pages and generate embeddings using the Gemini API
      //
      // for (const doc of pageLevelDocs) {
      //   console.log("Processing document:", doc.pageContent);
      //   const geminiEmbeddings = await gemini.getEmbeddings(doc.pageContent || ""); // Get embeddings for each page

      //   if (!geminiEmbeddings) {
      //     throw new Error("Gemini embeddings not returned for a page.");
      //   }
      //   console.log("Generated embeddings:", geminiEmbeddings);
      //   // code of it in the saved notes
      // //const vectorStore = await PineconeStore.fromTexts()
      // // for remove the error of addDocuments and embedQuery we atrying to do the fromtexts method but still we face the same issue in that fucnton also
      //   // Store the page document in Pinecone
      // const result =  await PineconeStore.fromDocuments([doc], geminiEmbeddings, {
      //     pineconeIndex,
      //     namespace: uploadedFile.id, // Use the uploaded file's ID as the namespace
      //   });
      //   console.log("Stored in Pinecone:", result);
      // }


