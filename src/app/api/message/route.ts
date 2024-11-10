import { db } from '@/db'
//import { openai } from '@/lib/openai'
import { getPineconeClient } from '@/lib/pinecone'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
//import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { PineconeStore } from 'langchain/vectorstores/pinecone'
import { NextRequest } from 'next/server'
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { sendMessageValidator } from '@/lib/validators/SendMessagevalidators'
//import { gemini } from '@/lib/gemini'
import { GeminiEmbeddings } from '@/lib/geminiEmbeddings'
export const POST = async (req: NextRequest) => {
  // endpoint for asking a question to a pdf file
try{


  const body = await req.json()

  const { getUser } = getKindeServerSession()
  const user = getUser()

  const { id: userId } = user

  if (!userId)
    return new Response('Unauthorized', { status: 401 })

  const { fileId, message } =
    sendMessageValidator.parse(body)

  const file = await db.file.findFirst({
    where: {
      id: fileId,
      userId,
    },
  })

  if (!file)
    return new Response('Not found', { status: 404 })

  await db.message.create({
    data: {
      text: message,
      isUserMessage: true,
      userId,
      fileId,
    },
  })

  // 1: vectorize message
  // const embeddings = new OpenAIEmbeddings({
  //   openAIApiKey: process.env.OPEN_AI_KEY,
  // })
  
  //const embeddings = await gemini.getEmbeddings(message); 
   // Initialize custom embeddings for user input
  //  const embeddings = new GeminiEmbeddings(
  //   process.env.HUGGINGFACE_API_KEY!,
  //   'sentence-transformers/all-MiniLM-L6-v2'
  // );
  // Generate embeddings for the user message
  const geminiEmbeddings = new GeminiEmbeddings(
    process.env.GEMINI_API_KEY!,
    "text-embedding-004"
  );
  const userMessageEmbedding = await geminiEmbeddings.embedQuery(message);
  const pinecone = await getPineconeClient()
  const pineconeIndex = pinecone.Index('vishalnewaccount')// updated name by docdecodenew , insted the docdecode , because we have to give the name of the index not organization
//Vector Search Logic: If the Pinecone vector search remains the same, you can still use the PineconeStore and the results from the Gemini embeddings:
  const vectorStore = await PineconeStore.fromExistingIndex(
    geminiEmbeddings,
    {
      pineconeIndex,
      namespace: file.id,
    }
  )

  const results = await vectorStore.similaritySearch(
    message,
    4 // 4 closest result we want from the pages
  )

  const prevMessages = await db.message.findMany({
    where: {
      fileId,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 6,
  })

  const formattedPrevMessages = prevMessages.map((msg) => ({
    role: msg.isUserMessage
      ? ('user' as const)
      : ('assistant' as const),
    content: msg.text,
  }))
//------------------------GPT -Code for the below operation we preforemed in the gemini------------//
  // const response = await openai.chat.completions.create({
  //   model: 'gpt-3.5-turbo',
  //   temperature: 0,
  //   stream: true,
  //   messages: [
  //     {
  //       role: 'system',
  //       content:
  //         'Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.',
  //     },
  //     {
  //       role: 'user',
  //       content: `Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer.
        
  // \n----------------\n
  
  // PREVIOUS CONVERSATION:
  // ${formattedPrevMessages.map((message) => {
  //   if (message.role === 'user')
  //     return `User: ${message.content}\n`
  //   return `Assistant: ${message.content}\n`
  // })}
  
  // \n----------------\n
  
  // CONTEXT:
  // ${results.map((r) => r.pageContent).join('\n\n')}
  
  // USER INPUT: ${message}`,
  //     },
  //   ],
  // })

  // gemini code for the =>Replace OpenAI API Calls with Gemini API: In the section where OpenAI generates the response, you'd replace it with a call to the Gemini API:
  const response = await fetch(process.env.GEMINI_API_URL as string, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GEMINI_API_KEY ?? ""}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: {
        text: `
        PREVIOUS CONVERSATION:
        ${formattedPrevMessages.map(msg => msg.role === 'user' ? `User: ${msg.content}` : `Assistant: ${msg.content}`).join('\n')}

        CONTEXT:
        ${results.map(r => r.pageContent).join('\n\n')}

        USER INPUT: ${message}
        `
      },
    }),
  });
  if (!response.ok) {
    return new Response('Failed to get response from Gemini API', { status: 500 })
  }
  // Stream the response using OpenAIStream
  const stream = OpenAIStream(response, {
    async onCompletion(completion) {
      await db.message.create({
        data: {
          text: completion,
          isUserMessage: false,
          fileId,
          userId,
        },
      })
    },
  })
  return new StreamingTextResponse(stream)
}
catch (error) {
  console.error('Error:', error)
  return new Response('Internal Server Error', { status: 500 })
}
}
