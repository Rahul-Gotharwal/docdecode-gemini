import { PineconeClient } from '@pinecone-database/pinecone'
export const getPineconeClient = async () => {
  const client = new PineconeClient()
  await client.init({
    
    apiKey: process.env.PINECONE_API_KEY!,
    environment: "us-east-1-aws" // Update to match your actual environment ID
    //environment: "aped-4627-b74a" // gcp-starter
    //https://docdecodenew-uwth44m.svc.aped-4627-b74a.pinecone.io
  })
  //console.log(client)
  return client

}
// we got the environment list by the help center on the pinecone web the list is below
// just go and create the index and crete the api key and insert them in the project
/**
 * You can find your Pinecone environment in the Pinecone console 1.

For pod-based indexes, here are the available environments 2:

| Cloud | Region | Environment |
| --- | --- | --- |
| GCP | us-west-1 (N. California) | us-west1-gcp |
| GCP | us-central-1 (Iowa) | us-central1-gcp |
| GCP | us-west-4 (Las Vegas) | us-west4-gcp |
| GCP | us-east-4 (Virginia) | us-east4-gcp |
| GCP | northamerica-northeast-1 | northamerica-northeast1-gcp |
| GCP | asia-northeast-1 (Japan) | asia-northeast1-gcp |
| GCP | asia-southeast-1 (Singapore) | asia-southeast1-gcp |
| GCP | us-east-1 (South Carolina) | us-east1-gcp |
| GCP | eu-west-1 (Belgium) | eu-west1-gcp |
| GCP | eu-west-4 (Netherlands) | eu-west4-gcp |
| AWS | us-east-1 (Virginia) | us-east-1-aws |
| Azure | eastus (Virginia) | eastus-azure |

For serverless indexes, these are the available regions :

| Cloud | Region |
| --- | --- |
| aws | us-east-1 (Virginia) |
| aws | us-west-2 (Oregon) |
| aws | eu-west-1 (Ireland) |
| gcp | us-central1 (Iowa) |
| gcp | europe-west4 (Netherlands) |
| azure | eastus2 (Virginia) |

Important notes:

The environment cannot be changed after an index is created
On the free Starter plan, you can create serverless indexes in the us-east-1 region of AWS only

 */